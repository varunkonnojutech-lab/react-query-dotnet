import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { todosApi, type TodoFilter } from '../api/todos';
import type { Todo } from '../lib/fakeServer';
import { todoKeys } from '../lib/queryKeys';

/** The list query. Filter lives in the key, so each filter has its own cache entry. */
export function useTodos(filter: TodoFilter = 'all') {
  return useQuery({
    queryKey: todoKeys.list({ status: filter }),
    queryFn: () => todosApi.list(filter),
  });
}

/**
 * Add a todo with an optimistic update:
 * 1. Cancel in-flight list refetches (they would overwrite our optimistic value).
 * 2. Snapshot the current list for rollback.
 * 3. Insert a temp todo immediately so the UI feels instant.
 * 4. On success, swap the temp todo for the server one (real id).
 * 5. On error, restore the snapshot — the user sees the add undone, with the error.
 * 6. Always invalidate at the end so the list converges with the server.
 */
export function useAddTodo(filter: TodoFilter = 'all') {
  const queryClient = useQueryClient();
  const listKey = todoKeys.list({ status: filter });

  return useMutation({
    mutationFn: (title: string) => todosApi.create(title),
    onMutate: async (title) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Todo[]>(listKey);
      const tempTodo: Todo = {
        id: Date.now(), // temp id — replaced by the server id on success
        title,
        done: false,
        createdAt: new Date().toISOString(),
      };
      queryClient.setQueryData<Todo[]>(listKey, (old) => [tempTodo, ...(old ?? [])]);
      return { previous, tempId: tempTodo.id };
    },
    onError: (_error, _title, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSuccess: (created, _title, context) => {
      queryClient.setQueryData<Todo[]>(listKey, (old) =>
        (old ?? []).map((t) => (t.id === context?.tempId ? created : t)),
      );
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

/** Toggle done/undone — optimistic, with rollback on failure. */
export function useToggleTodo(filter: TodoFilter = 'all') {
  const queryClient = useQueryClient();
  const listKey = todoKeys.list({ status: filter });

  return useMutation({
    mutationFn: (todo: Todo) => todosApi.toggle(todo),
    onMutate: async (todo) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Todo[]>(listKey);
      queryClient.setQueryData<Todo[]>(listKey, (old) =>
        (old ?? []).map((t) => (t.id === todo.id ? { ...t, done: !t.done } : t)),
      );
      return { previous };
    },
    onError: (_error, _todo, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}

/** Delete — optimistic removal, restored on failure. */
export function useDeleteTodo(filter: TodoFilter = 'all') {
  const queryClient = useQueryClient();
  const listKey = todoKeys.list({ status: filter });

  return useMutation({
    mutationFn: (id: number) => todosApi.remove(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: listKey });
      const previous = queryClient.getQueryData<Todo[]>(listKey);
      queryClient.setQueryData<Todo[]>(listKey, (old) => (old ?? []).filter((t) => t.id !== id));
      return { previous };
    },
    onError: (_error, _id, context) => {
      if (context?.previous) queryClient.setQueryData(listKey, context.previous);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: todoKeys.lists() });
    },
  });
}
