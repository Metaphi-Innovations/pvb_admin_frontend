import { demoDateAt, demoTimestamp } from "@/lib/accounts/demo-date-utils";
/**
 * Audit trail — accounting voucher alteration register (Tally/Busy style).
 * Particular = changed field name; Before/After = field values only (never sentences / JSON).
 */

import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { matchesMultiFilter } from "@/lib/accounts/report-multi-filter-utils";
import { loadFinancialYears } from "@/app/(app)/accounts/masters/masters-data";

export type AuditTrailAction = "Created" | "Modified" | "Deleted";

export type AuditTrailStatus = "Posted" | "Cancelled" | "Active" | "Draft";

export interface AuditTrailRecord {
  id: number;
  /** ISO datetime — split into Date / Time columns in the UI */
  dateTime: string;
  voucherType: string;
  voucherTypeCode: string;
  voucherNo: string;
  user: string;
  action: AuditTrailAction;
  /** Field that changed — e.g. Amount, Party, Status, Quantity, Date, Ledger, Narration, Voucher */
  particular: string;
  /** Old field value only (no sentences). Use "—" when created. */
  beforeAlteration: string;
  /** New field value only (no sentences). Use "—" when deleted. */
  afterAlteration: string;
  status: AuditTrailStatus;
}

export const AUDIT_TRAIL_ACTION_OPTIONS: { value: AuditTrailAction; label: string }[] = [
  { value: "Created", label: "Created" },
  { value: "Modified", label: "Modified" },
  { value: "Deleted", label: "Deleted" },
];

export const AUDIT_TRAIL_VOUCHER_TYPE_OPTIONS: { value: string; label: string }[] = [
  { value: "sales", label: "Sales Invoice" },
  { value: "purchase", label: "Purchase Invoice" },
  { value: "receipt", label: "Receipt Voucher" },
  { value: "payment", label: "Payment Voucher" },
  { value: "journal", label: "Journal Voucher" },
  { value: "contra", label: "Contra Voucher" },
  { value: "credit_note", label: "Credit Note" },
  { value: "debit_note", label: "Debit Note" },
];

export const AUDIT_TRAIL_VOUCHER_TYPE_LABELS: Record<string, string> = Object.fromEntries(
  AUDIT_TRAIL_VOUCHER_TYPE_OPTIONS.map((o) => [o.value, o.label]),
);

export const AUDIT_TRAIL_USER_OPTIONS: { value: string; label: string }[] = [
  { value: "Admin", label: "Admin" },
  { value: "Rajesh Kumar", label: "Rajesh Kumar" },
  { value: "Priya Sharma", label: "Priya Sharma" },
  { value: "Amit Patel", label: "Amit Patel" },
  { value: "Sneha Reddy", label: "Sneha Reddy" },
];

export const AUDIT_TRAIL_STATUS_OPTIONS: { value: AuditTrailStatus; label: string }[] = [
  { value: "Posted", label: "Posted" },
  { value: "Active", label: "Active" },
  { value: "Draft", label: "Draft" },
  { value: "Cancelled", label: "Cancelled" },
];

const STORAGE_KEY = "ds_accounts_audit_trail";
const SEED_VERSION_KEY = "ds_accounts_audit_trail_seed_version";
/** Bumped when Before/After store field values only (not descriptive text) */
const SEED_VERSION = 5;

type SeedSpec = Omit<AuditTrailRecord, "id" | "dateTime"> & { time?: string };

function seedRecord(id: number, index: number, spec: SeedSpec): AuditTrailRecord {
  const date = demoDateAt(index);
  const time =
    spec.time ??
    `${String(9 + (index % 9)).padStart(2, "0")}:${String((index * 11) % 60).padStart(2, "0")}:00`;
  const { time: _t, ...rest } = spec;
  return {
    id,
    dateTime: demoTimestamp(date, time),
    ...rest,
  };
}

