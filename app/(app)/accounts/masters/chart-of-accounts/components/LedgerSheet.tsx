"use client";

import React, { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { CompactToggle } from "@/components/ui/ActiveInactiveToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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
import type { ChartOfAccount } from "../../../data";
import {
  defaultBalanceTypeForParent,
  parentGroupLabel,
  type LedgerFormValues,
} from "../chart-of-accounts-data";
import { CoaParentGroupSelector } from "./CoaParentGroupSelector";
import { CoaAddLedgerParentSelect } from "./CoaAddLedgerParentSelect";
import {
  formatTdsSummary,
  getActiveTDSMasters,
  getTdsSectionCode,
} from "@/app/(app)/masters/tds/tds-data";

type SheetMode = "add" | "edit" | "view";

const GST_RATE_OPTIONS = ["0", "5", "12", "18", "28"] as const;

interface LedgerSheetProps {
  open: boolean;
  mode: SheetMode | null;
  form: LedgerFormValues;
  formError: string | null;
  previewCode: string;
  records: ChartOfAccount[];
  active: ChartOfAccount | null;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: LedgerFormValues) => void;
  canEdit: boolean;
  /** When true, parent group is pre-selected from tree '+' and cannot be changed */
  parentGroupLocked?: boolean;
}

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function YesNoRow({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
      <div>
        <Label className="text-xs">{label}</Label>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          {checked ? "Yes" : "No"}
        </p>
      </div>
      <CompactToggle
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        activeLabel="Yes"
        inactiveLabel="No"
      />
    </div>
  );
}

