import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity('tiers')
export class Tier {
  @PrimaryGeneratedColumn({ type: 'bigint', unsigned: true })
  id!: number;

  @Column({ type: 'varchar' })
  name!: string;

  @Column({ name: 'min_points', type: 'int', unsigned: true })
  minPoints!: number;

  // The driver returns DECIMAL as a string; the API exposes a number.
  @Column({
    name: 'earn_rate',
    type: 'decimal',
    precision: 5,
    scale: 2,
    transformer: {
      to: (value: number) => value,
      from: (value: string) => Number(value),
    },
  })
  earnRate!: number;
}