function buildStaticSeed(): AuditTrailRecord[] {
  const specs: SeedSpec[] = [
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0138",
      user: "Amit Patel",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹97,650",
      status: "Draft",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0138",
      user: "Amit Patel",
      action: "Modified",
      particular: "Quantity",
      beforeAlteration: "50 bags",
      afterAlteration: "52 bags",
      status: "Draft",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0138",
      user: "Amit Patel",
      action: "Modified",
      particular: "Amount",
      beforeAlteration: "₹97,650",
      afterAlteration: "₹1,01,350",
      status: "Draft",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0138",
      user: "Priya Sharma",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Approved",
      afterAlteration: "Posted",
      status: "Posted",
    },
    {
      voucherType: "Purchase Invoice",
      voucherTypeCode: "purchase",
      voucherNo: "PINV-2026-0015",
      user: "Amit Patel",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹86,400",
      status: "Draft",
    },
    {
      voucherType: "Purchase Invoice",
      voucherTypeCode: "purchase",
      voucherNo: "PINV-2026-0015",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Approved",
      afterAlteration: "Posted",
      status: "Posted",
    },
    {
      voucherType: "Purchase Invoice",
      voucherTypeCode: "purchase",
      voucherNo: "PINV-2026-0019",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Narration",
      beforeAlteration: "IGST 18%",
      afterAlteration: "CGST 9% + SGST 9%",
      status: "Active",
    },
    {
      voucherType: "Receipt Voucher",
      voucherTypeCode: "receipt",
      voucherNo: "RV-2026-0053",
      user: "Amit Patel",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹1,25,000",
      status: "Draft",
    },
    {
      voucherType: "Receipt Voucher",
      voucherTypeCode: "receipt",
      voucherNo: "RV-2026-0053",
      user: "Priya Sharma",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Approved",
      afterAlteration: "Posted",
      status: "Posted",
    },
    {
      voucherType: "Payment Voucher",
      voucherTypeCode: "payment",
      voucherNo: "PV-2026-0044",
      user: "Amit Patel",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹92,000",
      status: "Draft",
    },
    {
      voucherType: "Payment Voucher",
      voucherTypeCode: "payment",
      voucherNo: "PV-2026-0051",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Rejected",
      status: "Cancelled",
    },
    {
      voucherType: "Journal Voucher",
      voucherTypeCode: "journal",
      voucherNo: "JV-RENT-APR26",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Approved",
      afterAlteration: "Posted",
      status: "Posted",
    },
    {
      voucherType: "Journal Voucher",
      voucherTypeCode: "journal",
      voucherNo: "JV-DEPR-Q4",
      user: "Amit Patel",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹1,82,000",
      status: "Draft",
    },
    {
      voucherType: "Credit Note",
      voucherTypeCode: "credit_note",
      voucherNo: "CN-2026-0006",
      user: "Priya Sharma",
      action: "Modified",
      particular: "Amount",
      beforeAlteration: "₹15,200",
      afterAlteration: "₹14,800",
      status: "Active",
    },
    {
      voucherType: "Credit Note",
      voucherTypeCode: "credit_note",
      voucherNo: "CN-2026-0007",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Rejected",
      status: "Cancelled",
    },
    {
      voucherType: "Debit Note",
      voucherTypeCode: "debit_note",
      voucherNo: "DN-2026-0009",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Approved",
      afterAlteration: "Posted",
      status: "Posted",
    },
    {
      voucherType: "Debit Note",
      voucherTypeCode: "debit_note",
      voucherNo: "DN-2026-0008",
      user: "Rajesh Kumar",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹12,400",
      status: "Active",
    },
    {
      voucherType: "Contra Voucher",
      voucherTypeCode: "contra",
      voucherNo: "CONTRA-2026-0007",
      user: "Priya Sharma",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Posted",
      status: "Posted",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0129",
      user: "Amit Patel",
      action: "Deleted",
      particular: "Voucher",
      beforeAlteration: "₹34,500",
      afterAlteration: "—",
      status: "Cancelled",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0142",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Approved",
      status: "Active",
    },
    {
      voucherType: "Payment Voucher",
      voucherTypeCode: "payment",
      voucherNo: "PV-2026-0047",
      user: "Priya Sharma",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Approved",
      status: "Active",
    },
    {
      voucherType: "Purchase Invoice",
      voucherTypeCode: "purchase",
      voucherNo: "PINV-2026-0018",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Approved",
      status: "Active",
    },
    {
      voucherType: "Receipt Voucher",
      voucherTypeCode: "receipt",
      voucherNo: "RV-2026-0056",
      user: "Priya Sharma",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹80,000",
      status: "Active",
    },
    {
      voucherType: "Journal Voucher",
      voucherTypeCode: "journal",
      voucherNo: "JV-2026-0029",
      user: "Rajesh Kumar",
      action: "Created",
      particular: "Ledger",
      beforeAlteration: "—",
      afterAlteration: "Rent Expense / Sundry Creditors",
      status: "Active",
    },
    {
      voucherType: "Purchase Invoice",
      voucherTypeCode: "purchase",
      voucherNo: "PINV-2026-0022",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Rejected",
      status: "Cancelled",
    },
    {
      voucherType: "Payment Voucher",
      voucherTypeCode: "payment",
      voucherNo: "PV-2026-0058",
      user: "Priya Sharma",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹35,000",
      status: "Active",
    },
    {
      voucherType: "Contra Voucher",
      voucherTypeCode: "contra",
      voucherNo: "CONTRA-2026-0007",
      user: "Priya Sharma",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹50,000",
      status: "Draft",
    },
    {
      voucherType: "Debit Note",
      voucherTypeCode: "debit_note",
      voucherNo: "DN-2026-0011",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Status",
      beforeAlteration: "Pending",
      afterAlteration: "Approved",
      status: "Active",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0140",
      user: ACCOUNTS_CURRENT_USER,
      action: "Modified",
      particular: "Party",
      beforeAlteration: "Kaveri Seed Co.",
      afterAlteration: "Kaveri Seeds Pvt Ltd",
      status: "Active",
    },
    {
      voucherType: "Credit Note",
      voucherTypeCode: "credit_note",
      voucherNo: "CN-2026-0004",
      user: "Priya Sharma",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹8,750",
      status: "Active",
    },
    {
      voucherType: "Payment Voucher",
      voucherTypeCode: "payment",
      voucherNo: "PV-2026-0062",
      user: "Amit Patel",
      action: "Created",
      particular: "Amount",
      beforeAlteration: "—",
      afterAlteration: "₹18,500",
      status: "Draft",
    },
    {
      voucherType: "Sales Invoice",
      voucherTypeCode: "sales",
      voucherNo: "INV-2026-0145",
      user: "Amit Patel",
      action: "Modified",
      particular: "Date",
      beforeAlteration: "10-07-2026",
      afterAlteration: "12-07-2026",
      status: "Active",
    },
    {
      voucherType: "Journal Voucher",
      voucherTypeCode: "journal",
      voucherNo: "JV-RENT-APR26",
      user: "Rajesh Kumar",
      action: "Modified",
      particular: "Narration",
      beforeAlteration: "March rent",
      afterAlteration: "April rent provision",
      status: "Active",
    },
  ];

  return specs
    .map((spec, i) => seedRecord(i + 1, i, spec))
    .sort((a, b) => b.dateTime.localeCompare(a.dateTime));
}

