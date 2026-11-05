import { apiClient } from '../lib/apiClient';
import type { Todo } from '../lib/fakeServer';

export type TodoFilter = 'all' | 'active' | 'done';

export const todosApi = {
  list: (filter: TodoFilter = 'all') =>
    apiClient.get<Todo[]>(`/api/todos${filter === 'all' ? '' : `?status=${filter}`}`),

  create: (title: string) => apiClient.post<Todo>('/api/todos', { title }),

  toggle: (todo: Todo) =>
    apiClient.patch<Todo>(`/api/todos/${todo.id}`, { done: !todo.done }),

  remove: (id: number) => apiClient.delete<void>(`/api/todos/${id}`),
};
