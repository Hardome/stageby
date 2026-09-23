import type { Todo, TodoRow } from '#app/modules/todos/types';

export function toTodo(todo: TodoRow): Todo {
  return {
    id: todo.id,
    title: todo.title,
    description: todo.description,
    completed: todo.completed,
    createdAt: todo.createdAt.toISOString(),
    updatedAt: todo.updatedAt.toISOString(),
  };
}
