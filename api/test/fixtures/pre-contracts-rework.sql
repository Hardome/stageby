begin;

insert into "users" (
  "id",
  "login",
  "passwordHash",
  "fullName",
  "role",
  "phone",
  "isActive",
  "createdAt",
  "updatedAt"
)
overriding system value
values
  (1, 'manager.baseline', 'baseline-manager-hash', 'Baseline Manager', 'manager', '+79990000001', true, '2026-01-01 08:00:00+00', '2026-01-01 08:00:00+00'),
  (2, 'estimator.baseline', 'baseline-estimator-hash', 'Baseline Estimator', 'estimator', null, true, '2026-01-01 08:05:00+00', '2026-01-01 08:05:00+00'),
  (3, 'foreman.baseline', 'baseline-foreman-hash', 'Baseline Foreman', 'foreman', '+79990000003', true, '2026-01-01 08:10:00+00', '2026-01-01 08:10:00+00'),
  (4, 'inspector.baseline', 'baseline-inspector-hash', 'Baseline Inspector', 'inspector', null, false, '2026-01-01 08:15:00+00', '2026-01-02 08:15:00+00');

insert into "sessions" (
  "id",
  "userId",
  "tokenHash",
  "expiresAt",
  "createdAt"
)
overriding system value
values
  (1, 1, repeat('a', 64), '2027-01-01 08:00:00+00', '2026-01-01 08:00:00+00');

insert into "todos" (
  "id",
  "title",
  "description",
  "completed",
  "createdAt",
  "updatedAt"
)
values
  ('00000000-0000-4000-8000-000000000001', 'Baseline todo', 'Record from the pre-contracts-rework schema', false, '2026-01-01 09:00:00+00', '2026-01-01 09:00:00+00');

insert into "projects" (
  "id",
  "title",
  "ownerName",
  "address",
  "latitude",
  "longitude",
  "cadastralNumber",
  "houseDesign",
  "contractLabel",
  "dueDate",
  "notes",
  "isArchived",
  "createdAt",
  "updatedAt"
)
overriding system value
values
  (1, 'Baseline project', 'Baseline Client', 'Baseline address, 1', 56.838011, 60.597474, '66:41:0000000:1', 'Individual house', 'BASE-001', '2026-12-31', 'Covers populated optional fields.', false, '2026-01-02 08:00:00+00', '2026-01-02 08:00:00+00'),
  (2, 'Archived baseline project', 'Archived Client', null, null, null, null, null, null, null, null, true, '2025-12-01 08:00:00+00', '2026-01-03 08:00:00+00');

insert into "stages" (
  "id",
  "projectId",
  "type",
  "position",
  "workSubtypes",
  "assigneeId",
  "inspectorId",
  "status",
  "plannedStartDate",
  "plannedEndDate",
  "actualStartDate",
  "actualEndDate",
  "notes",
  "version",
  "createdAt",
  "updatedAt"
)
overriding system value
values
  (1, 1, 'foundation', 1, array['excavation', 'concrete']::varchar[], 3, 4, 'created', '2026-02-01', '2026-02-10', null, null, 'Created stage.', 1, '2026-01-02 09:00:00+00', '2026-01-02 09:00:00+00'),
  (2, 1, 'walls', 2, array['blocks']::varchar[], 3, 4, 'assigned', '2026-02-11', '2026-02-20', null, null, null, 2, '2026-01-02 09:05:00+00', '2026-01-03 09:05:00+00'),
  (3, 1, 'roof', 3, array[]::varchar[], 3, null, 'supplied', '2026-02-21', '2026-03-01', null, null, null, 1, '2026-01-02 09:10:00+00', '2026-01-02 09:10:00+00'),
  (4, 1, 'windows', 4, array['installation']::varchar[], 3, 4, 'started', '2026-03-02', '2026-03-05', '2026-03-02', null, null, 1, '2026-01-02 09:15:00+00', '2026-03-02 08:00:00+00'),
  (5, 1, 'facade', 5, array['insulation', 'cladding']::varchar[], 3, 4, 'in_progress', '2026-03-06', '2026-03-15', '2026-03-06', null, null, 3, '2026-01-02 09:20:00+00', '2026-03-10 08:00:00+00'),
  (6, 1, 'electrical', 6, array['rough-in']::varchar[], 3, 4, 'acceptance', '2026-03-16', '2026-03-22', '2026-03-16', '2026-03-21', null, 4, '2026-01-02 09:25:00+00', '2026-03-21 08:00:00+00'),
  (7, 1, 'plaster', 7, array['walls', 'ceilings']::varchar[], 3, 4, 'completed', '2026-03-23', '2026-04-01', '2026-03-23', '2026-03-31', 'Legacy plaster type.', 2, '2026-01-02 09:30:00+00', '2026-03-31 08:00:00+00'),
  (8, 1, 'heating', 8, array['boiler']::varchar[], null, null, 'created', null, null, null, null, null, 1, '2026-01-02 09:35:00+00', '2026-01-02 09:35:00+00');

insert into "stage_predecessors" ("projectId", "stageId", "predecessorStageId")
values
  (1, 2, 1),
  (1, 3, 2),
  (1, 4, 3),
  (1, 5, 4),
  (1, 6, 5),
  (1, 7, 6),
  (1, 8, 7);

insert into "checklists" ("id", "stageId", "version", "createdAt", "updatedAt")
overriding system value
values
  (1, 6, 2, '2026-03-16 08:00:00+00', '2026-03-20 08:00:00+00'),
  (2, 7, 1, '2026-03-23 08:00:00+00', '2026-03-31 08:00:00+00');

insert into "checklist_items" (
  "id",
  "checklistId",
  "title",
  "position",
  "isCompleted",
  "completedAt",
  "completedByUserId"
)
overriding system value
values
  (1, 1, 'Upload electrical panel photo', 1, true, '2026-03-20 10:00:00+00', 3),
  (2, 1, 'Check cable labels', 2, false, null, null),
  (3, 2, 'Upload finished walls photo', 1, true, '2026-03-30 10:00:00+00', 3),
  (4, 2, 'Upload finished ceilings photo', 2, true, '2026-03-30 10:05:00+00', 3);

insert into "acceptances" (
  "id",
  "stageId",
  "decision",
  "comment",
  "correctionDueDate",
  "decidedByUserId",
  "decidedAt"
)
overriding system value
values
  (1, 6, 'rejected', 'Replace one incorrectly labelled cable.', '2026-03-25', 4, '2026-03-21 12:00:00+00'),
  (2, 7, 'accepted', 'Accepted without corrections.', null, 4, '2026-03-31 12:00:00+00');

insert into "acceptance_items" ("acceptanceId", "checklistItemId")
values
  (1, 2),
  (2, 3),
  (2, 4);

select setval(pg_get_serial_sequence('users', 'id'), (select max("id") from "users"), true);
select setval(pg_get_serial_sequence('sessions', 'id'), (select max("id") from "sessions"), true);
select setval(pg_get_serial_sequence('projects', 'id'), (select max("id") from "projects"), true);
select setval(pg_get_serial_sequence('stages', 'id'), (select max("id") from "stages"), true);
select setval(pg_get_serial_sequence('checklists', 'id'), (select max("id") from "checklists"), true);
select setval(pg_get_serial_sequence('checklist_items', 'id'), (select max("id") from "checklist_items"), true);
select setval(pg_get_serial_sequence('acceptances', 'id'), (select max("id") from "acceptances"), true);

commit;
