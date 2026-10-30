import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { CurrentMemberId, MemberGuard } from '../auth/member.guard';
import { HistoryEntry, MeService, Profile } from './me.service';

@Controller('me')
@UseGuards(MemberGuard)
@ApiBearerAuth()
export class MeController {
  constructor(private readonly me: MeService) {}

  @Get()
  @ApiOkResponse({ description: 'Member, tier and point balance' })
  profile(@CurrentMemberId() memberId: number): Promise<Profile> {
    return this.me.profile(memberId);
  }

  @Get('history')
  @ApiOkResponse({ description: 'Latest 50 point entries, newest first' })
  history(@CurrentMemberId() memberId: number): Promise<HistoryEntry[]> {
    return this.me.history(memberId);
  }
}
