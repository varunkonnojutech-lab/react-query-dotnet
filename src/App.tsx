import { useState } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { queryClient } from './lib/queryClient';
import { TodoList } from './components/TodoList';
import { PostFeed } from './components/PostFeed';
import { AuthPanel } from './components/AuthPanel';
import { CacheInspector } from './components/CacheInspector';
import { usePrefetchFeed } from './hooks/usePosts';

type Tab = 'todos' | 'feed' | 'auth' | 'cache';

const TABS: { id: Tab; label: string; hint: string }[] = [
  { id: 'todos', label: 'Todos', hint: 'useQuery + optimistic mutations' },
  { id: 'feed', label: 'Feed', hint: 'useInfiniteQuery' },
  { id: 'auth', label: 'Auth', hint: 'dependent query + silent refresh' },
  { id: 'cache', label: 'Cache', hint: 'invalidate / refetch / prefetch' },
];

export function App() {
  const [tab, setTab] = useState<Tab>('todos');
  const prefetchFeed = usePrefetchFeed();

  return (
    <QueryClientProvider client={queryClient}>
      <main>
        <header>
          <h1>React Query + .NET</h1>
          <p>
            TanStack Query data-fetching patterns in React 18 + TypeScript, against a .NET 8 JWT
            API. No backend needed to run it: with no <code>VITE_API_URL</code> set, requests
            go to an in-memory demo server that mirrors the sibling{' '}
            <code>jwt-auth-deepdive</code> repo’s auth endpoints.
          </p>
        </header>

        <nav className="tabs" aria-label="Demos">
          {TABS.map((t) => (
            <button
              key={t.id}
              className={tab === t.id ? 'active' : ''}
              onClick={() => setTab(t.id)}
              onMouseEnter={t.id === 'feed' ? prefetchFeed : undefined}
              title={t.hint}
            >
              {t.label}
              <span className="muted"> · {t.hint}</span>
            </button>
          ))}
        </nav>
        <p className="muted">
          Hover the Feed tab — it prefetches the first page before you click.
        </p>

        {tab === 'todos' && <TodoList />}
        {tab === 'feed' && <PostFeed />}
        {tab === 'auth' && <AuthPanel />}
        {tab === 'cache' && <CacheInspector />}

        <footer>
          <p>
            Companion repos: <a href="https://github.com/varunkonnojutech-lab/jwt-auth-deepdive">jwt-auth-deepdive</a>{' '}
            (the real .NET 8 API this app is shaped around) ·{' '}
            <a href="https://github.com/varunkonnojutech-lab/react-dotnet-starter">react-dotnet-starter</a>{' '}
            (full-stack starter with a real backend).
          </p>
        </footer>
      </main>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
