import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { LedgerModule } from '../ledger/ledger.module';
import { RedemptionsModule } from '../redemptions/redemptions.module';
import { VouchersModule } from '../vouchers/vouchers.module';
import { FavoritesService } from './favorites.service';
import { MeController } from './me.controller';
import { MeService } from './me.service';

@Module({
  imports: [AuthModule, LedgerModule, RedemptionsModule, VouchersModule],
  controllers: [MeController],
  providers: [MeService, FavoritesService],
  exports: [MeService],
})
export class MeModule {}
