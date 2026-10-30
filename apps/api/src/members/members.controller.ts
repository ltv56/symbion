import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  UseGuards,
} from '@nestjs/common';
import { ApiSecurity } from '@nestjs/swagger';
import { ApiKeyGuard } from '../merchants/api-key.guard';
import { CurrentMerchant } from '../merchants/current-merchant.decorator';
import { Merchant } from '../merchants/merchant.entity';
import { CreateMemberDto } from './dto/create-member.dto';
import { MembersService } from './members.service';
import { Member } from './member.entity';

@Controller('members')
@UseGuards(ApiKeyGuard)
@ApiSecurity('api-key')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(@CurrentMerchant() merchant: Merchant): Promise<Member[]> {
    return this.membersService.findAll(merchant.id);
  }

  @Get(':id')
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @CurrentMerchant() merchant: Merchant,
  ): Promise<Member> {
    const member = await this.membersService.findOne(id, merchant.id);

    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    return member;
  }

  @Post()
  create(
    @Body() body: CreateMemberDto,
    @CurrentMerchant() merchant: Merchant,
  ): Promise<Member> {
    return this.membersService.create(body.name, body.email, merchant.id);
  }
}
