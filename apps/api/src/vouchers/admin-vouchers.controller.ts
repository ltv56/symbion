import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { AdminListVouchersQuery } from './dto/admin-list-vouchers.query';
import { AdminVoucherPage, VouchersService } from './vouchers.service';

// Vouchers in every state, which the public list leaves out
@Controller('admin/vouchers')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminVouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Get()
  list(@Query() query: AdminListVouchersQuery): Promise<AdminVoucherPage> {
    return this.vouchersService.listAll(query);
  }
}
