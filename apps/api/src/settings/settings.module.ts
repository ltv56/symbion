import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { ProgramSettings } from './program-settings.entity';
import { SettingsController } from './settings.controller';
import { SettingsService } from './settings.service';

@Module({
  imports: [TypeOrmModule.forFeature([ProgramSettings]), AuthModule],
  controllers: [SettingsController],
  providers: [SettingsService],
})
export class SettingsModule {}
