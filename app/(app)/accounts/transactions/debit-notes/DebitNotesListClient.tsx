"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function DebitNotesListClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Debit Notes",
        description: "Purchase debit notes adjusting vendor payables.",
        loadData: loadDebitNotes,
        newHref: "/accounts/transactions/debit-notes/new",
        editHref: (id) => `/accounts/transactions/debit-notes/${id}/edit`,
        getRow: (dn) => ({
          id: dn.id,
          number: dn.debitNoteNo,
          date: dn.debitNoteDate,
          party: dn.vendorName,
          amount: formatMoney(dn.currentDebitAmount),
          status: dn.status,
          viewHref: `/accounts/transactions/debit-notes/${dn.id}`,
        }),
      }}
    />
  );
}
