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
import { CreateVoucherDto } from './dto/create-voucher.dto';
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
