export type ProductMutation = {
  id: string;
  userId: string;
  kind: "insert" | "update" | "delete";
  productId: string;
  payload?: Record<string, unknown>;
  createdAt: number;
};

const DB_NAME = "bangnet-manager-offline";
const DB_VERSION = 1;
const QUEUE = "product-queue";
const SNAPSHOTS = "product-snapshots";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(QUEUE)) db.createObjectStore(QUEUE, { keyPath: "id" });
      if (!db.objectStoreNames.contains(SNAPSHOTS)) db.createObjectStore(SNAPSHOTS, { keyPath: "userId" });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveProductSnapshot(userId: string, rows: unknown[]) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS, "readwrite");
    tx.objectStore(SNAPSHOTS).put({ userId, rows, savedAt: Date.now() });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getProductSnapshot<T>(userId: string): Promise<T[] | null> {
  const db = await openDb();
  const value = await new Promise<any>((resolve, reject) => {
    const tx = db.transaction(SNAPSHOTS, "readonly");
    const request = tx.objectStore(SNAPSHOTS).get(userId);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
  db.close();
  return value?.rows ?? null;
}

export async function enqueueProductMutation(item: Omit<ProductMutation, "id" | "createdAt">) {
  const db = await openDb();
  const value: ProductMutation = { ...item, id: crypto.randomUUID(), createdAt: Date.now() };
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE, "readwrite");
    tx.objectStore(QUEUE).add(value);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function getProductMutations(userId: string): Promise<ProductMutation[]> {
  const db = await openDb();
  const rows = await new Promise<ProductMutation[]>((resolve, reject) => {
    const tx = db.transaction(QUEUE, "readonly");
    const request = tx.objectStore(QUEUE).getAll();
    request.onsuccess = () => resolve((request.result as ProductMutation[]).filter(x => x.userId === userId).sort((a,b) => a.createdAt-b.createdAt));
    request.onerror = () => reject(request.error);
  });
  db.close();
  return rows;
}

export async function removeProductMutation(id: string) {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(QUEUE, "readwrite");
    tx.objectStore(QUEUE).delete(id);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

export async function countProductMutations(userId: string) {
  return (await getProductMutations(userId)).length;
}
