import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { Voucher } from './voucher.entity';
import { VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() body: CreateVoucherDto): Promise<Voucher> {
    return this.vouchersService.create(body);
  }
}
