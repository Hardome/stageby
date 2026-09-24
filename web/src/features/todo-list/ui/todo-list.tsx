import { useListTodos } from '@api/queries/useListTodos';
import type { Todo } from '@api/types';

import { CreateTodoForm } from './create-form';
import { DeleteTodoButton } from './delete-button';
import { ToggleTodoCheckbox } from './toggle-todo-checkbox';

function TodoListItem({ todo }: { todo: Todo }) {
  return (
    <li className="group grid min-h-18 grid-cols-[auto_1fr_auto] items-center gap-3.5 rounded-2xl border border-stone-200 bg-white p-3.5 pl-4 transition hover:-translate-y-px hover:border-stone-300 hover:shadow-emerald-950/5 hover:shadow-lg">
      <ToggleTodoCheckbox completed={todo.completed} id={todo.id} title={todo.title} />
      <div className="min-w-0">
        <p
          className={`m-0 font-semibold [overflow-wrap:anywhere] ${
            todo.completed ? 'text-stone-400 line-through decoration-stone-400' : 'text-stone-900'
          }`}
        >
          {todo.title}
        </p>
        {todo.description && (
          <p
            className={`mt-1 mb-0 text-sm text-stone-500 [overflow-wrap:anywhere] ${todo.completed ? 'opacity-60' : ''}`}
          >
            {todo.description}
          </p>
        )}
      </div>
      <DeleteTodoButton id={todo.id} title={todo.title} />
    </li>
  );
}

export function TodoList() {
  const todos = useListTodos();

  if (todos.isPending) {
    return (
      <div aria-live="polite" className="flex min-h-44 items-center justify-center gap-2.5 text-stone-500">
        <span className="size-5 animate-spin rounded-full border-2 border-stone-300 border-t-emerald-700" />
        Загружаем задачи…
      </div>
    );
  }

  if (todos.isError) {
    return (
      <div
        className="flex min-h-44 flex-col items-center justify-center gap-2.5 text-center text-stone-500"
        role="alert"
      >
        <p className="m-0 font-bold text-stone-700">Не удалось загрузить задачи.</p>
        <button
          className="rounded-xl bg-emerald-100 px-4 py-2 font-bold text-emerald-900 transition hover:bg-emerald-200"
          onClick={() => void todos.refetch()}
          type="button"
        >
          Повторить
        </button>
      </div>
    );
  }

  if (todos.data.length === 0) {
    return (
      <div className="flex min-h-44 flex-col items-center justify-center gap-2 text-center text-stone-500">
        <span
          aria-hidden="true"
          className="mb-1 grid size-11 place-items-center rounded-full bg-emerald-100 font-black text-emerald-700"
        >
          ✓
        </span>
        <p className="m-0 font-bold text-stone-700">Список пока пуст</p>
        <span className="text-sm">Добавьте первую задачу — она появится здесь.</span>
      </div>
    );
  }

  const completedCount = todos.data.filter((todo) => todo.completed).length;

  return (
    <>
      <CreateTodoForm />
      <section aria-label="Список задач">
        <div className="flex justify-between px-0.5 pt-5 pb-3 font-bold text-stone-500 text-xs uppercase tracking-wider">
          <span>Всего: {todos.data.length}</span>
          <span>Выполнено: {completedCount}</span>
        </div>
        <ul className="m-0 grid list-none gap-2.5 p-0">
          {todos.data.map((todo) => (
            <TodoListItem key={todo.id} todo={todo} />
          ))}
        </ul>
      </section>
    </>
  );
}
