"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadPurchaseInvoices } from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function PurchaseInvoicesPageClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Purchase Invoices",
        description: "Purchase invoices with automatic accounting entry on approval.",
        loadData: loadPurchaseInvoices,
        newHref: "/accounts/transactions/purchase/new",
        editHref: (id) => `/accounts/transactions/purchase/${id}/edit`,
        getRow: (inv) => ({
          id: inv.id,
          number: inv.invoiceNo,
          date: inv.invoiceDate,
          party: inv.vendorName,
          amount: formatMoney(inv.grandTotal),
          status: inv.debitStatus,
          viewHref: `/accounts/transactions/purchase/${inv.id}`,
        }),
      }}
    />
  );
}
