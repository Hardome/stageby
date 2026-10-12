// cspell:ignore unstub
import { act } from 'react';

import { createRoot, type Root } from 'react-dom/client';

import { ProjectDocument } from './project-document';

const mocks = vi.hoisted(() => ({ get: vi.fn(), access: vi.fn() }));
vi.mock('@api/clients/getFileContent', () => ({ getFileContent: () => ({ unwrap: mocks.get }) }));
vi.mock('@shared/lib/hooks', () => ({ useAccessError: () => mocks.access }));

describe('project PDF access', () => {
  let root: Root;
  let container: HTMLDivElement;
  const tab = { opener: {}, location: { href: '' }, close: vi.fn() };
  const openTab = vi.fn();
  beforeEach(async () => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    vi.clearAllMocks();
    openTab.mockReturnValue(tab);
    vi.spyOn(window, 'open').mockImplementation(openTab);
    container = document.createElement('div');
    document.body.append(container);
    root = createRoot(container);
    await act(async () => {
      root.render(<ProjectDocument fileId={3} number={1} />);
      await Promise.resolve();
    });
  });
  afterEach(async () => {
    await act(async () => {
      root.unmount();
      await Promise.resolve();
    });
    container.remove();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });
  it('opens the signed URL only after the authorized request', async () => {
    mocks.get.mockResolvedValue({ downloadUrl: 'https://storage.example/project.pdf' });
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(openTab).toHaveBeenCalledWith('about:blank', '_blank');
    expect(tab.location.href).toBe('https://storage.example/project.pdf');
    expect(tab.opener).toBeNull();
  });
  it('closes the blank tab and allows retry after session failure', async () => {
    const error = { status: 401 };
    mocks.get.mockRejectedValue(error);
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(tab.close).toHaveBeenCalledOnce();
    expect(mocks.access).toHaveBeenCalledWith(error);
    expect(container).toHaveTextContent('Не удалось открыть PDF');
    expect(container.querySelector('button')).not.toBeDisabled();
  });
  it('explains a blocked popup without issuing a request', async () => {
    openTab.mockReturnValue(null);
    await act(async () => {
      container.querySelector('button')?.click();
      await Promise.resolve();
    });
    expect(mocks.get).not.toHaveBeenCalled();
    expect(container).toHaveTextContent('Разрешите открытие новой вкладки');
  });
});