const STATIC_SEED = buildStaticSeed();

function mapLegacyAction(raw: string): AuditTrailAction {
  const a = raw.toLowerCase();
  if (a.includes("delet") || a.includes("cancel")) return "Deleted";
  if (a.includes("creat") || a === "create") return "Created";
  return "Modified";
}

function mapLegacyStatus(raw: string, action: AuditTrailAction): AuditTrailStatus {
  const s = raw.toLowerCase();
  if (s.includes("delet") || s.includes("reject") || s.includes("cancel") || action === "Deleted") {
    return "Cancelled";
  }
  if (s.includes("post")) return "Posted";
  if (s.includes("draft") || s.includes("pending")) return "Draft";
  return "Active";
}

function mapModuleToVoucherType(module: string): { code: string; label: string } {
  const m = module.toLowerCase();
  if (m.includes("sales")) return { code: "sales", label: "Sales Invoice" };
  if (m.includes("purchase")) return { code: "purchase", label: "Purchase Invoice" };
  if (m.includes("receipt")) return { code: "receipt", label: "Receipt Voucher" };
  if (m.includes("payment")) return { code: "payment", label: "Payment Voucher" };
  if (m.includes("journal")) return { code: "journal", label: "Journal Voucher" };
  if (m.includes("contra")) return { code: "contra", label: "Contra Voucher" };
  if (m.includes("credit")) return { code: "credit_note", label: "Credit Note" };
  if (m.includes("debit")) return { code: "debit_note", label: "Debit Note" };
  return { code: "journal", label: module || "Journal Voucher" };
}

