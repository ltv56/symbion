import {
  Controller,
  Get,
  NotFoundException,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiNotFoundResponse } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import {
  AdminMemberDetail,
  AdminMemberPage,
  AdminMembersService,
} from './admin-members.service';
import { AdminListMembersQuery } from './dto/admin-list-members.query';

// Members of every merchant: the app admin sees them all
@Controller('admin/members')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class AdminMembersController {
  constructor(private readonly adminMembers: AdminMembersService) {}

  @Get()
  list(@Query() query: AdminListMembersQuery): Promise<AdminMemberPage> {
    return this.adminMembers.list(query);
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Unknown member' })
  async detail(
    @Param('id', ParseIntPipe) id: number,
  ): Promise<AdminMemberDetail> {
    const member = await this.adminMembers.detail(id);

    if (!member) {
      throw new NotFoundException(`Member with id ${id} not found`);
    }

    return member;
  }
}
