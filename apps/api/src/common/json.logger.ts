import { LoggerService } from '@nestjs/common';
import { requestContext } from './request-context';

type Level = 'debug' | 'info' | 'warn' | 'error';

// One JSON object per line on stdout, easy to grep and ship later.
export class JsonLogger implements LoggerService {
  log(message: unknown, context?: string): void {
    this.write('info', message, context);
  }

  warn(message: unknown, context?: string): void {
    this.write('warn', message, context);
  }

  debug(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  verbose(message: unknown, context?: string): void {
    this.write('debug', message, context);
  }

  fatal(message: unknown, context?: string): void {
    this.write('error', message, context);
  }

  // Nest calls error(message, stack, context); with two args the second is the context.
  error(message: unknown, stackOrContext?: string, context?: string): void {
    if (context === undefined) {
      this.write('error', message, stackOrContext);
    } else {
      this.write('error', message, context, stackOrContext);
    }
  }

  private write(
    level: Level,
    message: unknown,
    context?: string,
    stack?: string,
  ): void {
    const entry = {
      time: new Date().toISOString(),
      level,
      context,
      message: typeof message === 'string' ? message : JSON.stringify(message),
      requestId: requestContext.getStore()?.requestId,
      stack,
    };
    process.stdout.write(`${JSON.stringify(entry)}\n`);
  }
}
