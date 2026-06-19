"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadInvoices } from "@/app/(app)/accounts/invoices/invoices-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function SalesInvoicesPageClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Sales Invoices",
        description: "Sales invoices with automatic accounting entry on approval.",
        loadData: loadInvoices,
        newHref: "/accounts/transactions/invoices/new",
        editHref: (id) => `/accounts/transactions/invoices/${id}/edit`,
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
        }),
      }}
    />
  );
}
