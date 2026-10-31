import { BrandMark } from './BrandMark';

export function BrandLockup() {
  return (
    <div className="flex items-center gap-2">
      <BrandMark className="size-7" />
      <span className="text-lg font-bold tracking-tight">Symbion</span>
    </div>
  );
}
