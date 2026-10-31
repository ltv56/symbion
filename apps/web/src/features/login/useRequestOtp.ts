import { useMutation } from '@tanstack/react-query';
import { api } from '@/lib/api';

export function useRequestOtp() {
  return useMutation({
    mutationFn: (email: string) =>
      api<{ otp?: string }>('/auth/member/otp', {
        method: 'POST',
        body: { email },
      }),
  });
}
