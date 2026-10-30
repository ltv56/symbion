import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Merchant } from './merchant.entity';

export interface CreatedMerchant {
  id: number;
  name: string;
  apiKey: string;
}

@Injectable()
export class MerchantsService {
  constructor(
    @InjectRepository(Merchant)
    private readonly merchants: Repository<Merchant>,
  ) {}

  findAll(): Promise<Merchant[]> {
    return this.merchants.find();
  }

  findOne(id: number): Promise<Merchant | null> {
    return this.merchants.findOneBy({ id });
  }

  findByApiKey(apiKey: string): Promise<Merchant | null> {
    return this.merchants.findOneBy({ apiKeyHash: hashApiKey(apiKey) });
  }

  // The raw key is returned only by create and rotateApiKey; afterwards only its hash exists.
  async create(name: string): Promise<CreatedMerchant> {
    const apiKey = newApiKey();
    const merchant = await this.merchants.save(
      this.merchants.create({ name, apiKeyHash: hashApiKey(apiKey) }),
    );
    return { id: merchant.id, name: merchant.name, apiKey };
  }

  // The old key stops working at once.
  async rotateApiKey(id: number): Promise<CreatedMerchant | null> {
    const apiKey = newApiKey();
    const { affected } = await this.merchants.update(id, {
      apiKeyHash: hashApiKey(apiKey),
    });
    if (!affected) {
      return null;
    }
    const merchant = await this.merchants.findOneByOrFail({ id });
    return { id: merchant.id, name: merchant.name, apiKey };
  }
}

function newApiKey(): string {
  return randomBytes(32).toString('hex');
}

function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}
