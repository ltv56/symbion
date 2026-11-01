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

const SHOP = 'Demo Shop';
const CAFE = 'Demo Cafe';
const SHOP_ADDRESS = '85 Lê Lợi, Quận 1, TP. Hồ Chí Minh';
const CAFE_ADDRESS = '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh';
const VIETNAM_OFFSET_MS = 7 * 3_600_000;
const CODE_LIFETIME_MS = 30 * 86_400_000;

// Same as OrdersModule: 1 point per 10,000 VND at multiplier 1.0, at most 10,000 points per order.
const EARNING_BASE_UNIT_VND = 10_000;
const MAX_POINTS_PER_ORDER = 10_000;

const VOUCHERS = [
  {
    merchant: CAFE,
    title: 'Cà phê miễn phí',
    description:
      'Một ly cà phê miễn phí, nóng hoặc đá, size nào cũng được. Mỗi lượt ghé quán dùng một voucher.',
    steps: [
      'Đổi voucher trong ứng dụng.',
      'Đưa mã cho nhân viên tại quầy.',
      'Nhân viên xác nhận mã và phục vụ cà phê cho bạn.',
    ],
    faceValue: 35_000,
    pointsPrice: 300,
    stock: 50,
  },
  {
    merchant: SHOP,
    title: 'Giảm 20.000đ',
    description:
      'Giảm 20.000đ cho một hoá đơn. Không dùng chung với ưu đãi khác.',
    steps: [
      'Đổi voucher trong ứng dụng.',
      'Đưa mã cho nhân viên trước khi thanh toán.',
      'Nhân viên xác nhận mã và trừ 20.000đ vào hoá đơn.',
    ],
    faceValue: 20_000,
    pointsPrice: 150,
    stock: 50,
  },
  {
    merchant: SHOP,
    title: 'Giảm 100.000đ',
    description:
      'Giảm 100.000đ cho một hoá đơn. Không dùng chung với ưu đãi khác.',
    steps: [
      'Đổi voucher trong ứng dụng.',
      'Đưa mã cho nhân viên trước khi thanh toán.',
      'Nhân viên xác nhận mã và trừ 100.000đ vào hoá đơn.',
    ],
    faceValue: 100_000,
    pointsPrice: 800,
    stock: 20,
  },
];

type Step =
  | {
      kind: 'order';
      id: string;
      day: number;
      merchant: string;
      member: string;
      amount: number;
    }
  | {
      kind: 'redeem';
      id: string;
      day: number;
      member: string;
      voucher: string;
      confirm: boolean;
    }
  | { kind: 'refund'; id: string; day: number; order: string; amount: number };

const MEMBER_1 = 'member1@demo.example';
const MEMBER_2 = 'member2@demo.example';
const MEMBER_3 = 'member3@demo.example';

// Days of the previous month, in order. The amounts walk member 2 to Silver and member 3 to Gold.
const STEPS: Step[] = [
  {
    kind: 'order',
    id: 'o1',
    day: 3,
    merchant: SHOP,
    member: MEMBER_1,
    amount: 500_000,
  },
  {
    kind: 'order',
    id: 'o2',
    day: 5,
    merchant: CAFE,
    member: MEMBER_2,
    amount: 2_000_000,
  },
  {
    kind: 'order',
    id: 'o3',
    day: 8,
    merchant: SHOP,
    member: MEMBER_3,
    amount: 6_000_000,
  },
  {
    kind: 'order',
    id: 'o4',
    day: 12,
    merchant: SHOP,
    member: MEMBER_2,
    amount: 400_000,
  },
  {
    kind: 'order',
    id: 'o5',
    day: 15,
    merchant: CAFE,
    member: MEMBER_3,
    amount: 1_000_000,
  },
  {
    kind: 'redeem',
    id: 'r1',
    day: 18,
    member: MEMBER_3,
    voucher: 'Cà phê miễn phí',
    confirm: true,
  },
  {
    kind: 'redeem',
    id: 'r2',
    day: 20,
    member: MEMBER_2,
    voucher: 'Giảm 20.000đ',
    confirm: true,
  },
  {
    kind: 'redeem',
    id: 'r3',
    day: 22,
    member: MEMBER_3,
    voucher: 'Giảm 20.000đ',
    confirm: false,
  },
  { kind: 'refund', id: 'f1', day: 25, order: 'o1', amount: 250_000 },
];

