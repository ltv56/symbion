import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { DemoAccountsController } from './demo-accounts.controller';
import { DemoMembersController } from './demo-members.controller';
import { DemoResetService } from './demo-reset.service';

@Module({
  imports: [AuthModule],
  controllers: [DemoMembersController, DemoAccountsController],
  providers: [DemoResetService],
})
export class DemoModule {}
