"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function CreditNotesListClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Credit Notes",
        description: "Sales credit notes adjusting customer receivables.",
        loadData: loadCreditNotes,
        newHref: "/accounts/transactions/credit-notes/new",
        editHref: (id) => `/accounts/transactions/credit-notes/${id}/edit`,
        getRow: (cn) => ({
          id: cn.id,
          number: cn.creditNoteNo,
          date: cn.creditNoteDate,
          party: cn.customerName,
          amount: formatMoney(cn.currentCreditAmount),
          status: cn.status,
          viewHref: `/accounts/transactions/credit-notes/${cn.id}`,
        }),
      }}
    />
  );
}