// Entities and UTC for the services below. The shared data source has neither.
export function historyDataSource(base: DataSource): DataSource {
  return new DataSource({
    ...base.options,
    timezone: 'Z',
    entities: [Order, Redemption, Refund],
  } as DataSourceOptions);
}

// Replays last month through the real services, then moves the rows into that month.
// Everything is keyed by the month, so a second run changes nothing.
export async function seedDemoHistory(
  ds: DataSource,
  apiKey: string,
  now: Date,
): Promise<{ month: string; steps: number }> {
  const vnNow = new Date(now.getTime() + VIETNAM_OFFSET_MS);
  const year = vnNow.getUTCFullYear();
  const monthIndex = vnNow.getUTCMonth() - 1;
  const monthStart = new Date(Date.UTC(year, monthIndex, 1));
  const month = `${monthStart.getUTCFullYear()}-${String(monthStart.getUTCMonth() + 1).padStart(2, '0')}`;
  // 10:00 in Vietnam
  const dayAt = (day: number) =>
    new Date(Date.UTC(year, monthIndex, day, 10) - VIETNAM_OFFSET_MS);

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

  const merchantIds = new Map<string, number>();
  merchantIds.set(SHOP, await merchantId(ds, SHOP, apiKey, SHOP_ADDRESS));
  merchantIds.set(
    CAFE,
    await merchantId(ds, CAFE, `${apiKey}-cafe`, CAFE_ADDRESS),
  );

  const validUntil = addMonths(now, 12);
  const voucherIds = new Map<string, number>();
  for (const voucher of VOUCHERS) {
    const merchant = merchantIds.get(voucher.merchant)!;
    voucherIds.set(
      voucher.title,
      await upsertVoucher(ds, merchant, voucher, validUntil),
    );
  }

  const placed = new Map<string, { id: number; merchantId: number }>();
  for (const step of STEPS) {
    const when = dayAt(step.day);
    const key = `demo-${month}-${step.id}`;

    if (step.kind === 'order') {
      const merchant = merchantIds.get(step.merchant)!;
      const { order } = await orders.create(
        merchant,
        key,
        step.member,
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
      const voucherId = voucherIds.get(step.voucher)!;
      const voucherMerchant = merchantIds.get(
        VOUCHERS.find((v) => v.title === step.voucher)!.merchant,
      )!;
      const { redemption } = await redemptions.redeem(
        { email: step.member },
        voucherId,
        key,
      );
      const redemptionId = Number(redemption.id);
      const codeExpiry = Math.min(
        when.getTime() + CODE_LIFETIME_MS,
        validUntil.getTime(),
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
      if (step.confirm) {
        await redemptions.confirm(voucherMerchant, redemption.code);
        await ds.query(`UPDATE redemptions SET used_at = ? WHERE id = ?`, [
          when,
          redemptionId,
        ]);
      }
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
  return { month, steps: STEPS.length };
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

// Stock is set once; a rerun keeps the voucher open and refreshes its description and steps.
async function upsertVoucher(
  ds: DataSource,
  merchant: number,
  voucher: (typeof VOUCHERS)[number],
  validUntil: Date,
): Promise<number> {
  const [existing] = await ds.query(
    'SELECT id FROM vouchers WHERE merchant_id = ? AND title = ?',
    [merchant, voucher.title],
  );
  if (existing) {
    await ds.query(
      `UPDATE vouchers SET valid_until = ?, status = 'active', description = ?, steps = ? WHERE id = ?`,
      [
        validUntil,
        voucher.description,
        JSON.stringify(voucher.steps),
        existing.id,
      ],
    );
    return Number(existing.id);
  }
  const result = await ds.query(
    `INSERT INTO vouchers (merchant_id, title, description, steps, face_value, points_price, stock, valid_until)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      merchant,
      voucher.title,
      voucher.description,
      JSON.stringify(voucher.steps),
      voucher.faceValue,
      voucher.pointsPrice,
      voucher.stock,
      validUntil,
    ],
  );
  return Number(result.insertId);
}
