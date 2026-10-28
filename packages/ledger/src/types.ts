// ids are strings because MySQL BIGINT can be bigger than Number.MAX_SAFE_INTEGER.
// `remaining` is what is not spent yet.
export type Lot = {
  id: string;
  merchantId: string;
  memberId: string;
  points: number;
  remaining: number;
  expiresAt: Date | null;
  idempotencyKey: string;
  createdAt: Date;
};

export type EarnInput = {
  merchantId: string;
  memberId: string;
  points: number;
  idempotencyKey: string;
  expiresAt?: Date | null;
  now: Date;
};

export type SpendInput = {
  merchantId: string;
  memberId: string;
  points: number;
  now: Date;
  idempotencyKey: string;
};

export type SpendResult = {
  consumed: { lotId: string; points: number }[];
  debt: number;
};

// `duplicate` is true when the key was already used and `lot` is the original one.
export type EarnResult = {
  lot: Lot;
  duplicate: boolean;
};
