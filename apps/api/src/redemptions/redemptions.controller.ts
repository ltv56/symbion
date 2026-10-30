import {
  Body,
  Controller,
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
import { IdempotencyKey } from '../common/idempotency-key.decorator';
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
    @IdempotencyKey() key: string,
  ): Promise<Redemption> {
    const { redemption, created } = await this.redemptionsService.redeem(
      body.memberEmail,
      body.voucherId,
      key,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return redemption;
  }
}
