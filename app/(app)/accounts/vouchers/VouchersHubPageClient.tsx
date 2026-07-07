"use client";

import React, { useCallback, useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { VOUCHER_TYPE_LABELS, type VoucherTypeCode } from "../masters/masters-data";
import { VoucherListClient } from "./components/VoucherListClient";
import { VoucherEntryClient } from "./components/VoucherEntryClient";
import { PaymentVoucherForm } from "./components/PaymentVoucherForm";
import { ReceiptVoucherForm } from "./components/ReceiptVoucherForm";
import { ContraVoucherForm } from "./components/ContraVoucherForm";
import { voucherTypeToUrl, parseVoucherTypeParam } from "./voucher-routes";

const VOUCHER_DESCRIPTIONS: Record<VoucherTypeCode, string> = {
  journal: "Record debit and credit entries. Total debit must equal total credit.",
  payment: "Record money paid from a bank or cash ledger to an expense or creditor.",
  receipt: "Record money received in bank or cash from a customer or income source.",
  contra: "Transfer between cash and bank accounts.",
  sales: "Record sales transactions and receivables.",
  purchase: "Record purchase transactions and payables.",
  debit_note: "Adjust customer accounts with a debit note.",
  credit_note: "Adjust supplier or customer accounts with a credit note.",
};

export default function VouchersHubPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const mode = searchParams.get("mode");

  const activeTab = useMemo((): VoucherTypeCode => {
    if (tabParam) {
      const parsed = parseVoucherTypeParam(tabParam);
      if (parsed) return parsed;
    }
    return "journal";
  }, [tabParam]);

  useEffect(() => {
    if (!tabParam) {
      router.replace("/accounts/vouchers?tab=journal");
    }
  }, [tabParam, router]);

  const openNew = () => {
    router.push(`/accounts/vouchers?tab=${voucherTypeToUrl(activeTab)}&mode=new`);
  };

  const closeNew = useCallback(() => {
    router.push(`/accounts/vouchers?tab=${voucherTypeToUrl(activeTab)}&t=${Date.now()}`);
  }, [activeTab, router]);

  const label = VOUCHER_TYPE_LABELS[activeTab];

  if (mode === "new") {
    if (activeTab === "journal") {
      return <VoucherEntryClient voucherType="journal" onDone={closeNew} />;
    }
    if (activeTab === "payment") {
      return <PaymentVoucherForm onDone={closeNew} />;
    }
    if (activeTab === "receipt") {
      return <ReceiptVoucherForm onDone={closeNew} />;
    }
    if (activeTab === "contra") {
      return <ContraVoucherForm onDone={closeNew} />;
    }
    return <VoucherEntryClient voucherType={activeTab} onDone={closeNew} />;
  }

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Vouchers", label)}
      title={label}
      description={VOUCHER_DESCRIPTIONS[activeTab]}
      actions={
        <Button
          size="sm"
          className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white gap-1"
          onClick={openNew}
        >
          <Plus className="w-4 h-4" /> New {label}
        </Button>
      }
      layout="split"
    >
      <VoucherListClient voucherType={activeTab} embedded />
    </AccountsPageShell>
  );
}
