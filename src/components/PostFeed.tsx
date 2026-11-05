import { usePostFeed } from '../hooks/usePosts';

export function PostFeed() {
  const {
    data,
    isPending,
    isError,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = usePostFeed();

  const posts = data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <section>
      <h2>Feed — useInfiniteQuery</h2>
      <p>
        Pages accumulate in <code>data.pages</code>; <code>getNextPageParam</code> reads{' '}
        <code>nextPage</code> from the last page and returns <code>undefined</code> when the
        feed is exhausted. Scroll down and keep loading — no page state in the component.
      </p>

      {isPending && <p>Loading feed…</p>}
      {isError && <p className="error">Feed failed: {error.message}</p>}

      <ul className="post-list">
        {posts.map((post) => (
          <li key={post.id}>
            <strong>{post.title}</strong>
            <span className="muted"> by {post.author}</span>
            <p>{post.body}</p>
          </li>
        ))}
      </ul>

      <div className="toolbar">
        <button
          onClick={() => void fetchNextPage()}
          disabled={!hasNextPage || isFetchingNextPage}
        >
          {isFetchingNextPage
            ? 'Loading more…'
            : hasNextPage
              ? 'Load more'
              : 'You’ve reached the end'}
        </button>
        <span className="muted">
          {posts.length} posts loaded · {data?.pages.length ?? 0} pages in cache
        </span>
      </div>
    </section>
  );
}
