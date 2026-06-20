"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import {
  loadPurchaseInvoices,
  savePurchaseInvoices,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { purchaseInvoiceImpactResolved } from "@/lib/accounts/resolved-impact-previews";
import { maybePostPurchaseInvoice } from "@/lib/accounts/document-posting-bridge";
import { formatMoney } from "@/lib/accounts/money-format";

export default function PurchaseInvoicesPageClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Purchase Invoices",
        description: "Create and post purchase bills with ledger impact.",
        loadData: loadPurchaseInvoices,
        newHref: "/accounts/transactions/purchase/new",
        editHref: (id) => `/accounts/transactions/purchase/${id}/edit`,
        onPost: (id) => {
          const inv = loadPurchaseInvoices().find((r) => r.id === Number(id));
          if (inv) maybePostPurchaseInvoice(inv);
        },
        onDelete: (id) => {
          savePurchaseInvoices(loadPurchaseInvoices().filter((r) => r.id !== Number(id)));
        },
        canPost: (r) => r.status === "draft" || r.status === "no_debit",
        canDelete: (r) => r.status === "draft" || r.status === "no_debit",
        canEdit: (r) => r.status === "draft" || r.status === "no_debit",
        getRow: (inv) => ({
          id: inv.id,
          number: inv.invoiceNo,
          date: inv.invoiceDate,
          party: inv.vendorName,
          amount: formatMoney(inv.grandTotal),
          status: inv.source === "manual_entry" ? "draft" : (inv.debitStatus === "no_debit" ? "posted" : inv.debitStatus),
          viewHref: `/accounts/transactions/purchase/${inv.id}`,
          impactLines: purchaseInvoiceImpactResolved({
            vendorName: inv.vendorName,
            taxable: inv.subtotal,
            taxAmount: inv.taxAmount,
            grandTotal: inv.grandTotal,
          }),
        }),
      }}
    />
  );
}
