import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Patch,
  UseGuards,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiOkResponse,
} from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import {
  DEMO_POINT_VALUE_MAX,
  DEMO_POINT_VALUE_MIN,
  demoLimitsOn,
} from '../demo/demo-limits';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsService, SettingsView } from './settings.service';

@Controller('settings')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly config: ConfigService,
  ) {}

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
    if (
      demoLimitsOn(this.config) &&
      (body.pointValueVnd < DEMO_POINT_VALUE_MIN ||
        body.pointValueVnd > DEMO_POINT_VALUE_MAX)
    ) {
      throw new BadRequestException(
        `In the demo the point value stays between ${DEMO_POINT_VALUE_MIN} and ${DEMO_POINT_VALUE_MAX}`,
      );
    }
    return this.settingsService.update(body.pointValueVnd);
  }
}
