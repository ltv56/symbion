import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'merchant_id', type: 'bigint', unsigned: true })
  merchantId!: number;

  @Column({ name: 'member_id', type: 'bigint', unsigned: true })
  memberId!: number;

  @Column({ name: 'idempotency_key', type: 'varchar' })
  idempotencyKey!: string;

  @Column({ type: 'bigint', unsigned: true })
  amount!: number;

  @Column({
    name: 'request_hash',
    type: 'char',
    length: 64,
    nullable: true,
    select: false,
  })
  requestHash?: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
