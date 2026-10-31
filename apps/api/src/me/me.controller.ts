import {
  Body,
  Controller,
  Get,
  HttpStatus,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentMemberId, MemberGuard } from '../auth/member.guard';
import { IdempotencyKey } from '../common/idempotency-key.decorator';
import { RedeemVoucherDto } from '../redemptions/dto/create-redemption.dto';
import { Redemption } from '../redemptions/redemption.entity';
import { RedemptionsService } from '../redemptions/redemptions.service';
import {
  HistoryEntry,
  MemberRedemption,
  MeService,
  Profile,
  UnspentLot,
} from './me.service';

@Controller('me')
@UseGuards(MemberGuard)
@ApiBearerAuth()
export class MeController {
  constructor(
    private readonly me: MeService,
    private readonly redemptions: RedemptionsService,
  ) {}

  @Get()
  @ApiOkResponse({
    description: 'Member, tier, point balance and progress to the next tier',
  })
  profile(@CurrentMemberId() memberId: number): Promise<Profile> {
    return this.me.profile(memberId);
  }

  @Get('lots')
  @ApiOkResponse({
    description: 'Unspent, unexpired point lots, earliest expiry first',
  })
  lots(@CurrentMemberId() memberId: number): Promise<UnspentLot[]> {
    return this.me.lots(memberId);
  }

  @Get('history')
  @ApiOkResponse({ description: 'Latest 50 point entries, newest first' })
  history(@CurrentMemberId() memberId: number): Promise<HistoryEntry[]> {
    return this.me.history(memberId);
  }

  @Get('redemptions')
  @ApiOkResponse({ description: 'Latest 50 redemptions, newest first' })
  redemptionList(
    @CurrentMemberId() memberId: number,
  ): Promise<MemberRedemption[]> {
    return this.me.redemptions(memberId);
  }

  @Post('redemptions')
  @ApiHeader({ name: 'Idempotency-Key', required: true })
  @ApiCreatedResponse({ type: Redemption, description: 'Voucher redeemed' })
  @ApiOkResponse({
    type: Redemption,
    description: 'Idempotency-Key already used: the original redemption',
  })
  @ApiConflictResponse({ description: 'Not enough points or out of stock' })
  async redeem(
    @CurrentMemberId() memberId: number,
    @Body() body: RedeemVoucherDto,
    @Res({ passthrough: true }) res: Response,
    @IdempotencyKey() key: string,
  ): Promise<Redemption> {
    const { redemption, created } = await this.redemptions.redeem(
      { id: memberId },
      body.voucherId,
      key,
    );
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return redemption;
  }
}
