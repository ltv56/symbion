import {
  Body,
  Controller,
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
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { IdempotencyKey } from '../common/idempotency-key.decorator';
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
  @ApiUnprocessableEntityResponse({
    description: 'Idempotency-Key already used with a different request',
  })
  async create(
    @Body() body: CreateOrderDto,
    @CurrentMerchant() merchant: Merchant,
    @Res({ passthrough: true }) res: Response,
    @IdempotencyKey() key: string,
  ): Promise<Order> {
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
