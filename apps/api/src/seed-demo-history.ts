import { createHash } from 'node:crypto';
import { Ledger } from '@symbion/ledger';
import { DataSource, type DataSourceOptions, EntityManager } from 'typeorm';
import { addMonths } from './common/add-months';
import { TierEarningStrategy } from './earning/tier-earning.strategy';
import { MysqlLedgerStorage } from './ledger/mysql-ledger.storage';
import { Order } from './orders/order.entity';
import { OrdersService } from './orders/orders.service';
import { Redemption } from './redemptions/redemption.entity';
import { RedemptionsService } from './redemptions/redemptions.service';
import { Refund } from './refunds/refund.entity';
import { RefundsService } from './refunds/refunds.service';
import {
  type DemoVoucher,
  FAVORITES,
  MERCHANTS,
  type MerchantKey,
  memberEmail,
  STEPS,
  VOUCHERS,
  type When,
} from './seed-demo-data';

const VIETNAM_OFFSET_MS = 7 * 3_600_000;
const DAY_MS = 86_400_000;
const CODE_LIFETIME_MS = 30 * DAY_MS;

// Same as OrdersModule: 1 point per 10,000 VND at multiplier 1.0, at most 10,000 points per order.
const EARNING_BASE_UNIT_VND = 10_000;
const MAX_POINTS_PER_ORDER = 10_000;

// Entities and UTC for the services below. The shared data source has neither.
export function historyDataSource(base: DataSource): DataSource {
  return new DataSource({
    ...base.options,
    timezone: 'Z',
    entities: [Order, Redemption, Refund],
  } as DataSourceOptions);
}

// 10:00 in Vietnam. `label` keys the idempotency keys: the calendar month, or `rel` for day offsets.
function resolve(when: When, now: Date): { at: Date; label: string } {
  const vnNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = vnNow.getUTCFullYear();
  const monthIndex = vnNow.getUTCMonth();
  if ('daysAgo' in when) {
    const today = Date.UTC(year, monthIndex, vnNow.getUTCDate(), 10);
    return {
      at: new Date(today - VIETNAM_OFFSET_MS - when.daysAgo * DAY_MS),
      label: 'rel',
    };
  }
  const start = new Date(Date.UTC(year, monthIndex - when.month, 1));
  const label = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return {
    at: new Date(
      Date.UTC(year, monthIndex - when.month, when.day, 10) - VIETNAM_OFFSET_MS,
    ),
    label,
  };
}

