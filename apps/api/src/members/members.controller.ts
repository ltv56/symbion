import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { MembersService } from './members.service';
import { Member } from './member.entity';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(): Promise<Member[]> {
    return this.membersService.findAll();
  }

  @Get(':id')
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<Member> {
    const member = await this.membersService.findOne(id);

    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    return member;
  }

  @Post()
  create(@Body() body: CreateMemberDto): Promise<Member> {
    // Manual field checks removed: the global ValidationPipe validates CreateMemberDto.
    return this.membersService.create(body.name, body.email, body.merchantId);
  }
}
