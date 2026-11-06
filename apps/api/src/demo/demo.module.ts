import { Module } from '@nestjs/common';
import { DemoAccountsController } from './demo-accounts.controller';
import { DemoMembersController } from './demo-members.controller';
import { DemoResetService } from './demo-reset.service';

@Module({
  controllers: [DemoMembersController, DemoAccountsController],
  providers: [DemoResetService],
})
export class DemoModule {}
