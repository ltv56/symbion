import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
  ): Promise<Order> {
    const member = await this.members.findOneBy({ email: memberEmail });
    if (!member) {
      throw new NotFoundException(`Member ${memberEmail} not found`);
    }

    return this.orders.save(
      this.orders.create({
        merchantId,
        memberId: member.id,
        idempotencyKey,
        amount: amount.toFixed(2),
      }),
    );
  }
}
