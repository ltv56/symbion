import {
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Ledger } from '@symbion/ledger';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/is-duplicate-entry';
import { Redemption } from './redemption.entity';
import { generateVoucherCode } from './voucher-code';

type RedeemResult = { redemption: Redemption; created: boolean };

const CODE_LIFETIME_MS = 30 * 86_400_000;

@Injectable()
export class RedemptionsService {
  constructor(
    @InjectRepository(Redemption)
    private readonly redemptions: Repository<Redemption>,
    private readonly dataSource: DataSource,
    private readonly ledger: Ledger<EntityManager>,
  ) {}

  async redeem(
    memberEmail: string,
    voucherId: number,
    clientKey: string,
  ): Promise<RedeemResult> {
    let memberId: number | undefined;
    try {
      return await this.dataSource.transaction(async (tx) => {
        // Lock order: member, then voucher.
        const [member]: { id: number }[] = await tx.query(
          `SELECT id FROM members WHERE email = ? FOR UPDATE`,
          [memberEmail],
        );
        if (!member) {
          throw new NotFoundException(`Member ${memberEmail} not found`);
        }
        memberId = Number(member.id);

        // Before the balance check: a repeated request waits on the lock and would see 409.
        // Plain read: FOR UPDATE takes a gap lock and two members deadlock on the insert.
        const existing = await tx.findOneBy(Redemption, {
          memberId,
          clientKey,
        });
        if (existing) {
          return sameVoucherOrThrow(existing, voucherId);
        }

        const now = new Date();
        const [voucher]: {
          merchant_id: number;
          points_price: number;
          stock: number;
          valid_until: Date;
        }[] = await tx.query(
          `SELECT merchant_id, points_price, stock, valid_until FROM vouchers
          WHERE id = ? AND status = 'active' AND valid_until > ?
          FOR UPDATE`,
          [voucherId, now],
        );
        if (!voucher) {
          throw new NotFoundException(`Voucher with id ${voucherId} not found`);
        }
        if (Number(voucher.stock) === 0) {
          throw new ConflictException(`Voucher ${voucherId} is out of stock`);
        }

        // The ledger allows debt (refunds need it), so redemption must refuse it here.
        const points = Number(voucher.points_price);
        const balance = await this.ledger.balance(tx, String(memberId), now);
        if (balance < points) {
          throw new ConflictException(
            `Not enough points: balance ${balance}, voucher costs ${points}`,
          );
        }

        await tx.query(`UPDATE vouchers SET stock = stock - 1 WHERE id = ?`, [
          voucherId,
        ]);

        const [settings]: { point_value_vnd: number }[] = await tx.query(
          `SELECT point_value_vnd FROM program_settings WHERE id = 1`,
        );
        const merchantId = Number(voucher.merchant_id);
        const redemption = await tx.save(
          tx.create(Redemption, {
            merchantId,
            memberId,
            voucherId,
            code: generateVoucherCode(),
            points,
            pointValueVnd: Number(settings?.point_value_vnd),
            clientKey,
            expiresAt: codeExpiry(now, voucher.valid_until),
          }),
        );
        // save() keeps the insertId as the driver returns it (a string)
        redemption.id = Number(redemption.id);

        await this.ledger.spend(tx, {
          merchantId: String(merchantId),
          memberId: String(memberId),
          points,
          idempotencyKey: `redemption:${redemption.id}`,
          now,
        });

        return { redemption, created: true };
      });
    } catch (error) {
      if (
        memberId !== undefined &&
        isDuplicateEntry(error, 'uq_redemptions_member_client_key')
      ) {
        const existing = await this.redemptions.findOneByOrFail({
          memberId,
          clientKey,
        });
        return sameVoucherOrThrow(existing, voucherId);
      }
      throw error;
    }
  }

  // Only the voucher's merchant may confirm; a repeat returns the first result.
  async confirm(merchantId: number, code: string): Promise<Redemption> {
    return this.dataSource.transaction(async (tx) => {
      const where = { code: code.toUpperCase(), merchantId };
      const redemption = await tx.findOne(Redemption, {
        where,
        lock: { mode: 'pessimistic_write' },
      });
      if (!redemption) {
        throw new NotFoundException(`Redemption code ${code} not found`);
      }
      if (redemption.status === 'used') {
        return redemption;
      }
      if (redemption.status === 'expired') {
        throw new ConflictException(`Redemption code ${code} has expired`);
      }

      await tx.update(Redemption, redemption.id, {
        status: 'used',
        usedAt: new Date(),
      });
      // Reload: TIMESTAMP drops the milliseconds, so a repeat must see the same value.
      return tx.findOneByOrFail(Redemption, where);
    });
  }
}

// Whole seconds: TIMESTAMP has none, and the response must match a later read.
function codeExpiry(now: Date, validUntil: Date): Date {
  const start = Math.floor(now.getTime() / 1000) * 1000;
  return new Date(Math.min(start + CODE_LIFETIME_MS, validUntil.getTime()));
}

function sameVoucherOrThrow(
  existing: Redemption,
  voucherId: number,
): RedeemResult {
  if (Number(existing.voucherId) !== voucherId) {
    throw new UnprocessableEntityException(
      'Idempotency-Key was already used with a different request',
    );
  }
  return { redemption: existing, created: false };
}
