import {
  Controller,
  Get,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ApiOkResponse, ApiServiceUnavailableResponse } from '@nestjs/swagger';
import { DataSource } from 'typeorm';

@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(private readonly dataSource: DataSource) {}

  @Get()
  @ApiOkResponse({
    description: 'The api is up and MySQL answers',
    schema: { example: { status: 'ok' } },
  })
  @ApiServiceUnavailableResponse({ description: 'MySQL does not answer' })
  async check(): Promise<{ status: 'ok' }> {
    try {
      await this.dataSource.query('SELECT 1');
    } catch (error) {
      // the cause stays in the log; the body must not leak host or driver details
      this.logger.error(
        `Health check failed: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('Database unavailable');
    }

    return { status: 'ok' };
  }
}
