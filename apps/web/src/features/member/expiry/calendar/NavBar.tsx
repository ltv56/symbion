import { cn } from 'cn';
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PRESS } from './layout';

function IconButton({
  label,
  disabled,
  onClick,
  className,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid min-h-11 min-w-11 place-items-center rounded-lg disabled:opacity-35',
        PRESS,
        className,
      )}
    >
      {children}
    </button>
  );
}

export function NavBar({
  title,
  onPrev,
  onNext,
  prevDisabled,
  nextDisabled,
  onBack,
}: {
  title: string;
  onPrev: () => void;
  onNext: () => void;
  prevDisabled: boolean;
  nextDisabled: boolean;
  onBack: () => void;
}) {
  const { t } = useTranslation();
  return (
    <div>
      {/* the 44px target hangs out into the padding */}
      <IconButton
        label={t('timeline.back')}
        onClick={onBack}
        className="-mt-3 -mb-3 -ml-2"
      >
        <ArrowLeft className="size-5" aria-hidden />
      </IconButton>
      <div className="flex items-center justify-center">
        <IconButton
          label={t('timeline.prev')}
          disabled={prevDisabled}
          onClick={onPrev}
        >
          <ChevronLeft className="size-4" aria-hidden />
        </IconButton>
        <span className="min-w-24 text-center font-semibold">{title}</span>
        <IconButton
          label={t('timeline.next')}
          disabled={nextDisabled}
          onClick={onNext}
        >
          <ChevronRight className="size-4" aria-hidden />
        </IconButton>
      </div>
    </div>
  );
}
