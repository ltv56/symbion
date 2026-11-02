import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { CreateVoucherDto } from './dto/create-voucher.dto';
import { ListVouchersQuery } from './dto/list-vouchers.query';
import { UpdateVoucherDto } from './dto/update-voucher.dto';
import { Voucher } from './voucher.entity';
import { VoucherPage, VouchersService } from './vouchers.service';

@Controller('vouchers')
export class VouchersController {
  constructor(private readonly vouchersService: VouchersService) {}

  @Post()
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  create(@Body() body: CreateVoucherDto): Promise<Voucher> {
    return this.vouchersService.create(body);
  }

  @Patch(':id')
  @UseGuards(AdminGuard)
  @ApiBearerAuth()
  @ApiNotFoundResponse({ description: 'Unknown voucher' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateVoucherDto,
  ): Promise<Voucher> {
    const voucher = await this.vouchersService.update(id, body);

    if (!voucher) {
      throw new NotFoundException(`Voucher with id ${id} not found`);
    }

    return voucher;
  }

  @Get()
  list(@Query() query: ListVouchersQuery): Promise<VoucherPage> {
    return this.vouchersService.list(query.limit, query.after);
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Voucher> {
    const voucher = await this.vouchersService.findActive(id);

    if (!voucher) {
      throw new NotFoundException(`Voucher with id ${id} not found`);
    }

    return voucher;
  }
}
