import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Request, Response } from 'express';

export interface ErrorBody {
  statusCode: number;
  error: string;
  message: string;
  details?: string[];
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const body = this.toBody(exception);
    this.log(exception, body.statusCode, request);
    response.status(body.statusCode).json(body);
  }

  private toBody(exception: unknown): ErrorBody {
    if (!(exception instanceof HttpException)) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'Internal Server Error',
        message: 'Internal server error',
      };
    }

    const statusCode = exception.getStatus();
    const payload = exception.getResponse();
    const fields =
      typeof payload === 'object'
        ? (payload as { message?: string | string[]; error?: string })
        : { message: payload };
    const error = fields.error ?? HttpStatus[statusCode] ?? 'Error';

    // ValidationPipe reports one message per violated constraint.
    if (Array.isArray(fields.message)) {
      return {
        statusCode,
        error,
        message: 'Validation failed',
        details: fields.message,
      };
    }
    return { statusCode, error, message: fields.message ?? exception.message };
  }

  // Method and path only: bodies and headers can carry credentials such as x-api-key.
  private log(exception: unknown, statusCode: number, request: Request): void {
    const line = `${request.method} ${request.path} ${statusCode}`;
    if (statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        line,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(line);
    }
  }
}
