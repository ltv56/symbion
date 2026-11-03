import { Module } from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { EntityManager } from 'typeorm';
import { MysqlLedgerStorage } from './mysql-ledger.storage';
import { PointExpiryService } from './point-expiry.service';

@Module({
  providers: [
    MysqlLedgerStorage,
    PointExpiryService,
    {
      provide: Ledger,
      useFactory: (storage: MysqlLedgerStorage) =>
        new Ledger<EntityManager>(storage),
      inject: [MysqlLedgerStorage],
    },
  ],
  exports: [Ledger],
})
export class LedgerModule {}
