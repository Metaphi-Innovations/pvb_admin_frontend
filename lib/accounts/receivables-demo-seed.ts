/**
 * Receivables demo seed — supplemental invoices, collection follow-ups and receipt allocation.
 */

import {
  loadInvoices,
  saveInvoices,
  derivePaymentStatus,
  type InvoiceRecord,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { loadCustomers } from "@/app/(app)/masters/customers/customer-data";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import type { CollectionFollowUp, CollectionFollowUpHistoryEntry } from "@/lib/accounts/receivables-data";
import {
  seedCollectionFollowUps,
  seedCollectionFollowUpHistory,
  seedReceiptAllocations,
} from "@/lib/accounts/receivables-data";
import {
  applyRelativeInvoiceDates,
  demoDateAt,
  demoDocNo,
} from "@/lib/accounts/demo-date-utils";

type SupplementalInvoiceSpec = {
  id: number;
  invoiceNo: string;
  customerId: number;
  invoiceDate: string;
  dueDate: string;
  subtotal: number;
  taxAmount: number;
  grandTotal: number;
  amountReceived: number;
  amountCredited?: number;
};

/** 13 supplemental invoices — brings receivables demo to 25 invoices across 5 core customers */
const SUPPLEMENTAL_INVOICE_SPECS_RAW: SupplementalInvoiceSpec[] = [
  {
    id: 13,
    invoiceNo: "INV-2026-013",
    customerId: 1,
    invoiceDate: "2026-02-12",
    dueDate: "2026-03-14",
    subtotal: 42373,
    taxAmount: 7627,
    grandTotal: 50000,
    amountReceived: 50000,
  },
  {
    id: 14,
    invoiceNo: "INV-2026-014",
    customerId: 1,
    invoiceDate: "2026-04-18",
    dueDate: "2026-05-18",
    subtotal: 101695,
    taxAmount: 18305,
    grandTotal: 120000,
    amountReceived: 0,
  },
  {
    id: 15,
    invoiceNo: "INV-2026-015",
    customerId: 2,
    invoiceDate: "2026-03-08",
    dueDate: "2026-04-07",
    subtotal: 55085,
    taxAmount: 9915,
    grandTotal: 65000,
    amountReceived: 30000,
  },
  {
    id: 16,
    invoiceNo: "INV-2026-016",
    customerId: 2,
    invoiceDate: "2026-05-22",
    dueDate: "2026-06-21",
    subtotal: 84746,
    taxAmount: 15254,
    grandTotal: 100000,
    amountReceived: 0,
  },
  {
    id: 17,
    invoiceNo: "INV-2026-017",
    customerId: 3,
    invoiceDate: "2026-03-20",
    dueDate: "2026-04-19",
    subtotal: 63559,
    taxAmount: 11441,
    grandTotal: 75000,
    amountReceived: 75000,
  },
  {
    id: 18,
    invoiceNo: "INV-2026-018",
    customerId: 3,
    invoiceDate: "2026-06-01",
    dueDate: "2026-06-16",
    subtotal: 33898,
    taxAmount: 6102,
    grandTotal: 40000,
    amountReceived: 0,
  },
  {
    id: 19,
    invoiceNo: "INV-2026-019",
    customerId: 4,
    invoiceDate: "2026-02-25",
    dueDate: "2026-03-27",
    subtotal: 46610,
    taxAmount: 8390,
    grandTotal: 55000,
    amountReceived: 55000,
  },
  {
    id: 20,
    invoiceNo: "INV-2026-020",
    customerId: 4,
    invoiceDate: "2026-06-05",
    dueDate: "2026-06-20",
    subtotal: 25424,
    taxAmount: 4576,
    grandTotal: 30000,
    amountReceived: 10000,
  },
  {
    id: 21,
    invoiceNo: "INV-2026-021",
    customerId: 5,
    invoiceDate: "2026-04-02",
    dueDate: "2026-05-02",
    subtotal: 72034,
    taxAmount: 12966,
    grandTotal: 85000,
    amountReceived: 42500,
  },
  {
    id: 22,
    invoiceNo: "INV-2026-022",
    customerId: 5,
    invoiceDate: "2026-05-30",
    dueDate: "2026-06-29",
    subtotal: 42373,
    taxAmount: 7627,
    grandTotal: 50000,
    amountReceived: 0,
  },
  {
    id: 23,
    invoiceNo: "INV-2026-023",
    customerId: 1,
    invoiceDate: "2026-06-08",
    dueDate: "2026-06-23",
    subtotal: 16949,
    taxAmount: 3051,
    grandTotal: 20000,
    amountReceived: 0,
  },
  {
    id: 24,
    invoiceNo: "INV-2026-024",
    customerId: 2,
    invoiceDate: "2026-06-10",
    dueDate: "2026-07-10",
    subtotal: 29661,
    taxAmount: 5339,
    grandTotal: 35000,
    amountReceived: 0,
  },
  {
    id: 25,
    invoiceNo: "INV-2026-025",
    customerId: 3,
    invoiceDate: "2026-06-12",
    dueDate: "2026-07-12",
    subtotal: 21186,
    taxAmount: 3814,
    grandTotal: 25000,
    amountReceived: 15000,
  },
];

function getSupplementalInvoiceSpecs(): SupplementalInvoiceSpec[] {
  return applyRelativeInvoiceDates(SUPPLEMENTAL_INVOICE_SPECS_RAW, 2, "INV", new Date(), 3);
}

function buildSupplementalInvoice(spec: SupplementalInvoiceSpec, customerName: string): InvoiceRecord {
  const amountCredited = spec.amountCredited ?? 0;
  const unitPrice = spec.subtotal / 50;
  const collections =
    spec.amountReceived > 0
      ? [
          {
            id: spec.id,
            paymentDate: spec.invoiceDate,
            amount: spec.amountReceived,
            paymentMode: "NEFT" as const,
            referenceNo: `RCPT-${spec.invoiceNo}`,
            remarks: `Payment against ${spec.invoiceNo}`,
            createdBy: ACCOUNTS_CURRENT_USER,
            createdAt: `${spec.invoiceDate}T10:00:00.000Z`,
          },
        ]
      : [];

  const customer = loadCustomers().find((c) => c.id === spec.customerId);

  return {
    id: spec.id,
    invoiceNo: spec.invoiceNo,
    invoiceDate: spec.invoiceDate,
    dueDate: spec.dueDate,
    referenceNo: spec.invoiceNo,
    salesOrderNo: "",
    remarks: `Receivables demo invoice ${spec.invoiceNo}`,
    customerId: spec.customerId,
    customerName,
    customerLedgerId: null,
    customerMobile: customer?.mobile ?? "",
    customerEmail: customer?.email ?? "",
    customerGst: customer?.gstin ?? "",
    billingAddress: customer?.address ?? "",
    shippingAddress: customer?.address ?? "",
    receivableLedger: customerName,
    salesperson: "Rajesh Sharma",
    lineItems: [
      {
        id: `sup-line-${spec.id}`,
        productId: 1,
        productName: "DAP 50kg",
        description: "Receivables demo line",
        qty: 50,
        unit: "BAG",
        unitPrice,
        discountPct: 0,
        taxPct: 18,
        amount: spec.subtotal,
        creditedQty: 0,
        creditedAmount: 0,
      },
    ],
    subtotal: spec.subtotal,
    discountTotal: 0,
    taxAmount: spec.taxAmount,
    grandTotal: spec.grandTotal,
    amountReceived: spec.amountReceived,
    balanceAmount: spec.grandTotal - spec.amountReceived - amountCredited,
    amountCredited,
    balanceCreditAllowed: spec.grandTotal - amountCredited,
    creditStatus: amountCredited > 0 ? "partially_credited" : "no_credit",
    soAdjustmentStatus: "open",
    invoiceStatus: "sent",
    paymentStatus:
      spec.amountReceived <= 0
        ? "unpaid"
        : spec.amountReceived >= spec.grandTotal
          ? "paid"
          : "partially_paid",
    collections,
    attachments: [],
    activity: [
      {
        at: `${spec.invoiceDate}T09:00:00.000Z`,
        action: "created",
        by: ACCOUNTS_CURRENT_USER,
        detail: `Posted sales invoice ${spec.invoiceNo}`,
      },
    ],
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
    createdAt: `${spec.invoiceDate}T09:00:00.000Z`,
    updatedAt: `${spec.invoiceDate}T09:00:00.000Z`,
  };
}

export const DEMO_COLLECTION_FOLLOWUPS: CollectionFollowUp[] = [
  {
    id: 1,
    followUpNo: "FU-0001",
    customerId: 1,
    customerName: "ABC Agro Distributor",
    invoiceId: 14,
    invoiceNo: "INV-2026-014",
    outstandingAmount: 120000,
    dueDate: "2026-05-18",
    followUpDate: "2026-06-10",
    assignedTo: "Rajesh Sharma",
    contactPerson: "Mr. Patil",
    phone: "9876543210",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "follow_up_scheduled",
    remarks: "Customer requested statement; follow up for overdue ₹1,20,000.",
    nextFollowUpDate: "2026-06-18",
  },
  {
    id: 2,
    followUpNo: "FU-0002",
    customerId: 4,
    customerName: "Green Harvest Agro",
    invoiceId: 20,
    invoiceNo: "INV-2026-020",
    outstandingAmount: 20000,
    dueDate: "2026-06-20",
    followUpDate: "2026-06-12",
    assignedTo: "Priya Singh",
    contactPerson: "Purchase Desk",
    phone: "9834567890",
    promiseToPayDate: "2026-06-25",
    promiseAmount: 20000,
    status: "promise_to_pay",
    remarks: "Promised NEFT by month-end.",
    nextFollowUpDate: "2026-06-26",
  },
  {
    id: 3,
    followUpNo: "FU-0003",
    customerId: 3,
    customerName: "Yavatmal Cotton FPO",
    invoiceId: 7,
    invoiceNo: "INV-2026-007",
    outstandingAmount: 145000,
    dueDate: "2026-06-02",
    followUpDate: "2026-06-05",
    assignedTo: "Amit Verma",
    contactPerson: "FPO Secretary",
    phone: "9823456789",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "not_contacted",
    remarks: "Awaiting FPO board approval for payment release.",
    nextFollowUpDate: "2026-06-22",
  },
  {
    id: 4,
    followUpNo: "FU-0004",
    customerId: 2,
    customerName: "Krishna Retail Store",
    invoiceId: 16,
    invoiceNo: "INV-2026-016",
    outstandingAmount: 100000,
    dueDate: "2026-06-21",
    followUpDate: "2026-06-15",
    assignedTo: "Neha Patel",
    contactPerson: "Store Manager",
    phone: "9856789012",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "follow_up_scheduled",
    remarks: "Reminder call scheduled for overdue balance.",
    nextFollowUpDate: "2026-06-20",
  },
  {
    id: 5,
    followUpNo: "FU-0005",
    customerId: 3,
    customerName: "Yavatmal Cotton FPO",
    invoiceId: 8,
    invoiceNo: "INV-2026-008",
    outstandingAmount: 45000,
    dueDate: "2026-06-26",
    followUpDate: "2026-06-08",
    assignedTo: "Amit Verma",
    contactPerson: "Accounts",
    phone: "9823456789",
    promiseToPayDate: "2026-06-30",
    promiseAmount: 25000,
    status: "part_payment_received",
    remarks: "₹25,000 received via RV-2026-005; balance follow-up scheduled.",
    nextFollowUpDate: "2026-07-01",
  },
  {
    id: 6,
    followUpNo: "FU-0006",
    customerId: 5,
    customerName: "Pune Agri Traders",
    invoiceId: 22,
    invoiceNo: "INV-2026-022",
    outstandingAmount: 50000,
    dueDate: "2026-06-29",
    followUpDate: "2026-06-01",
    assignedTo: "Suresh Kumar",
    contactPerson: "Store Owner",
    phone: "9867890123",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "not_contacted",
    remarks: "Requested copy of invoice and delivery challan.",
    nextFollowUpDate: "2026-06-24",
  },
  {
    id: 7,
    followUpNo: "FU-0007",
    customerId: 1,
    customerName: "ABC Agro Distributor",
    invoiceId: 23,
    invoiceNo: "INV-2026-023",
    outstandingAmount: 20000,
    dueDate: "2026-06-23",
    followUpDate: "2026-06-14",
    assignedTo: "Rajesh Sharma",
    contactPerson: "Mr. Deshmukh",
    phone: "9878901234",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "escalated",
    remarks: "Escalated to regional manager — no response on two calls.",
    nextFollowUpDate: "2026-06-21",
  },
  {
    id: 8,
    followUpNo: "FU-0008",
    customerId: 2,
    customerName: "Krishna Retail Store",
    invoiceId: 15,
    invoiceNo: "INV-2026-015",
    outstandingAmount: 35000,
    dueDate: "2026-04-07",
    followUpDate: "2026-06-16",
    assignedTo: "Priya Singh",
    contactPerson: "Accounts",
    phone: "9845678901",
    promiseToPayDate: "2026-06-28",
    promiseAmount: 35000,
    status: "promise_to_pay",
    remarks: "Customer agreed to clear April balance by month-end.",
    nextFollowUpDate: "2026-06-29",
  },
  {
    id: 9,
    followUpNo: "FU-0009",
    customerId: 4,
    customerName: "Green Harvest Agro",
    invoiceId: 5,
    invoiceNo: "INV-2026-005",
    outstandingAmount: 70000,
    dueDate: "2026-07-07",
    followUpDate: "2026-06-18",
    assignedTo: "Neha Patel",
    contactPerson: "Finance",
    phone: "9834567890",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "closed",
    remarks: "Partial payment received; case closed pending next invoice cycle.",
    nextFollowUpDate: "",
  },
  {
    id: 10,
    followUpNo: "FU-0010",
    customerId: 5,
    customerName: "Pune Agri Traders",
    invoiceId: 21,
    invoiceNo: "INV-2026-021",
    outstandingAmount: 42500,
    dueDate: "2026-05-02",
    followUpDate: "2026-06-11",
    assignedTo: "Suresh Kumar",
    contactPerson: "Owner",
    phone: "9867890123",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "part_payment_received",
    remarks: "₹42,500 outstanding after partial receipt.",
    nextFollowUpDate: "2026-06-27",
  },
];

const DEMO_COLLECTION_HISTORY: CollectionFollowUpHistoryEntry[] = [
  {
    id: 1,
    followUpId: 1,
    date: "2026-06-10",
    status: "follow_up_scheduled",
    remarks: "Initial follow-up logged; statement shared on email.",
    updatedBy: "Rajesh Sharma",
  },
  {
    id: 2,
    followUpId: 2,
    date: "2026-06-12",
    status: "promise_to_pay",
    remarks: "Customer promised NEFT by 25 Jun.",
    updatedBy: "Priya Singh",
  },
  {
    id: 3,
    followUpId: 5,
    date: "2026-06-08",
    status: "part_payment_received",
    remarks: "₹25,000 allocated from RV-2026-005.",
    updatedBy: "Amit Verma",
  },
  {
    id: 4,
    followUpId: 7,
    date: "2026-06-14",
    status: "escalated",
    remarks: "Escalated after two unanswered calls.",
    updatedBy: "Rajesh Sharma",
  },
];

/** Maps voucher numbers to invoice allocation lines (voucherId resolved at runtime). */
export const DEMO_RECEIPT_ALLOCATION_SPECS: Array<{
  voucherNumber: string;
  lines: Array<{ invoiceNo: string; amount: number }>;
}> = [
  {
    voucherNumber: "RV-2026-001",
    lines: [{ invoiceNo: "INV-2026-001", amount: 80000 }],
  },
  {
    voucherNumber: "RV-2026-002",
    lines: [{ invoiceNo: "INV-2026-002", amount: 45000 }],
  },
  {
    voucherNumber: "RV-2026-003",
    lines: [{ invoiceNo: "INV-2026-006", amount: 118000 }],
  },
  {
    voucherNumber: "RV-2026-004",
    lines: [
      { invoiceNo: "INV-2026-004", amount: 80000 },
      { invoiceNo: "INV-2026-005", amount: 10000 },
    ],
  },
  {
    voucherNumber: "RV-2026-005",
    lines: [{ invoiceNo: "INV-2026-008", amount: 25000 }],
  },
  { voucherNumber: "RV-2026-006", lines: [] },
];

function buildDemoReceiptAllocationSpecs(ref = new Date()) {
  const invNo = (id: number) => demoDocNo("INV", id, ref, 3);
  const rvNo = (seq: number) => demoDocNo("RV", seq, ref, 3);
  return [
    { voucherNumber: rvNo(1), lines: [{ invoiceNo: invNo(1), amount: 80000 }] },
    { voucherNumber: rvNo(2), lines: [{ invoiceNo: invNo(2), amount: 45000 }] },
    { voucherNumber: rvNo(3), lines: [{ invoiceNo: invNo(6), amount: 118000 }] },
    {
      voucherNumber: rvNo(4),
      lines: [
        { invoiceNo: invNo(4), amount: 80000 },
        { invoiceNo: invNo(5), amount: 10000 },
      ],
    },
    { voucherNumber: rvNo(5), lines: [{ invoiceNo: invNo(8), amount: 25000 }] },
    { voucherNumber: rvNo(6), lines: [] as Array<{ invoiceNo: string; amount: number }> },
  ];
}

const COLLECTION_DATE_OFFSETS: Record<
  number,
  { followUp: number; next: number; promise?: number }
> = {
  1: { followUp: 10, next: 18 },
  2: { followUp: 12, next: 26, promise: 25 },
  3: { followUp: 5, next: 22 },
  4: { followUp: 15, next: 20 },
  5: { followUp: 8, next: 1, promise: 0 },
  6: { followUp: 1, next: 24 },
  7: { followUp: 14, next: 21 },
  8: { followUp: 16, next: 29, promise: 28 },
  9: { followUp: 18, next: -1 },
  10: { followUp: 11, next: 27 },
};

function buildDemoCollectionFollowUps(ref = new Date()): CollectionFollowUp[] {
  const invoices = loadInvoices();
  const rv5 = demoDocNo("RV", 5, ref, 3);
  return DEMO_COLLECTION_FOLLOWUPS.map((row) => {
    const inv = invoices.find((i) => i.id === row.invoiceId);
    const o = COLLECTION_DATE_OFFSETS[row.id] ?? { followUp: 7, next: 14 };
    return {
      ...row,
      invoiceNo: inv?.invoiceNo ?? demoDocNo("INV", row.invoiceId ?? 0, ref, 3),
      dueDate: inv?.dueDate ?? demoDateAt(o.followUp + 8, ref),
      followUpDate: demoDateAt(o.followUp, ref),
      promiseToPayDate:
        row.promiseToPayDate === ""
          ? ""
          : o.promise != null
            ? demoDateAt(o.promise, ref)
            : demoDateAt(o.followUp + 3, ref),
      nextFollowUpDate: o.next < 0 ? "" : demoDateAt(o.next, ref),
      remarks: row.remarks.replace("RV-2026-005", rv5),
    };
  });
}

function buildDemoCollectionHistory(ref = new Date()): CollectionFollowUpHistoryEntry[] {
  const offsets = [10, 12, 8, 14];
  return DEMO_COLLECTION_HISTORY.map((row, i) => ({
    ...row,
    date: demoDateAt(offsets[i] ?? 7, ref),
    remarks: row.remarks.replace("RV-2026-005", demoDocNo("RV", 5, ref, 3)),
  }));
}

export function seedReceivablesDemoData(
  resolveVoucherId: (voucherNumber: string) => number | undefined,
  resolveInvoiceId: (invoiceNo: string) => number | undefined,
): void {
  const ref = new Date();
  seedCollectionFollowUps(buildDemoCollectionFollowUps(ref));
  seedCollectionFollowUpHistory(buildDemoCollectionHistory(ref));

  const entries = buildDemoReceiptAllocationSpecs(ref).map((spec) => {
    const voucherId = resolveVoucherId(spec.voucherNumber);
    if (!voucherId) return null;
    return {
      voucherId,
      lines: spec.lines
        .map((l) => {
          const invoiceId = resolveInvoiceId(l.invoiceNo);
          if (!invoiceId) return null;
          return { invoiceId, invoiceNo: l.invoiceNo, amount: l.amount };
        })
        .filter(Boolean) as Array<{ invoiceId: number; invoiceNo: string; amount: number }>,
    };
  }).filter(Boolean) as Array<{
    voucherId: number;
    lines: Array<{ invoiceId: number; invoiceNo: string; amount: number }>;
  }>;

  seedReceiptAllocations(entries);
}

export function seedReceivablesSupplementalData(): void {
  if (typeof window === "undefined") return;

  const customers = loadCustomers();
  const existing = loadInvoices();
  const existingNos = new Set(existing.map((i) => i.invoiceNo));

  const toAdd = getSupplementalInvoiceSpecs().filter((s) => !existingNos.has(s.invoiceNo)).map(
    (spec) => {
      const customer = customers.find((c) => c.id === spec.customerId);
      return buildSupplementalInvoice(spec, customer?.customerName ?? "Customer");
    },
  );

  if (toAdd.length > 0) {
    saveInvoices([...existing, ...toAdd]);
  }

  seedCollectionFollowUps(buildDemoCollectionFollowUps(new Date()));
  seedCollectionFollowUpHistory(buildDemoCollectionHistory(new Date()));
}

const RECEIVABLES_SEED_KEY = "ds_receivables_demo_seed_v3";
export const RECEIVABLES_SEED_VERSION = "relative-dates-v3";

/** Idempotent client-side seed for supplemental receivables demo data. */
export function ensureReceivablesDemoData(): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(RECEIVABLES_SEED_KEY) === RECEIVABLES_SEED_VERSION) return;
  try {
    seedReceivablesSupplementalData();
    localStorage.setItem(RECEIVABLES_SEED_KEY, RECEIVABLES_SEED_VERSION);
  } catch (err) {
    console.error("[receivables] supplemental seed failed:", err);
  }
}
