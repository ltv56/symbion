export type MerchantKey = 'shop' | 'cafe' | 'bakery' | 'book' | 'pho' | 'tea';

export const MERCHANTS: {
  key: MerchantKey;
  name: string;
  keySuffix: string;
  address: string;
}[] = [
  {
    key: 'shop',
    name: 'Tạp Hoá Cây Me',
    keySuffix: '',
    address: '85 Lê Lợi, Quận 1, TP. Hồ Chí Minh',
  },
  {
    key: 'cafe',
    name: 'Cà Phê Hẻm Xanh',
    keySuffix: '-cafe',
    address: '12 Nguyễn Huệ, Quận 1, TP. Hồ Chí Minh',
  },
  {
    key: 'bakery',
    name: 'Tiệm Bánh Nắng Mai',
    keySuffix: '-bakery',
    address: '240 Pasteur, Quận 3, TP. Hồ Chí Minh',
  },
  {
    key: 'book',
    name: 'Hiệu Sách Gác Nhỏ',
    keySuffix: '-book',
    address: '18 Nguyễn Văn Bình, Quận 1, TP. Hồ Chí Minh',
  },
  {
    key: 'pho',
    name: 'Quán Phở Gánh',
    keySuffix: '-pho',
    address: '102 Võ Văn Tần, Quận 3, TP. Hồ Chí Minh',
  },
  {
    key: 'tea',
    name: 'Trà Sữa Mây Chiều',
    keySuffix: '-tea',
    address: '9 Lý Tự Trọng, Quận 1, TP. Hồ Chí Minh',
  },
];

export const DEMO_MEMBERS = [
  'Nguyễn Minh Anh',
  'Trần Quốc Bảo',
  'Lê Thu Hà',
  'Phạm Gia Huy',
  'Võ Khánh Linh',
  'Đặng Hoàng Nam',
  'Bùi Ngọc Trâm',
  'Hoàng Đức Thịnh',
  'Ngô Thảo Vy',
  'Đỗ Anh Tuấn',
].map((name, index) => ({ name, email: memberEmail(index + 1) }));

export function memberEmail(n: number): string {
  return `member${n}@demo.example`;
}

function steps(finish: string): string[] {
  return [
    'Đổi voucher trong ứng dụng.',
    'Đưa mã cho nhân viên tại quầy.',
    finish,
  ];
}

export type DemoVoucher = {
  merchant: MerchantKey;
  title: string;
  description: string;
  steps: string[];
  faceValue: number;
  pointsPrice: number;
  stock: number;
  endsInDays?: number;
  stopped?: boolean;
};

