# React Query + .NET

[![Build](https://github.com/varunkonnojutech-lab/react-query-dotnet/actions/workflows/ci.yml/badge.svg)](https://github.com/varunkonnojutech-lab/react-query-dotnet/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![React 18](https://img.shields.io/badge/React-18-61DAFB)](https://react.dev/)
[![TanStack Query 5](https://img.shields.io/badge/TanStack%20Query-5-FF4154)](https://tanstack.com/query/latest)
[![Open in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/varunkonnojutech-lab/react-query-dotnet)

TanStack Query data-fetching patterns in React 18 + TypeScript, against a .NET 8 JWT API. Not a toy counter app: four working demos — an optimistic todo list, an infinite-scrolling feed, JWT login with silent token refresh, and a live cache inspector — each one showing the pattern instead of describing it.

## Who is this for

React developers who already fetch with `useEffect` + `fetch` and are tired of writing loading flags, retry loops, and cache invalidation by hand — and .NET developers who want to see what the frontend side of their JWT API should look like.

## What you'll learn

- **Query keys as a cache schema** — one key factory (`src/lib/queryKeys.ts`) so invalidation can never silently miss an entry
- **Optimistic updates done right** — the five-step cancel → snapshot → write → rollback → invalidate dance, with a “Simulate failure” toggle so you can watch the rollback happen (`src/hooks/useTodos.ts`)
- **Infinite queries** — `useInfiniteQuery` with cursor pagination and no page state in the component (`src/hooks/usePosts.ts`)
- **Auth with TanStack Query** — dependent queries (`enabled: hasToken`), login/logout mutations, and silent refresh-token rotation on 401 that replays the failed request (`src/lib/apiClient.ts`, `src/hooks/useAuth.ts`)
- **staleTime vs gcTime, invalidate vs refetch vs prefetch** — the distinctions that decide whether your UI feels instant or flickers, with a live cache inspector to see them in action
- **Why mutations never auto-retry** — a retried POST can double-create; a retried GET cannot hurt anyone

The full notes live in [`docs/patterns.md`](docs/patterns.md) — one section per pattern, with the exact file to read.

## Prerequisites

- [Node.js 20+](https://nodejs.org/) with npm — or click **Open in GitHub Codespaces** above for a ready-made environment in your browser, no install needed.

## Quick start

```bash
git clone https://github.com/varunkonnojutech-lab/react-query-dotnet.git
cd react-query-dotnet
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. No backend needed: with no `VITE_API_URL` set, requests go to an in-memory demo server (`src/lib/fakeServer.ts`) that mirrors the sibling `jwt-auth-deepdive` repo's auth endpoints — including 2-minute access tokens, refresh-token rotation, and reuse detection.

```bash
npm test    # Vitest: query-key factory + demo API behaviour
npm run build
```

## What you get

| Tab | Pattern | Try it |
|---|---|---|
| Todos | `useQuery` + optimistic `useMutation`s | Add/toggle/delete a todo; turn on “Simulate failure” and watch the rollback |
| Feed | `useInfiniteQuery` | Scroll and keep loading; hover the tab first — it prefetches page 1 |
| Auth | Dependent query + silent refresh | Log in with `demo@example.com` / `password1234`, then “Expire my token” and refetch — no login prompt |
| Cache | `invalidateQueries` / `refetchQueries` / `prefetchQuery` | Invalidate the todos cache and watch the list refetch in the background |

Open the React Query Devtools (bottom-left, dev mode) to see every query, its key, and its cached data.

## Pointing at a real API

Run the sibling [`jwt-auth-deepdive`](https://github.com/varunkonnojutech-lab/jwt-auth-deepdive) repo (a .NET 8 API with the same `/api/auth/*` endpoints), then start the app with its URL:

```bash
VITE_API_URL=http://localhost:5000 npm run dev
```

The demo server is bypassed entirely and every request hits your API. The todos/posts endpoints don't exist on that API yet — add them there (or keep the demo server for those two resources) and the app works unchanged: the client only cares about the response shape.

## Project layout

```
src/
  main.tsx                 # QueryClientProvider + Devtools wiring
  App.tsx                  # Tab shell; prefetches the feed on hover
  lib/
    queryClient.ts         # One QueryClient: staleTime/gcTime/retry defaults
    queryKeys.ts           # The key factory — every key in the app
    apiClient.ts           # fetch wrapper: auth header + silent 401 refresh
    auth.ts                # Token storage (localStorage in the demo)
    fakeServer.ts          # In-memory demo API (auth + todos + posts)
  api/
    todos.ts posts.ts authApi.ts   # One function per endpoint
  hooks/
    useTodos.ts            # List query + optimistic add/toggle/delete
    usePosts.ts            # Infinite feed + prefetch helper
    useAuth.ts             # Login/logout + dependent /me query
  components/
    TodoList.tsx PostFeed.tsx AuthPanel.tsx CacheInspector.tsx
docs/
  patterns.md              # The full notes, one section per pattern
```

## Next steps

- Swap the demo server for your real API (see above) and add a `todos` resource to it — the client already speaks REST.
- Move tokens from `localStorage` to httpOnly cookies; the refresh flow stays the same, only the storage changes.
- Add `select` to derive filtered lists from one cached list instead of one query per filter.
- Add a mutation for editing a todo title, using the same optimistic pattern as the toggle.
