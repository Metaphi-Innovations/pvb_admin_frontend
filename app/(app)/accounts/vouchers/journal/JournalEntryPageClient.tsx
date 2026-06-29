"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import { SchemeSettlementSelector } from "@/components/accounts/SchemeSettlementSelector";
import { JOURNAL_VOUCHER_HREF } from "@/lib/accounts/accounts-nav";
import {
  buildSchemeSettlementJournalLines,
  isSchemeSettlementAlreadySettled,
  markSchemeSettlementSettled,
  SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG,
  validateSchemeSettlementAmount,
  type PendingSchemeSettlementOption,
} from "@/lib/accounts/scheme-settlement-data";

export default function JournalEntryPageClient() {
  const router = useRouter();
  const [schemeSettlementKey, setSchemeSettlementKey] = useState("");
  const [schemeSelection, setSchemeSelection] = useState<PendingSchemeSettlementOption | null>(null);
  const [schemeSettlementAmount, setSchemeSettlementAmount] = useState(0);

  const controlledLines = useMemo(() => {
    if (!schemeSelection || schemeSettlementAmount <= 0) return undefined;
    return buildSchemeSettlementJournalLines(
      schemeSettlementAmount,
      schemeSelection.customerName,
      schemeSelection.schemeCode,
    );
  }, [schemeSelection, schemeSettlementAmount]);

  const onSchemeChange = (key: string, opt: PendingSchemeSettlementOption | null) => {
    if (key && isSchemeSettlementAlreadySettled(key)) {
      setSchemeSettlementKey("");
      setSchemeSelection(null);
      return;
    }
    setSchemeSettlementKey(key);
    setSchemeSelection(opt);
  };

  const extraHeader = (
    <div className="max-w-2xl">
      <SchemeSettlementSelector
        value={schemeSettlementKey}
        onChange={onSchemeChange}
        settlementAmount={schemeSettlementAmount}
        onSettlementAmountChange={setSchemeSettlementAmount}
        variant="journal_voucher"
      />
    </div>
  );

  return (
    <ZohoVoucherEntryForm
      voucherType="journal"
      cancelHref={JOURNAL_VOUCHER_HREF}
      onDone={() => router.push(JOURNAL_VOUCHER_HREF)}
      showFinancialYear
      breadcrumbSection="Transactions"
      extraHeader={extraHeader}
      controlledLines={controlledLines}
      validateBeforePost={() => {
        if (!schemeSettlementKey || !schemeSelection) return null;
        if (isSchemeSettlementAlreadySettled(schemeSettlementKey)) {
          return SCHEME_SETTLEMENT_ALREADY_SETTLED_MSG;
        }
        return validateSchemeSettlementAmount(
          schemeSettlementAmount,
          schemeSelection.estimatedBenefitAmount,
        );
      }}
      onPostComplete={(voucher) => {
        if (!schemeSettlementKey) return;
        markSchemeSettlementSettled({
          settlementKey: schemeSettlementKey,
          documentType: "journal_voucher",
          documentNo: voucher.voucherNumber,
          settlementAmount: schemeSettlementAmount,
          settlementDate: voucher.date,
        });
      }}
    />
  );
}
