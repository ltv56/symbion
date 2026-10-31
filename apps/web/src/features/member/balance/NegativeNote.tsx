import { Info } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// The negative-balance note with an info icon
export function NegativeNote() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <p className="mt-3 max-w-prose text-pretty">
      {t('member.negativeNote')}{' '}
      <TooltipProvider>
        <Tooltip open={open} onOpenChange={setOpen}>
          <TooltipTrigger asChild>
            {/* preventDefault: Radix also closes on click */}
            <button
              type="button"
              aria-label={t('member.negativeHintLabel')}
              onClick={(e) => {
                e.preventDefault();
                setOpen(true);
              }}
              className="relative inline-flex size-5 translate-y-0.75 items-center justify-center rounded-full text-muted-foreground transition-colors after:absolute after:-inset-3 hover:text-foreground focus-visible:outline-2 focus-visible:outline-foreground motion-reduce:transition-none"
            >
              <Info className="size-4" aria-hidden />
            </button>
          </TooltipTrigger>
          <TooltipContent
            side="bottom"
            sideOffset={6}
            collisionPadding={16}
            className="max-w-64 text-sm"
          >
            {t('member.negativeHint')}
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    </p>
  );
}
