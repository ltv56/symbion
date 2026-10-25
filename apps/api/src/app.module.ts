import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MembersModule } from './members/members.module';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }), MembersModule],
})
export class AppModule {}
