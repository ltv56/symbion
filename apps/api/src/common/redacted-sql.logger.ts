import { Logger as NestLogger } from '@nestjs/common';
import type { Logger } from 'typeorm';

// Prod SQL log: the query text only. Params hold member emails, and MySQL error
// messages repeat the value (Duplicate entry '...'), so neither goes to the log.
export class RedactedSqlLogger implements Logger {
  private readonly logger = new NestLogger('SQL');

  logQuery(query: string, _parameters?: unknown[]): void {
    this.logger.log(query);
  }

  logQueryError(
    error: string | Error,
    query: string,
    _parameters?: unknown[],
  ): void {
    const { code, errno } = error as { code?: string; errno?: number };
    this.logger.error(
      `query failed (${code ?? 'unknown'} ${errno ?? ''}): ${query}`,
    );
  }

  logQuerySlow(time: number, query: string, _parameters?: unknown[]): void {
    this.logger.warn(`slow query (${time}ms): ${query}`);
  }

  logSchemaBuild(message: string): void {
    this.logger.log(message);
  }

  logMigration(message: string): void {
    this.logger.log(message);
  }

  log(level: 'log' | 'info' | 'warn', message: unknown): void {
    if (level === 'warn') {
      this.logger.warn(String(message));
    } else {
      this.logger.log(String(message));
    }
  }
}
