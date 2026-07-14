/**
 * GSTR-2A portal upload store — active dataset + versioned history per GSTIN+period.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type {
  Gstr2aDocType,
  Gstr2aManualOverride,
  Gstr2aPortalDocument,
  Gstr2aUploadRecord,
} from "./gstr2a-report-types";

const UPLOAD_STORAGE_KEY = "ds_accounts_gstr2a_uploads_v1";
const OVERRIDE_STORAGE_KEY = "ds_accounts_gstr2a_overrides_v1";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadGstr2aUploads(): Gstr2aUploadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(UPLOAD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Gstr2aUploadRecord[]) : [];
  } catch {
    return [];
  }
}

function saveUploads(list: Gstr2aUploadRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(list));
}

export function getActiveGstr2aUpload(
  gstin: string,
  returnPeriod: string,
): Gstr2aUploadRecord | null {
  const list = loadGstr2aUploads();
  return (
    list.find(
      (u) =>
        u.isActive &&
        u.gstin === gstin &&
        u.returnPeriod === returnPeriod,
    ) ?? null
  );
}

export function listGstr2aUploadHistory(
  gstin?: string,
  returnPeriod?: string,
): Gstr2aUploadRecord[] {
  return loadGstr2aUploads()
    .filter((u) => {
      if (gstin && gstin !== "all" && u.gstin !== gstin) return false;
      if (returnPeriod && returnPeriod !== "all" && u.returnPeriod !== returnPeriod) return false;
      return true;
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.version - a.version);
}

function mapPortalDocType(raw: string): Gstr2aDocType {
  const s = raw.toLowerCase();
  if (s.includes("credit") || s === "c" || s === "cdn" || s === "cdnr") return "credit_note";
  if (s.includes("debit") || s === "d") return "debit_note";
  return "purchase_invoice";
}

/**
 * Parse a simplified GSTR-2A JSON (portal download style).
 * Accepts either `{ b2b: [...] }` portal format or a flat `{ documents: [...] }` array.
 */
export function parseGstr2aJson(raw: unknown, fileName: string): Gstr2aPortalDocument[] {
  const docs: Gstr2aPortalDocument[] = [];
  let n = 0;

  const push = (partial: Partial<Gstr2aPortalDocument> & { invoiceNo: string }) => {
    n += 1;
    docs.push({
      id: uid(`p-${n}`),
      supplierName: partial.supplierName?.trim() || "Supplier",
      supplierGstin: (partial.supplierGstin ?? "").trim().toUpperCase(),
      docType: partial.docType ?? "purchase_invoice",
      invoiceNo: partial.invoiceNo.trim(),
      invoiceDate: (partial.invoiceDate ?? "").slice(0, 10),
      taxableAmount: Number(partial.taxableAmount) || 0,
      cgst: Number(partial.cgst) || 0,
      sgst: Number(partial.sgst) || 0,
      igst: Number(partial.igst) || 0,
    });
  };

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid GSTR-2A JSON — expected an object.");
  }

  const root = raw as Record<string, unknown>;

  // Flat documents array (demo / simplified upload)
  if (Array.isArray(root.documents)) {
    for (const item of root.documents) {
      if (!item || typeof item !== "object") continue;
      const d = item as Record<string, unknown>;
      const invoiceNo = String(d.invoiceNo ?? d.inum ?? "").trim();
      if (!invoiceNo) continue;
      push({
        supplierName: String(d.supplierName ?? d.tradeNam ?? d.lglNm ?? "Supplier"),
        supplierGstin: String(d.supplierGstin ?? d.ctin ?? ""),
        docType: mapPortalDocType(String(d.docType ?? d.inv_typ ?? "invoice")),
        invoiceNo,
        invoiceDate: String(d.invoiceDate ?? d.dt ?? ""),
        taxableAmount: Number(d.taxableAmount ?? d.txval ?? 0),
        cgst: Number(d.cgst ?? d.camt ?? 0),
        sgst: Number(d.sgst ?? d.samt ?? 0),
        igst: Number(d.igst ?? d.iamt ?? 0),
      });
    }
  }

  // Standard portal b2b invoices
  if (Array.isArray(root.b2b)) {
    for (const party of root.b2b) {
      if (!party || typeof party !== "object") continue;
      const p = party as Record<string, unknown>;
      const ctin = String(p.ctin ?? "");
      const name = String(p.trdNm ?? p.lglNm ?? "Supplier");
      const invs = Array.isArray(p.inv) ? p.inv : [];
      for (const inv of invs) {
        if (!inv || typeof inv !== "object") continue;
        const i = inv as Record<string, unknown>;
        const invoiceNo = String(i.inum ?? "").trim();
        if (!invoiceNo) continue;
        const items = Array.isArray(i.itms) ? i.itms : [];
        let taxable = 0;
        let cgst = 0;
        let sgst = 0;
        let igst = 0;
        for (const it of items) {
          if (!it || typeof it !== "object") continue;
          const det = ((it as Record<string, unknown>).itm_det ?? it) as Record<string, unknown>;
          taxable += Number(det.txval ?? 0);
          cgst += Number(det.camt ?? 0);
          sgst += Number(det.samt ?? 0);
          igst += Number(det.iamt ?? 0);
        }
        if (items.length === 0) {
          taxable = Number(i.txval ?? i.val ?? 0);
          cgst = Number(i.camt ?? 0);
          sgst = Number(i.samt ?? 0);
          igst = Number(i.iamt ?? 0);
        }
        push({
          supplierName: name,
          supplierGstin: ctin,
          docType: "purchase_invoice",
          invoiceNo,
          invoiceDate: String(i.dt ?? "").split("-").reverse().join("-").length === 10
            ? // portal often DD-MM-YYYY
              (() => {
                const dt = String(i.dt ?? "");
                if (/^\d{2}-\d{2}-\d{4}$/.test(dt)) {
                  const [dd, mm, yyyy] = dt.split("-");
                  return `${yyyy}-${mm}-${dd}`;
                }
                return dt.slice(0, 10);
              })()
            : String(i.dt ?? "").slice(0, 10),
          taxableAmount: taxable,
          cgst,
          sgst,
          igst,
        });
      }
    }
  }

  // CDN / CDNR credit-debit notes
  for (const key of ["cdn", "cdnr", "cdnra"]) {
    if (!Array.isArray(root[key])) continue;
    for (const party of root[key] as unknown[]) {
      if (!party || typeof party !== "object") continue;
      const p = party as Record<string, unknown>;
      const ctin = String(p.ctin ?? "");
      const name = String(p.trdNm ?? p.lglNm ?? "Supplier");
      const notes = Array.isArray(p.nt) ? p.nt : [];
      for (const nt of notes) {
        if (!nt || typeof nt !== "object") continue;
        const n = nt as Record<string, unknown>;
        const invoiceNo = String(n.ntNum ?? n.inum ?? "").trim();
        if (!invoiceNo) continue;
        const ntty = String(n.ntty ?? "C").toUpperCase();
        push({
          supplierName: name,
          supplierGstin: ctin,
          docType: ntty === "D" ? "debit_note" : "credit_note",
          invoiceNo,
          invoiceDate: (() => {
            const dt = String(n.dt ?? "");
            if (/^\d{2}-\d{2}-\d{4}$/.test(dt)) {
              const [dd, mm, yyyy] = dt.split("-");
              return `${yyyy}-${mm}-${dd}`;
            }
            return dt.slice(0, 10);
          })(),
          taxableAmount: Number(n.txval ?? 0),
          cgst: Number(n.camt ?? 0),
          sgst: Number(n.samt ?? 0),
          igst: Number(n.iamt ?? 0),
        });
      }
    }
  }

  if (docs.length === 0) {
    throw new Error(
      `No invoice / note documents found in ${fileName}. Expected b2b / cdn sections or a documents[] array.`,
    );
  }
  return docs;
}

