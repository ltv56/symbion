import { Matches } from 'class-validator';

export class ReconciliationQuery {
  @Matches(/^20\d{2}-(0[1-9]|1[0-2])$/, {
    message: 'month must be YYYY-MM, from 2000-01',
  })
  month!: string;
}
