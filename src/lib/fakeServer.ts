/**
 * Demo API — an in-memory stand-in for a real .NET backend.
 *
 * When `VITE_API_URL` is unset, apiClient routes every request here instead
 * of the network, so `npm run dev` works with zero backend. The surface is
 * deliberately identical to the sibling `jwt-auth-deepdive` repo:
 *
 *   POST /api/auth/login    { email, password } -> tokens
 *   POST /api/auth/refresh  { refreshToken }    -> rotated tokens
 *   POST /api/auth/logout   { refreshToken }    -> 204
 *   GET  /api/auth/me                          -> { id, email, name, role }
 *   GET  /api/todos?status=                    -> Todo[]
 *   POST /api/todos        { title }            -> Todo
 *   PATCH /api/todos/:id   { title?, done? }    -> Todo
 *   DELETE /api/todos/:id                       -> 204
 *   GET  /api/posts?page=&pageSize=             -> { items, nextPage }
 *
 * Auth behaviour mirrors jwt-auth-deepdive on purpose: access tokens are
 * short-lived (2 minutes), refresh tokens rotate on every use, and reusing
 * a revoked refresh token revokes the whole family (reuse detection).
 *
 * Demo account: demo@example.com / password1234
 */

export interface Todo {
  id: number;
  title: string;
  done: boolean;
  createdAt: string;
}

export interface Post {
  id: number;
  title: string;
  body: string;
  author: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: string;
}

export interface ApiResponse<T> {
  status: number;
  body: T | { error: string };
}

const ACCESS_TOKEN_TTL_MS = 2 * 60_000;

const SEED_TODOS: Todo[] = [
  { id: 1, title: 'Read the query key factory (lib/queryKeys.ts)', done: true, createdAt: '2026-11-05T08:00:00.000Z' },
  { id: 2, title: 'Toggle a todo and watch the optimistic update', done: false, createdAt: '2026-11-05T08:01:00.000Z' },
  { id: 3, title: 'Turn on "Simulate failure" and toggle again — see the rollback', done: false, createdAt: '2026-11-05T08:02:00.000Z' },
  { id: 4, title: 'Open the feed tab and scroll — infinite query in action', done: false, createdAt: '2026-11-05T08:03:00.000Z' },
  { id: 5, title: 'Log in (demo@example.com / password1234) and watch /me load', done: false, createdAt: '2026-11-05T08:04:00.000Z' },
  { id: 6, title: 'Expire the token and click anything — silent refresh saves it', done: false, createdAt: '2026-11-05T08:05:00.000Z' },
];

const POST_AUTHORS = ['Ada Lovelace', 'Grace Hopper', 'Alan Turing', 'Edsger Dijkstra'];
const POST_TOPICS = [
  'Why staleTime is not cacheTime',
  'Optimistic updates without the foot-gun',
  'Invalidation vs refetch: pick one',
  'Prefetching on hover feels like magic',
  'Dependent queries and the enabled flag',
  'Retry budgets: stop hammering a down API',
  'Query keys are your cache schema',
  'Mutations are not queries (and why it matters)',
  'Background refetching, explained simply',
  'When to reach for useInfiniteQuery',
];

function seedPosts(): Post[] {
  return Array.from({ length: 30 }, (_, i) => ({
    id: i + 1,
    title: `${POST_TOPICS[i % POST_TOPICS.length]} (part ${Math.floor(i / POST_TOPICS.length) + 1})`,
    body: `Post #${i + 1} in the demo feed. In a real app this page came from the API with cursor pagination; here it comes from the in-memory demo server in src/lib/fakeServer.ts.`,
    author: POST_AUTHORS[i % POST_AUTHORS.length],
  }));
}

interface RefreshRecord {
  token: string;
  userId: string;
  revokedAt: string | null;
  replacedBy: string | null;
}

