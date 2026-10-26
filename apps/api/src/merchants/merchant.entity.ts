import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('merchants')
export class Merchant {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  // select: false keeps the hash out of every read; it is only ever written.
  @Column({ name: 'api_key_hash', type: 'char', length: 64, select: false })
  apiKeyHash!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
