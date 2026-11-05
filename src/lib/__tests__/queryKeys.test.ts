import { describe, expect, it } from 'vitest';
import { authKeys, postKeys, todoKeys } from '../queryKeys';

describe('query key factory', () => {
  it('builds hierarchical keys: invalidating todos covers lists and details', () => {
    const listKey = todoKeys.list({ status: 'all' });
    const detailKey = todoKeys.detail(42);
    // Both start with the same ['todos'] prefix, so invalidating todoKeys.all
    // refetches both. The factory guarantees this by construction.
    expect(listKey[0]).toBe('todos');
    expect(detailKey[0]).toBe('todos');
    expect(listKey).toEqual(['todos', 'list', { status: 'all' }]);
    expect(detailKey).toEqual(['todos', 'detail', 42]);
  });

  it('keeps different filters as different cache entries', () => {
    expect(todoKeys.list({ status: 'active' })).not.toEqual(todoKeys.list({ status: 'done' }));
    expect(todoKeys.list({ status: 'active' })).not.toEqual(todoKeys.list());
  });

  it('keeps the feed and auth keys in their own namespaces', () => {
    expect(postKeys.feed()).toEqual(['posts', 'feed']);
    expect(authKeys.me).toEqual(['auth', 'me']);
  });
});
