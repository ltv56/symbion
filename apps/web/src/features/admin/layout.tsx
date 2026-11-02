import type { ReactNode } from 'react';

// Title and a line of facts on the ground, actions at the far end
export function PageHeader({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      data-surface="ground"
      className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4"
    >
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 min-h-5 text-sm text-muted-foreground">{subtitle}</p>
      </div>
      {children}
    </div>
  );
}

// Records on the red half, the chosen record on the ground; stacked below lg
export function TwoHalves({ children }: { children: ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,28rem)]">
      {children}
    </div>
  );
}
