import { describe, expect, it } from 'vitest';
import { createFakeServer } from '../fakeServer';

function headers(auth?: string): Record<string, string> {
  return auth ? { Authorization: `Bearer ${auth}` } : {};
}

describe('demo API (fakeServer)', () => {
  it('lists, creates, toggles, and deletes todos', async () => {
    const server = createFakeServer();
    const list = await server.handle('GET', '/api/todos', new URLSearchParams(), {}, undefined);
    expect(list.status).toBe(200);
    expect(Array.isArray(list.body)).toBe(true);

    const created = await server.handle('POST', '/api/todos', new URLSearchParams(), {}, { title: 'Test todo' });
    expect(created.status).toBe(201);
    const todo = created.body as { id: number; title: string; done: boolean };
    expect(todo.title).toBe('Test todo');
    expect(todo.done).toBe(false);

    const toggled = await server.handle('PATCH', `/api/todos/${todo.id}`, new URLSearchParams(), {}, { done: true });
    expect((toggled.body as { done: boolean }).done).toBe(true);

    const deleted = await server.handle('DELETE', `/api/todos/${todo.id}`, new URLSearchParams(), {}, undefined);
    expect(deleted.status).toBe(204);
  });

  it('filters todos by status', async () => {
    const server = createFakeServer();
    const active = await server.handle('GET', '/api/todos', new URLSearchParams('status=active'), {}, undefined);
    const done = await server.handle('GET', '/api/todos', new URLSearchParams('status=done'), {}, undefined);
    expect((active.body as unknown[]).length).toBeGreaterThan(0);
    expect((done.body as unknown[]).length).toBe(1); // one seeded todo is done
  });

  it('paginates posts and ends with nextPage null', async () => {
    const server = createFakeServer();
    const first = await server.handle('GET', '/api/posts', new URLSearchParams('page=1&pageSize=5'), {}, undefined);
    const body = first.body as { items: unknown[]; nextPage: number | null };
    expect(body.items).toHaveLength(5);
    expect(body.nextPage).toBe(2);

    const last = await server.handle('GET', '/api/posts', new URLSearchParams('page=6&pageSize=5'), {}, undefined);
    const lastBody = last.body as { items: unknown[]; nextPage: number | null };
    expect(lastBody.items).toHaveLength(5);
    expect(lastBody.nextPage).toBeNull();
  });

  it('logs in, serves /me, rotates refresh tokens, and detects reuse', async () => {
    const server = createFakeServer();

    const bad = await server.handle('POST', '/api/auth/login', new URLSearchParams(), {}, { email: 'demo@example.com', password: 'wrong' });
    expect(bad.status).toBe(401);

    const login = await server.handle('POST', '/api/auth/login', new URLSearchParams(), {}, { email: 'demo@example.com', password: 'password1234' });
    expect(login.status).toBe(200);
    const tokens = login.body as { accessToken: string; refreshToken: string };

    const me = await server.handle('GET', '/api/auth/me', new URLSearchParams(), headers(tokens.accessToken), undefined);
    expect(me.status).toBe(200);
    expect((me.body as { email: string }).email).toBe('demo@example.com');

    const noAuth = await server.handle('GET', '/api/auth/me', new URLSearchParams(), {}, undefined);
    expect(noAuth.status).toBe(401);

    const refreshed = await server.handle('POST', '/api/auth/refresh', new URLSearchParams(), {}, { refreshToken: tokens.refreshToken });
    expect(refreshed.status).toBe(200);
    const newTokens = refreshed.body as { refreshToken: string };

    // Reusing the old (now revoked) refresh token is rejected — reuse detection.
    const reuse = await server.handle('POST', '/api/auth/refresh', new URLSearchParams(), {}, { refreshToken: tokens.refreshToken });
    expect(reuse.status).toBe(401);
    expect(newTokens.refreshToken).not.toBe(tokens.refreshToken);
  });

  it('fails the next mutation once when simulateFailureOnce is set', async () => {
    const server = createFakeServer();
    server.simulateFailureOnce();
    const failed = await server.handle('POST', '/api/todos', new URLSearchParams(), {}, { title: 'boom' });
    expect(failed.status).toBe(500);
    // And only once: the retry succeeds.
    const ok = await server.handle('POST', '/api/todos', new URLSearchParams(), {}, { title: 'fine' });
    expect(ok.status).toBe(201);
  });
});
