import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MerchantsService } from '../merchants/merchants.service';
import { ProgramSettings } from '../settings/program-settings.entity';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { Voucher } from './voucher.entity';

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
}
