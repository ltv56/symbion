import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { Member } from '../members/member.entity';
import { Order } from './order.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order) private readonly orders: Repository<Order>,
    @InjectRepository(Member) private readonly members: Repository<Member>,
  ) {}

  async create(
    merchantId: number,
    idempotencyKey: string,
    memberEmail: string,
    amount: number,
  ): Promise<{ order: Order; created: boolean }> {
    const member = await this.members.findOneBy({ email: memberEmail });
    if (!member) {
      throw new NotFoundException(`Member ${memberEmail} not found`);
    }

    // Insert first, don't SELECT first: parallel retries would both see "not found".
    try {
      const order = await this.orders.save(
        this.orders.create({
          merchantId,
          memberId: member.id,
          idempotencyKey,
          amount: amount.toFixed(2),
        }),
      );
      return { order, created: true };
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error.driverError as { code?: string }).code === 'ER_DUP_ENTRY'
      ) {
        const order = await this.orders.findOneByOrFail({
          merchantId,
          idempotencyKey,
        });
        return { order, created: false };
      }
      throw error;
    }
  }
}
