import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { FormError } from '@/components/FormError';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { setAdminToken } from '@/lib/adminAuth';
import { api, ApiError } from '@/lib/api';
import { useDemoAccounts } from '../useDemoAccounts';
import { adminLoginSchema } from './schemas';

type Credentials = z.infer<typeof adminLoginSchema>;

export function AdminLoginForm() {
  const { t } = useTranslation();
  const login = useMutation({
    mutationFn: (body: Credentials) =>
      api<{ accessToken: string }>('/auth/login', {
        method: 'POST',
        body,
        as: 'admin',
      }),
    onSuccess: ({ accessToken }) => setAdminToken(accessToken),
  });
  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<Credentials>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: '', password: '' },
  });

  const submit = handleSubmit((values) => login.mutate(values));
  const demoAdmin = useDemoAccounts().data?.admin;

  return (
    <form onSubmit={submit} noValidate className="mt-2 space-y-5">
      <p className="text-sm text-muted-foreground">{t('admin.login.intro')}</p>
      <div className="space-y-2">
        <label htmlFor="admin-email" className="block text-sm font-medium">
          {t('admin.login.email')}
        </label>
        <Input
          id="admin-email"
          type="email"
          autoComplete="username"
          autoFocus
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'admin-email-error' : undefined}
          {...register('email')}
        />
        {errors.email?.message && (
          <FormError id="admin-email-error">
            {t(errors.email.message)}
          </FormError>
        )}
      </div>
      <div className="space-y-2">
        <label htmlFor="admin-password" className="block text-sm font-medium">
          {t('admin.login.password')}
        </label>
        <Input
          id="admin-password"
          type="password"
          autoComplete="current-password"
          aria-invalid={!!errors.password}
          aria-describedby={
            errors.password ? 'admin-password-error' : undefined
          }
          {...register('password')}
        />
        {errors.password?.message && (
          <FormError id="admin-password-error">
            {t(errors.password.message)}
          </FormError>
        )}
      </div>
      {login.isError && (
        <FormError>
          {t(
            login.error instanceof ApiError && login.error.status === 401
              ? 'admin.login.wrong'
              : 'errors.generic',
          )}
        </FormError>
      )}
      <Button
        type="submit"
        size="lg"
        className="w-full"
        disabled={login.isPending}
      >
        {t(login.isPending ? 'admin.login.signingIn' : 'admin.login.signIn')}
      </Button>
      {demoAdmin && (
        <Button
          type="button"
          variant="secondary"
          size="lg"
          className="w-full"
          onClick={() => {
            setValue('email', demoAdmin.email, { shouldValidate: true });
            setValue('password', demoAdmin.password, { shouldValidate: true });
          }}
        >
          {t('admin.login.useDemo')}
        </Button>
      )}
    </form>
  );
}
