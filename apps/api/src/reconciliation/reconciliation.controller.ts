import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse } from '@nestjs/swagger';
import { AdminGuard } from '../auth/admin.guard';
import { ReconciliationQuery } from './dto/reconciliation.query';
import {
  ReconciliationReport,
  ReconciliationService,
} from './reconciliation.service';

@Controller('reconciliation')
@UseGuards(AdminGuard)
@ApiBearerAuth()
export class ReconciliationController {
  constructor(private readonly reconciliationService: ReconciliationService) {}

  @Get()
  @ApiOkResponse({
    description: 'What each merchant and the app owe for the month',
  })
  report(@Query() query: ReconciliationQuery): Promise<ReconciliationReport> {
    return this.reconciliationService.report(query.month);
  }
}
