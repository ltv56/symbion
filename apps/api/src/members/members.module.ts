import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { MerchantsModule } from '../merchants/merchants.module';
import { Member } from './member.entity';
import { MembersController } from './members.controller';
import { MembersService } from './members.service';

@Module({
  imports: [TypeOrmModule.forFeature([Member]), MerchantsModule],
  controllers: [MembersController],
  providers: [MembersService],
})
export class MembersModule {}
