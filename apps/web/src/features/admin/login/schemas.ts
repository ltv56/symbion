import { z } from 'zod';

// Messages are i18n keys
export const adminLoginSchema = z.object({
  email: z.email({ error: 'admin.login.validation.email' }),
  password: z.string().min(1, { error: 'admin.login.validation.password' }),
});
