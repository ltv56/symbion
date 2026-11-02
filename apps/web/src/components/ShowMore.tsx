// Folds a long list
export function ShowMore({
  expanded,
  onToggle,
  moreLabel,
  lessLabel,
}: {
  expanded: boolean;
  onToggle: () => void;
  moreLabel: string;
  lessLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="mt-1 flex min-h-11 w-full items-center justify-center rounded-lg text-sm font-medium underline underline-offset-4 outline-offset-2 focus-visible:outline-2 focus-visible:outline-card-foreground"
    >
      {expanded ? lessLabel : moreLabel}
    </button>
  );
}
