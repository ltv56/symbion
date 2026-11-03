import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// The question sits on the page itself, the field below it
export function NameStep({
  initialName,
  pending,
  failed,
  onSubmit,
  onSkip,
}: {
  initialName: string;
  pending: boolean;
  failed: boolean;
  onSubmit: (name: string) => void;
  onSkip: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState(initialName);
  const [empty, setEmpty] = useState(false);

  function submit(event: FormEvent) {
    event.preventDefault();
    const trimmed = name.trim();
    setEmpty(trimmed === '');
    if (trimmed !== '') onSubmit(trimmed);
  }

  return (
    <form
      data-surface="ground"
      onSubmit={submit}
      noValidate
      className="space-y-5"
    >
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-balance wrap-anywhere">
          {t('login.name.title')}
        </h1>
        <p className="text-muted-foreground">{t('login.name.hint')}</p>
      </div>
      <div className="space-y-2">
        <label htmlFor="display-name" className="sr-only">
          {t('login.name.label')}
        </label>
        <Input
          id="display-name"
          autoComplete="nickname"
          maxLength={255}
          autoFocus
          value={name}
          aria-invalid={empty}
          aria-describedby={empty ? 'display-name-error' : undefined}
          onFocus={(event) => event.currentTarget.select()}
          onChange={(event) => {
            setName(event.target.value);
            setEmpty(false);
          }}
        />
        {empty && (
          <FormError id="display-name-error">
            {t('login.name.required')}
          </FormError>
        )}
      </div>
      {failed && <FormError>{t('login.name.failed')}</FormError>}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" size="lg" disabled={pending}>
          {t(pending ? 'login.name.saving' : 'login.name.next')}
        </Button>
        <Button
          type="button"
          variant="link"
          className="px-0 text-foreground"
          disabled={pending}
          onClick={onSkip}
        >
          {t('login.name.skip')}
        </Button>
      </div>
    </form>
  );
}
