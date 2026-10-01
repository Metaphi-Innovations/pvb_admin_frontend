/**
 * GSTR-2B portal upload store — active dataset + versioned history per GSTIN+period.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type {
  Gstr2bDocType,
  Gstr2bManualOverride,
  Gstr2bPortalDocument,
  Gstr2bUploadRecord,
} from "./gstr2b-report-types";

const UPLOAD_STORAGE_KEY = "ds_accounts_gstr2b_uploads_v1";
const OVERRIDE_STORAGE_KEY = "ds_accounts_gstr2b_overrides_v1";

function nowIso(): string {
  return new Date().toISOString();
}

function uid(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function loadGstr2bUploads(): Gstr2bUploadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(UPLOAD_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Gstr2bUploadRecord[]) : [];
  } catch {
    return [];
  }
}

function saveUploads(list: Gstr2bUploadRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(UPLOAD_STORAGE_KEY, JSON.stringify(list));
}

export function getActiveGstr2bUpload(
  gstin: string,
  returnPeriod: string,
): Gstr2bUploadRecord | null {
  const list = loadGstr2bUploads();
  return (
    list.find(
      (u) =>
        u.isActive &&
        u.gstin === gstin &&
        u.returnPeriod === returnPeriod,
    ) ?? null
  );
}

export function listGstr2bUploadHistory(
  gstin?: string,
  returnPeriod?: string,
): Gstr2bUploadRecord[] {
  return loadGstr2bUploads()
    .filter((u) => {
      if (gstin && gstin !== "all" && u.gstin !== gstin) return false;
      if (returnPeriod && returnPeriod !== "all" && u.returnPeriod !== returnPeriod) return false;
      return true;
    })
    .sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt) || b.version - a.version);
}

function mapPortalDocType(raw: string): Gstr2bDocType {
  const s = raw.toLowerCase();
  if (s.includes("credit") || s === "c" || s === "cdn" || s === "cdnr") return "credit_note";
  if (s.includes("debit") || s === "d") return "debit_note";
  return "purchase_invoice";
}

function parseItcAvailable(raw: unknown): boolean {
  if (typeof raw === "boolean") return raw;
  const s = String(raw ?? "Y").trim().toUpperCase();
  return s === "Y" || s === "YES" || s === "TRUE" || s === "1";
}

function parsePortalDate(dt: string): string {
  if (/^\d{2}-\d{2}-\d{4}$/.test(dt)) {
    const [dd, mm, yyyy] = dt.split("-");
    return `${yyyy}-${mm}-${dd}`;
  }
  return dt.slice(0, 10);
}

/**
 * Parse GSTR-2B JSON (portal download style).
 * Accepts `{ b2b: [...] }`, CDN sections, or `{ documents: [...] }`.
 */
