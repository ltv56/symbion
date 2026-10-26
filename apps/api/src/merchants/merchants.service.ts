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

  async create(name: string): Promise<CreatedMerchant> {
    const apiKey = randomBytes(32).toString('hex');
    const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');

    const merchant = await this.merchants.save(
      this.merchants.create({ name, apiKeyHash }),
    );

    // The raw key is returned only here; afterwards only its hash exists.
    return { id: merchant.id, name: merchant.name, apiKey };
  }
}
