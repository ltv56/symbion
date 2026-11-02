import type { TFunction } from 'i18next';

// The three seeded tiers are translated, others show as typed
export function tierLabel(t: TFunction, name: string): string {
  return t(`tier.${name.toLowerCase()}`, { defaultValue: name });
}
