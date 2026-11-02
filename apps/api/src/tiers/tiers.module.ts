import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Tier } from './tier.entity';
import { TierDowngradeService } from './tier-downgrade.service';
import { TiersController } from './tiers.controller';
import { TiersService } from './tiers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tier]), AuthModule],
  controllers: [TiersController],
  providers: [TiersService, TierDowngradeService],
})
export class TiersModule {}