export const VOUCHERS: DemoVoucher[] = [
  {
    merchant: 'shop',
    title: 'Giảm 20.000đ',
    description:
      'Giảm 20.000đ cho một hoá đơn. Không dùng chung với ưu đãi khác.',
    steps: steps('Nhân viên xác nhận mã và trừ 20.000đ vào hoá đơn.'),
    faceValue: 20_000,
    pointsPrice: 150,
    stock: 50,
  },
  {
    merchant: 'shop',
    title: 'Giảm 50.000đ',
    description:
      'Giảm 50.000đ cho một hoá đơn từ 200.000đ. Không dùng chung với ưu đãi khác.',
    steps: steps('Nhân viên xác nhận mã và trừ 50.000đ vào hoá đơn.'),
    faceValue: 50_000,
    pointsPrice: 400,
    stock: 30,
  },
  {
    merchant: 'shop',
    title: 'Giảm 100.000đ',
    description:
      'Giảm 100.000đ cho một hoá đơn. Không dùng chung với ưu đãi khác.',
    steps: steps('Nhân viên xác nhận mã và trừ 100.000đ vào hoá đơn.'),
    faceValue: 100_000,
    pointsPrice: 800,
    stock: 20,
  },
  {
    merchant: 'cafe',
    title: 'Cà phê miễn phí',
    description:
      'Một ly cà phê miễn phí, nóng hoặc đá, size nào cũng được. Mỗi lượt ghé quán dùng một voucher.',
    steps: steps('Nhân viên xác nhận mã và phục vụ cà phê cho bạn.'),
    faceValue: 35_000,
    pointsPrice: 300,
    stock: 50,
  },
  {
    merchant: 'cafe',
    title: 'Combo cà phê + bánh',
    description: 'Một ly cà phê và một phần bánh ngọt trong ngày.',
    steps: steps('Nhân viên xác nhận mã và phục vụ combo cho bạn.'),
    faceValue: 70_000,
    pointsPrice: 580,
    stock: 3,
  },
  {
    merchant: 'cafe',
    title: 'Nâng cấp size L miễn phí',
    description: 'Nâng cỡ ly lên size L không tính thêm phí cho một đồ uống.',
    steps: steps('Nhân viên xác nhận mã và nâng cỡ ly cho bạn.'),
    faceValue: 5_000,
    pointsPrice: 40,
    stock: 100,
  },
  {
    merchant: 'bakery',
    title: 'Bánh croissant miễn phí',
    description: 'Một chiếc bánh croissant bơ nướng trong ngày.',
    steps: steps('Nhân viên xác nhận mã và đưa bánh cho bạn.'),
    faceValue: 30_000,
    pointsPrice: 250,
    stock: 40,
  },
  {
    merchant: 'bakery',
    title: 'Hộp bánh 6 chiếc',
    description: 'Một hộp sáu chiếc bánh ngọt do tiệm chọn theo ngày.',
    steps: steps('Nhân viên xác nhận mã và đóng hộp bánh cho bạn.'),
    faceValue: 120_000,
    pointsPrice: 950,
    stock: 15,
  },
  {
    merchant: 'book',
    title: 'Giảm 30.000đ sách',
    description:
      'Giảm 30.000đ cho một hoá đơn từ 150.000đ. Không áp dụng cho sách đang giảm giá.',
    steps: steps('Nhân viên xác nhận mã và trừ 30.000đ vào hoá đơn.'),
    faceValue: 30_000,
    pointsPrice: 240,
    stock: 40,
  },
  {
    merchant: 'book',
    title: 'Sổ tay bìa da',
    description: 'Một cuốn sổ tay bìa da, giấy kem 120 trang. Số lượng có hạn.',
    steps: steps('Nhân viên xác nhận mã và trao sổ tay cho bạn.'),
    faceValue: 90_000,
    pointsPrice: 720,
    stock: 1,
  },
  {
    merchant: 'pho',
    title: 'Tô phở bò tái',
    description: 'Một tô phở bò tái cỡ vừa, kèm quẩy.',
    steps: steps('Nhân viên xác nhận mã và phục vụ tô phở cho bạn.'),
    faceValue: 65_000,
    pointsPrice: 520,
    stock: 30,
  },
  {
    merchant: 'pho',
    title: 'Giảm 25.000đ tại quán',
    description:
      'Giảm 25.000đ cho hoá đơn ăn tại quán. Ưu đãi có thời hạn ngắn.',
    steps: steps('Nhân viên xác nhận mã và trừ 25.000đ vào hoá đơn.'),
    faceValue: 25_000,
    pointsPrice: 200,
    stock: 40,
    endsInDays: 9,
  },
  {
    merchant: 'tea',
    title: 'Trà sữa size M',
    description: 'Một ly trà sữa size M, chọn vị bất kỳ trong thực đơn.',
    steps: steps('Nhân viên xác nhận mã và pha ly trà sữa cho bạn.'),
    faceValue: 45_000,
    pointsPrice: 380,
    stock: 50,
  },
  {
    merchant: 'tea',
    title: 'Topping trân châu miễn phí',
    description: 'Thêm một phần trân châu cho một đồ uống.',
    steps: steps('Nhân viên xác nhận mã và thêm trân châu cho bạn.'),
    faceValue: 10_000,
    pointsPrice: 80,
    stock: 100,
  },
  {
    merchant: 'tea',
    title: 'Trà sữa mùa hè',
    description: 'Ly trà sữa vị trái cây theo mùa. Voucher đã ngừng phát hành.',
    steps: steps('Nhân viên xác nhận mã và pha ly trà cho bạn.'),
    faceValue: 40_000,
    pointsPrice: 340,
    stock: 20,
    stopped: true,
  },
];

