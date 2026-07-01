import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import {
  getTdsSectionCode,
  loadTDSMasters,
  type TDSMaster,
} from "@/app/(app)/masters/tds/tds-data";
import { parseTdsSectionCode } from "@/lib/accounts/tds-coa-utils";

export type TdsPartyType =
  | "Supplier"
  | "Customer"
  | "Contractor"
  | "Professional"
  | "Employee";

export type TdsPaymentStatus = "paid" | "unpaid";

export type TdsSourceVoucherType = "purchase_invoice" | "journal" | "payment";

export interface TdsPartyWiseRow {
  id: string;
  partyId: number;
  partyType: TdsPartyType;
  partyName: string;
  pan: string;
  tdsSection: string;
  tdsSectionName: string;
  tdsRate: string;
  tdsLedgerId: number | null;
  voucherNo: string;
  voucherDate: string;
  billNo: string;
  taxableAmount: number;
  tdsAmount: number;
  paymentStatus: TdsPaymentStatus;
  challanNo?: string;
  sourceType: TdsSourceVoucherType;
  sourceId: number;
  partyLedgerId: number | null;
}

export interface TdsPartyWiseFilters {
  dateFrom: string;
  dateTo: string;
  section: string;
  ledgerId: string;
  partyType: string;
  paymentStatus: string;
  search: string;
}

const STORAGE_KEY = "ds_tds_party_wise_v1";

function resolvePartyLedgerId(
  partyId: number,
  partyType: TdsPartyType,
): number | null {
  const records = loadChartOfAccounts();
  const module =
    partyType === "Customer" ? "customer_master" : "vendor_master";
  const ledger = records.find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.erpSourceModule === module &&
      r.erpSourceId === partyId,
  );
  return ledger?.id ?? null;
}

function resolveTdsLedgerId(sectionCode: string): number | null {
  const code = sectionCode.toUpperCase();
  const ledger = loadChartOfAccounts().find(
    (r) =>
      r.nodeLevel === "ledger" &&
      r.accountName.toUpperCase().includes(`SEC ${code}`),
  );
  return ledger?.id ?? null;
}

function masterForSection(sectionCode: string): TDSMaster | undefined {
  const code = sectionCode.toUpperCase();
  return loadTDSMasters().find(
    (m) => getTdsSectionCode(m).toUpperCase() === code,
  );
}

export function resolveTdsSourceHref(row: TdsPartyWiseRow): string {
  switch (row.sourceType) {
    case "purchase_invoice":
      return `/accounts/purchase-invoices/${row.sourceId}`;
    case "payment":
    case "journal":
    default:
      return `/accounts/vouchers/view/${row.sourceId}`;
  }
}

export function resolvePartyGeneralLedgerHref(row: TdsPartyWiseRow): string {
  if (row.partyLedgerId) {
    return `/accounts/reports/ledger?ledger=${row.partyLedgerId}`;
  }
  return "/accounts/reports/ledger";
}

const TDS_PARTY_WISE_SEED: TdsPartyWiseRow[] = [
  {
    id: "tds-1",
    partyId: 1,
    partyType: "Supplier",
    partyName: "Agro Chem Distributors Pvt Ltd",
    pan: "AABCA1234F",
    tdsSection: "194C",
    tdsSectionName: "Contractor Payment",
    tdsRate: "1%",
    tdsLedgerId: null,
    voucherNo: "PUR-2026-001",
    voucherDate: "2026-04-12",
    billNo: "ACD/INV/26/041",
    taxableAmount: 85000,
    tdsAmount: 850,
    paymentStatus: "unpaid",
    sourceType: "purchase_invoice",
    sourceId: 1,
    partyLedgerId: null,
  },
  {
    id: "tds-2",
    partyId: 2,
    partyType: "Contractor",
    partyName: "GreenField Logistics",
    pan: "AAFCG5678K",
    tdsSection: "194C",
    tdsSectionName: "Contractor Payment",
    tdsRate: "1%",
    tdsLedgerId: null,
    voucherNo: "PAY-2026-0142",
    voucherDate: "2026-04-18",
    billNo: "GFL/WT/042",
    taxableAmount: 42000,
    tdsAmount: 420,
    paymentStatus: "paid",
    challanNo: "CH-TDS-APR-042",
    sourceType: "payment",
    sourceId: 14,
    partyLedgerId: null,
  },
  {
    id: "tds-3",
    partyId: 3,
    partyType: "Professional",
    partyName: "LegalEase Advisors LLP",
    pan: "AADCL9012M",
    tdsSection: "194J",
    tdsSectionName: "Professional Fees",
    tdsRate: "10%",
    tdsLedgerId: null,
    voucherNo: "PUR-2026-003",
    voucherDate: "2026-05-05",
    billNo: "LEA/PRO/2026/09",
    taxableAmount: 25000,
    tdsAmount: 2500,
    paymentStatus: "unpaid",
    sourceType: "purchase_invoice",
    sourceId: 3,
    partyLedgerId: null,
  },
  {
    id: "tds-4",
    partyId: 4,
    partyType: "Supplier",
    partyName: "Krishna Pesticides Ltd",
    pan: "AABCK3456P",
    tdsSection: "194Q",
    tdsSectionName: "Purchase of Goods",
    tdsRate: "0.1%",
    tdsLedgerId: null,
    voucherNo: "PUR-2026-004",
    voucherDate: "2026-05-12",
    billNo: "KIP/26/INV-033",
    taxableAmount: 125000,
    tdsAmount: 125,
    paymentStatus: "unpaid",
    sourceType: "purchase_invoice",
    sourceId: 4,
    partyLedgerId: null,
  },
  {
    id: "tds-5",
    partyId: 5,
    partyType: "Supplier",
    partyName: "CropCare Inputs Pvt Ltd",
    pan: "AABCC7890R",
    tdsSection: "194H",
    tdsSectionName: "Commission",
    tdsRate: "5%",
    tdsLedgerId: null,
    voucherNo: "JRN-2026-0088",
    voucherDate: "2026-05-20",
    billNo: "CCI/COM/19B",
    taxableAmount: 18000,
    tdsAmount: 900,
    paymentStatus: "paid",
    challanNo: "CH-TDS-MAY-019",
    sourceType: "journal",
    sourceId: 88,
    partyLedgerId: null,
  },
  {
    id: "tds-6",
    partyId: 2,
    partyType: "Contractor",
    partyName: "GreenField Logistics",
    pan: "AAFCG5678K",
    tdsSection: "194C",
    tdsSectionName: "Contractor Payment",
    tdsRate: "1%",
    tdsLedgerId: null,
    voucherNo: "PUR-2026-002",
    voucherDate: "2026-04-22",
    billNo: "GFL/FRT/118",
    taxableAmount: 31500,
    tdsAmount: 315,
    paymentStatus: "unpaid",
    sourceType: "purchase_invoice",
    sourceId: 2,
    partyLedgerId: null,
  },
  {
    id: "tds-7",
    partyId: 1,
    partyType: "Supplier",
    partyName: "Agro Chem Distributors Pvt Ltd",
    pan: "AABCA1234F",
    tdsSection: "194J",
    tdsSectionName: "Professional Fees",
    tdsRate: "10%",
    tdsLedgerId: null,
    voucherNo: "PAY-2026-0156",
    voucherDate: "2026-06-02",
    billNo: "ACD/CONS/12",
    taxableAmount: 12000,
    tdsAmount: 1200,
    paymentStatus: "paid",
    challanNo: "CH-TDS-JUN-007",
    sourceType: "payment",
    sourceId: 156,
    partyLedgerId: null,
  },
];

