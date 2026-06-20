/**
 * Receivables demo seed — collection follow-ups and receipt allocation links.
 * Called from accounts-demo-seed after invoices and receipt vouchers are posted.
 */

import type { CollectionFollowUp } from "@/lib/accounts/receivables-data";
import {
  seedCollectionFollowUps,
  seedReceiptAllocations,
} from "@/lib/accounts/receivables-data";

export const DEMO_COLLECTION_FOLLOWUPS: CollectionFollowUp[] = [
  {
    id: 1,
    followUpNo: "FU-0001",
    customerId: 1,
    customerName: "ABC Agro Distributor",
    invoiceId: 1,
    invoiceNo: "INV-2026-001",
    outstandingAmount: 50000,
    dueDate: "2026-04-04",
    followUpDate: "2026-06-10",
    assignedTo: "Rajesh Sharma",
    contactPerson: "Mr. Patil",
    phone: "9876543210",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "follow_up_due",
    remarks: "Customer requested statement; follow up for overdue ₹50,000.",
    nextFollowUpDate: "2026-06-18",
  },
  {
    id: 2,
    followUpNo: "FU-0002",
    customerId: 4,
    customerName: "Green Harvest Agro",
    invoiceId: 4,
    invoiceNo: "INV-2026-004",
    outstandingAmount: 20000,
    dueDate: "2026-04-14",
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
    status: "pending",
    remarks: "Awaiting FPO board approval for payment release.",
    nextFollowUpDate: "2026-06-22",
  },
  {
    id: 4,
    followUpNo: "FU-0004",
    customerId: 6,
    customerName: "Konkan Fertilizer Depot",
    invoiceId: 9,
    invoiceNo: "INV-2026-009",
    outstandingAmount: 5040,
    dueDate: "2026-06-09",
    followUpDate: "2026-06-15",
    assignedTo: "Neha Patel",
    contactPerson: "Depot Manager",
    phone: "9856789012",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "follow_up_due",
    remarks: "Small balance — reminder call pending.",
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
    status: "partially_collected",
    remarks: "₹25,000 received via RV-2026-005; balance follow-up scheduled.",
    nextFollowUpDate: "2026-07-01",
  },
  {
    id: 6,
    followUpNo: "FU-0006",
    customerId: 7,
    customerName: "Vidarbha Agro Mart",
    invoiceId: 11,
    invoiceNo: "INV-2026-011",
    outstandingAmount: 42500,
    dueDate: "2026-06-14",
    followUpDate: "2026-06-01",
    assignedTo: "Suresh Kumar",
    contactPerson: "Store Owner",
    phone: "9867890123",
    promiseToPayDate: "",
    promiseAmount: 0,
    status: "pending",
    remarks: "Requested copy of invoice and delivery challan.",
    nextFollowUpDate: "2026-06-24",
  },
  {
    id: 7,
    followUpNo: "FU-0007",
    customerId: 8,
    customerName: "Bharat Krishi Kendra",
    invoiceId: 12,
    invoiceNo: "INV-2026-012",
    outstandingAmount: 62000,
    dueDate: "2026-07-27",
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
    customerId: 1,
    customerName: "ABC Agro Distributor",
    invoiceId: null,
    invoiceNo: "",
    outstandingAmount: 175000,
    dueDate: "",
    followUpDate: "2026-06-16",
    assignedTo: "Rajesh Sharma",
    contactPerson: "Mr. Patil",
    phone: "9876543210",
    promiseToPayDate: "2026-07-05",
    promiseAmount: 100000,
    status: "promise_to_pay",
    remarks: "Customer agreed to pay ₹1,00,000 against total outstanding.",
    nextFollowUpDate: "2026-07-06",
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

export function seedReceivablesDemoData(
  resolveVoucherId: (voucherNumber: string) => number | undefined,
  resolveInvoiceId: (invoiceNo: string) => number | undefined,
): void {
  seedCollectionFollowUps(DEMO_COLLECTION_FOLLOWUPS);

  const entries = DEMO_RECEIPT_ALLOCATION_SPECS.map((spec) => {
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
