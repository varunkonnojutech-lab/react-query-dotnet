import { useState } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { todoKeys } from '../lib/queryKeys';
import { todosApi } from '../api/todos';

/**
 * A peek under the hood: what does the todos cache actually hold right now?
 * Shows status, freshness, and last-updated time straight from the QueryClient,
 * plus the three cache operations learners mix up: invalidate, refetch, prefetch.
 */
export function CacheInspector() {
  const queryClient = useQueryClient();
  const isFetching = useIsFetching();
  const [, forceRender] = useState(0);

  const state = queryClient.getQueryState(todoKeys.list({ status: 'all' }));
  const cached = queryClient.getQueryData(todoKeys.list({ status: 'all' })) as unknown[] | undefined;

  return (
    <section>
      <h2>Cache inspector — what the QueryClient knows</h2>
      <p>
        Same cache the Todos tab reads. <strong>Invalidate</strong> marks it stale (refetch
        happens in the background). <strong>Refetch</strong> fetches now.{' '}
        <strong>Prefetch</strong> warms the cache before anyone opens the tab.
      </p>

      <dl className="inspector">
        <dt>Query status</dt>
        <dd>{state?.status ?? 'no cache entry yet'}</dd>
        <dt>Fetch status</dt>
        <dd>{state?.fetchStatus ?? '—'}</dd>
        <dt>Data updated</dt>
        <dd>
          {state?.dataUpdatedAt
            ? `${new Date(state.dataUpdatedAt).toLocaleTimeString()} (${Math.round((Date.now() - state.dataUpdatedAt) / 1000)}s ago)`
            : '—'}
        </dd>
        <dt>Cached todos</dt>
        <dd>{cached ? `${cached.length} items` : 'none cached'}</dd>
        <dt>Queries fetching right now</dt>
        <dd>{isFetching}</dd>
      </dl>

      <div className="toolbar">
        <button
          onClick={() => {
            void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
            setTimeout(() => forceRender((n) => n + 1), 100);
          }}
        >
          Invalidate todos
        </button>
        <button
          onClick={() => {
            void queryClient.refetchQueries({ queryKey: todoKeys.lists() });
            setTimeout(() => forceRender((n) => n + 1), 100);
          }}
        >
          Refetch todos now
        </button>
        <button
          onClick={() => {
            void queryClient.prefetchQuery({
              queryKey: todoKeys.list({ status: 'all' }),
              queryFn: () => todosApi.list('all'),
            });
            setTimeout(() => forceRender((n) => n + 1), 600);
          }}
        >
          Prefetch todos
        </button>
        <button onClick={() => forceRender((n) => n + 1)}>Refresh this panel</button>
      </div>

      <p className="muted">
        Tip: open the React Query Devtools (bottom-left, in dev mode) for the full cache view —
        every query, its key, its data, and its observers.
      </p>
    </section>
  );
}
