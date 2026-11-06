import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';

describe('ledger_lots indexes', () => {
  let app: INestApplication;
  let dataSource: DataSource;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
    dataSource = app.get(DataSource);
  });

  afterAll(async () => {
    await app.close();
  });

  it('indexes (ref_type, ref_id) for the refund lookup', async () => {
    const rows: { column_name: string }[] = await dataSource.query(
      `SELECT column_name AS column_name FROM information_schema.statistics
      WHERE table_schema = DATABASE() AND table_name = 'ledger_lots'
        AND index_name = 'idx_ledger_lots_ref'
      ORDER BY seq_in_index`,
    );

    expect(rows.map((row) => row.column_name)).toEqual(['ref_type', 'ref_id']);
  });
});
