import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  Put,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiHeader,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentMemberId, MemberGuard } from '../auth/member.guard';
import { IdempotencyKey } from '../common/idempotency-key.decorator';
import { RedeemVoucherDto } from '../redemptions/dto/create-redemption.dto';
import { Redemption } from '../redemptions/redemption.entity';
import { RedemptionsService } from '../redemptions/redemptions.service';
import { HistoryQuery } from './dto/history.query';
import { Favorite, FavoritesService } from './favorites.service';
import {
  HistoryEntry,
  MemberRedemption,
  MeService,
  Partner,
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
    private readonly favorites: FavoritesService,
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
  @ApiOkResponse({
    description:
      'Point entries, newest first; `limit` (default 50, max 100), `after` = id of the last entry seen',
  })
  history(
    @CurrentMemberId() memberId: number,
    @Query() query: HistoryQuery,
  ): Promise<HistoryEntry[]> {
    return this.me.history(memberId, query.limit, query.after);
  }

  @Get('redemptions')
  @ApiOkResponse({ description: 'Latest 50 redemptions, newest first' })
  redemptionList(
    @CurrentMemberId() memberId: number,
  ): Promise<MemberRedemption[]> {
    return this.me.redemptions(memberId);
  }

  @Get('partners')
  @ApiOkResponse({ description: 'Every merchant of the programme, by name' })
  partners(): Promise<Partner[]> {
    return this.me.partners();
  }

  @Get('favorites')
  @ApiOkResponse({
    description: 'Favorite vouchers that are still listed, newest first',
  })
  favoriteList(@CurrentMemberId() memberId: number): Promise<Favorite[]> {
    return this.favorites.list(memberId);
  }

  @Put('favorites/:voucherId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Favorite added, or already there' })
  @ApiNotFoundResponse({ description: 'Voucher unknown or not listed' })
  addFavorite(
    @CurrentMemberId() memberId: number,
    @Param('voucherId', ParseIntPipe) voucherId: number,
  ): Promise<void> {
    return this.favorites.add(memberId, voucherId);
  }

  @Delete('favorites/:voucherId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Favorite removed, or was not there' })
  removeFavorite(
    @CurrentMemberId() memberId: number,
    @Param('voucherId', ParseIntPipe) voucherId: number,
  ): Promise<void> {
    return this.favorites.remove(memberId, voucherId);
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
