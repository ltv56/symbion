import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type VoucherStatus = 'active' | 'expired';

@Entity('vouchers')
export class Voucher {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'merchant_id', type: 'bigint', unsigned: true })
  merchantId!: number;

  @Column({ type: 'varchar' })
  title!: string;

  @Column({ name: 'face_value', type: 'bigint', unsigned: true })
  faceValue!: number;

  @Column({ name: 'points_price', type: 'bigint', unsigned: true })
  pointsPrice!: number;

  @Column({ type: 'int', unsigned: true })
  stock!: number;

  @Column({ name: 'valid_until', type: 'timestamp' })
  validUntil!: Date;

  @Column({ type: 'varchar', default: 'active' })
  status!: VoucherStatus;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