export function createFakeServer() {
  let todos: Todo[] = [...SEED_TODOS];
  let nextTodoId = SEED_TODOS.length + 1;
  const posts = seedPosts();

  // One demo user, mirroring the jwt-auth-deepdive seed shape.
  const user = { id: 'demo-user-1', email: 'demo@example.com', name: 'Demo User', role: 'User' };
  const password = 'password1234';

  const accessTokens = new Map<string, { userId: string; expiresAt: number }>();
  const refreshTokens = new Map<string, RefreshRecord>();
  let tokenCounter = 0;

  /** Flip to true to make the next mutating request fail with a 500. */
  let failNextMutation = false;
  const latencyMs = 250;

  function mintTokens(userId: string): AuthTokens {
    tokenCounter += 1;
    const accessToken = `demo-access-${tokenCounter}-${Date.now()}`;
    const refreshToken = `demo-refresh-${tokenCounter}-${Date.now()}`;
    const expiresAt = Date.now() + ACCESS_TOKEN_TTL_MS;
    accessTokens.set(accessToken, { userId, expiresAt });
    refreshTokens.set(refreshToken, { token: refreshToken, userId, revokedAt: null, replacedBy: null });
    return { accessToken, refreshToken, accessTokenExpiresAt: new Date(expiresAt).toISOString() };
  }

  function bearerUserId(headers: Record<string, string>): string | null {
    const header = headers['authorization'] ?? headers['Authorization'];
    if (!header?.startsWith('Bearer ')) return null;
    const record = accessTokens.get(header.slice('Bearer '.length));
    if (!record || record.expiresAt <= Date.now()) return null;
    return record.userId;
  }

  function ok<T>(body: T, status = 200): ApiResponse<T> {
    return { status, body };
  }
  function fail(error: string, status: number): ApiResponse<never> {
    return { status, body: { error } };
  }

  async function handle(
    method: string,
    path: string,
    query: URLSearchParams,
    headers: Record<string, string>,
    rawBody: unknown,
  ): Promise<ApiResponse<unknown>> {
    await new Promise((resolve) => setTimeout(resolve, latencyMs));

    // --- Auth ---
    if (path === '/api/auth/login' && method === 'POST') {
      const body = rawBody as { email?: string; password?: string };
      if (body?.email?.toLowerCase() !== user.email || body?.password !== password) {
        return fail('Invalid email or password.', 401);
      }
      return ok(mintTokens(user.id));
    }

    if (path === '/api/auth/refresh' && method === 'POST') {
      const body = rawBody as { refreshToken?: string };
      const record = body?.refreshToken ? refreshTokens.get(body.refreshToken) : undefined;
      if (!record) return fail('Invalid refresh token.', 401);
      if (record.revokedAt) {
        // Reuse detection: a revoked token presented again revokes the family.
        for (const r of refreshTokens.values()) {
          if (r.userId === record.userId) r.revokedAt = new Date().toISOString();
        }
        return fail('Refresh token reuse detected. Please log in again.', 401);
      }
      // Rotate: revoke the old token, issue a new pair.
      const tokens = mintTokens(record.userId);
      record.revokedAt = new Date().toISOString();
      record.replacedBy = tokens.refreshToken;
      return ok(tokens);
    }

    if (path === '/api/auth/logout' && method === 'POST') {
      const body = rawBody as { refreshToken?: string };
      if (body?.refreshToken) refreshTokens.delete(body.refreshToken);
      return ok(null, 204);
    }

    if (path === '/api/auth/me' && method === 'GET') {
      const userId = bearerUserId(headers);
      if (!userId) return fail('Unauthorized.', 401);
      return ok({ id: user.id, email: user.email, name: user.name, role: user.role });
    }

    // --- Todos (public in the demo; the real API would require auth) ---
    if (path === '/api/todos' && method === 'GET') {
      const status = query.get('status');
      const list = status === 'active'
        ? todos.filter((t) => !t.done)
        : status === 'done'
          ? todos.filter((t) => t.done)
          : [...todos];
      return ok(list);
    }

    if (path === '/api/todos' && method === 'POST') {
      if (failNextMutation) { failNextMutation = false; return fail('Simulated server error (500).', 500); }
      const body = rawBody as { title?: string };
      if (!body?.title?.trim()) return fail('Title is required.', 400);
      const todo: Todo = { id: nextTodoId++, title: body.title.trim(), done: false, createdAt: new Date().toISOString() };
      todos = [todo, ...todos];
      return ok(todo, 201);
    }

    const todoMatch = path.match(/^\/api\/todos\/(\d+)$/);
    if (todoMatch) {
      const id = Number(todoMatch[1]);
      if (method === 'PATCH') {
        if (failNextMutation) { failNextMutation = false; return fail('Simulated server error (500).', 500); }
        const index = todos.findIndex((t) => t.id === id);
        if (index === -1) return fail('Todo not found.', 404);
        const body = rawBody as { title?: string; done?: boolean };
        todos[index] = { ...todos[index], ...(body.title !== undefined ? { title: body.title } : {}), ...(body.done !== undefined ? { done: body.done } : {}) };
        return ok(todos[index]);
      }
      if (method === 'DELETE') {
        if (failNextMutation) { failNextMutation = false; return fail('Simulated server error (500).', 500); }
        if (!todos.some((t) => t.id === id)) return fail('Todo not found.', 404);
        todos = todos.filter((t) => t.id !== id);
        return ok(null, 204);
      }
    }

    // --- Posts (cursor-style pagination via ?page=) ---
    if (path === '/api/posts' && method === 'GET') {
      const page = Math.max(1, Number(query.get('page') ?? '1') || 1);
      const pageSize = Math.min(50, Math.max(1, Number(query.get('pageSize') ?? '5') || 5));
      const start = (page - 1) * pageSize;
      const items = posts.slice(start, start + pageSize);
      return ok({ items, nextPage: start + pageSize < posts.length ? page + 1 : null });
    }

    return fail(`No demo route for ${method} ${path}.`, 404);
  }

  return {
    handle,
    /** Next POST/PATCH/DELETE fails with a 500 — the UI's rollback demo. */
    simulateFailureOnce() { failNextMutation = true; },
    reset() {
      todos = [...SEED_TODOS];
      nextTodoId = SEED_TODOS.length + 1;
      accessTokens.clear();
      refreshTokens.clear();
      failNextMutation = false;
    },
  };
}

export type FakeServer = ReturnType<typeof createFakeServer>;

/** App-wide singleton (tests create their own via createFakeServer()). */
export const fakeServer = createFakeServer();
