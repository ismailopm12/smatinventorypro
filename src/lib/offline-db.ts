// Offline database using native IndexedDB API

const DB_NAME = 'inventory-offline-db';
const DB_VERSION = 1;

let db: IDBDatabase | null = null;

function getDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (db) {
      resolve(db);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);

    request.onsuccess = () => {
      db = request.result;
      resolve(db);
    };

    request.onupgradeneeded = (event) => {
      const database = (event.target as IDBOpenDBRequest).result;

      // Items store
      if (!database.objectStoreNames.contains('items')) {
        database.createObjectStore('items', { keyPath: 'id' });
      }

      // Categories store
      if (!database.objectStoreNames.contains('categories')) {
        database.createObjectStore('categories', { keyPath: 'id' });
      }

      // Batches store
      if (!database.objectStoreNames.contains('batches')) {
        database.createObjectStore('batches', { keyPath: 'id' });
      }

      // Transactions store
      if (!database.objectStoreNames.contains('transactions')) {
        database.createObjectStore('transactions', { keyPath: 'id' });
      }

      // Pending operations store
      if (!database.objectStoreNames.contains('pendingOperations')) {
        database.createObjectStore('pendingOperations', { keyPath: 'id', autoIncrement: true });
      }

      // Metadata store
      if (!database.objectStoreNames.contains('metadata')) {
        database.createObjectStore('metadata', { keyPath: 'key' });
      }
    };
  });
}

// Generic put operation
async function putItem(storeName: string, item: any): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.put(item);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Generic getAll operation
async function getAllItems(storeName: string): Promise<any[]> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.getAll();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result || []);
  });
}

// Generic delete operation
async function deleteItem(storeName: string, key: any): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.delete(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Generic clear operation
async function clearStore(storeName: string): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readwrite');
    const store = tx.objectStore(storeName);
    const request = store.clear();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Generic count operation
async function countItems(storeName: string): Promise<number> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    const request = store.count();
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

// Cache items locally
export async function cacheItems(items: any[]): Promise<void> {
  for (const item of items) {
    await putItem('items', {
      id: item.id,
      data: item,
      synced: true,
      updatedAt: Date.now(),
    });
  }
  await setMetadata('items_last_sync', Date.now());
}

// Get cached items
export async function getCachedItems(): Promise<any[]> {
  const items = await getAllItems('items');
  return items.map(item => item.data);
}

// Cache categories locally
export async function cacheCategories(categories: any[]): Promise<void> {
  for (const category of categories) {
    await putItem('categories', {
      id: category.id,
      data: category,
      synced: true,
      updatedAt: Date.now(),
    });
  }
  await setMetadata('categories_last_sync', Date.now());
}

// Get cached categories
export async function getCachedCategories(): Promise<any[]> {
  const categories = await getAllItems('categories');
  return categories.map(cat => cat.data);
}

// Cache batches locally
export async function cacheBatches(batches: any[]): Promise<void> {
  for (const batch of batches) {
    await putItem('batches', {
      id: batch.id,
      data: batch,
      synced: true,
      updatedAt: Date.now(),
    });
  }
}

// Get cached batches for an item
export async function getCachedBatchesForItem(itemId: string): Promise<any[]> {
  const allBatches = await getAllItems('batches');
  return allBatches
    .filter(batch => batch.data.item_id === itemId)
    .map(batch => batch.data);
}

// Cache transactions locally
export async function cacheTransactions(transactions: any[]): Promise<void> {
  for (const transaction of transactions) {
    await putItem('transactions', {
      id: transaction.id,
      data: transaction,
      synced: true,
      updatedAt: Date.now(),
    });
  }
  await setMetadata('transactions_last_sync', Date.now());
}

// Get cached transactions
export async function getCachedTransactions(): Promise<any[]> {
  const transactions = await getAllItems('transactions');
  return transactions.map(tx => tx.data);
}

// Add a pending operation (for offline writes)
export async function addPendingOperation(
  type: 'create' | 'update' | 'delete',
  table: string,
  data: any
): Promise<void> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('pendingOperations', 'readwrite');
    const store = tx.objectStore('pendingOperations');
    const request = store.add({
      type,
      table,
      data,
      createdAt: Date.now(),
    });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve();
  });
}

// Get all pending operations
export async function getPendingOperations(): Promise<any[]> {
  return getAllItems('pendingOperations');
}

// Clear a pending operation after sync
export async function clearPendingOperation(id: number): Promise<void> {
  return deleteItem('pendingOperations', id);
}

// Clear all pending operations
export async function clearAllPendingOperations(): Promise<void> {
  return clearStore('pendingOperations');
}

// Set metadata
export async function setMetadata(key: string, value: any): Promise<void> {
  return putItem('metadata', { key, value });
}

// Get metadata
export async function getMetadata(key: string): Promise<any> {
  const database = await getDB();
  return new Promise((resolve, reject) => {
    const tx = database.transaction('metadata', 'readonly');
    const store = tx.objectStore('metadata');
    const request = store.get(key);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result?.value);
  });
}

// Check if we have cached data
export async function hasCachedData(): Promise<boolean> {
  const itemCount = await countItems('items');
  return itemCount > 0;
}

// Clear all cached data
export async function clearAllCachedData(): Promise<void> {
  await Promise.all([
    clearStore('items'),
    clearStore('categories'),
    clearStore('batches'),
    clearStore('transactions'),
    clearStore('metadata'),
  ]);
}