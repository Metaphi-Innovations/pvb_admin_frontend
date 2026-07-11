"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import type { BankReconTransactionRecord } from "@/lib/accounts/bank-recon-register";
import type { BankReconCategorizeCategory } from "@/lib/accounts/bank-recon-categorize-types";
import { BankReconCategorizePanel } from "./BankReconCategorizePanel";

const ADD_TYPES: {
  id: string;
  label: string;
  category: BankReconCategorizeCategory;
}[] = [
  { id: "receipt", label: "Receipt Voucher", category: "customer_receipt" },
  { id: "payment", label: "Payment Voucher", category: "vendor_payment" },
  { id: "contra", label: "Contra Voucher", category: "bank_transfer" },
  { id: "journal", label: "Journal Voucher", category: "other_receipt" },
  { id: "bank_charges", label: "Bank Charges", category: "bank_charges" },
  { id: "interest_income", label: "Interest Income", category: "interest_income" },
  { id: "expense", label: "Expense", category: "expense" },
  { id: "income", label: "Income", category: "other_income" },
];

export function BankReconAddTransactionPanel({
  bankAccountId: _bankAccountId,
  transaction,
  onSaved,
}: {
  bankAccountId: string;
  transaction: BankReconTransactionRecord;
  onSaved: () => void;
}) {
  const isDeposit = (transaction.deposit ?? 0) > 0;
  const [selectedType, setSelectedType] = useState<string | null>(null);

  const filteredTypes = ADD_TYPES.filter((t) => {
    if (t.id === "interest_income" || t.id === "receipt" || t.id === "income" || t.id === "contra" || t.id === "journal") {
      return isDeposit || t.id === "contra" || t.id === "journal";
    }
    return !isDeposit || t.id === "contra";
  });

  const preset = ADD_TYPES.find((t) => t.id === selectedType)?.category;

  if (!selectedType) {
    return (
      <div className="space-y-2">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Create Entry
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {filteredTypes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setSelectedType(t.id)}
              className={cn(
                "h-8 px-2 text-[11px] font-medium rounded-lg border border-border text-left",
                "hover:bg-brand-50 hover:border-brand-200 hover:text-brand-700 transition-colors",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full min-h-0">
      <button
        type="button"
        className="text-[11px] text-brand-600 hover:underline mb-2 self-start"
        onClick={() => setSelectedType(null)}
      >
        ← Change type
      </button>
      <BankReconCategorizePanel
        transaction={transaction}
        onSaved={onSaved}
        presetCategory={preset}
      />
    </div>
  );
}
