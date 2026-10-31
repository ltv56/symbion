import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, LessThan, MoreThan, Repository } from 'typeorm';
import { MerchantsService } from '../merchants/merchants.service';
import { ProgramSettings } from '../settings/program-settings.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { Voucher } from './voucher.entity';

export interface VoucherPage {
  items: Voucher[];
  nextCursor: number | null;
}

@Injectable()
export class VouchersService {
  constructor(
    @InjectRepository(Voucher) private readonly vouchers: Repository<Voucher>,
    @InjectRepository(ProgramSettings)
    private readonly settings: Repository<ProgramSettings>,
    private readonly merchants: MerchantsService,
  ) {}

  async create(dto: CreateVoucherDto): Promise<Voucher> {
    if (!(await this.merchants.findOne(dto.merchantId))) {
      throw new NotFoundException(
        `Merchant with id ${dto.merchantId} not found`,
      );
    }

    // The app pays the merchant pointsPrice x point value, so the discount must cover it.
    const { pointValueVnd } = await this.settings.findOneByOrFail({ id: 1 });
    const floor = dto.pointsPrice * pointValueVnd;
    if (dto.faceValue < floor) {
      throw new BadRequestException(
        `faceValue ${dto.faceValue} is below the floor ${floor} (${dto.pointsPrice} points x ${pointValueVnd} VND)`,
      );
    }

    const saved = await this.vouchers.save(this.vouchers.create(dto));
    // save() keeps the insertId as the driver returns it (a string)
    saved.id = Number(saved.id);
    return saved;
  }

  // Keyset pagination; one extra row tells whether another page exists
  async list(limit: number, after?: number): Promise<VoucherPage> {
    const rows = await this.vouchers.find({
      where: {
        ...this.redeemable(),
        ...(after ? { id: LessThan(after) } : {}),
      },
      order: { id: 'DESC' },
      take: limit + 1,
    });

    const items = rows.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      nextCursor: rows.length > limit && last ? last.id : null,
    };
  }

  findActive(id: number): Promise<Voucher | null> {
    return this.vouchers.findOneBy({ id, ...this.redeemable() });
  }

  private redeemable(): FindOptionsWhere<Voucher> {
    return { status: 'active', validUntil: MoreThan(new Date()) };
  }
}
