import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  NotFoundException,
} from '@nestjs/common';
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
  findOne(@Param('id') id: string): Member {
    const member = this.membersService.findOne(Number(id));
    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }
    return member;
  }

  @Post()
  create(@Body() body: { name: string; email: string }): Member {
    return this.membersService.create(body.name, body.email);
  }
}
