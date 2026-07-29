/**
 * Binary purchase invoice attachments — IndexedDB (not localStorage).
 */

const DB_NAME = "ds_purchase_invoice_attachments";
const DB_VERSION = 1;
const STORE_NAME = "attachments";

export interface StoredPurchaseAttachment {
  id: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  blob: Blob;
  uploadedAt: string;
}

const objectUrlCache = new Map<string, string>();

function openDb(): Promise<IDBDatabase> {
  if (typeof window === "undefined" || !window.indexedDB) {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onerror = () => reject(req.error ?? new Error("Failed to open attachment store"));
    req.onsuccess = () => resolve(req.result);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

function runTransaction<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  return openDb().then(
    (db) =>
      new Promise<T>((resolve, reject) => {
        const tx = db.transaction(STORE_NAME, mode);
        const store = tx.objectStore(STORE_NAME);
        const req = fn(store);
        req.onsuccess = () => resolve(req.result as T);
        req.onerror = () => reject(req.error ?? new Error("Attachment store operation failed"));
      }),
  );
}

export async function putPurchaseAttachment(record: StoredPurchaseAttachment): Promise<void> {
  await runTransaction("readwrite", (store) => store.put(record));
}

export async function getPurchaseAttachment(id: string): Promise<StoredPurchaseAttachment | null> {
  const row = await runTransaction<StoredPurchaseAttachment | undefined>("readonly", (store) =>
    store.get(id),
  );
  return row ?? null;
}

export async function deletePurchaseAttachment(id: string): Promise<void> {
  const cached = objectUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(id);
  }
  await runTransaction("readwrite", (store) => store.delete(id));
}

export async function getPurchaseAttachmentObjectUrl(id: string): Promise<string | null> {
  if (objectUrlCache.has(id)) return objectUrlCache.get(id)!;
  const stored = await getPurchaseAttachment(id);
  if (!stored) return null;
  const url = URL.createObjectURL(stored.blob);
  objectUrlCache.set(id, url);
  return url;
}

export function revokePurchaseAttachmentObjectUrl(id: string): void {
  const cached = objectUrlCache.get(id);
  if (cached) {
    URL.revokeObjectURL(cached);
    objectUrlCache.delete(id);
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body] = dataUrl.split(",");
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

/** Persist a legacy base64 data URL into IndexedDB (fire-and-forget safe). */
export async function persistDataUrlAttachment(input: {
  id: string;
  documentName: string;
  fileName: string;
  dataUrl: string;
  uploadedAt: string;
  fileType?: string;
  fileSize?: number;
}): Promise<void> {
  const blob = dataUrlToBlob(input.dataUrl);
  await putPurchaseAttachment({
    id: input.id,
    fileName: input.fileName,
    fileType: input.fileType ?? blob.type,
    fileSize: input.fileSize ?? blob.size,
    blob,
    uploadedAt: input.uploadedAt,
  });
}
