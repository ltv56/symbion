import { Module } from '@nestjs/common';
import { Ledger } from '@symbion/ledger';
import { EntityManager } from 'typeorm';
import { MysqlLedgerStorage } from './mysql-ledger.storage';

@Module({
  providers: [
    MysqlLedgerStorage,
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
