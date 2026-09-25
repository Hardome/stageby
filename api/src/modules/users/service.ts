import type { CreateUserWritable, UpdateUser } from '#app/generated/types.gen';
import { hashPassword } from '#app/modules/auth/password-hasher';
import {
  type ListUsersInput,
  LoginTakenError,
  type UpdateUserResult,
  type UserRepository,
} from '#app/modules/users/repository';

export type CreateUserResult =
  | { status: 'created'; user: Awaited<ReturnType<UserRepository['create']>> }
  | { status: 'login_taken' };

export class UserService {
  readonly #repository: UserRepository;

  constructor(repository: UserRepository) {
    this.#repository = repository;
  }

  list(input: ListUsersInput) {
    return this.#repository.list(input);
  }

  findById(id: number) {
    return this.#repository.findById(id);
  }

  async create(input: CreateUserWritable): Promise<CreateUserResult> {
    const passwordHash = await hashPassword(input.password);

    try {
      const user = await this.#repository.create({
        login: input.login,
        passwordHash,
        fullName: input.fullName,
        role: input.role,
        ...(input.phone !== undefined ? { phone: input.phone } : {}),
      });
      return { status: 'created', user };
    } catch (error) {
      if (error instanceof LoginTakenError) {
        return { status: 'login_taken' };
      }

      throw error;
    }
  }

  update(id: number, input: UpdateUser): Promise<UpdateUserResult> {
    return this.#repository.updateAtomically(id, input);
  }

  async setPassword(id: number, password: string): Promise<boolean> {
    const passwordHash = await hashPassword(password);
    return this.#repository.setPasswordAtomically(id, passwordHash);
  }
}