// Replays the history through the real services in time order, then moves the rows to their dates.
// Everything is keyed by the month, so a second run changes nothing.
export async function seedDemoHistory(
  ds: DataSource,
  apiKey: string,
  now: Date,
): Promise<{ month: string; steps: number }> {
  const ledger = new Ledger<EntityManager>(new MysqlLedgerStorage());
  const orders = new OrdersService(
    ds.getRepository(Order),
    ds,
    ledger,
    new TierEarningStrategy(EARNING_BASE_UNIT_VND),
    MAX_POINTS_PER_ORDER,
  );
  const redemptions = new RedemptionsService(
    ds.getRepository(Redemption),
    ds,
    ledger,
  );
  const refunds = new RefundsService(ds, ledger);

  const merchantIds = new Map<MerchantKey, number>();
  for (const merchant of MERCHANTS) {
    merchantIds.set(
      merchant.key,
      await merchantId(
        ds,
        merchant.name,
        `${apiKey}${merchant.keySuffix}`,
        merchant.address,
      ),
    );
  }

  const issued = new Map<
    string,
    { id: number; merchantId: number; validUntil: Date }
  >();
  for (const voucher of VOUCHERS) {
    const merchant = merchantIds.get(voucher.merchant)!;
    const validUntil = voucher.endsInDays
      ? new Date(now.getTime() + voucher.endsInDays * DAY_MS)
      : addMonths(now, 12);
    issued.set(voucher.title, {
      id: await upsertVoucher(ds, merchant, voucher, validUntil),
      merchantId: merchant,
      validUntil,
    });
  }
  await saveFavorites(ds, issued);

  const timeline = STEPS.map((step, index) => ({
    step,
    index,
    ...resolve(step.when, now),
  })).sort((a, b) => a.at.getTime() - b.at.getTime() || a.index - b.index);

  const placed = new Map<string, { id: number; merchantId: number }>();
  for (const { step, at: when, label } of timeline) {
    const key = `demo-${label}-${step.id}`;

    if (step.kind === 'order') {
      const merchant = merchantIds.get(step.merchant)!;
      const { order } = await orders.create(
        merchant,
        key,
        memberEmail(step.member),
        step.amount,
      );
      const orderId = Number(order.id);
      placed.set(step.id, { id: orderId, merchantId: merchant });
      await ds.query(`UPDATE orders SET created_at = ? WHERE id = ?`, [
        when,
        orderId,
      ]);
      await ds.query(
        `UPDATE ledger_lots SET created_at = ?, expires_at = ?
        WHERE type = 'earn' AND ref_type = 'order' AND ref_id = ?`,
        [when, addMonths(when, 12), orderId],
      );
    } else if (step.kind === 'redeem') {
      const voucher = issued.get(step.voucher)!;
      const { redemption } = await redemptions.redeem(
        { email: memberEmail(step.member) },
        voucher.id,
        key,
      );
      const redemptionId = Number(redemption.id);
      // Confirm first: a code dated in the past would already count as expired
      if (step.confirm) {
        await redemptions.confirm(voucher.merchantId, redemption.code);
        await ds.query(`UPDATE redemptions SET used_at = ? WHERE id = ?`, [
          when,
          redemptionId,
        ]);
      }
      const codeExpiry = Math.min(
        when.getTime() + CODE_LIFETIME_MS,
        voucher.validUntil.getTime(),
      );
      await ds.query(
        `UPDATE redemptions SET created_at = ?, expires_at = ? WHERE id = ?`,
        [when, new Date(codeExpiry), redemptionId],
      );
      await ds.query(
        `UPDATE ledger_lots SET created_at = ?
        WHERE type = 'spend' AND ref_type = 'redemption' AND ref_id = ?`,
        [when, redemptionId],
      );
    } else {
      const order = placed.get(step.order)!;
      const { refund } = await refunds.refund(
        order.merchantId,
        order.id,
        step.amount,
        key,
      );
      const refundId = Number(refund.id);
      await ds.query(`UPDATE refunds SET created_at = ? WHERE id = ?`, [
        when,
        refundId,
      ]);
      await ds.query(
        `UPDATE ledger_lots SET created_at = ?
        WHERE type = 'spend' AND ref_type = 'refund' AND ref_id = ?`,
        [when, refundId],
      );
    }
  }
  return {
    month: resolve({ month: 1, day: 1 }, now).label,
    steps: STEPS.length,
  };
}

// Matched by api key hash, like the demo merchant in seed-demo.ts.
async function merchantId(
  ds: DataSource,
  name: string,
  apiKey: string,
  address: string,
): Promise<number> {
  const apiKeyHash = createHash('sha256').update(apiKey).digest('hex');
  await ds.query(
    `INSERT INTO merchants (name, address, api_key_hash) VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE name = VALUES(name), address = VALUES(address)`,
    [name, address, apiKeyHash],
  );
  const [row] = await ds.query(
    'SELECT id FROM merchants WHERE api_key_hash = ?',
    [apiKeyHash],
  );
  return Number(row.id);
}

// Stock is set once; a rerun keeps the voucher's state and refreshes its text and validity.
async function upsertVoucher(
  ds: DataSource,
  merchant: number,
  voucher: DemoVoucher,
  validUntil: Date,
): Promise<number> {
  const status = voucher.stopped ? 'expired' : 'active';
  const [existing] = await ds.query(
    'SELECT id FROM vouchers WHERE merchant_id = ? AND title = ?',
    [merchant, voucher.title],
  );
  if (existing) {
    await ds.query(
      `UPDATE vouchers SET valid_until = ?, status = ?, description = ?, steps = ? WHERE id = ?`,
      [
        validUntil,
        status,
        voucher.description,
        JSON.stringify(voucher.steps),
        existing.id,
      ],
    );
    return Number(existing.id);
  }
  const result = await ds.query(
    `INSERT INTO vouchers (merchant_id, title, description, steps, face_value, points_price, stock, valid_until, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      merchant,
      voucher.title,
      voucher.description,
      JSON.stringify(voucher.steps),
      voucher.faceValue,
      voucher.pointsPrice,
      voucher.stock,
      validUntil,
      status,
    ],
  );
  return Number(result.insertId);
}

async function saveFavorites(
  ds: DataSource,
  issued: Map<string, { id: number; merchantId: number }>,
): Promise<void> {
  for (const [member, title] of FAVORITES) {
    const voucher = issued.get(title)!;
    await ds.query(
      `INSERT INTO voucher_favorites (member_id, voucher_id, merchant_id)
      SELECT m.id, ?, ? FROM members m WHERE m.email = ?
      ON DUPLICATE KEY UPDATE member_id = voucher_favorites.member_id`,
      [voucher.id, voucher.merchantId, memberEmail(member)],
    );
  }
}
