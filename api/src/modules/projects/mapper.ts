import type { ProjectRow } from '#app/db/schema/projects';
import type { Project } from '#app/generated/types.gen';

export function toProject(project: ProjectRow): Project {
  return {
    id: project.id,
    ownerName: project.ownerName,
    address: project.address,
    coordinates: {
      latitude: project.latitude,
      longitude: project.longitude,
    },
    cadastralNumber: project.cadastralNumber,
    houseDesign: project.houseDesign,
    contractLabel: project.contractLabel,
    plannedStartDate: project.plannedStartDate,
    plannedEndDate: project.plannedEndDate,
    notes: project.notes,
    isArchived: project.isArchived,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
  };
}