/** Known field labels used in Particular (clean register style). */
const FIELD_PARTICULARS = [
  "Amount",
  "Party",
  "Status",
  "Quantity",
  "Date",
  "Ledger",
  "Narration",
  "Voucher",
] as const;

function stripFieldLabel(value: string): string {
  const v = value.trim();
  if (!v || v === "—" || v === "-") return "—";
  // Remove leading "Field: " / "Field — " style prefixes
  const labeled = v.match(
    /^(Status|Amount|Party|Quantity|Qty|Date|Ledger|Narration|Voucher|Tax|Credit amount)\s*[:—–-]\s*(.+)$/i,
  );
  if (labeled?.[2]) return labeled[2].trim() || "—";
  // Drop trailing descriptive clauses after em/en dash when left side looks like a value
  const sentence = v.match(/^(.+?)\s+[—–-]\s+.+$/);
  if (sentence?.[1] && sentence[1].length <= 40 && !/[.!?]$/.test(sentence[1])) {
    // Keep full value if it contains ₹ (amount ranges etc.) — only strip when clearly descriptive
    if (/created|posted|updated|approved|rejected|deleted|draft voucher|pending checker/i.test(v)) {
      return sentence[1].trim();
    }
  }
  // Collapse common descriptive wrappers to the value itself
  if (/^draft\b/i.test(v) && /₹/.test(v)) {
    const amt = v.match(/₹[\d,]+(?:\.\d+)?/);
    if (amt) return amt[0];
  }
  if (/voucher deleted/i.test(v)) return "—";
  return v;
}

function inferParticular(
  before: string,
  after: string,
  action: AuditTrailAction,
  hints: string,
): string {
  const hay = `${before} ${after} ${hints}`.toLowerCase();
  if (action === "Deleted") return "Voucher";
  if (action === "Created" && /₹|amount|total/.test(hay)) return "Amount";
  if (/part(y|ies)|customer|vendor|distributor/.test(hay)) return "Party";
  if (/qty|quantity|bags|units/.test(hay)) return "Quantity";
  if (/status|pending|approved|posted|rejected|draft|cancelled/.test(hay)) return "Status";
  if (/ledger|dr\s|cr\s|debit|credit account/.test(hay)) return "Ledger";
  if (/date|\d{2}-\d{2}-\d{4}/.test(hay)) return "Date";
  if (/narration|remark|note|igst|cgst|sgst|gst/.test(hay)) return "Narration";
  if (/₹|amount|total/.test(hay)) return "Amount";
  if (action === "Created") return "Voucher";
  return "Voucher";
}

