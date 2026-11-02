import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { isDuplicateEntry } from '../common/is-duplicate-entry';
import { CreateTierDto } from './dto/create-tier.dto';
import { UpdateTierDto } from './dto/update-tier.dto';
import { Tier } from './tier.entity';

@Injectable()
export class TiersService {
  constructor(
    @InjectRepository(Tier) private readonly tiers: Repository<Tier>,
  ) {}

  findAll(): Promise<Tier[]> {
    return this.tiers.find({ order: { minSpend: 'ASC' } });
  }

  findOne(id: number): Promise<Tier | null> {
    return this.tiers.findOneBy({ id });
  }

  async create(dto: CreateTierDto): Promise<Tier> {
    try {
      const saved = await this.tiers.save(this.tiers.create(dto));
      // save() keeps the insertId as the driver returns it (a string)
      saved.id = Number(saved.id);
      return saved;
    } catch (error) {
      return rethrow(error, dto);
    }
  }

  // Members keep their tier until their next evaluation; new orders use the new rate.
  async update(id: number, dto: UpdateTierDto): Promise<Tier | null> {
    if (!(await this.tiers.existsBy({ id }))) {
      return null;
    }
    const { name, minSpend, earnRate } = dto;
    // update() throws when every value is undefined
    if (
      name !== undefined ||
      minSpend !== undefined ||
      earnRate !== undefined
    ) {
      try {
        await this.tiers.update(id, { name, minSpend, earnRate });
      } catch (error) {
        return rethrow(error, dto);
      }
    }
    return this.tiers.findOneBy({ id });
  }
}

function rethrow(
  error: unknown,
  values: { name?: string; minSpend?: number },
): never {
  if (isDuplicateEntry(error, 'uq_tiers_min_spend')) {
    throw new ConflictException(
      `A tier already starts at ${values.minSpend} VND`,
    );
  }
  if (isDuplicateEntry(error, 'uq_tiers_name')) {
    throw new ConflictException(`Tier name ${values.name} is already used`);
  }
  throw error;
}
