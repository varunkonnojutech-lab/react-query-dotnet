/**
 * Query key factory — every query key in the app comes from here.
 *
 * Rules this enforces:
 * 1. Keys are arrays, most-specific last: ['todos', 'list'] vs ['todos', 'detail', id].
 * 2. Invalidation is hierarchical: invalidating ['todos'] refetches every
 *    todos query (list + details); invalidating ['todos', 'list'] only the list.
 * 3. Filters live in the key: ['todos', 'list', { status }] — a different
 *    filter is a different cache entry, never a stale mix.
 */
export const todoKeys = {
  all: ['todos'] as const,
  lists: () => [...todoKeys.all, 'list'] as const,
  list: (filter: { status?: 'all' | 'active' | 'done' } = {}) =>
    [...todoKeys.lists(), filter] as const,
  details: () => [...todoKeys.all, 'detail'] as const,
  detail: (id: number) => [...todoKeys.details(), id] as const,
};

export const postKeys = {
  all: ['posts'] as const,
  feed: () => [...postKeys.all, 'feed'] as const,
};

export const authKeys = {
  me: ['auth', 'me'] as const,
};
