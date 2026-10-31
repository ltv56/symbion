import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

export type RedemptionStatus = 'issued';

@Entity('redemptions')
export class Redemption {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ name: 'merchant_id', type: 'bigint', unsigned: true })
  merchantId!: number;

  @Column({ name: 'member_id', type: 'bigint', unsigned: true })
  memberId!: number;

  @Column({ name: 'voucher_id', type: 'bigint', unsigned: true })
  voucherId!: number;

  @Column({ type: 'varchar' })
  code!: string;

  @Column({ type: 'bigint', unsigned: true })
  points!: number;

  @Column({ name: 'point_value_vnd', type: 'int', unsigned: true })
  pointValueVnd!: number;

  @Column({ type: 'varchar', default: 'issued' })
  status!: RedemptionStatus;

  @Column({ name: 'client_key', type: 'varchar' })
  clientKey!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
