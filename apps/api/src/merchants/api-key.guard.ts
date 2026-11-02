import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { Merchant } from './merchant.entity';
import { MerchantsService } from './merchants.service';

export type MerchantRequest = Request & { merchant: Merchant };

@Injectable()
export class ApiKeyGuard implements CanActivate {
  constructor(private readonly merchants: MerchantsService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<MerchantRequest>();
    const apiKey = request.header('x-api-key');
    if (!apiKey) {
      throw new UnauthorizedException('Missing API key');
    }

    const merchant = await this.merchants.findByApiKey(apiKey);
    if (!merchant) {
      throw new UnauthorizedException('Invalid API key');
    }

    request.merchant = merchant;
    return true;
  }
}
