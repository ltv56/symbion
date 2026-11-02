import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';

// The key in the Data face with a copy button; it is shown once
export function KeyReveal({ apiKey }: { apiKey: string }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const text = useRef<HTMLSpanElement>(null);
  const timer = useRef<number>(0);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  async function copy() {
    try {
      await navigator.clipboard.writeText(apiKey);
    } catch {
      // No clipboard: select the key
      const el = text.current;
      if (el) window.getSelection()?.selectAllChildren(el);
    }
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <div className="flex items-start gap-2 rounded-lg bg-muted p-3">
      <span
        ref={text}
        className="min-w-0 flex-1 font-mono text-sm break-all select-all"
      >
        {apiKey}
      </span>
      <Button
        size="icon"
        aria-label={t('admin.merchants.key.copy')}
        onClick={() => void copy()}
      >
        {copied ? <Check /> : <Copy />}
      </Button>
      <span role="status" className="sr-only">
        {copied ? t('admin.merchants.key.copied') : ''}
      </span>
    </div>
  );
}
