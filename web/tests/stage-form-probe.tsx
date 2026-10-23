import { useStageForm } from '@features/stages/edit/lib/use-stage-form';

import { editStage } from './project-edit-fixture';

interface StageFormProbeProperties {
  onEditor: (editor: ReturnType<typeof useStageForm>) => void;
}

export function StageFormProbe({ onEditor }: Readonly<StageFormProbeProperties>) {
  const editor = useStageForm(editStage().stage);
  onEditor(editor);

  return (
    <form onSubmit={editor.save}>
      <button type="submit">Сохранить</button>
    </form>
  );
}