// [member number, voucher title]
export const FAVORITES: [number, string][] = [
  [1, 'Cà phê miễn phí'],
  [1, 'Trà sữa size M'],
  [3, 'Combo cà phê + bánh'],
  [3, 'Hộp bánh 6 chiếc'],
  [3, 'Tô phở bò tái'],
  [7, 'Giảm 30.000đ sách'],
  [10, 'Giảm 100.000đ'],
];

// `month` counts calendar months back from now (1 = last month); `daysAgo` counts days back.
export type When = { month: number; day: number } | { daysAgo: number };

export type Step =
  | {
      kind: 'order';
      id: string;
      when: When;
      merchant: MerchantKey;
      member: number;
      amount: number;
    }
  | {
      kind: 'redeem';
      id: string;
      when: When;
      member: number;
      voucher: string;
      confirm: boolean;
    }
  | { kind: 'refund'; id: string; when: When; order: string; amount: number };

const ago = (daysAgo: number): When => ({ daysAgo });
const at = (month: number, day: number): When => ({ month, day });

// Orders that get a refund stay inside the 90-day window: last month, or two months back from day 8.
const regularOrders = (member: number, count: number): Step[] =>
  Array.from({ length: count }, (_, i) => ({
    kind: 'order',
    id: `${member}g${i}`,
    when: at(5 - Math.floor(i / 11), 2 + (i % 11) * 2),
    merchant: MERCHANTS[i % MERCHANTS.length]!.key,
    member,
    amount: 100_000 + (i % 5) * 50_000,
  }));

