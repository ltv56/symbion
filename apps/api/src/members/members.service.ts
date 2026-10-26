import {
  ConflictException,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Member } from './member.entity';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member) private readonly members: Repository<Member>,
  ) {}

  findAll(): Promise<Member[]> {
    return this.members.find();
  }

  findOne(id: number): Promise<Member | null> {
    return this.members.findOneBy({ id });
  }

  async create(
    name: string,
    email: string,
    merchantId: number,
  ): Promise<Member> {
    const [tier] = await this.members.query(
      'SELECT id FROM tiers ORDER BY min_points ASC LIMIT 1',
    );
    if (!tier) {
      throw new ServiceUnavailableException('No tiers configured');
    }

    try {
      return await this.members.save(
        this.members.create({
          name,
          email,
          merchantId,
          tierId: Number(tier.id),
        }),
      );
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
      ) {
        throw new ConflictException(`Email ${email} is already registered`);
      }
      throw error;
    }
  }
}
