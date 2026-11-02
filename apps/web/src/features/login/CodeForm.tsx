import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { REGEXP_ONLY_DIGITS } from 'input-otp';
import { useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from '@/components/ui/input-otp';
import { api, ApiError } from '@/lib/api';
import { setToken } from '@/lib/auth';
import type { CodeSent } from './EmailForm';
import { codeSchema } from './schemas';
import { useRequestOtp } from './useRequestOtp';

const SLOT = 'h-11 flex-1 font-mono text-lg';

export function CodeForm({
  email,
  demoOtp,
  onSent,
  onChangeEmail,
}: CodeSent & {
  onSent: (sent: CodeSent) => void;
  onChangeEmail: () => void;
}) {
  const { t } = useTranslation();
  const input = useRef<HTMLInputElement>(null);
  const requestOtp = useRequestOtp();
  const login = useMutation({
    mutationFn: (otp: string) =>
      api<{ accessToken: string }>('/auth/member/login', {
        method: 'POST',
        body: { email, otp },
      }),
    onSuccess: ({ accessToken }) => setToken(accessToken),
    onError: () => {
      form.reset();
      input.current?.focus();
    },
  });
  const form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    defaultValues: { otp: '' },
  });
  const { errors } = form.formState;

  const submit = form.handleSubmit(({ otp }) => login.mutate(otp));

  function resend() {
    login.reset();
    form.reset();
    requestOtp.mutate(email, {
      onSuccess: (res) => onSent({ email, demoOtp: res.otp ?? null }),
    });
  }

  return (
    <form onSubmit={submit} noValidate className="mt-2 space-y-5">
      <p className="text-sm text-muted-foreground wrap-anywhere">
        {t('login.codeIntro', { email })}
      </p>
      {demoOtp && (
        <div className="flex items-center justify-between gap-3 text-sm">
          <span>
            {t('login.demoCode')}{' '}
            <span className="font-mono text-base font-bold">{demoOtp}</span>
          </span>
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              form.setValue('otp', demoOtp, { shouldValidate: true });
              input.current?.focus();
            }}
          >
            {t('login.useDemoCode')}
          </Button>
        </div>
      )}
      <div className="space-y-2">
        <label htmlFor="otp" className="block text-sm font-medium">
          {t('login.code')}
        </label>
        <Controller
          control={form.control}
          name="otp"
          render={({ field }) => (
            <InputOTP
              id="otp"
              ref={input}
              containerClassName="w-full"
              maxLength={6}
              pattern={REGEXP_ONLY_DIGITS}
              autoFocus
              disabled={login.isPending}
              value={field.value}
              onChange={field.onChange}
              onBlur={field.onBlur}
              onComplete={() => void submit()}
              aria-invalid={!!errors.otp || login.isError}
            >
              <InputOTPGroup className="w-full">
                {[0, 1, 2, 3, 4, 5].map((index) => (
                  <InputOTPSlot key={index} index={index} className={SLOT} />
                ))}
              </InputOTPGroup>
            </InputOTP>
          )}
        />
        {errors.otp?.message && <FormError>{t(errors.otp.message)}</FormError>}
      </div>
      {login.isError && (
        <FormError>
          {t(
            login.error instanceof ApiError && login.error.status === 401
              ? 'login.wrongCode'
              : 'errors.generic',
          )}
        </FormError>
      )}
      {requestOtp.isError && <FormError>{t('errors.generic')}</FormError>}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={login.isPending}
      >
        {t(login.isPending ? 'login.signingIn' : 'login.signIn')}
      </Button>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
        <Button
          type="button"
          variant="link"
          className="px-0 text-card-foreground"
          disabled={requestOtp.isPending}
          onClick={resend}
        >
          {t('login.resend')}
        </Button>
        <Button
          type="button"
          variant="link"
          className="px-0 text-card-foreground"
          onClick={onChangeEmail}
        >
          {t('login.changeEmail')}
        </Button>
      </div>
    </form>
  );
}
