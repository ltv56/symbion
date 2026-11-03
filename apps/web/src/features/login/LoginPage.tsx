import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppHeader } from '@/components/AppHeader';
import { api } from '@/lib/api';
import { setToken } from '@/lib/auth';
import { CodeForm } from './CodeForm';
import { EmailForm, type CodeSent } from './EmailForm';
import { NameStep } from './NameStep';

type Step =
  | { kind: 'email' }
  | { kind: 'code'; sent: CodeSent }
  | { kind: 'name'; email: string; otp: string };

export function LoginPage() {
  const { t } = useTranslation();
  const [step, setStep] = useState<Step>({ kind: 'email' });
  const defaultName =
    step.kind === 'name' ? (step.email.split('@')[0] ?? step.email) : '';
  // The same code goes back with the name: that call creates the member
  const create = useMutation({
    mutationFn: (input: { email: string; otp: string; name: string }) =>
      api<{ accessToken: string }>('/auth/member/login', {
        method: 'POST',
        body: input,
      }),
    onSuccess: ({ accessToken }) => setToken(accessToken),
  });

  return (
    <div className="flex min-h-svh flex-col">
      <AppHeader />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 pb-16 md:px-6">
        {step.kind === 'name' ? (
          <NameStep
            initialName={defaultName}
            pending={create.isPending}
            failed={create.isError}
            onSubmit={(name) =>
              create.mutate({ email: step.email, otp: step.otp, name })
            }
            onSkip={() =>
              create.mutate({
                email: step.email,
                otp: step.otp,
                name: defaultName,
              })
            }
          />
        ) : (
          <section className="rounded-lg bg-card p-7 text-card-foreground md:p-9">
            <h1 className="text-2xl font-bold tracking-tight">
              {t('login.title')}
            </h1>
            {step.kind === 'code' ? (
              <CodeForm
                {...step.sent}
                onSent={(sent) => setStep({ kind: 'code', sent })}
                onChangeEmail={() => setStep({ kind: 'email' })}
                onSignedIn={(result, otp) =>
                  'needName' in result
                    ? setStep({ kind: 'name', email: step.sent.email, otp })
                    : setToken(result.accessToken)
                }
              />
            ) : (
              <EmailForm onSent={(sent) => setStep({ kind: 'code', sent })} />
            )}
          </section>
        )}
      </main>
    </div>
  );
}
