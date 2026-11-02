import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { DataSource } from 'typeorm';
import { AppModule } from '../src/app.module';

describe('Database', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('connects to MySQL without synchronize', async () => {
    const dataSource = app.get(DataSource);
    const rows = await dataSource.query('SELECT 1 AS ok');
    expect(Number(rows[0].ok)).toBe(1);
    expect(dataSource.options.synchronize).toBe(false);
  });
});
