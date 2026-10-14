import { createMemoryHistory, createRootRoute, createRoute, createRouter } from '@tanstack/react-router';

import { loginSearch, roleHome, safeReturnTo } from './access-navigation';

describe('access navigation', () => {
  it('chooses a home for each role', () => {
    expect(roleHome('manager')).toBe('/');
    expect(roleHome('foreman')).toBe('/my-stages');
  });

  it.each([
    undefined,
    ['/', '//example.com'],
    'https://example.com',
    '//example.com',
    String.raw`/\example.com`,
    '/%2f/example.com',
    '/%5c/example.com',
    '/\n/example.com',
    '/%00example.com',
    'javascript:alert(1)',
    '/login',
    '/login/?returnTo=/login',
    '/projects/%',
  ])('rejects unsafe or recursive return addresses: %s', (address) => {
    expect(safeReturnTo(address)).toBeUndefined();
  });

  it('preserves query parameters and hash through router navigation', async () => {
    const root = createRootRoute();
    const home = createRoute({ getParentRoute: () => root, path: '/' });
    const users = createRoute({ getParentRoute: () => root, path: '/users', validateSearch: (search) => search });
    const router = createRouter({ routeTree: root.addChildren([home, users]), history: createMemoryHistory() });
    const returnTo = safeReturnTo('/users?offset=20&query=alex#profile');

    await router.navigate({ to: '/', href: returnTo });

    const target = router.state.location;

    expect(target.pathname).toBe('/users');
    expect(target.search).toEqual({ offset: 20, query: 'alex' });
    expect(target.hash).toBe('profile');
    expect(loginSearch({ returnTo, ignored: true })).toEqual({ returnTo });
  });
});
