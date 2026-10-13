const mocks = {
  load: vi.fn(),
  update: vi.fn(),
  dirty: vi.fn(),
  success: vi.fn(),
  access: vi.fn(),
  upload: vi.fn(),
};

export function getProjectEditingMocks() {
  return mocks;
}
