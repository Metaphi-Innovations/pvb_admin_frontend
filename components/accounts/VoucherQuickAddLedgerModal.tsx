"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { BookOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { VoucherLedgerGroupSelect } from "@/components/accounts/VoucherLedgerGroupSelect";
import {
  DEFAULT_LEDGER_FORM,
  defaultBalanceTypeForParent,
  generateLedgerCode,
  type LedgerFormValues,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import {
  createVoucherQuickAddLedger,
  type VoucherLedgerScope,
} from "@/lib/accounts/voucher-quick-add-ledger";

function isNestedOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return Boolean(
    target.closest("[data-radix-popover-content]") ||
      target.closest("[data-radix-popper-content-wrapper]"),
  );
}

interface VoucherQuickAddLedgerSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  scope?: VoucherLedgerScope;
  onCreated: (ledger: ChartOfAccount) => void;
}

export function VoucherQuickAddLedgerSheet({
  open,
  onOpenChange,
  onCreated,
}: VoucherQuickAddLedgerSheetProps) {
  const records = useCoaRecords();
  const [form, setForm] = useState<LedgerFormValues>(DEFAULT_LEDGER_FORM);
  const [error, setError] = useState<string | null>(null);

  const previewCode = useMemo(() => generateLedgerCode(records), [records]);

  const setField = (patch: Partial<LedgerFormValues>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const reset = () => {
    setForm(DEFAULT_LEDGER_FORM);
    setError(null);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const handleSave = () => {
    try {
      const ledger = createVoucherQuickAddLedger(form);
      onCreated(ledger);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create sub group ledger.");
    }
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        onInteractOutside={(e) => {
          if (isNestedOverlayTarget(e.target)) e.preventDefault();
        }}
        onPointerDownOutside={(e) => {
          if (isNestedOverlayTarget(e.target)) e.preventDefault();
        }}
      >
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-9 h-9 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4 text-brand-600" />
            </div>
            <div className="min-w-0">
              <SheetTitle>Create New Sub Group Ledger</SheetTitle>
              <SheetDescription>
                Saved under Chart of Accounts. Continue voucher entry after saving.
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-3">
          {error && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {error}
            </p>
          )}

          <p className="text-[10px] text-muted-foreground font-mono">Code: {previewCode} (auto)</p>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Sub Group Ledger Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 text-sm rounded-lg"
              value={form.ledgerName}
              onChange={(e) => setField({ ledgerName: e.target.value })}
              placeholder="e.g. ABC Agro Distributor, Marketing Expenses - Pune"
              autoFocus
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">
              Under Ledger Group <span className="text-red-500">*</span>
            </Label>
            <VoucherLedgerGroupSelect
              records={records}
              value={form.parentGroupId}
              onChange={(id) =>
                setField({
                  parentGroupId: id,
                  balanceType: defaultBalanceTypeForParent(records, id),
                })
              }
            />
            <p className="text-[11px] text-muted-foreground">
              e.g. Sundry Debtors, Bank Accounts, Direct Expenses, Duties &amp; Taxes
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Opening Balance</Label>
            <AccountsMoneyInput
              compact={false}
              className="h-9 text-sm rounded-lg"
              value={form.openingBalance}
              onChange={(v) => setField({ openingBalance: String(v) })}
              placeholder="0.00"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Balance Type</Label>
            <div className="flex items-center gap-4">
              {(["Debit", "Credit"] as const).map((bt) => (
                <label
                  key={bt}
                  className="flex items-center gap-2 text-xs cursor-pointer select-none"
                >
                  <input
                    type="radio"
                    name="quick-add-balance-type"
                    checked={form.balanceType === bt}
                    onChange={() => setField({ balanceType: bt })}
                    className="w-3.5 h-3.5 accent-brand-600"
                  />
                  <span className={cn(form.balanceType === bt && "font-medium text-foreground")}>
                    {bt}
                  </span>
                </label>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between rounded-xl border border-border bg-muted/20 px-3 py-2.5">
            <div>
              <Label className="text-xs">Status</Label>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active" ? "Active" : "Inactive"}
              </p>
            </div>
            <ActiveInactiveToggle
              active={form.status === "active"}
              onChange={(on) => setField({ status: on ? "active" : "inactive" })}
            />
          </div>
        </SheetBody>

        <SheetFooter>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={!form.ledgerName.trim() || !form.parentGroupId}
          >
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** @deprecated Use VoucherQuickAddLedgerSheet */
export const VoucherQuickAddLedgerModal = VoucherQuickAddLedgerSheet;