export function saveGstr2aUpload(input: {
  gstin: string;
  returnPeriod: string;
  fileName: string;
  documents: Gstr2aPortalDocument[];
}): Gstr2aUploadRecord {
  const all = loadGstr2aUploads();
  const same = all.filter((u) => u.gstin === input.gstin && u.returnPeriod === input.returnPeriod);
  const nextVersion = same.reduce((m, u) => Math.max(m, u.version), 0) + 1;

  const updated = all.map((u) =>
    u.gstin === input.gstin && u.returnPeriod === input.returnPeriod
      ? { ...u, isActive: false }
      : u,
  );

  const record: Gstr2aUploadRecord = {
    id: uid("up"),
    gstin: input.gstin,
    returnPeriod: input.returnPeriod,
    fileName: input.fileName,
    uploadedAt: nowIso(),
    uploadedBy: ACCOUNTS_CURRENT_USER,
    recordCount: input.documents.length,
    version: nextVersion,
    isActive: true,
    documents: input.documents,
  };

  updated.push(record);
  saveUploads(updated);
  return record;
}

export function loadGstr2aOverrides(): Gstr2aManualOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Gstr2aManualOverride[]) : [];
  } catch {
    return [];
  }
}

function saveOverrides(list: Gstr2aManualOverride[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(list));
}

export function setGstr2aManualOverride(input: {
  rowId: string;
  status?: "matched" | "needs_review" | null;
  remark: string;
}): Gstr2aManualOverride {
  const existing = loadGstr2aOverrides().find((o) => o.rowId === input.rowId);
  const list = loadGstr2aOverrides().filter((o) => o.rowId !== input.rowId);
  const next: Gstr2aManualOverride = {
    rowId: input.rowId,
    status:
      input.status === undefined
        ? (existing?.status ?? null)
        : input.status,
    remark: input.remark.trim(),
    markedBy: ACCOUNTS_CURRENT_USER,
    markedAt: nowIso(),
  };
  list.push(next);
  saveOverrides(list);
  return next;
}

export function clearGstr2aManualOverride(rowId: string): void {
  saveOverrides(loadGstr2aOverrides().filter((o) => o.rowId !== rowId));
}
