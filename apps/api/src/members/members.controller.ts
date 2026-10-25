import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  ParseIntPipe,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { CreateMemberDto } from './dto/create-member.dto';
import { MembersService } from './members.service';
import type { Member } from './member';

@Controller('members')
export class MembersController {
  constructor(private readonly membersService: MembersService) {}

  @Get()
  findAll(): Member[] {
    return this.membersService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Member {
    const member = this.membersService.findOne(id);

    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    return member;
  }

  @Post()
  create(@Body() body: CreateMemberDto): Member {
    if (
      typeof body?.name !== 'string' ||
      !body.name.trim() ||
      typeof body?.email !== 'string' ||
      !body.email.trim()
    ) {
      throw new BadRequestException('Name and email are required');
    }

    return this.membersService.create(body.name, body.email);
  }
}
