import type { CreateProject } from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import type { ProjectRepository } from '#app/modules/projects/repository';

export class ProjectService {
  readonly #repository: ProjectRepository;

  constructor(repository: ProjectRepository) {
    this.#repository = repository;
  }

  create(input: CreateProject, context: AuditContext = { source: 'system' }) {
    return this.#repository.createAtomically(input, context);
  }
}
