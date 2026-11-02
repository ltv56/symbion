import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Merchant } from '../merchants/merchant.entity';
import { MerchantsService } from '../merchants/merchants.service';
import { ProgramSettings } from '../settings/program-settings.entity';
import { AdminListVouchersQuery } from './dto/admin-list-vouchers.query';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { Voucher } from './voucher.entity';

export type VoucherView = Voucher & {
  merchantName: string;
  merchantPhotoUrl: string | null;
  merchantAddress: string | null;
};

export interface VoucherPage {
  items: VoucherView[];
  nextCursor: number | null;
}

// A voucher in any state, with how many codes were issued for it
export type AdminVoucherView = Voucher & {
  merchantName: string;
  redeemedCount: number;
};

export interface AdminVoucherPage {
  items: AdminVoucherView[];
  nextCursor: number | null;
}

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher) private readonly vouchers: Repository<Voucher>,
    private readonly merchants: MerchantsService,
  ) {}

  async create(dto: CreateVoucherDto): Promise<Voucher> {
    if (!(await this.merchants.findOne(dto.merchantId))) {
      throw new NotFoundException(
        `Merchant with id ${dto.merchantId} not found`,
      );
    }

    return this.vouchers.manager.transaction(async (tx) => {
      // Shared lock: waits for a point value change in flight
      const { pointValueVnd } = await tx.findOneOrFail(ProgramSettings, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_read' },
      });
      // The app pays the merchant pointsPrice x point value, so the discount must cover it.
      const floor = dto.pointsPrice * pointValueVnd;
      if (dto.faceValue < floor) {
        throw new BadRequestException(
          `faceValue ${dto.faceValue} is below the floor ${floor} (${dto.pointsPrice} points x ${pointValueVnd} VND)`,
        );
      }

      const saved = await tx.save(tx.create(Voucher, dto));
      // save() keeps the insertId as the driver returns it (a string)
      saved.id = Number(saved.id);
      return saved;
    });
  }

  // Stock is set, not counted: a redemption holds the row lock, so a change and a redemption queue up.
  async update(id: number, dto: UpdateVoucherDto): Promise<Voucher | null> {
    if (!(await this.vouchers.existsBy({ id }))) {
      return null;
    }
    const { stock, validUntil, status } = dto;
    // update() throws when every value is undefined
    if (stock !== undefined || validUntil !== undefined || status) {
      await this.vouchers.update(id, { stock, validUntil, status });
    }
    return this.vouchers.findOneBy({ id });
  }

  // Every state, newest first; the same keyset as the public list
  async listAll(query: AdminListVouchersQuery): Promise<AdminVoucherPage> {
    const { limit, after, merchantId, status } = query;
    const builder = this.vouchers
      .createQueryBuilder('v')
      .innerJoin(Merchant, 'm', 'm.id = v.merchantId')
      .addSelect('m.name', 'merchantName')
      .addSelect(
        '(SELECT COUNT(*) FROM redemptions r WHERE r.voucher_id = v.id)',
        'redeemedCount',
      )
      .orderBy('v.id', 'DESC')
      .limit(limit + 1);
    if (after) builder.andWhere('v.id < :after', { after });
    if (merchantId)
      builder.andWhere('v.merchantId = :merchantId', { merchantId });
    if (status) builder.andWhere('v.status = :status', { status });

    // The join is one-to-one, so entities and raw rows line up by index
    const { entities, raw } = await builder.getRawAndEntities<{
      merchantName: string;
      redeemedCount: string | number;
    }>();
    const rows = entities.map((voucher, i) =>
      Object.assign(voucher, {
        merchantName: raw[i]!.merchantName,
        redeemedCount: Number(raw[i]!.redeemedCount),
      }),
    );
    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? last.id : null,
    };
  }

  // Keyset pagination; one extra row tells whether another page exists
  async list(limit: number, after?: number): Promise<VoucherPage> {
    const query = this.redeemable()
      .orderBy('v.id', 'DESC')
      .limit(limit + 1);
    if (after) {
      query.andWhere('v.id < :after', { after });
    }
    const rows = await this.withMerchant(query);

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? last.id : null,
    };
  }

  async findActive(id: number): Promise<VoucherView | null> {
    const [voucher] = await this.withMerchant(
      this.redeemable().andWhere('v.id = :id', { id }),
    );
    return voucher ?? null;
  }

  private redeemable(): SelectQueryBuilder<Voucher> {
    return this.vouchers
      .createQueryBuilder('v')
      .innerJoin(Merchant, 'm', 'm.id = v.merchantId')
      .addSelect('m.name', 'merchantName')
      .addSelect('m.photoUrl', 'merchantPhotoUrl')
      .addSelect('m.address', 'merchantAddress')
      .where('v.status = :status AND v.validUntil > :now', {
        status: 'active',
        now: new Date(),
      });
  }

  // The join is one-to-one, so entities and raw rows line up by index
  private async withMerchant(
    query: SelectQueryBuilder<Voucher>,
  ): Promise<VoucherView[]> {
    const { entities, raw } = await query.getRawAndEntities<{
      merchantName: string;
      merchantPhotoUrl: string | null;
      merchantAddress: string | null;
    }>();
    return entities.map((voucher, i) => {
      const { merchantName, merchantPhotoUrl, merchantAddress } = raw[i]!;
      return Object.assign(voucher, {
        merchantName,
        merchantPhotoUrl,
        merchantAddress,
      });
    });
  }
}
