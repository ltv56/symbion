import { ChevronDown } from 'lucide-react';
import { useId, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { formatPoints, signed } from '@/lib/format';
import type { DemoMember } from './useDemoMembers';

export function DemoAccounts({
  members,
  onPick,
}: {
  members: DemoMember[];
  onPick: (email: string) => void;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language.startsWith('en') ? 'en' : 'vi';
  const [open, setOpen] = useState(false);
  const panel = useId();
  if (members.length === 0) return null;

  return (
    <section className="mt-5 border-t border-card-foreground/20 pt-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panel}
        onClick={() => setOpen((value) => !value)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 text-left text-sm font-medium outline-offset-2 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-card-foreground"
      >
        {t('login.demo.open')}
        <ChevronDown
          aria-hidden
          className={`size-4 shrink-0 transition-transform motion-reduce:transition-none ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div id={panel}>
          <p className="mt-1 px-2 text-sm text-muted-foreground">
            {t('login.demo.hint')}
          </p>
          <ul className="mt-2">
            {members.map((member) => (
              <li key={member.email}>
                <button
                  type="button"
                  onClick={() => onPick(member.email)}
                  className="flex min-h-11 w-full items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-left outline-offset-2 hover:bg-foreground/5 focus-visible:outline-2 focus-visible:outline-card-foreground"
                >
                  <span className="min-w-0">
                    <span className="line-clamp-1 text-sm font-medium wrap-anywhere">
                      {member.name ?? member.email}
                    </span>
                    <span className="line-clamp-1 font-mono text-xs text-muted-foreground wrap-anywhere">
                      {member.email}
                    </span>
                  </span>
                  <span className="shrink-0 text-right text-sm tabular-nums">
                    <span className="block font-medium">
                      {signed(member.balance, (n) => formatPoints(n, lang))}{' '}
                      <span className="text-xs font-normal text-muted-foreground">
                        {t('login.demo.points')}
                      </span>
                    </span>
                    <span className="block text-xs text-muted-foreground">
                      {member.tierName}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
