import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MeModule } from '../me/me.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { AdminMembersController } from './admin-members.controller';
import { AdminMembersService } from './admin-members.service';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Member]),
    AuthModule,
    MeModule,
    MerchantsModule,
  ],
  controllers: [MembersController, AdminMembersController],
  providers: [MembersService, AdminMembersService],
})
export class MembersModule {}
