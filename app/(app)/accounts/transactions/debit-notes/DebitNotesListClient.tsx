"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadDebitNotes, approveDebitNote, saveDebitNotes } from "@/app/(app)/accounts/debit-notes/debit-notes-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { debitNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";

export default function DebitNotesListClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Debit Notes",
        description: "Purchase debit notes — reduces supplier payable.",
        loadData: loadDebitNotes,
        newHref: "/accounts/transactions/debit-notes/new",
        editHref: (id) => `/accounts/transactions/debit-notes/${id}/edit`,
        onPost: (id) => approveDebitNote(Number(id)),
        onDelete: (id) => {
          saveDebitNotes(loadDebitNotes().filter((dn) => dn.id !== Number(id)));
        },
        getRow: (dn) => {
          const taxable = Math.max(0, dn.currentDebitAmount - (dn.gstAmount ?? 0));
          return {
            id: dn.id,
            number: dn.debitNoteNo,
            date: dn.debitNoteDate,
            party: dn.vendorName,
            amount: formatMoney(dn.currentDebitAmount),
            status: dn.status,
            viewHref: `/accounts/transactions/debit-notes/${dn.id}`,
            impactLines: debitNoteImpactResolved({
              vendorName: dn.vendorName,
              taxable,
              taxAmount: dn.gstAmount ?? 0,
              grandTotal: dn.currentDebitAmount,
            }),
          };
        },
      }}
    />
  );
}
