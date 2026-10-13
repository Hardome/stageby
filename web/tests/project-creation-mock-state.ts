const mocks = {
  create: vi.fn(),
  success: vi.fn(),
  dirty: vi.fn(),
  accessError: vi.fn(),
  upload: vi.fn(),
};

export function getProjectCreationMocks() {
  return mocks;
}
