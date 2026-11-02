import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { OUTLINE } from '../styles';
import { currentMonth, monthLabel, recentMonths, shiftMonth } from './month';

const MONTHS_LISTED = 12;

// Steps back and forth, or jumps to one of the last twelve
export function MonthSwitch({
  month,
  onChange,
}: {
  month: string;
  onChange: (month: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const latest = currentMonth();

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="outline"
        size="icon"
        className={OUTLINE}
        aria-label={t('admin.statement.previous')}
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft />
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className={`${OUTLINE} min-w-40 justify-between aria-expanded:bg-foreground/10 aria-expanded:text-foreground`}
            aria-label={t('admin.statement.pickMonth')}
          >
            {monthLabel(month, i18n.language)}
            <ChevronDown />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-44">
          {recentMonths(MONTHS_LISTED).map((option) => (
            <DropdownMenuItem
              key={option}
              aria-current={option === month ? 'true' : undefined}
              className={
                option === month ? 'bg-foreground/10 font-semibold' : ''
              }
              onSelect={() => onChange(option)}
            >
              {monthLabel(option, i18n.language)}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <Button
        variant="outline"
        size="icon"
        className={OUTLINE}
        aria-label={t('admin.statement.next')}
        disabled={month >= latest}
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight />
      </Button>
    </div>
  );
}
