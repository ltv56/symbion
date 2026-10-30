import {
  BadRequestException,
  Body,
  Controller,
  Headers,
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
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Refund> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 255) {
      throw new BadRequestException(
        'Idempotency-Key header is required (max 255 characters)',
      );
    }

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
