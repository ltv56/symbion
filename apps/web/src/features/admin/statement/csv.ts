import type { Statement } from './useStatement';

const HEADER = [
  'month',
  'merchant_id',
  'merchant',
  'point_value_vnd',
  'earned_points',
  'earned_vnd',
  'refunded_points',
  'refunded_vnd',
  'redeemed_points',
  'redeemed_vnd',
  'breakage_points',
  'breakage_vnd',
  'net_vnd',
];

// Text that starts like a formula is quoted so a spreadsheet reads it as text
function cell(value: string | number): string {
  const text =
    typeof value === 'string' && /^[=+\-@\t\r]/.test(value)
      ? `'${value}`
      : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function statementCsv(statement: Statement): string {
  const rows = statement.merchants.map((row) => [
    statement.month,
    row.merchantId,
    row.merchantName,
    statement.pointValueVnd,
    row.earnedPoints,
    row.earnedVnd,
    row.refundedPoints,
    row.refundedVnd,
    row.redeemedPoints,
    row.redeemedVnd,
    row.breakagePoints,
    row.breakageVnd,
    row.netVnd,
  ]);
  const lines = [HEADER, ...rows].map((line) => line.map(cell).join(','));
  return `﻿${lines.join('\r\n')}\r\n`;
}

export function downloadCsv(filename: string, text: string) {
  const url = URL.createObjectURL(
    new Blob([text], { type: 'text/csv;charset=utf-8' }),
  );
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