export function parseGstr2bJson(raw: unknown, fileName: string): Gstr2bPortalDocument[] {
  const docs: Gstr2bPortalDocument[] = [];
  let n = 0;

  const push = (partial: Partial<Gstr2bPortalDocument> & { invoiceNo: string }) => {
    n += 1;
    docs.push({
      id: uid(`p2b-${n}`),
      supplierName: partial.supplierName?.trim() || "Supplier",
      supplierGstin: (partial.supplierGstin ?? "").trim().toUpperCase(),
      docType: partial.docType ?? "purchase_invoice",
      invoiceNo: partial.invoiceNo.trim(),
      invoiceDate: (partial.invoiceDate ?? "").slice(0, 10),
      taxableAmount: Number(partial.taxableAmount) || 0,
      cgst: Number(partial.cgst) || 0,
      sgst: Number(partial.sgst) || 0,
      igst: Number(partial.igst) || 0,
      itcAvailable: partial.itcAvailable !== false,
    });
  };

  if (!raw || typeof raw !== "object") {
    throw new Error("Invalid GSTR-2B JSON — expected an object.");
  }

  const root = raw as Record<string, unknown>;

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
        invoiceDate: String(d.invoiceDate ?? d.dt ?? "").slice(0, 10),
        taxableAmount: Number(d.taxableAmount ?? d.txval ?? 0),
        cgst: Number(d.cgst ?? d.camt ?? 0),
        sgst: Number(d.sgst ?? d.samt ?? 0),
        igst: Number(d.igst ?? d.iamt ?? 0),
        itcAvailable: parseItcAvailable(d.itcAvailable ?? d.itcavl ?? "Y"),
      });
    }
  }

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
        let itcOk = true;
        for (const it of items) {
          if (!it || typeof it !== "object") continue;
          const det = ((it as Record<string, unknown>).itm_det ?? it) as Record<string, unknown>;
          taxable += Number(det.txval ?? 0);
          cgst += Number(det.camt ?? 0);
          sgst += Number(det.samt ?? 0);
          igst += Number(det.iamt ?? 0);
          if (det.itcavl != null) itcOk = itcOk && parseItcAvailable(det.itcavl);
        }
        if (items.length === 0) {
          taxable = Number(i.txval ?? i.val ?? 0);
          cgst = Number(i.camt ?? 0);
          sgst = Number(i.samt ?? 0);
          igst = Number(i.iamt ?? 0);
          itcOk = parseItcAvailable(i.itcavl ?? "Y");
        }
        push({
          supplierName: name,
          supplierGstin: ctin,
          docType: "purchase_invoice",
          invoiceNo,
          invoiceDate: parsePortalDate(String(i.dt ?? "")),
          taxableAmount: taxable,
          cgst,
          sgst,
          igst,
          itcAvailable: itcOk,
        });
      }
    }
  }

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
        const nte = nt as Record<string, unknown>;
        const invoiceNo = String(nte.ntNum ?? nte.inum ?? "").trim();
        if (!invoiceNo) continue;
        const ntty = String(nte.ntty ?? "C").toUpperCase();
        push({
          supplierName: name,
          supplierGstin: ctin,
          docType: ntty === "D" ? "debit_note" : "credit_note",
          invoiceNo,
          invoiceDate: parsePortalDate(String(nte.dt ?? "")),
          taxableAmount: Number(nte.txval ?? 0),
          cgst: Number(nte.camt ?? 0),
          sgst: Number(nte.samt ?? 0),
          igst: Number(nte.iamt ?? 0),
          itcAvailable: parseItcAvailable(nte.itcavl ?? "Y"),
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

export function saveGstr2bUpload(input: {
  gstin: string;
  returnPeriod: string;
  fileName: string;
  documents: Gstr2bPortalDocument[];
}): Gstr2bUploadRecord {
  const all = loadGstr2bUploads();
  const same = all.filter((u) => u.gstin === input.gstin && u.returnPeriod === input.returnPeriod);
  const nextVersion = same.reduce((m, u) => Math.max(m, u.version), 0) + 1;

  const updated = all.map((u) =>
    u.gstin === input.gstin && u.returnPeriod === input.returnPeriod
      ? { ...u, isActive: false }
      : u,
  );

  const record: Gstr2bUploadRecord = {
    id: uid("up2b"),
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

export function loadGstr2bOverrides(): Gstr2bManualOverride[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OVERRIDE_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Gstr2bManualOverride[]) : [];
  } catch {
    return [];
  }
}

function saveOverrides(list: Gstr2bManualOverride[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(OVERRIDE_STORAGE_KEY, JSON.stringify(list));
}

export function setGstr2bManualOverride(input: {
  rowId: string;
  status?: "itc_available" | "needs_review" | null;
  remark: string;
}): Gstr2bManualOverride {
  const existing = loadGstr2bOverrides().find((o) => o.rowId === input.rowId);
  const list = loadGstr2bOverrides().filter((o) => o.rowId !== input.rowId);
  const next: Gstr2bManualOverride = {
    rowId: input.rowId,
    status: input.status === undefined ? (existing?.status ?? null) : input.status,
    remark: input.remark.trim(),
    markedBy: ACCOUNTS_CURRENT_USER,
    markedAt: nowIso(),
  };
  list.push(next);
  saveOverrides(list);
  return next;
}
