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
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
  ApiSecurity,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ApiKeyGuard } from '../merchants/api-key.guard';
import { CreateRedemptionDto } from './dto/create-redemption.dto';
import { Redemption } from './redemption.entity';
import { RedemptionsService } from './redemptions.service';

@Controller('redemptions')
export class RedemptionsController {
  constructor(private readonly redemptionsService: RedemptionsService) {}

  @Post()
  @UseGuards(ApiKeyGuard)
  @ApiSecurity('api-key')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: Redemption, description: 'Voucher redeemed' })
  @ApiOkResponse({
    type: Redemption,
    description: 'Idempotency-Key already used: the original redemption',
  })
  @ApiConflictResponse({ description: 'Not enough points or out of stock' })
  @ApiUnprocessableEntityResponse({
    description: 'Idempotency-Key already used with a different voucher',
  })
  async create(
    @Body() body: CreateRedemptionDto,
    @Res({ passthrough: true }) res: Response,
    @Headers('idempotency-key') idempotencyKey?: string,
  ): Promise<Redemption> {
    const key = idempotencyKey?.trim();
    if (!key || key.length > 255) {
      throw new BadRequestException(
        'Idempotency-Key header is required (max 255 characters)',
      );
    }

    const { redemption, created } = await this.redemptionsService.redeem(
      body.memberEmail,
      body.voucherId,
      key,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return redemption;
  }
}
