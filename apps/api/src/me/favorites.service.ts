import { Injectable, NotFoundException } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { VouchersService } from '../vouchers/vouchers.service';

export type Favorite = {
  voucherId: number;
  createdAt: Date;
};

@Injectable()
export class FavoritesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly vouchers: VouchersService,
  ) {}

  // Listed vouchers only, like GET /vouchers/:id
  async add(memberId: number, voucherId: number): Promise<void> {
    const voucher = await this.vouchers.findActive(voucherId);
    if (!voucher) {
      throw new NotFoundException(`Voucher with id ${voucherId} not found`);
    }
    // No-op update keeps the first created_at; the primary key settles parallel calls
    await this.dataSource.query(
      `INSERT INTO voucher_favorites (member_id, voucher_id, merchant_id)
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE member_id = member_id`,
      [memberId, voucherId, voucher.merchantId],
    );
  }

  async remove(memberId: number, voucherId: number): Promise<void> {
    await this.dataSource.query(
      `DELETE FROM voucher_favorites WHERE member_id = ? AND voucher_id = ?`,
      [memberId, voucherId],
    );
  }

  async list(memberId: number): Promise<Favorite[]> {
    const rows: { voucher_id: number; created_at: Date }[] =
      await this.dataSource.query(
        `SELECT f.voucher_id, f.created_at
        FROM voucher_favorites f JOIN vouchers v ON v.id = f.voucher_id
        WHERE f.member_id = ? AND v.status = 'active' AND v.valid_until > ?
        ORDER BY f.created_at DESC, f.voucher_id DESC`,
        [memberId, new Date()],
      );
    return rows.map((row) => ({
      voucherId: Number(row.voucher_id),
      createdAt: row.created_at,
    }));
  }
}
