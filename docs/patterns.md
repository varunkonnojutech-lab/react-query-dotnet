# TanStack Query patterns — the full notes

Every pattern in this repo, why it exists, and where to see it in the code.
The app itself is the runnable version; this doc is the explanation.

## 1. Query keys are your cache schema

All keys come from one factory — `src/lib/queryKeys.ts`. Keys are arrays,
most-specific last, and filters live inside the key:

```ts
['todos', 'list', { status: 'active' }]   // one cache entry per filter
['todos', 'detail', 42]                    // one entry per todo
```

Invalidation is hierarchical: invalidating `['todos']` refetches the list
*and* every detail query; invalidating `['todos', 'list']` touches only lists.
If you build keys ad hoc in components, invalidation silently misses entries.
One factory prevents that.

## 2. staleTime is not gcTime

- **`staleTime`** (30s here): how long data counts as *fresh*. Fresh data is
  reused on remounts and tab switches with no network call. Stale data is
  still shown instantly — then refetched in the background.
- **`gcTime`** (5 min here, called `cacheTime` in v4): how long *unused* data
  stays in memory. After that it is garbage-collected and the next visit
  refetches from scratch.

Rule of thumb: `staleTime` is a UX decision (how often may this data change?),
`gcTime` is a memory decision. A list that changes rarely deserves a long
`staleTime`; a live dashboard deserves a short one.

## 3. Optimistic updates: the five-step dance

See `useAddTodo` / `useToggleTodo` / `useDeleteTodo` in `src/hooks/useTodos.ts`:

1. `cancelQueries` — stop in-flight refetches that would overwrite the
   optimistic value.
2. Snapshot the current cache (`getQueryData`) for rollback.
3. `setQueryData` — write the optimistic value. The UI updates instantly.
4. `onError` — restore the snapshot. The user sees the change undone, with
   the error message.
5. `onSettled` — invalidate, so the cache converges with the server.

The toggle and delete mutations share the same shape. The add mutation has
one extra step: on success it swaps the temporary id for the real server id.

Try it: turn on “Simulate failure” in the Todos tab and toggle a todo — the
checkbox flips, then flips back with an error. That rollback is the whole point.

## 4. Mutations never auto-retry

`QueryClient` defaults in `src/lib/queryClient.ts` set `retry: 0` for
mutations. A retried `POST` can create the same todo twice; a retried payment
can charge twice. If a mutation fails, show the error and let the user retry
deliberately.

Queries *do* retry (once, with exponential backoff) — a failed `GET` is safe
to repeat.

## 5. Infinite queries: no page state in the component

`usePostFeed` (`src/hooks/usePosts.ts`) keeps pages in `data.pages`. The only
thing the component does is call `fetchNextPage()`. `getNextPageParam` reads
`nextPage` from the last page and returns `undefined` when the feed ends —
that is what disables the “Load more” button. No `page` state, no manual
array merging, no duplicate items on refetch.

## 6. Dependent queries and the `enabled` flag

The profile query in `src/hooks/useAuth.ts` has `enabled: hasToken`. No token,
no request, no 401 noise in the console. When login succeeds, the mutation's
`onSuccess` saves the tokens and invalidates the `me` query — which flips
`enabled` on and loads the profile. This is the standard shape for “load X
only after Y exists”.

## 7. Silent refresh on 401

`src/lib/apiClient.ts` attaches the access token to every request. On a 401
with a refresh token available, it calls `/api/auth/refresh` once and replays
the original request — the component never sees the failure. If the refresh
also fails, tokens are cleared and the error surfaces as “session expired”.

The Auth tab has an “Expire my token, then refetch /me” button so you can
watch this happen: the refetch succeeds with no login prompt.

This mirrors the sibling `jwt-auth-deepdive` repo: short-lived access tokens
(2 minutes in the demo), refresh-token rotation on every use, and reuse
detection — presenting a revoked refresh token revokes the whole token family.

## 8. Prefetching: fetch before the user asks

Hovering the Feed tab calls `prefetchInfiniteQuery` (`src/hooks/usePosts.ts`
→ `usePrefetchFeed`). By the time the user clicks, the first page is already
in the cache and the tab renders instantly. Same idea works for detail pages:
prefetch `['todos', 'detail', id]` on link hover.

Prefetching is a bet — only prefetch what the user is *likely* to open next,
or you trade one loading spinner for wasted bandwidth.

## 9. Invalidate vs refetch vs prefetch

- **Invalidate** — mark stale; the query refetches in the background *if it
  is currently mounted*. Cheap, and the standard move after a mutation.
- **Refetch** — fetch right now, whether mounted or not. Use when the user
  explicitly asked (“Refresh” button).
- **Prefetch** — fetch now so a *future* mount is instant. Use on hover or
  after login for data the user will need next.

The Cache tab (`src/components/CacheInspector.tsx`) lets you run all three
against the todos cache and watch the state change.

## 10. Where do tokens live?

This demo stores tokens in `localStorage` to keep the code readable. A
production app should prefer httpOnly cookies set by the backend — JavaScript
can never read them, so XSS cannot steal them. The `jwt-auth-deepdive` repo
documents that trade-off in detail; the token *flow* here (rotation, reuse
detection, silent refresh) is identical either way.

## 11. Devtools are part of the workflow

In dev mode, the React Query Devtools panel (bottom-left) shows every query,
its key, its data, its observers, and its fetch status. When a UI bug smells
like stale data, open the Devtools before adding a `useEffect` — nine times
out of ten the answer is already in the cache view.
