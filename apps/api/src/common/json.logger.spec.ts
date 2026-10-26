import { JsonLogger } from './json.logger';
import { requestContext } from './request-context';

describe('JsonLogger', () => {
  let lines: string[];
  let logger: JsonLogger;
  const first = (): Record<string, unknown> =>
    JSON.parse(lines[0] ?? '{}') as Record<string, unknown>;

  beforeEach(() => {
    lines = [];
    jest.spyOn(process.stdout, 'write').mockImplementation((chunk) => {
      lines.push(String(chunk));
      return true;
    });
    logger = new JsonLogger();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('writes one JSON line with level, context and message', () => {
    logger.log('server started', 'Bootstrap');

    expect(lines).toHaveLength(1);
    expect(lines[0]?.endsWith('\n')).toBe(true);
    expect(first()).toMatchObject({
      level: 'info',
      context: 'Bootstrap',
      message: 'server started',
    });
  });

  it('adds the request id when inside a request', () => {
    requestContext.run({ requestId: 'req-1' }, () => logger.warn('slow'));

    expect(first()).toMatchObject({
      level: 'warn',
      requestId: 'req-1',
    });
  });

  it('leaves the request id out when there is no request', () => {
    logger.log('boot');

    expect(first()).not.toHaveProperty('requestId');
  });

  it('puts the stack of an error in its own field', () => {
    logger.error(
      'POST /orders 500',
      'Error: boom\n    at x',
      'AllExceptionsFilter',
    );

    expect(first()).toMatchObject({
      level: 'error',
      context: 'AllExceptionsFilter',
      message: 'POST /orders 500',
      stack: 'Error: boom\n    at x',
    });
  });
});
