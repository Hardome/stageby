import { writeSessionDraft } from '@shared/lib';
import { setupProjectCreation, types } from '@tests/project-creation-harness';

describe('project form recovery', () => {
  const setup = setupProjectCreation();

  it('restores incomplete input after remounting and keeps the form dirty', async () => {
    await setup.fill('ownerName', 'Незавершённое имя');
    await setup.fill('coordinates', '56.');

    await setup.renderForm(types, 'returned-session');

    expect(setup.input('ownerName').value).toBe('Незавершённое имя');
    expect(setup.input('coordinates').value).toBe('56.');
  });

  it('ignores malformed drafts and drafts belonging to another account', async () => {
    writeSessionDraft('create-project:v1:1', { ownerName: 'Повреждённый черновик' });
    writeSessionDraft('create-project:v1:2', { ownerName: 'Чужой черновик' });

    await setup.renderForm(types, 'returned-session');

    expect(setup.input('ownerName').value).toBe('');
  });
});
