import {
  BadRequestException,
  Body,
  Controller,
  Headers,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Response } from 'express';
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
  @ApiCreatedResponse({ type: Order, description: 'Order created' })
  @ApiOkResponse({
    type: Order,
    description: 'Idempotency-Key already used: the original order',
  })
  async create(
    @Body() body: CreateOrderDto,
    @CurrentMerchant() merchant: Merchant,
    @Res({ passthrough: true }) res: Response,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Order> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 255) {
      throw new BadRequestException(
        'Idempotency-Key header is required (max 255 characters)',
      );
    }

    const { order, created } = await this.ordersService.create(
      merchant.id,
      key,
      body.memberEmail,
      body.amount,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return order;
  }
}