function normalizeLegacyRecord(raw: Record<string, unknown>, id: number): AuditTrailRecord {
  // Already on voucher-register schema
  if (raw.voucherType && raw.voucherNo && raw.beforeAlteration !== undefined) {
    const action = (raw.action as AuditTrailAction) ?? "Modified";
    let particular = String(raw.particular ?? "").trim();
    const before = stripFieldLabel(String(raw.beforeAlteration ?? "—"));
    const after = stripFieldLabel(String(raw.afterAlteration ?? "—"));

    // Upgrade descriptive particulars (seed v4 style) to field names
    if (
      !FIELD_PARTICULARS.includes(particular as (typeof FIELD_PARTICULARS)[number]) ||
      particular.includes("—") ||
      particular.length > 24
    ) {
      particular = inferParticular(before, after, action, particular);
    }

    return {
      id,
      dateTime: String(raw.dateTime ?? demoTimestamp(demoDateAt(0))),
      voucherType: String(raw.voucherType),
      voucherTypeCode: String(raw.voucherTypeCode ?? "journal"),
      voucherNo: String(raw.voucherNo),
      user: String(raw.user ?? ACCOUNTS_CURRENT_USER),
      action,
      particular,
      beforeAlteration: before,
      afterAlteration: after,
      status: (raw.status as AuditTrailStatus) ?? "Active",
    };
  }

  const module = String(raw.module ?? "");
  const vt = mapModuleToVoucherType(module);
  const activityOrAction = String(raw.activityType ?? raw.action ?? "Modified");
  const action = mapLegacyAction(activityOrAction);
  const status = mapLegacyStatus(String(raw.status ?? ""), action);
  const before = stripFieldLabel(String(raw.oldValue ?? raw.beforeAlteration ?? "—"));
  const after = stripFieldLabel(String(raw.newValue ?? raw.afterAlteration ?? "—"));
  const hints = [raw.partyName, raw.details, raw.action, activityOrAction]
    .filter(Boolean)
    .map(String)
    .join(" ");

  return {
    id,
    dateTime: String(raw.dateTime ?? demoTimestamp(demoDateAt(0))),
    voucherType: vt.label,
    voucherTypeCode: String(raw.moduleCode ?? vt.code),
    voucherNo: String(raw.reference ?? "—"),
    user: String(raw.user ?? ACCOUNTS_CURRENT_USER),
    action,
    particular: inferParticular(before, after, action, hints),
    beforeAlteration: before,
    afterAlteration: after,
    status,
  };
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
      saveRecords(STATIC_SEED);
      localStorage.setItem(SEED_VERSION_KEY, String(SEED_VERSION));
      return STATIC_SEED;
    }

    const stored = JSON.parse(raw) as Record<string, unknown>[];
    if (!Array.isArray(stored) || stored.length < 10) {
      saveRecords(STATIC_SEED);
      return STATIC_SEED;
    }

    return stored.map((row, i) =>
      normalizeLegacyRecord(row, Number(row.id) || i + 1),
    );
  } catch {
    return STATIC_SEED;
  }
}

/** Append a voucher alteration entry — persists across refresh. */
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

export function formatAuditTrailDate(iso: string): string {
  const [date] = iso.split("T");
  if (!date) return iso;
  const [y, m, d] = date.split("-");
  return `${d}-${m}-${y}`;
}

export function formatAuditTrailTime(iso: string): string {
  const time = iso.split("T")[1];
  if (!time) return "—";
  return time.slice(0, 5);
}

function matchesFinancialYear(dateIso: string, financialYearId?: string): boolean {
  if (!financialYearId || financialYearId === "all") return true;
  const fy = loadFinancialYears().find((f) => String(f.id) === String(financialYearId));
  if (!fy) return true;
  const day = dateIso.slice(0, 10);
  return day >= fy.startDate && day <= fy.endDate;
}

export function filterAuditTrail(
  records: AuditTrailRecord[],
  opts: {
    search?: string;
    dateFrom?: string;
    dateTo?: string;
    financialYearId?: string;
    voucherType?: string | string[];
    user?: string | string[];
    action?: string | string[];
  },
): AuditTrailRecord[] {
  let list = [...records];

  list = list.filter((r) => matchesFinancialYear(r.dateTime, opts.financialYearId));
  list = list.filter((r) => matchesMultiFilter(opts.voucherType, r.voucherTypeCode));
  list = list.filter((r) => matchesMultiFilter(opts.user, r.user));
  list = list.filter((r) => matchesMultiFilter(opts.action, r.action));

  if (opts.search?.trim()) {
    const q = opts.search.toLowerCase();
    list = list.filter(
      (r) =>
        r.user.toLowerCase().includes(q) ||
        r.voucherType.toLowerCase().includes(q) ||
        r.voucherNo.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q) ||
        r.particular.toLowerCase().includes(q) ||
        r.beforeAlteration.toLowerCase().includes(q) ||
        r.afterAlteration.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q),
    );
  }
  if (opts.dateFrom) {
    list = list.filter((r) => r.dateTime.slice(0, 10) >= opts.dateFrom!);
  }
  if (opts.dateTo) {
    list = list.filter((r) => r.dateTime.slice(0, 10) <= opts.dateTo!);
  }

  return list;
}