function hydrateSeedRow(row: TdsPartyWiseRow): TdsPartyWiseRow {
  const master = masterForSection(row.tdsSection);
  const rate = master?.tdsRate ?? row.tdsRate.replace("%", "");
  return {
    ...row,
    tdsSectionName: master?.sectionName ?? row.tdsSectionName,
    tdsRate: /slab/i.test(rate) ? "As per slab" : `${rate}%`,
    tdsLedgerId: resolveTdsLedgerId(row.tdsSection),
    partyLedgerId: resolvePartyLedgerId(row.partyId, row.partyType),
  };
}

export function loadTdsPartyWiseRows(): TdsPartyWiseRow[] {
  if (typeof window === "undefined") {
    return TDS_PARTY_WISE_SEED.map(hydrateSeedRow);
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const base = raw
      ? (JSON.parse(raw) as TdsPartyWiseRow[])
      : TDS_PARTY_WISE_SEED;
    if (!raw) localStorage.setItem(STORAGE_KEY, JSON.stringify(TDS_PARTY_WISE_SEED));
    return base.map(hydrateSeedRow);
  } catch {
    return TDS_PARTY_WISE_SEED.map(hydrateSeedRow);
  }
}

export function filterTdsPartyWiseRows(
  rows: TdsPartyWiseRow[],
  filters: TdsPartyWiseFilters,
): TdsPartyWiseRow[] {
  const q = filters.search.trim().toLowerCase();
  return rows.filter((row) => {
    if (filters.dateFrom && row.voucherDate < filters.dateFrom) return false;
    if (filters.dateTo && row.voucherDate > filters.dateTo) return false;
    if (filters.section !== "all" && row.tdsSection !== filters.section) return false;
    if (filters.ledgerId !== "all") {
      const ledger = loadChartOfAccounts().find((r) => String(r.id) === filters.ledgerId);
      const ledgerSection = ledger ? parseTdsSectionCode(ledger.accountName) : null;
      const matchesLedgerId =
        row.tdsLedgerId != null && String(row.tdsLedgerId) === filters.ledgerId;
      const matchesSection = ledgerSection === row.tdsSection;
      if (!matchesLedgerId && !matchesSection) return false;
    }
    if (filters.partyType !== "all" && row.partyType !== filters.partyType) return false;
    if (filters.paymentStatus !== "all" && row.paymentStatus !== filters.paymentStatus) {
      return false;
    }
    if (q) {
      const hay = [
        row.partyName,
        row.pan,
        row.tdsSection,
        row.voucherNo,
        row.billNo,
        row.challanNo ?? "",
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function computeTdsPartyWiseSummary(rows: TdsPartyWiseRow[]) {
  const taxable = rows.reduce((s, r) => s + r.taxableAmount, 0);
  const tds = rows.reduce((s, r) => s + r.tdsAmount, 0);
  const unpaid = rows
    .filter((r) => r.paymentStatus === "unpaid")
    .reduce((s, r) => s + r.tdsAmount, 0);
  const paid = rows
    .filter((r) => r.paymentStatus === "paid")
    .reduce((s, r) => s + r.tdsAmount, 0);
  return { taxable, tds, unpaid, paid, count: rows.length };
}

export const TDS_PARTY_TYPE_OPTIONS = [
  { value: "all", label: "All Party Types" },
  { value: "Supplier", label: "Supplier" },
  { value: "Customer", label: "Customer" },
  { value: "Contractor", label: "Contractor" },
  { value: "Professional", label: "Professional" },
  { value: "Employee", label: "Employee" },
] as const;

export const TDS_PAYMENT_STATUS_OPTIONS = [
  { value: "all", label: "All Status" },
  { value: "unpaid", label: "Unpaid" },
  { value: "paid", label: "Paid" },
] as const;
