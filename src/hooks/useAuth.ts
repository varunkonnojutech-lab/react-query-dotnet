import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { authApi } from '../api/authApi';
import { clearTokens, getTokens, saveTokens } from '../lib/auth';
import { authKeys } from '../lib/queryKeys';

/**
 * Login mutation: on success the token pair is saved and the `me` query
 * becomes enabled (dependent query — see useMe below).
 */
export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      authApi.login(email, password),
    onSuccess: (tokens) => {
      saveTokens(tokens);
      void queryClient.invalidateQueries({ queryKey: authKeys.me });
    },
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const tokens = getTokens();
      if (tokens) await authApi.logout(tokens.refreshToken).catch(() => undefined);
    },
    onSettled: () => {
      clearTokens();
      queryClient.removeQueries({ queryKey: authKeys.me });
    },
  });
}

/**
 * Dependent query: only runs once a token exists. `enabled` is the whole
 * trick — no token, no request, no 401 noise.
 */
export function useMe() {
  const hasToken = getTokens() !== null;
  return useQuery({
    queryKey: authKeys.me,
    queryFn: () => authApi.me(),
    enabled: hasToken,
    staleTime: 60_000,
    retry: false, // A 401 here means "logged out", not "try again".
  });
}
