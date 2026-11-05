import { QueryClient } from '@tanstack/react-query';

/**
 * One QueryClient for the whole app. The defaults here are the opinionated
 * part of this repo — they are what makes the UI feel instant instead of
 * refetching on every render:
 *
 * - staleTime 30s: data is "fresh" for 30 seconds, so remounts and tab
 *   switches reuse the cache instead of hitting the network.
 * - gcTime 5 min: unused data stays in memory for 5 minutes (was `cacheTime`
 *   in v4) so back-navigation is instant.
 * - retry 1 with exponential backoff: one retry for transient failures,
 *   then surface the error instead of hammering a down server.
 * - refetchOnWindowFocus: true (the default) — coming back to the tab
 *   refetches only if the data is stale.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30_000),
      refetchOnWindowFocus: true,
    },
    mutations: {
      retry: 0, // Mutations must never auto-retry: a retried POST can double-create.
    },
  },
});
