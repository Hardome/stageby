import type { CreateTodo, Todo, UpdateTodo } from '../generated/types.gen.js';

export interface TodoRepository {
  findAll(): Promise<Todo[]>;
  findById(id: string): Promise<Todo | null>;
  create(input: CreateTodo): Promise<Todo>;
  update(id: string, input: UpdateTodo): Promise<Todo | null>;
  delete(id: string): Promise<boolean>;
}
