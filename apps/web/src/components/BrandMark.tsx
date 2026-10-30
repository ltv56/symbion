export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden>
      <circle
        cx="12"
        cy="12"
        r="10"
        fill="none"
        className="stroke-brand"
        strokeWidth="2"
      />
      <circle
        cx="12"
        cy="12"
        r="5.5"
        fill="none"
        className="stroke-brand"
        strokeWidth="1.5"
      />
    </svg>
  );
}
