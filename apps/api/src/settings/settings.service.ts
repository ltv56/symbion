import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProgramSettings } from './program-settings.entity';

export interface SettingsView {
  pointValueVnd: number;
}

type BelowFloor = {
  id: number;
  title: string;
  face_value: number;
  points_price: number;
};

const NAMED_VOUCHERS = 5;

@Injectable()
export class SettingsService {
  constructor(
    @InjectRepository(ProgramSettings)
    private readonly settings: Repository<ProgramSettings>,
  ) {}

  async get(): Promise<SettingsView> {
    const { pointValueVnd } = await this.settings.findOneByOrFail({ id: 1 });
    return { pointValueVnd };
  }

  // Lock the row first: a voucher being created takes a shared lock and waits.
  async update(pointValueVnd: number): Promise<SettingsView> {
    return this.settings.manager.transaction(async (tx) => {
      await tx.findOneOrFail(ProgramSettings, {
        where: { id: 1 },
        lock: { mode: 'pessimistic_write' },
      });

      // DECIMAL: points_price x value can pass BIGINT
      const below: BelowFloor[] = await tx.query(
        `SELECT id, title, face_value, points_price FROM vouchers
         WHERE status = 'active' AND valid_until > ?
           AND face_value < CAST(points_price AS DECIMAL(40, 0)) * ?
         ORDER BY id`,
        [new Date(), pointValueVnd],
      );
      if (below.length > 0) {
        throw new ConflictException(floorMessage(pointValueVnd, below));
      }

      await tx.update(ProgramSettings, { id: 1 }, { pointValueVnd });
      return { pointValueVnd };
    });
  }
}

function floorMessage(value: number, below: BelowFloor[]): string {
  const named = below
    .slice(0, NAMED_VOUCHERS)
    .map(
      (v) =>
        `#${v.id} "${v.title}" (${v.points_price} points x ${value} VND > ${v.face_value})`,
    )
    .join(', ');
  const rest =
    below.length > NAMED_VOUCHERS
      ? `, and ${below.length - NAMED_VOUCHERS} more`
      : '';
  const count = `${below.length} voucher${below.length === 1 ? '' : 's'}`;
  return `Point value ${value} puts ${count} under their floor: ${named}${rest}`;
}
