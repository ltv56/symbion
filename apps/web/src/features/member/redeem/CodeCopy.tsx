import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// The code in the Code face, with a copy button
export function CodeCopy({ code }: { code: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const text = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // No clipboard: select the code
      const el = text.current;
      if (el) window.getSelection()?.selectAllChildren(el);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
      <span
        ref={text}
        className="font-mono text-xl font-medium tracking-wide break-all tabular-nums select-all @max-[22rem]:text-lg"
      >
        <span aria-hidden>{code}</span>
        <span className="sr-only select-none">{code.split('').join(' ')}</span>
      </span>
      <Button
        size="icon"
        aria-label={t('redemptions.copy', { code: code.split('').join(' ') })}
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <span role="status" className="sr-only">
        {copied ? t('redemptions.copied') : ''}
      </span>
    </div>
  );
}
