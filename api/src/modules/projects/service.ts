import type { CreateProject, ListProjectsData, UpdateProject } from '#app/generated/types.gen';
import type { AuditContext } from '#app/modules/audit/context';
import type { ProjectRepository } from '#app/modules/projects/repository';

export class ProjectService {
  readonly #repository: ProjectRepository;

  constructor(repository: ProjectRepository) {
    this.#repository = repository;
  }

  get(projectId: number) {
    return this.#repository.get(projectId);
  }

  list(query: NonNullable<ListProjectsData['query']>) {
    return this.#repository.list(query);
  }

  update(projectId: number, input: UpdateProject, context: AuditContext) {
    return this.#repository.update(projectId, input, context);
  }

  create(input: CreateProject, key: string, context: AuditContext = { source: 'system' }) {
    return this.#repository.createAtomically(input, key, context);
  }
}
