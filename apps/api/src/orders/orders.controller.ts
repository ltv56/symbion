import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiHeader, ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../merchants/api-key.guard';
import { CurrentMerchant } from '../merchants/current-merchant.decorator';
import { Merchant } from '../merchants/merchant.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { Order } from './order.entity';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  create(
    @Body() body: CreateOrderDto,
    @CurrentMerchant() merchant: Merchant,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Order> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 255) {
      throw new BadRequestException(
        'Idempotency-Key header is required (max 255 characters)',
      );
    }

    return this.ordersService.create(
      merchant.id,
      key,
      body.memberEmail,
      body.amount,
    );
  }
}
