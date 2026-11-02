import * as React from 'react';
import { cn } from 'cn';

// Adapted from Ephemera's rubber-stamp
const SIZES = {
  sm: {
    outer: 'border-2 p-0.75',
    inner: 'border px-2.5 py-0.5',
    text: 'text-xs leading-5 tracking-widest',
    sub: 'text-xs leading-4',
  },
  md: {
    outer: 'border-[3px] p-1',
    inner: 'border px-4 py-1.5',
    text: 'text-base leading-6 tracking-[0.12em]',
    sub: 'text-xs leading-4',
  },
};

function useInView<T extends Element>() {
  const ref = React.useRef<T>(null);
  const [inView, setInView] = React.useState(
    () => typeof IntersectionObserver === 'undefined',
  );
  React.useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, inView] as const;
}

interface RubberStampProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  // A line under the main words
  sub?: React.ReactNode;
  rotate?: number;
  size?: keyof typeof SIZES;
  // Strike onto the page when scrolled into view
  animate?: boolean;
}

export function RubberStamp({
  children,
  sub,
  rotate = -8,
  size = 'md',
  animate = true,
  className,
  style,
  ...props
}: RubberStampProps) {
  const [ref, inView] = useInView<HTMLDivElement>();
  const s = SIZES[size];

  return (
    <div
      ref={ref}
      style={{ rotate: `${rotate}deg`, ...style }}
      className={cn(
        'inline-flex w-fit text-destructive select-none',
        animate && !inView && 'opacity-0 motion-reduce:opacity-100',
        animate &&
          inView &&
          'animate-in duration-300 ease-out fade-in zoom-in-[2.2] motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      <div className={cn('rounded-md border-current', s.outer)}>
        <div
          className={cn(
            'flex flex-col items-center rounded-sm border-current',
            s.inner,
          )}
        >
          <span className={cn('font-bold whitespace-nowrap uppercase', s.text)}>
            {children}
          </span>
          {sub && (
            <span
              className={cn(
                'font-mono font-medium whitespace-nowrap uppercase tabular-nums',
                s.sub,
              )}
            >
              {sub}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
