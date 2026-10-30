import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CreateTierDto } from './dto/create-tier.dto';
import { Tier } from './tier.entity';

@Injectable()
export class TiersService {
  constructor(
    @InjectRepository(Tier) private readonly tiers: Repository<Tier>,
  ) {}

  findAll(): Promise<Tier[]> {
    return this.tiers.find({ order: { minPoints: 'ASC' } });
  }

  findOne(id: number): Promise<Tier | null> {
    return this.tiers.findOneBy({ id });
  }

  async create(dto: CreateTierDto): Promise<Tier> {
    // min_points has no unique constraint yet, so this check can race.
    if (await this.tiers.existsBy({ minPoints: dto.minPoints })) {
      throw new ConflictException(
        `A tier already starts at ${dto.minPoints} points`,
      );
    }

    try {
      const saved = await this.tiers.save(this.tiers.create(dto));
      // save() keeps the insertId as the driver returns it (a string)
      saved.id = Number(saved.id);
      return saved;
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(`Tier name ${dto.name} is already used`);
      }
      throw error;
    }
  }
}
