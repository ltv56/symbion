import { z } from 'zod';

// Messages are i18n keys
export const emailSchema = z.object({
  email: z.email({ error: 'login.validation.email' }),
});

export const codeSchema = z.object({
  otp: z.string().regex(/^\d{6}$/, { error: 'login.validation.code' }),
});
