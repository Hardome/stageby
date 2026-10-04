-- New template edition for edited.ver2. Individual checklists and previous
-- template editions remain intact; public stage codes stay stable.
UPDATE "stage_types"
SET "title" = CASE "code"
  WHEN 'windows' THEN 'Окна, двери'
  WHEN 'finishing' THEN 'Штукатурка'
END, "updatedAt" = now()
WHERE "code" IN ('windows', 'finishing');--> statement-breakpoint
UPDATE "checklist_templates"
SET "isActive" = false, "updatedAt" = now()
WHERE "isActive" AND "stageTypeCode" IN (
  'foundation', 'walls', 'roof', 'windows', 'facade', 'electrical', 'finishing', 'heating'
);--> statement-breakpoint
INSERT INTO "checklist_templates" ("stageTypeCode")
SELECT "code" FROM "stage_types"
WHERE "code" IN ('foundation', 'walls', 'roof', 'windows', 'facade', 'electrical', 'finishing', 'heating')
ORDER BY "position";--> statement-breakpoint
INSERT INTO "checklist_template_items" ("checklistTemplateId", "title", "photoHint", "position")
SELECT template."id", item."title", item."photoHint", item."position"
FROM "checklist_templates" template
JOIN (
  VALUES
    ('foundation', 1, 'Подготовка котлована и канализации', 'Котлован должен войти во весь кадр с двух сторон'),
    ('foundation', 2, 'Армирование', 'Фото перевязки всех углов и перехлёста арматуры'),
    ('foundation', 3, 'Тёплые полы', 'Фото развязки тёплого пола и вывода в коллекторные группы'),
    ('foundation', 4, 'Бетонные работы и укрытие бетона плёнкой', 'Фото фундамента с двух сторон'),
    ('foundation', 5, 'Уборка', NULL),
    ('walls', 1, 'Стартовый ряд, армировка стартового ряда', 'Фото армировки и первого ряда'),
    ('walls', 2, 'Кладка до первой армировки', 'Фото кладки'),
    ('walls', 3, 'Кладка до второй армировки', 'Фото кладки'),
    ('walls', 4, 'Кладка до третьего ряда армировки', 'Фото кладки'),
    ('walls', 5, 'Армопояс', 'Фото армировки армопояса'),
    ('walls', 6, 'Уборка', NULL),
    ('roof', 1, 'Мауэрлат', 'Фото крепления мауэрлата'),
    ('roof', 2, 'Лаги, стропила', 'Фото крепления лаг и стропил'),
    ('roof', 3, 'Пароизоляция', 'Фото крыши со всех сторон'),
    ('roof', 4, 'Утепление', 'Фото утеплителя'),
    ('roof', 5, 'Ветрозащита и обрешётка', 'Фото ветрозащиты с обрешёткой'),
    ('roof', 6, 'Кровельное покрытие', 'Фото кровли со всех сторон'),
    ('roof', 7, 'Лобовые, торцевые планки', 'Фото планок'),
    ('roof', 8, 'Уборка', NULL),
    ('windows', 1, 'Установка окон', 'Фото каждого окна'),
    ('windows', 2, 'Установка дверей', 'Фото каждой двери'),
    ('windows', 3, 'Уборка', NULL),
    ('facade', 1, 'Утепление', 'Фото утеплителя'),
    ('facade', 2, 'Армировка', 'Фото армировки'),
    ('facade', 3, 'Фасадное покрытие', 'Фото фасада со всех сторон'),
    ('facade', 4, 'Уборка', NULL),
    ('electrical', 1, 'Установка щитового оборудования', 'Фото всех щитков'),
    ('electrical', 2, 'Установка распределительных коробок', 'Фото каждой коробки'),
    ('electrical', 3, 'Уборка', NULL),
    ('finishing', 1, 'Армировка штукатурных углов, проёмов', 'Фото углов и проёмов'),
    ('finishing', 2, 'Штукатурка', 'Фото всех стен'),
    ('finishing', 3, 'Уборка', NULL),
    ('heating', 1, 'Установка котлов и коллекторов', 'Фото соединений, котлов и коллекторов'),
    ('heating', 2, 'Уборка', NULL)
) AS item("stageTypeCode", "position", "title", "photoHint")
  ON item."stageTypeCode" = template."stageTypeCode"
WHERE template."isActive";
