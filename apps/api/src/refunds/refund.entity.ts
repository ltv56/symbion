import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('refunds')
export class Refund {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'merchant_id', type: 'bigint', unsigned: true })
  merchantId!: number;

  @Column({ name: 'order_id', type: 'bigint', unsigned: true })
  orderId!: number;

  @Column({ name: 'idempotency_key', type: 'varchar' })
  idempotencyKey!: string;

  @Column({ type: 'bigint', unsigned: true })
  amount!: number;

  @Column({ name: 'points_deducted', type: 'bigint', unsigned: true })
  pointsDeducted!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
