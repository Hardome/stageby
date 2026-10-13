import type { ProjectFormValues } from '@entities/project';

import type { ProjectEdit } from '@api/types';

export function projectExclusionReasons(
  snapshot: ProjectEdit,
  stages: Pick<ProjectFormValues['stages'][number], 'enabled'>[],
) {
  const included = stages.filter((stage) => stage.enabled).length;

  return snapshot.stages.map(({ stage }, index) => {
    if (stage.actualStartDate !== null) return 'Этап фактически начат — исключение запрещено.';

    return included === 1 && stages[index]?.enabled ? 'Нельзя исключить последний включённый этап.' : undefined;
  });
}
