import { Table, TableBody } from '@shared/ui/table';

import type { DashboardProjectRow } from '@api/types';

import { DashboardProjectCard } from './dashboard-project-card';
import { DashboardProjectRow as ProjectRow } from './dashboard-project-row';
import { DashboardProjectTableHeader } from './dashboard-project-table-header';

interface DashboardProjectResultsProperties {
  projects: DashboardProjectRow[];
  today: string;
}

export function DashboardProjectResults({ projects, today }: Readonly<DashboardProjectResultsProperties>) {
  return (
    <>
      <ul aria-label="Карточки объектов" className="grid gap-4 md:hidden">
        {projects.map((project) => (
          <li key={project.projectId} className="min-w-0">
            <DashboardProjectCard project={project} today={today} />
          </li>
        ))}
      </ul>
      <div className="hidden md:block">
        <Table aria-label="Таблица объектов">
          <DashboardProjectTableHeader />
          <TableBody>
            {projects.map((project) => (
              <ProjectRow key={project.projectId} project={project} today={today} />
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
