// Fixed per merchant
const TINTS = [
  'bg-avatar-1 text-avatar-1-ink',
  'bg-avatar-2 text-avatar-2-ink',
  'bg-avatar-3 text-avatar-3-ink',
];

export function MerchantAvatar({ id, name }: { id: number; name: string }) {
  return (
    <span
      className={`flex size-10 shrink-0 items-center justify-center rounded-full text-base font-semibold ${TINTS[id % TINTS.length]}`}
      aria-hidden
    >
      {name.charAt(0)}
    </span>
  );
}
