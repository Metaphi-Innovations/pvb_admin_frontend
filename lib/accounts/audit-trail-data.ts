import { demoAddDays, demoDateAt, demoFinancialYearStart, demoToday, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Audit trail — seeded from accounting activity + user actions in localStorage.
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { loadVouchers } from "@/app/(app)/accounts/vouchers/voucher-data";

export interface AuditTrailRecord {
  id: number;
  dateTime: string;
  user: string;
  module: string;
  action: string;
  reference: string;
  details: string;
}

const STORAGE_KEY = "ds_accounts_audit_trail";
const SEED_VERSION_KEY = "ds_accounts_audit_trail_seed_version";
const SEED_VERSION = 2;

const STATIC_SEED: AuditTrailRecord[] = [
  {
    id: 1,
    dateTime: demoTimestamp(demoDateAt(0)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Sales Invoice",
    action: "Posted",
    reference: "INV-2026-0001",
    details: "Tax invoice posted for Reliance Agri — ₹97,650",
  },
  {
    id: 2,
    dateTime: demoTimestamp(demoDateAt(1)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Sales Invoice",
    action: "Posted",
    reference: "INV-2026-0002",
    details: "Tax invoice posted for Mahindra Farms — ₹1,62,400",
  },
  {
    id: 3,
    dateTime: demoTimestamp(demoDateAt(2)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Stock Transfer Invoice",
    action: "Posted",
    reference: "STI-2026-0001",
    details: "Stock transfer invoice to Ahmedabad Warehouse — ₹54,600",
  },
  {
    id: 4,
    dateTime: demoTimestamp(demoDateAt(3)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Purchase Invoice",
    action: "Approved",
    reference: "PINV-2026-001",
    details: "Purchase bill approved — Rallis India Ltd — ₹1,18,000",
  },
  {
    id: 5,
    dateTime: demoTimestamp(demoDateAt(4)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Receipt Voucher",
    action: "Posted",
    reference: "RV-2026-0042",
    details: "Customer receipt ₹80,000 — ABC Agro Distributor",
  },
  {
    id: 6,
    dateTime: demoTimestamp(demoDateAt(5)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Payment Voucher",
    action: "Posted",
    reference: "PV-2026-0031",
    details: "Vendor payment ₹1,50,000 — Coromandel International",
  },
  {
    id: 7,
    dateTime: demoTimestamp(demoDateAt(6)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Journal Voucher",
    action: "Posted",
    reference: "JRN-RENT-APR",
    details: "April rent journal — ₹45,000",
  },
  {
    id: 8,
    dateTime: demoTimestamp(demoDateAt(7)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Contra Voucher",
    action: "Posted",
    reference: "CONTRA-001",
    details: "Cash deposited to HDFC Bank — ₹50,000",
  },
  {
    id: 9,
    dateTime: demoTimestamp(demoDateAt(8)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Credit Note",
    action: "Approved",
    reference: "CN-2026-001",
    details: "Credit note approved — rate difference ABC Agro",
  },
  {
    id: 10,
    dateTime: demoTimestamp(demoDateAt(9)),
    user: ACCOUNTS_CURRENT_USER,
    module: "Fund Transfer",
    action: "Completed",
    reference: "FT-2026-0005",
    details: "HDFC → Axis Bank transfer — ₹1,00,000",
  },
];

function buildDynamicEntries(): AuditTrailRecord[] {
  const entries: AuditTrailRecord[] = [];
  let id = 1000;

  for (const inv of loadInvoices().slice(0, 3)) {
    const last = inv.activity?.[inv.activity.length - 1];
    if (!last) continue;
    entries.push({
      id: id++,
      dateTime: last.at,
      user: last.by,
      module: inv.invoiceType === "stock_transfer" ? "Stock Transfer Invoice" : "Sales Invoice",
      action: last.action === "created" ? "Created" : "Updated",
      reference: inv.invoiceNo,
      details: last.detail,
    });
  }

  for (const pi of loadPurchaseInvoices().slice(0, 2)) {
    entries.push({
      id: id++,
      dateTime: `${pi.invoiceDate}T11:00:00`,
      user: pi.createdBy,
      module: "Purchase Invoice",
      action: pi.workflow?.status === "posted" ? "Posted" : "Created",
      reference: pi.vendorInvoiceNo || pi.invoiceNo,
      details: `Purchase bill ${pi.vendorName} — ₹${pi.grandTotal.toLocaleString("en-IN")}`,
    });
  }

  for (const v of loadVouchers().filter((v) => v.status === "posted").slice(0, 3)) {
    entries.push({
      id: id++,
      dateTime: `${v.date}T12:00:00`,
      user: v.createdBy,
      module: `${v.voucherType.charAt(0).toUpperCase()}${v.voucherType.slice(1)} Voucher`,
      action: "Posted",
      reference: v.voucherNumber,
      details: v.narration || "—",
    });
  }

  return entries;
}

function mergeSeed(): AuditTrailRecord[] {
  const dynamic = buildDynamicEntries();
  const dynamicRefs = new Set(dynamic.map((d) => d.reference));
  const staticFiltered = STATIC_SEED.filter((s) => !dynamicRefs.has(s.reference));
  return [...staticFiltered, ...dynamic].sort((a, b) =>
    b.dateTime.localeCompare(a.dateTime),
  );
}

function saveRecords(records: AuditTrailRecord[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
}

export function loadAuditTrailRecords(): AuditTrailRecord[] {
  if (typeof window === "undefined") return STATIC_SEED;

  try {
    const version = localStorage.getItem(SEED_VERSION_KEY);
    const raw = localStorage.getItem(STORAGE_KEY);

    if (version !== String(SEED_VERSION) || !raw) {
      const merged = mergeSeed();
      saveRecords(merged);
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
      return merged;
    }

    const stored = JSON.parse(raw) as AuditTrailRecord[];
    if (stored.length < 5) {
      const merged = mergeSeed();
      saveRecords(merged);
      return merged;
    }
    return stored;
  } catch {
    return STATIC_SEED;
  }
}

/** Append a user action — persists across refresh. */
export function appendAuditTrailEntry(
  entry: Omit<AuditTrailRecord, "id">,
): AuditTrailRecord[] {
  const records = loadAuditTrailRecords();
  const next: AuditTrailRecord = {
    ...entry,
    id: records.reduce((max, r) => Math.max(max, r.id), 0) + 1,
  };
  const updated = [next, ...records];
  saveRecords(updated);
  return updated;
}

export function filterAuditTrail(
  records: AuditTrailRecord[],
  opts: { search?: string; dateFrom?: string; dateTo?: string; module?: string },
): AuditTrailRecord[] {
  let list = [...records];
  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.user.toLowerCase().includes(q) ||
        r.module.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.reference.toLowerCase().includes(q) ||
        r.details.toLowerCase().includes(q),
    );
  }
  if (opts.dateFrom) {
    list = list.filter((r) => r.dateTime.slice(0, 10) >= opts.dateFrom!);
  }
  if (opts.dateTo) {
    list = list.filter((r) => r.dateTime.slice(0, 10) <= opts.dateTo!);
  }
  if (opts.module && opts.module !== "all") {
    list = list.filter((r) => r.module === opts.module);
  }
  return list;
}
