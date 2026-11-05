import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { postsApi } from '../api/posts';
import { postKeys } from '../lib/queryKeys';

/**
 * Infinite feed. `getNextPageParam` reads `nextPage` from the last loaded
 * page; returning `undefined` tells TanStack Query there is nothing more to
 * fetch, which disables the "Load more" button.
 */
export function usePostFeed() {
  return useInfiniteQuery({
    queryKey: postKeys.feed(),
    queryFn: ({ pageParam }) => postsApi.fetchPage(pageParam),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
  });
}

/** Prefetch the first feed page so the Feed tab renders instantly when opened. */
export function usePrefetchFeed() {
  const queryClient = useQueryClient();
  return () => {
    void queryClient.prefetchInfiniteQuery({
      queryKey: postKeys.feed(),
      queryFn: ({ pageParam }) => postsApi.fetchPage(pageParam),
      initialPageParam: 1,
      getNextPageParam: (lastPage) => lastPage.nextPage ?? undefined,
      pages: 1,
    });
  };
}
