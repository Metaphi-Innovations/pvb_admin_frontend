"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import {
  loadInvoices,
  markInvoiceSent,
  saveInvoices,
} from "@/app/(app)/accounts/invoices/invoices-data";
import { salesInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { formatMoney } from "@/lib/accounts/money-format";

export default function SalesInvoicesPageClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Sales Invoices",
        description: "Create and post sales tax invoices with ledger impact.",
        loadData: loadInvoices,
        newHref: "/accounts/transactions/invoices/new",
        editHref: (id) => `/accounts/transactions/invoices/${id}/edit`,
        onPost: (id) => markInvoiceSent(Number(id)),
        onDelete: (id) => {
          const next = loadInvoices().filter((inv) => inv.id !== Number(id));
          saveInvoices(next);
        },
        canPost: (r) => r.status === "draft",
        canEdit: (r) => r.status === "draft",
        canDelete: (r) => r.status === "draft",
        getRow: (inv) => ({
          id: inv.id,
          number: inv.invoiceNo,
          date: inv.invoiceDate,
          party: inv.customerName,
          amount: formatMoney(inv.grandTotal),
          status: inv.invoiceStatus,
          viewHref: `/accounts/transactions/invoices/${inv.id}`,
          viewFields: [
            { label: "Due Date", value: inv.dueDate },
            { label: "Payment Status", value: inv.paymentStatus },
            { label: "Reference", value: inv.referenceNo || "—" },
          ],
          impactLines: salesInvoiceImpactResolved({
            customerName: inv.customerName,
            taxable: Math.max(0, inv.grandTotal - inv.taxAmount),
            taxAmount: inv.taxAmount,
            grandTotal: inv.grandTotal,
          }),
        }),
      }}
    />
  );
}
