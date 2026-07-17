/**
 * Frontend-only Bill-wise demo rows for UI testing (no invoice / voucher required).
 */

import type { BillWiseReferenceRow } from "@/lib/accounts/bill-wise-outstanding";

export const BILL_WISE_DEMO_CUSTOMER_LEDGER_NAME = "ABC Distributor";

/** Stable negative ids — not real invoice records. */
export const BILL_WISE_DEMO_INVOICE_IDS = [-9001, -9002, -9003] as const;

export function isBillWiseDemoLedgerName(name: string): boolean {
  return name.trim().toLowerCase() === BILL_WISE_DEMO_CUSTOMER_LEDGER_NAME.toLowerCase();
}

export function isBillWiseDemoDocumentId(id: number): boolean {
  return (BILL_WISE_DEMO_INVOICE_IDS as readonly number[]).includes(id);
}

/** Demo SI rows for ABC Distributor — UI testing only. */
export function getAbcDistributorBillWiseDemoReferences(
  asOfDate = new Date().toISOString().slice(0, 10),
): BillWiseReferenceRow[] {
  const today = asOfDate.slice(0, 10);
  return [
    {
      documentId: BILL_WISE_DEMO_INVOICE_IDS[0],
      documentNo: "SI-001",
      documentDate: "2026-04-01",
      dueDate: "2026-04-30",
      documentAmount: 10_000,
      adjustedAmount: 0,
      outstandingAmount: 10_000,
      daysOverdue: daysOverdue("2026-04-30", today),
      ageingBucket: ageingLabel(daysOverdue("2026-04-30", today)),
      status: "Pending",
    },
    {
      documentId: BILL_WISE_DEMO_INVOICE_IDS[1],
      documentNo: "SI-002",
      documentDate: "2026-05-10",
      dueDate: "2026-06-09",
      documentAmount: 20_000,
      adjustedAmount: 15_000,
      outstandingAmount: 5_000,
      daysOverdue: daysOverdue("2026-06-09", today),
      ageingBucket: ageingLabel(daysOverdue("2026-06-09", today)),
      status: "Partially Paid",
    },
    {
      documentId: BILL_WISE_DEMO_INVOICE_IDS[2],
      documentNo: "SI-003",
      documentDate: "2026-04-20",
      dueDate: "2026-05-20",
      documentAmount: 30_000,
      adjustedAmount: 0,
      outstandingAmount: 30_000,
      daysOverdue: Math.max(1, daysOverdue("2026-05-20", today)),
      ageingBucket: ageingLabel(Math.max(1, daysOverdue("2026-05-20", today))),
      status: "Overdue",
    },
  ];
}

function daysOverdue(dueDate: string, asOf: string): number {
  const due = new Date(dueDate);
  const asOfD = new Date(asOf);
  if (Number.isNaN(due.getTime()) || Number.isNaN(asOfD.getTime())) return 0;
  const diff = Math.floor((asOfD.getTime() - due.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

function ageingLabel(days: number): string {
  if (days <= 0) return "Not due";
  if (days <= 30) return "1–30 days";
  if (days <= 60) return "31–60 days";
  if (days <= 90) return "61–90 days";
  return "90+ days";
}
