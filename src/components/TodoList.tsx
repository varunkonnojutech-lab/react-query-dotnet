import { useState } from 'react';
import { useAddTodo, useDeleteTodo, useTodos, useToggleTodo } from '../hooks/useTodos';
import type { TodoFilter } from '../api/todos';
import { fakeServer } from '../lib/fakeServer';

export function TodoList() {
  const [filter, setFilter] = useState<TodoFilter>('all');
  const [title, setTitle] = useState('');
  const [simulateFailure, setSimulateFailure] = useState(false);

  const { data: todos, isPending, isError, error, refetch, isFetching } = useTodos(filter);
  const addTodo = useAddTodo(filter);
  const toggleTodo = useToggleTodo(filter);
  const deleteTodo = useDeleteTodo(filter);

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = title.trim();
    if (!trimmed) return;
    if (simulateFailure) fakeServer.simulateFailureOnce();
    addTodo.mutate(trimmed);
    setTitle('');
  }

  return (
    <section>
      <h2>Todos — useQuery + optimistic mutations</h2>
      <p>
        The list is a <code>useQuery</code>. Adding, toggling, and deleting are{' '}
        <code>useMutation</code>s with optimistic updates: the UI changes instantly and rolls
        back if the server says no. Turn on “Simulate failure” and toggle a todo to watch
        the rollback happen.
      </p>

      <div className="toolbar">
        {(['all', 'active', 'done'] as TodoFilter[]).map((f) => (
          <button key={f} className={filter === f ? 'active' : ''} onClick={() => setFilter(f)}>
            {f[0].toUpperCase() + f.slice(1)}
          </button>
        ))}
        <label className="checkbox">
          <input
            type="checkbox"
            checked={simulateFailure}
            onChange={(e) => setSimulateFailure(e.target.checked)}
          />
          Simulate failure on next mutation
        </label>
        <button onClick={() => void refetch()} disabled={isFetching}>
          {isFetching ? 'Refetching…' : 'Refetch'}
        </button>
      </div>

      <form onSubmit={handleAdd} className="add-form">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs doing?"
          aria-label="New todo title"
        />
        <button type="submit" disabled={addTodo.isPending || !title.trim()}>
          Add todo
        </button>
      </form>

      {addTodo.isError && <p className="error">Add failed: {addTodo.error.message} — the optimistic row was rolled back.</p>}
      {toggleTodo.isError && <p className="error">Toggle failed: {toggleTodo.error.message} — restored.</p>}
      {deleteTodo.isError && <p className="error">Delete failed: {deleteTodo.error.message} — restored.</p>}

      {isPending && <p>Loading todos…</p>}
      {isError && (
        <p className="error">
          Couldn’t load todos: {error.message}{' '}
          <button onClick={() => void refetch()}>Retry</button>
        </p>
      )}

      <ul className="todo-list">
        {todos?.map((todo) => (
          <li key={todo.id} className={todo.done ? 'done' : ''}>
            <label>
              <input
                type="checkbox"
                checked={todo.done}
                onChange={() => {
                  if (simulateFailure) fakeServer.simulateFailureOnce();
                  toggleTodo.mutate(todo);
                }}
              />
              {todo.title}
            </label>
            <button
              className="danger"
              onClick={() => {
                if (simulateFailure) fakeServer.simulateFailureOnce();
                deleteTodo.mutate(todo.id);
              }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
      {todos?.length === 0 && <p>No todos here. Add one above.</p>}
      {isFetching && !isPending && <p className="muted">Background refetch in progress…</p>}
    </section>
  );
}
