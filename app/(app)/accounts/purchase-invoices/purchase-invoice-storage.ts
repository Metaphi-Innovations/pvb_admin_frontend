/**
 * Purchase invoice localStorage hygiene — lightweight records only.
 */

import type {
  PurchaseAttachment,
  PurchaseInvoiceOcrPayload,
  PurchaseInvoiceRecord,
} from "./purchase-invoices-data";
import {
  CANONICAL_DIRECT_DEMO_NOS,
  CANONICAL_GRN_DEMO_NOS,
  PURCHASE_INVOICE_LEGACY_DEMO_NOS,
} from "./purchase-invoice-demo-constants";
import { persistDataUrlAttachment } from "./purchase-invoice-attachment-store";

export const PURCHASE_INVOICE_STORAGE_KEY = "ds_accounts_purchase_invoices_v2";
export const PURCHASE_INVOICE_STORAGE_MIGRATION_FLAG = "ds_pi_storage_v3_migrated";

const LEGACY_SEED_INVOICE_NOS = new Set([
  "PUR-2026-001",
  "PUR-2026-002",
  "PUR-2026-003",
  "PUR-2026-004",
  "PUR-2026-005",
]);

export class PurchaseInvoiceStorageQuotaError extends Error {
  constructor() {
    super("Unable to save locally because browser storage is full.");
    this.name = "PurchaseInvoiceStorageQuotaError";
  }
}

export function isStorageQuotaError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { name?: string; code?: number };
  return (
    e.name === "QuotaExceededError" ||
    e.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
    e.code === 22 ||
    e.code === 1014
  );
}

export function isPurchaseInvoiceDemoRecord(
  rec: Pick<PurchaseInvoiceRecord, "invoiceNo">,
): boolean {
  const no = rec.invoiceNo;
  if (PURCHASE_INVOICE_LEGACY_DEMO_NOS.has(no)) return true;
  if (LEGACY_SEED_INVOICE_NOS.has(no)) return true;
  if (no.startsWith("PUR-DEMO-")) return true;
  if (no.startsWith("PUR-DP-")) return true;
  if (CANONICAL_GRN_DEMO_NOS.has(no)) return true;
  if (CANONICAL_DIRECT_DEMO_NOS.has(no)) return true;
  return false;
}

export function sanitizeAttachmentForStorage(
  attachment: PurchaseAttachment | null,
): PurchaseAttachment | null {
  if (!attachment) return null;
  return {
    id: attachment.id,
    documentName: attachment.documentName,
    fileName: attachment.fileName,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
    fileUrl: attachment.fileUrl ?? attachment.id,
    uploadedAt: attachment.uploadedAt,
  };
}

function sanitizeOcrPayload(
  payload: PurchaseInvoiceOcrPayload | null | undefined,
): PurchaseInvoiceOcrPayload | null {
  if (!payload) return null;
  const { rawText: _rawText, ...rest } = payload;
  return rest;
}

function isDirectPurchaseStoredRecord(rec: PurchaseInvoiceRecord): boolean {
  if (rec.sourceType === "direct_purchase") return true;
  if (rec.source === "manual_entry") return true;
  return Boolean(rec.directLines?.length);
}

/** Strip heavy / duplicate fields before persisting to localStorage. */
export function sanitizePurchaseInvoiceForStorage(
  rec: PurchaseInvoiceRecord,
): PurchaseInvoiceRecord {
  const attachment = sanitizeAttachmentForStorage(rec.attachment);
  const ocrPayload = sanitizeOcrPayload(rec.ocrPayload);

  if (!isDirectPurchaseStoredRecord(rec)) {
    return { ...rec, attachment, ocrPayload };
  }

  const lineItems = rec.lineItems.map(({ directLine: _directLine, ...line }) => line);

  return {
    ...rec,
    attachment,
    ocrPayload,
    lineItems,
  };
}

export function dedupePurchaseInvoices(
  records: PurchaseInvoiceRecord[],
): PurchaseInvoiceRecord[] {
  const byId = new Map<number, PurchaseInvoiceRecord>();
  const byNo = new Map<string, PurchaseInvoiceRecord>();

  for (const rec of records) {
    const existingById = byId.get(rec.id);
    const existingByNo = byNo.get(rec.invoiceNo);
    const keep =
      !existingById && !existingByNo
        ? rec
        : pickNewerRecord(rec, existingById ?? existingByNo!);
    byId.set(keep.id, keep);
    byNo.set(keep.invoiceNo, keep);
  }

  return [...byId.values()].sort((a, b) => a.id - b.id);
}

function pickNewerRecord(
  a: PurchaseInvoiceRecord,
  b: PurchaseInvoiceRecord,
): PurchaseInvoiceRecord {
  const aTs = Date.parse(a.updatedAt || a.createdAt || "") || 0;
  const bTs = Date.parse(b.updatedAt || b.createdAt || "") || 0;
  return aTs >= bTs ? a : b;
}

export function stripDemoRecordsFromStorage(
  records: PurchaseInvoiceRecord[],
): PurchaseInvoiceRecord[] {
  return records.filter((rec) => !isPurchaseInvoiceDemoRecord(rec));
}

function queueLegacyAttachmentMigration(attachment: PurchaseAttachment | null): void {
  if (!attachment?.dataUrl?.startsWith("data:")) return;
  void persistDataUrlAttachment({
    id: attachment.id,
    documentName: attachment.documentName,
    fileName: attachment.fileName,
    dataUrl: attachment.dataUrl,
    uploadedAt: attachment.uploadedAt,
    fileType: attachment.fileType,
    fileSize: attachment.fileSize,
  }).catch(() => {});
}

/** One-time cleanup for oversized ds_accounts_purchase_invoices_v2 payloads. */
export function ensurePurchaseInvoiceStorageMigration(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(PURCHASE_INVOICE_STORAGE_MIGRATION_FLAG) === "1") return;

  try {
    const raw = localStorage.getItem(PURCHASE_INVOICE_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PurchaseInvoiceRecord[];
      const cleaned = dedupePurchaseInvoices(
        stripDemoRecordsFromStorage(parsed.map((rec) => {
          queueLegacyAttachmentMigration(rec.attachment);
          return sanitizePurchaseInvoiceForStorage(rec);
        })),
      );
      localStorage.setItem(PURCHASE_INVOICE_STORAGE_KEY, JSON.stringify(cleaned));
    }

    localStorage.removeItem("ds_accounts_purchase_invoices_v1");
    localStorage.setItem(PURCHASE_INVOICE_STORAGE_MIGRATION_FLAG, "1");
  } catch {
    try {
      localStorage.setItem(PURCHASE_INVOICE_STORAGE_MIGRATION_FLAG, "1");
    } catch {
      /* ignore */
    }
  }
}

export function writePurchaseInvoicesToStorage(records: PurchaseInvoiceRecord[]): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(records.map(sanitizePurchaseInvoiceForStorage));
  try {
    localStorage.setItem(PURCHASE_INVOICE_STORAGE_KEY, payload);
  } catch (error) {
    if (isStorageQuotaError(error)) {
      throw new PurchaseInvoiceStorageQuotaError();
    }
    throw error;
  }
}

export function hasPurchaseInvoiceAttachment(
  attachment: PurchaseAttachment | null | undefined,
): boolean {
  if (!attachment) return false;
  return Boolean(attachment.fileUrl ?? attachment.fileName);
}
