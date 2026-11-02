import {
  Body,
  Controller,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiHeader,
  ApiNotFoundResponse,
  ApiSecurity,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { IdempotencyKey } from '../common/idempotency-key.decorator';
import { ApiKeyGuard } from '../merchants/api-key.guard';
import { CurrentMerchant } from '../merchants/current-merchant.decorator';
import { Merchant } from '../merchants/merchant.entity';
import { CreateRefundDto } from './dto/create-refund.dto';
import { Refund } from './refund.entity';
import { RefundsService } from './refunds.service';

@Controller('orders/:orderId/refunds')
export class RefundsController {
  constructor(private readonly refundsService: RefundsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: Refund, description: 'Refund recorded' })
  @ApiNotFoundResponse({ description: 'No such order for this merchant' })
  async create(
    @Param('orderId', ParseIntPipe) orderId: number,
    @Body() body: CreateRefundDto,
    @CurrentMerchant() merchant: Merchant,
    @Res({ passthrough: true }) res: Response,
    @IdempotencyKey() key: string,
  ): Promise<Refund> {
    const { refund, created } = await this.refundsService.refund(
      merchant.id,
      orderId,
      body.amount,
      key,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return refund;
  }
}
