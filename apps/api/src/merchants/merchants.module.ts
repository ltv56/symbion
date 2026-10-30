import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Merchant } from './merchant.entity';
import { ApiKeyGuard } from './api-key.guard';
import { MerchantsController } from './merchants.controller';
import { MerchantsService } from './merchants.service';

@Module({
  imports: [TypeOrmModule.forFeature([Merchant]), AuthModule],
  controllers: [MerchantsController],
  providers: [MerchantsService, ApiKeyGuard],
  exports: [MerchantsService, ApiKeyGuard],
})
export class MerchantsModule {}
