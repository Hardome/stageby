import type { CreateProject } from '#app/generated/types.gen';
import type { ProjectRepository } from '#app/modules/projects/repository';

export class ProjectService {
  readonly #repository: ProjectRepository;

  constructor(repository: ProjectRepository) {
    this.#repository = repository;
  }

  create(input: CreateProject) {
    return this.#repository.createAtomically(input);
  }
}
