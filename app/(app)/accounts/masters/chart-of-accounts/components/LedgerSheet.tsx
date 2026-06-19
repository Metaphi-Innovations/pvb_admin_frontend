"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

type SheetMode = "add" | "edit" | "view";

interface LedgerSheetProps {
  open: boolean;
  mode: SheetMode | null;
  kind?: "ledger" | "sub_ledger";
  form: LedgerFormValues;
  formError: string | null;
  previewCode: string;
  records: ChartOfAccount[];
  active: ChartOfAccount | null;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: LedgerFormValues) => void;
  canEdit: boolean;
}

export function LedgerSheet({
  open,
  mode,
  kind = "ledger",
  form,
  formError,
  previewCode,
  records,
  active,
  onClose,
  onSave,
  onFormChange,
  canEdit,
}: LedgerSheetProps) {
  const readOnly = mode === "view" || !canEdit;

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
                  ? kind === "sub_ledger"
                    ? "Add Sub-Ledger"
                    : "Add Ledger"
                  : mode === "edit"
                    ? kind === "sub_ledger"
                      ? "Edit Sub-Ledger"
                      : "Edit Ledger"
                    : "Account Details"}
              </SheetTitle>
              <SheetDescription className="text-xs mt-0.5">
                {readOnly
                  ? "View account configuration."
                  : kind === "sub_ledger"
                    ? "Sub-ledgers are leaf accounts under a ledger (Level 5)."
                    : "Ledgers can only be created under sub-groups or leaf account groups."}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {formError && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
              {formError}
            </p>
          )}

          <div className="space-y-1">
            <Label className="text-[11px]">Ledger Code</Label>
            <Input className="h-8 text-xs font-mono bg-muted/30" value={previewCode} disabled readOnly />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">
              {kind === "sub_ledger" ? "Sub-Ledger Name" : "Ledger Name"}{" "}
              <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-8 text-xs"
              disabled={readOnly}
              value={form.ledgerName}
              onChange={(e) => setForm({ ledgerName: e.target.value })}
              placeholder="e.g. Office Cash, Trade Debtor, Rent"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">Alias</Label>
            <Input
              className="h-8 text-xs"
              disabled={readOnly}
              value={form.alias}
              onChange={(e) => setForm({ alias: e.target.value })}
              placeholder="Short name for search & reports"
            />
          </div>

          <div className="space-y-1">
            <Label className="text-[11px]">
              {kind === "sub_ledger" ? "Parent Ledger" : "Parent Group / Sub-Group"}{" "}
              <span className="text-red-500">*</span>
            </Label>
            {kind === "sub_ledger" ? (
              <Input
                className="h-8 text-xs bg-muted/30"
                disabled
                readOnly
                value={
                  form.parentGroupId
                    ? parentGroupLabel(records, form.parentGroupId)
                    : "—"
                }
              />
            ) : (
              <CoaParentGroupSelector
                records={records}
                value={form.parentGroupId}
                disabled={readOnly}
                onChange={(id) => {
                  setForm({
                    parentGroupId: id,
                    balanceType: defaultBalanceTypeForParent(records, id),
                  });
                }}
              />
            )}
          </div>

          {kind !== "sub_ledger" && (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Opening Balance</Label>
              <Input
                className="h-8 text-xs"
                type="number"
                min={0}
                disabled={readOnly}
                value={form.openingBalance}
                onChange={(e) => setForm({ openingBalance: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Dr / Cr</Label>
              <Select
                value={form.balanceType}
                disabled={readOnly}
                onValueChange={(v) => setForm({ balanceType: v as "Debit" | "Credit" })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Debit" className="text-xs">
                    Dr (Debit)
                  </SelectItem>
                  <SelectItem value="Credit" className="text-xs">
                    Cr (Credit)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          )}

          {kind !== "sub_ledger" && (
          <div className="rounded-lg border border-border/60 p-3 bg-muted/10 space-y-2.5">
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={form.gstApplicable}
                disabled={readOnly}
                onCheckedChange={(c) => setForm({ gstApplicable: !!c })}
              />
              GST Applicable
            </label>
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <Checkbox
                checked={form.tdsApplicable}
                disabled={readOnly}
                onCheckedChange={(c) => setForm({ tdsApplicable: !!c })}
              />
              TDS Applicable
            </label>
          </div>
          )}

          <div className="flex items-center justify-between rounded-lg border border-border/60 px-3 py-2.5">
            <div>
              <Label className="text-[11px]">Active Status</Label>
              <p className="text-[10px] text-muted-foreground">
                {form.status === "active" ? "Active" : "Inactive"}
              </p>
            </div>
            <ActiveInactiveToggle
              active={form.status === "active"}
              onChange={(on) => setForm({ status: on ? "active" : "inactive" })}
              disabled={readOnly}
            />
          </div>

          {readOnly && active && (
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-2.5 space-y-1.5 text-[11px]">
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
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            {readOnly ? "Close" : "Cancel"}
          </Button>
          {!readOnly && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onSave}
            >
              Save Ledger
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
