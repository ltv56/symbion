import { Logger } from '@nestjs/common';
import { RedactedSqlLogger } from './redacted-sql.logger';

describe('RedactedSqlLogger', () => {
  let lines: string[];
  let logger: RedactedSqlLogger;

  beforeEach(() => {
    lines = [];
    const collect = (message: unknown) => {
      lines.push(String(message));
    };
    jest.spyOn(Logger.prototype, 'log').mockImplementation(collect);
    jest.spyOn(Logger.prototype, 'error').mockImplementation(collect);
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(collect);
    logger = new RedactedSqlLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('logs the query without its parameters', () => {
    logger.logQuery('SELECT * FROM members WHERE email = ?', [
      'ann@example.com',
    ]);

    const output = lines.join('\n');
    expect(output).toContain('SELECT * FROM members WHERE email = ?');
    expect(output).not.toContain('ann@example.com');
  });

  it('logs a failed query with its code but not the driver message', () => {
    const error = Object.assign(
      new Error("Duplicate entry 'ann@example.com' for key 'uq_members_email'"),
      { code: 'ER_DUP_ENTRY', errno: 1062 },
    );

    logger.logQueryError(error, 'INSERT INTO members (email) VALUES (?)', [
      'ann@example.com',
    ]);

    const output = lines.join('\n');
    expect(output).toContain('ER_DUP_ENTRY');
    expect(output).toContain('INSERT INTO members');
    expect(output).not.toContain('ann@example.com');
  });

  it('logs a slow query without its parameters', () => {
    logger.logQuerySlow(1500, 'SELECT * FROM members WHERE email = ?', [
      'ann@example.com',
    ]);

    const output = lines.join('\n');
    expect(output).toContain('1500');
    expect(output).not.toContain('ann@example.com');
  });
});
