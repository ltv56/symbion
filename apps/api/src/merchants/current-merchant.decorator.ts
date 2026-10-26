import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { Merchant } from './merchant.entity';
import { MerchantRequest } from './api-key.guard';

export const CurrentMerchant = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Merchant =>
    context.switchToHttp().getRequest<MerchantRequest>().merchant,
);
