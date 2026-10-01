"use client";

/**
 * Reusable party-master Accounting Details fields (Customer / Vendor).
 * Chart of Accounts mirrors these values on the linked Sundry Debtor/Creditor ledger —
 * never ask for Opening Balance again in COA.
 */

import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { CompactToggle } from "@/components/ui/ActiveInactiveToggle";
import { demoFinancialYearStart } from "@/lib/accounts/demo-date-utils";

export interface PartyMasterAccountingValues {
  openingBalance: string;
  balanceType: "Debit" | "Credit";
  /** ISO date YYYY-MM-DD */
  openingBalanceDate: string;
  billWiseAccounting: boolean;
  accountingDescription: string;
}

export const DEFAULT_PARTY_MASTER_ACCOUNTING: PartyMasterAccountingValues = {
  openingBalance: "0",
  balanceType: "Debit",
  openingBalanceDate: demoFinancialYearStart(),
  billWiseAccounting: true,
  accountingDescription: "",
};

/** @deprecated Alias — prefer PartyMasterAccountingValues */
export type PartyLedgerAccountingValues = PartyMasterAccountingValues;

interface PartyMasterAccountingFieldsProps {
  values: PartyMasterAccountingValues;
  onChange: (next: Partial<PartyMasterAccountingValues>) => void;
  disabled?: boolean;
  /** Optional FY hint under the date field */
  fyHintLabel?: string;
  /** Label for the optional remarks field */
  descriptionLabel?: string;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

/**
 * Compact Accounting Details block — Generic Ledger / Bank Account visual language.
 */
export function PartyMasterAccountingFields({
  values,
  onChange,
  disabled,
  fyHintLabel,
  descriptionLabel = "Description",
}: PartyMasterAccountingFieldsProps) {
  return (
    <section>
      <SectionHeading label="Accounting Details" />
      <div className="grid max-w-[800px] grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Opening Balance</Label>
          <AccountsMoneyInput
            className="h-9 text-sm rounded-lg"
            disabled={disabled}
            value={values.openingBalance}
            onChange={(v) => onChange({ openingBalance: String(v) })}
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Balance Type</Label>
          <Select
            value={values.balanceType}
            disabled={disabled}
            onValueChange={(v) => onChange({ balanceType: v as "Debit" | "Credit" })}
          >
            <SelectTrigger className="h-9 text-sm rounded-lg">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Debit" className="text-xs">
                Debit
              </SelectItem>
              <SelectItem value="Credit" className="text-xs">
                Credit
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Opening Balance Date</Label>
          <Input
            type="date"
            className="h-9 text-sm rounded-lg"
            disabled={disabled}
            value={values.openingBalanceDate || ""}
            onChange={(e) => onChange({ openingBalanceDate: e.target.value })}
          />
          {fyHintLabel ? (
            <p className="text-[11px] text-muted-foreground">
              Defaults to FY start ({fyHintLabel})
            </p>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Defaults to financial year start date
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs font-medium">Bill-wise Accounting</Label>
          <div className="flex h-9 items-center">
            <CompactToggle
              checked={values.billWiseAccounting}
              disabled={disabled}
              onCheckedChange={(v) => onChange({ billWiseAccounting: v })}
              activeLabel="Yes"
              inactiveLabel="No"
            />
          </div>
          <p className="text-[11px] text-muted-foreground">
            Recommended Yes for Sundry Debtors / Creditors
          </p>
        </div>
        <div className="space-y-1.5 md:col-span-2 max-w-[640px]">
          <Label className="text-xs font-medium">
            {descriptionLabel}{" "}
            <span className="font-normal text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            className="min-h-[56px] h-[56px] resize-none rounded-lg text-xs"
            disabled={disabled}
            value={values.accountingDescription}
            onChange={(e) => onChange({ accountingDescription: e.target.value })}
            placeholder="Optional migration or reference remarks"
            rows={2}
          />
        </div>
      </div>
    </section>
  );
}

/** @deprecated Prefer PartyMasterAccountingFields */
export function PartyLedgerAccountingDetails(
  props: PartyMasterAccountingFieldsProps & { fyOpeningDateLabel?: string },
) {
  const { fyOpeningDateLabel, ...rest } = props;
  return (
    <div className="mb-4 rounded-xl border border-border bg-white p-4 shadow-sm">
      <PartyMasterAccountingFields {...rest} fyHintLabel={fyOpeningDateLabel} />
    </div>
  );
}

export function parseOpeningBalanceAmount(raw: string): number {
  const n = Number(String(raw).replace(/,/g, "").trim());
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function partyAccountingFromMaster(input: {
  openingBalance?: number | null;
  balanceType?: "Debit" | "Credit" | null;
  openingBalanceDate?: string | null;
  billWiseAccounting?: boolean | null;
  accountingDescription?: string | null;
}): PartyMasterAccountingValues {
  return {
    openingBalance:
      input.openingBalance != null && Number.isFinite(input.openingBalance)
        ? String(input.openingBalance)
        : "0",
    balanceType: input.balanceType === "Credit" ? "Credit" : "Debit",
    openingBalanceDate:
      (input.openingBalanceDate || "").trim() || demoFinancialYearStart(),
    billWiseAccounting: input.billWiseAccounting !== false,
    accountingDescription: (input.accountingDescription || "").trim(),
  };
}
