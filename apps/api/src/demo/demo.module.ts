import { Module } from '@nestjs/common';
import { DemoMembersController } from './demo-members.controller';
import { DemoResetService } from './demo-reset.service';

@Module({
  controllers: [DemoMembersController],
  providers: [DemoResetService],
})
export class DemoModule {}
