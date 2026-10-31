import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { emailSchema } from './schemas';
import { useRequestOtp } from './useRequestOtp';

export interface CodeSent {
  email: string;
  demoOtp: string | null;
}

export function EmailForm({ onSent }: { onSent: (sent: CodeSent) => void }) {
  const { t } = useTranslation();
  const requestOtp = useRequestOtp();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: '' },
  });

  const submit = handleSubmit(({ email }) =>
    requestOtp.mutate(email, {
      onSuccess: (res) => onSent({ email, demoOtp: res.otp ?? null }),
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="mt-2 space-y-5">
      <p className="text-sm text-muted-foreground">{t('login.intro')}</p>
      <div className="space-y-2">
        <label htmlFor="email" className="block text-sm font-medium">
          {t('login.email')}
        </label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          autoFocus
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          {...register('email')}
        />
        {errors.email?.message && (
          <FormError id="email-error">{t(errors.email.message)}</FormError>
        )}
      </div>
      {requestOtp.isError && <FormError>{t('errors.generic')}</FormError>}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={requestOtp.isPending}
      >
        {t(requestOtp.isPending ? 'login.sending' : 'login.sendCode')}
      </Button>
    </form>
  );
}
