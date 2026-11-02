import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService, SettingsView } from './settings.service';

@Controller('settings')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  get(): Promise<SettingsView> {
    return this.settingsService.get();
  }

  @Patch()
  @ApiOkResponse({ description: 'The programme settings after the change' })
  @ApiConflictResponse({
    description: 'A sellable voucher would fall under its floor',
  })
  update(@Body() body: UpdateSettingsDto): Promise<SettingsView> {
    return this.settingsService.update(body.pointValueVnd);
  }
}