export const STEPS: Step[] = [
  // 1: Bronze, small history, one refund
  {
    kind: 'order',
    id: '1a',
    when: at(1, 3),
    merchant: 'shop',
    member: 1,
    amount: 500_000,
  },
  { kind: 'refund', id: '1b', when: at(1, 25), order: '1a', amount: 250_000 },
  {
    kind: 'order',
    id: '1c',
    when: at(4, 10),
    merchant: 'cafe',
    member: 1,
    amount: 180_000,
  },
  {
    kind: 'order',
    id: '1d',
    when: at(3, 15),
    merchant: 'cafe',
    member: 1,
    amount: 120_000,
  },
  {
    kind: 'order',
    id: '1e',
    when: at(2, 12),
    merchant: 'shop',
    member: 1,
    amount: 150_000,
  },
  {
    kind: 'order',
    id: '1f',
    when: at(1, 8),
    merchant: 'pho',
    member: 1,
    amount: 90_000,
  },
  {
    kind: 'redeem',
    id: '1g',
    when: at(1, 12),
    member: 1,
    voucher: 'Nâng cấp size L miễn phí',
    confirm: true,
  },

  // 2: Silver, points that expire in about 15 days
  {
    kind: 'order',
    id: '2a',
    when: ago(350),
    merchant: 'shop',
    member: 2,
    amount: 2_000_000,
  },
  {
    kind: 'order',
    id: '2b',
    when: at(4, 14),
    merchant: 'bakery',
    member: 2,
    amount: 300_000,
  },
  {
    kind: 'order',
    id: '2c',
    when: at(3, 9),
    merchant: 'pho',
    member: 2,
    amount: 250_000,
  },
  {
    kind: 'order',
    id: '2d',
    when: at(1, 5),
    merchant: 'cafe',
    member: 2,
    amount: 2_000_000,
  },
  {
    kind: 'order',
    id: '2e',
    when: at(1, 12),
    merchant: 'shop',
    member: 2,
    amount: 400_000,
  },
  {
    kind: 'redeem',
    id: '2f',
    when: at(1, 20),
    member: 2,
    voucher: 'Giảm 20.000đ',
    confirm: true,
  },

  // 3: Gold, more history rows than one page, a valid code
  ...regularOrders(3, 52),
  { kind: 'refund', id: '3a', when: at(1, 3), order: '3g40', amount: 40_000 },
  { kind: 'refund', id: '3b', when: at(1, 20), order: '3g48', amount: 100_000 },
  {
    kind: 'redeem',
    id: '3c',
    when: at(2, 20),
    member: 3,
    voucher: 'Giảm 50.000đ',
    confirm: true,
  },
  {
    kind: 'redeem',
    id: '3d',
    when: at(1, 14),
    member: 3,
    voucher: 'Combo cà phê + bánh',
    confirm: true,
  },
  {
    kind: 'redeem',
    id: '3e',
    when: ago(3),
    member: 3,
    voucher: 'Nâng cấp size L miễn phí',
    confirm: false,
  },

  // 4: refund after the points were spent, negative balance
  {
    kind: 'order',
    id: '4a',
    when: at(3, 12),
    merchant: 'cafe',
    member: 4,
    amount: 100_000,
  },
  {
    kind: 'order',
    id: '4b',
    when: at(1, 6),
    merchant: 'shop',
    member: 4,
    amount: 2_000_000,
  },
  {
    kind: 'redeem',
    id: '4c',
    when: at(1, 10),
    member: 4,
    voucher: 'Giảm 20.000đ',
    confirm: true,
  },
  { kind: 'refund', id: '4d', when: at(1, 14), order: '4b', amount: 2_000_000 },

  // 5: a code that expired unused
  {
    kind: 'order',
    id: '5a',
    when: at(3, 10),
    merchant: 'pho',
    member: 5,
    amount: 800_000,
  },
  {
    kind: 'redeem',
    id: '5b',
    when: ago(45),
    member: 5,
    voucher: 'Nâng cấp size L miễn phí',
    confirm: false,
  },
  {
    kind: 'order',
    id: '5c',
    when: ago(8),
    merchant: 'tea',
    member: 5,
    amount: 150_000,
  },

  // 6: points that already expired
  {
    kind: 'order',
    id: '6a',
    when: ago(400),
    merchant: 'shop',
    member: 6,
    amount: 800_000,
  },
  {
    kind: 'order',
    id: '6b',
    when: ago(380),
    merchant: 'book',
    member: 6,
    amount: 500_000,
  },
  {
    kind: 'order',
    id: '6c',
    when: ago(20),
    merchant: 'tea',
    member: 6,
    amount: 300_000,
  },

  // 7: Silver just under Gold
  {
    kind: 'order',
    id: '7a',
    when: at(5, 10),
    merchant: 'shop',
    member: 7,
    amount: 1_500_000,
  },
  {
    kind: 'order',
    id: '7b',
    when: at(4, 6),
    merchant: 'cafe',
    member: 7,
    amount: 900_000,
  },
  {
    kind: 'redeem',
    id: '7c',
    when: at(4, 20),
    member: 7,
    voucher: 'Topping trân châu miễn phí',
    confirm: true,
  },
  {
    kind: 'order',
    id: '7d',
    when: at(3, 18),
    merchant: 'bakery',
    member: 7,
    amount: 1_100_000,
  },
  {
    kind: 'order',
    id: '7e',
    when: at(2, 9),
    merchant: 'pho',
    member: 7,
    amount: 700_000,
  },
  {
    kind: 'order',
    id: '7f',
    when: at(1, 15),
    merchant: 'tea',
    member: 7,
    amount: 650_000,
  },

  // 8: Silver that falls out of the 12-month window soon
  {
    kind: 'order',
    id: '8a',
    when: ago(345),
    merchant: 'shop',
    member: 8,
    amount: 1_200_000,
  },
  {
    kind: 'order',
    id: '8b',
    when: ago(100),
    merchant: 'cafe',
    member: 8,
    amount: 80_000,
  },

  // 9: no events

  // 10: Gold, three partial refunds of one order
  {
    kind: 'order',
    id: 'xa',
    when: at(4, 8),
    merchant: 'shop',
    member: 10,
    amount: 7_000_000,
  },
  {
    kind: 'order',
    id: 'xb',
    when: at(2, 10),
    merchant: 'cafe',
    member: 10,
    amount: 2_000_000,
  },
  { kind: 'refund', id: 'xc', when: at(1, 2), order: 'xb', amount: 400_000 },
  { kind: 'refund', id: 'xd', when: at(1, 9), order: 'xb', amount: 600_000 },
  { kind: 'refund', id: 'xe', when: at(1, 17), order: 'xb', amount: 300_000 },
  {
    kind: 'redeem',
    id: 'xf',
    when: at(1, 21),
    member: 10,
    voucher: 'Sổ tay bìa da',
    confirm: true,
  },
];
