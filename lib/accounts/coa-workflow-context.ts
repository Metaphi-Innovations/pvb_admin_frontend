import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { resolveCoaGroupContext } from "@/lib/accounts/coa-group-drilldown";

export type CoaWorkflowContext =
  | { kind: "sales_group"; ledgerCount: number; totalBalance: number; transactionCount: number }
  | {
      kind: "customer_ledger";
      ledgerId: number;
      ledgerName: string;
      outstanding: number;
      invoiceCount: number;
      paymentCount: number;
    }
  | {
      kind: "vendor_ledger";
      ledgerId: number;
      ledgerName: string;
      outstanding: number;
      billCount: number;
      paymentCount: number;
    }
  | null;

export function resolveCoaWorkflowContext(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaWorkflowContext {
  const ctx = resolveCoaGroupContext(node, records);
  if (!ctx) return null;
  if (ctx.kind === "sales") {
    return {
      kind: "sales_group",
      ledgerCount: ctx.salesLedgers.length,
      totalBalance: ctx.totalSales,
      transactionCount: loadInvoices().length,
    };
  }
  if (ctx.kind === "customer_ledger") {
    return {
      kind: "customer_ledger",
      ledgerId: ctx.ledgerId,
      ledgerName: ctx.nodeName,
      outstanding: ctx.outstanding,
      invoiceCount: ctx.invoiceCount,
      paymentCount: ctx.paymentCount,
    };
  }
  if (ctx.kind === "vendor_ledger") {
    return {
      kind: "vendor_ledger",
      ledgerId: ctx.ledgerId,
      ledgerName: ctx.nodeName,
      outstanding: ctx.outstanding,
      billCount: ctx.billCount,
      paymentCount: ctx.paymentCount,
    };
  }
  return null;
}
