import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { ProgramSettings } from '../settings/program-settings.entity';
import { Voucher } from './voucher.entity';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, ProgramSettings]),
    AuthModule,
    MerchantsModule,
  ],
  controllers: [VouchersController],
  providers: [VouchersService],
})
export class VouchersModule {}
