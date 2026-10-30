import {
  Body,
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { CreateMerchantDto } from './dto/create-merchant.dto';
import { Merchant } from './merchant.entity';
import { CreatedMerchant, MerchantsService } from './merchants.service';

@Controller('merchants')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class MerchantsController {
  constructor(private readonly merchantsService: MerchantsService) {}

  @Get()
  findAll(): Promise<Merchant[]> {
    return this.merchantsService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Merchant> {
    const merchant = await this.merchantsService.findOne(id);

    if (!merchant) {
      throw new NotFoundException(`Merchant with id ${id} not found`);
    }

    return merchant;
  }

  @Post()
  create(@Body() body: CreateMerchantDto): Promise<CreatedMerchant> {
    return this.merchantsService.create(body.name);
  }
}
