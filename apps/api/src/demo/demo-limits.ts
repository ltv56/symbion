import { ConfigService } from '@nestjs/config';

export const DEMO_POINT_VALUE_MIN = 50;
export const DEMO_POINT_VALUE_MAX = 200;

// On with DEMO_MODE unless DEMO_ADMIN_LIMITS=false (the e2e suites turn it off)
export const demoLimitsOn = (config: ConfigService): boolean =>
  config.get<string>('DEMO_MODE') === 'true' &&
  config.get<string>('DEMO_ADMIN_LIMITS') !== 'false';
