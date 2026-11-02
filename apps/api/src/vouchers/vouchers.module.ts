import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { MerchantsModule } from '../merchants/merchants.module';
import { ProgramSettings } from '../settings/program-settings.entity';
import { AdminVouchersController } from './admin-vouchers.controller';
import { Voucher } from './voucher.entity';
import { VouchersController } from './vouchers.controller';
import { VouchersService } from './vouchers.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Voucher, ProgramSettings]),
    AuthModule,
    MerchantsModule,
  ],
  controllers: [VouchersController, AdminVouchersController],
  providers: [VouchersService],
  exports: [VouchersService],
})
export class VouchersModule {}
