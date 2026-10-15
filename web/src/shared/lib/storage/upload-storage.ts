const databaseName = 'stageby-uploads';
const storeName = 'queues';

const operations = { pending: Promise.resolve() as Promise<unknown> };

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(databaseName, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(storeName);
    request.onsuccess = () => resolve(request.result);
    request.addEventListener('error', () => reject(request.error ?? new Error('Хранилище недоступно.')));
    request.onblocked = () => reject(new Error('Хранилище занято другой вкладкой.'));
  });
}

function transaction<T>(operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const previous = operations.pending;

  async function execute() {
    try {
      await previous;
    } catch {
      // Предыдущий отказ не блокирует последующие операции с хранилищем.
    }

    const database = await openDatabase();

    return new Promise<T>((resolve, reject) => {
      const current = database.transaction(storeName, 'readwrite');
      const request = operation(current.objectStore(storeName));
      current.oncomplete = () => {
        database.close();
        resolve(request.result);
      };
      current.addEventListener('abort', () => {
        database.close();
        reject(current.error ?? new Error('Сохранение очереди прервано.'));
      });
      current.addEventListener('error', () => reject(current.error ?? new Error('Очередь не сохранена.')));
    });
  }

  const next = execute();
  operations.pending = next;

  return next;
}

export function readUploadQueue(ownerId: number, scope: string): Promise<unknown> {
  return transaction((store) => store.get(`${ownerId}:${scope}`));
}

export function writeUploadQueue(ownerId: number, scope: string, value: unknown): Promise<unknown> {
  return transaction((store) => store.put(value, `${ownerId}:${scope}`));
}

export function clearUploadStorage(): Promise<unknown> {
  return transaction((store) => store.clear());
}

export async function reconcileUploadStorage(ownerId: number): Promise<void> {
  const storedOwner: unknown = await transaction((store) => store.get('owner'));

  if (storedOwner !== ownerId) await clearUploadStorage();
  await transaction((store) => store.put(ownerId, 'owner'));
}
