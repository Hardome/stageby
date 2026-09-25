import { client } from '../../generated/api/.kubb/client';

export function configureApiClient(): void {
  client.setConfig({ credentials: 'include' });
}
