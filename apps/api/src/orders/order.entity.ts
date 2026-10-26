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

  @Column({ type: 'decimal', precision: 12, scale: 2 })
  amount!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