export function LedgerSheet({
  open,
  mode,
  form,
  formError,
  previewCode,
  records,
  active,
  onClose,
  onSave,
  onFormChange,
  canEdit,
  parentGroupLocked = false,
}: LedgerSheetProps) {
  const readOnly = mode === "view" || !canEdit;
  const parentGroupError =
    !form.parentGroupId && formError === "Please select a Parent Group."
      ? formError
      : null;

  const tdsOptions = useMemo(() => getActiveTDSMasters(), [open]);

  const setForm = (patch: Partial<LedgerFormValues>) =>
    onFormChange({ ...form, ...patch });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">
                {mode === "add"
                  ? "Add Generic Ledger"
                  : mode === "edit"
                    ? "Edit Generic Ledger"
                    : "Generic Ledger Details"}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {readOnly
                  ? "View accounting configuration for this ledger."
                  : parentGroupLocked
                    ? "Accounting ledger under the selected Level 3 group. Legal entity details stay in ERP Masters."
                    : "For income, expense, asset, or liability ledgers (e.g. Rent, Interest Income). Not for customers, suppliers, or banks."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {formError && !parentGroupError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {formError}
            </p>
          )}

          {/* Basic Information */}
          <div className="space-y-3">
            <SectionHeading label="Basic Information" />

            <div className="space-y-1">
              <Label className="text-xs">
                Ledger Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className="h-9 text-sm font-medium"
                disabled={readOnly}
                value={form.ledgerName}
                onChange={(e) => setForm({ ledgerName: e.target.value })}
                placeholder="e.g. Office Rent, Audit Fees, Interest Income"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Ledger Code</Label>
              <Input
                className="h-9 text-sm font-medium bg-muted/30 font-mono"
                disabled
                readOnly
                value={mode === "add" ? previewCode : active?.accountCode ?? previewCode}
              />
              <p className="text-[11px] text-muted-foreground">Auto-generated</p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Alias</Label>
              <Input
                className="h-9 text-sm font-medium"
                disabled={readOnly}
                value={form.alias}
                onChange={(e) => setForm({ alias: e.target.value })}
                placeholder="Optional short name for search"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">
                Parent Group / Level 3 <span className="text-red-500">*</span>
              </Label>
              {parentGroupLocked && form.parentGroupId ? (
                <>
                  <Input
                    className="h-9 text-sm font-medium bg-muted/30"
                    disabled
                    readOnly
                    value={parentGroupLabel(records, form.parentGroupId)}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Auto-selected from the Level 3 group in the chart
                  </p>
                </>
              ) : mode === "add" ? (
                <CoaAddLedgerParentSelect
                  records={records}
                  value={form.parentGroupId}
                  placeholder="Select Level 3 Accounting Group…"
                  error={parentGroupError}
                  onChange={(id) => {
                    setForm({
                      parentGroupId: id,
                      balanceType: defaultBalanceTypeForParent(records, id),
                    });
                  }}
                />
              ) : (
                <CoaParentGroupSelector
                  records={records}
                  value={form.parentGroupId}
                  disabled={readOnly || mode === "edit"}
                  onChange={(id) => {
                    setForm({
                      parentGroupId: id,
                      balanceType: defaultBalanceTypeForParent(records, id),
                    });
                  }}
                />
              )}
            </div>
          </div>

          {/* Accounting */}
          <div className="space-y-3">
            <SectionHeading label="Accounting" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Opening Balance</Label>
                <AccountsMoneyInput
                  className="h-9 text-sm font-medium"
                  disabled={readOnly}
                  value={form.openingBalance}
                  onChange={(v) => setForm({ openingBalance: String(v) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Balance Type</Label>
                <Select
                  value={form.balanceType}
                  disabled={readOnly}
                  onValueChange={(v) => setForm({ balanceType: v as "Debit" | "Credit" })}
                >
                  <SelectTrigger className="h-9 text-sm font-medium">
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
            </div>
          </div>

          {/* Controls */}
          <div className="space-y-3">
            <SectionHeading label="Controls" />

            <div className="grid grid-cols-2 gap-3">
              <YesNoRow
                label="Cost Centre Applicable"
                checked={form.costCenterApplicable}
                disabled={readOnly}
                onChange={(v) => setForm({ costCenterApplicable: v })}
              />
              <YesNoRow
                label="Bill-wise Accounting"
                checked={form.billWiseAccounting}
                disabled={readOnly}
                onChange={(v) => setForm({ billWiseAccounting: v })}
              />
            </div>
          </div>

          {/* Tax Configuration */}
          <div className="space-y-3">
            <SectionHeading label="Tax Configuration" />

            <YesNoRow
              label="GST Applicable"
              checked={form.gstApplicable}
              disabled={readOnly}
              onChange={(v) =>
                setForm({
                  gstApplicable: v,
                  ...(v ? {} : { defaultGstRate: "", defaultHsnSac: "" }),
                })
              }
            />
            {form.gstApplicable && (
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-3">
                <div className="space-y-1">
                  <Label className="text-xs">Default GST Rate</Label>
                  <Select
                    value={form.defaultGstRate || "__none__"}
                    disabled={readOnly}
                    onValueChange={(v) =>
                      setForm({ defaultGstRate: v === "__none__" ? "" : v })
                    }
                  >
                    <SelectTrigger className="h-9 text-sm font-medium">
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__" className="text-xs">
                        None
                      </SelectItem>
                      {GST_RATE_OPTIONS.map((rate) => (
                        <SelectItem key={rate} value={rate} className="text-xs">
                          {rate}%
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Default HSN/SAC</Label>
                  <Input
                    className="h-9 text-sm font-medium font-mono"
                    disabled={readOnly}
                    value={form.defaultHsnSac}
                    onChange={(e) => setForm({ defaultHsnSac: e.target.value })}
                    placeholder="Optional HSN / SAC code"
                  />
                </div>
              </div>
            )}

            <YesNoRow
              label="TDS Applicable"
              checked={form.tdsApplicable}
              disabled={readOnly}
              onChange={(v) =>
                setForm({
                  tdsApplicable: v,
                  ...(v ? {} : { defaultTdsSection: "" }),
                })
              }
            />
            {form.tdsApplicable && (
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                <Label className="text-xs">Default TDS Section</Label>
                <Select
                  value={form.defaultTdsSection || "__none__"}
                  disabled={readOnly}
                  onValueChange={(v) =>
                    setForm({ defaultTdsSection: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger className="h-9 text-sm font-medium">
                    <SelectValue placeholder="Select TDS section…" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[240px]">
                    <SelectItem value="__none__" className="text-xs">
                      None
                    </SelectItem>
                    {tdsOptions.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                        {formatTdsSummary(t)} — {getTdsSectionCode(t)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <YesNoRow
              label="TCS Applicable"
              checked={form.tcsApplicable}
              disabled={readOnly}
              onChange={(v) =>
                setForm({
                  tcsApplicable: v,
                  ...(v ? {} : { defaultTcsSection: "" }),
                })
              }
            />
            {form.tcsApplicable && (
              <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-1">
                <Label className="text-xs">Default TCS Section</Label>
                <Input
                  className="h-9 text-sm font-medium"
                  disabled={readOnly}
                  value={form.defaultTcsSection}
                  onChange={(e) => setForm({ defaultTcsSection: e.target.value })}
                  placeholder="e.g. Section 206C"
                />
              </div>
            )}
          </div>

          {/* Description */}
          <div className="space-y-3">
            <SectionHeading label="Description" />

            <div className="space-y-1">
              <Label className="text-xs">Description / Remarks</Label>
              <Textarea
                className="text-sm min-h-[72px] resize-none"
                disabled={readOnly}
                value={form.description}
                onChange={(e) => setForm({ description: e.target.value })}
                placeholder="Optional notes for accountants"
              />
            </div>
          </div>

          {readOnly && active && (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 space-y-1.5 text-xs">
              <p>
                <span className="text-muted-foreground">Hierarchy:</span>{" "}
                {parentGroupLabel(records, active.parentAccountId ?? 0)}
              </p>
              <p>
                <span className="text-muted-foreground">Created by:</span> {active.createdBy}
              </p>
            </div>
          )}
        </SheetBody>

        <SheetFooter className="px-5 py-3 border-t border-border/60 bg-muted/20 gap-2 sm:gap-2">
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button
              size="sm"
              className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onSave}
            >
              Save
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
