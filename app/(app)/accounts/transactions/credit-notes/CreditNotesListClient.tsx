"use client";

import { TransactionListPage } from "@/app/(app)/accounts/components/TransactionListPage";
import { loadCreditNotes, approveCreditNote, saveCreditNotes } from "@/app/(app)/accounts/credit-notes/credit-notes-data";
import { formatMoney } from "@/lib/accounts/money-format";
import { creditNoteImpactResolved } from "@/lib/accounts/resolved-impact-previews";

export default function CreditNotesListClient() {
  return (
    <TransactionListPage
      config={{
        section: "Transactions",
        title: "Credit Notes",
        description: "Sales credit notes — reduces customer outstanding.",
        loadData: loadCreditNotes,
        newHref: "/accounts/transactions/credit-notes/new",
        editHref: (id) => `/accounts/transactions/credit-notes/${id}/edit`,
        onPost: (id) => approveCreditNote(Number(id)),
        onDelete: (id) => {
          saveCreditNotes(loadCreditNotes().filter((cn) => cn.id !== Number(id)));
        },
        getRow: (cn) => {
          const tax = cn.taxCreditAmount ?? Math.max(0, cn.currentCreditAmount * 0.18 / 1.18);
          const taxable = Math.max(0, cn.currentCreditAmount - tax);
          return {
            id: cn.id,
            number: cn.creditNoteNo,
            date: cn.creditNoteDate,
            party: cn.customerName,
            amount: formatMoney(cn.currentCreditAmount),
            status: cn.status,
            viewHref: `/accounts/transactions/credit-notes/${cn.id}`,
            impactLines: creditNoteImpactResolved({
              customerName: cn.customerName,
              taxable,
              taxAmount: tax,
              grandTotal: cn.currentCreditAmount,
            }),
          };
        },
      }}
    />
  );
}
