import { Column, Entity, PrimaryColumn } from 'typeorm';

// Single row, id = 1
@Entity('program_settings')
export class ProgramSettings {
  @PrimaryColumn({ type: 'tinyint', unsigned: true })
  id!: number;

  @Column({ name: 'point_value_vnd', type: 'int', unsigned: true })
  pointValueVnd!: number;
}
