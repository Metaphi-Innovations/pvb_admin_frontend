"use client";

import React from "react";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  DEFAULT_LEDGER_META,
  LEDGER_TYPE_OPTIONS,
  MASTER_OWNED_LEDGER_TYPES,
  type LedgerExtendedMeta,
  type LedgerTypeOption,
} from "@/lib/accounts/ledger-metadata";

interface LedgerTypeFieldsProps {
  meta: LedgerExtendedMeta;
  readOnly: boolean;
  mode: "add" | "edit" | "view";
  onChange: (meta: LedgerExtendedMeta) => void;
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[11px]">
        {label}
        {required ? <span className="text-red-500"> *</span> : null}
      </Label>
      {children}
    </div>
  );
}

export function LedgerTypeFields({ meta, readOnly, mode, onChange }: LedgerTypeFieldsProps) {
  const set = (patch: Partial<LedgerExtendedMeta>) => onChange({ ...meta, ...patch });
  const type = meta.ledgerType;

  return (
    <div className="space-y-4">
      <Field label="Ledger Type" required>
        <Select
          value={type}
          disabled={readOnly || mode === "edit"}
          onValueChange={(v) =>
            onChange({ ...DEFAULT_LEDGER_META, ledgerType: v as LedgerTypeOption })
          }
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select type" />
          </SelectTrigger>
          <SelectContent className="max-h-[280px]">
            {LEDGER_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      {MASTER_OWNED_LEDGER_TYPES.has(type) && mode === "add" && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[11px] text-amber-900 space-y-1.5">
          {type === "Customer" && (
            <>
              <p className="font-medium">Create from Customer Master</p>
              <p>Customer ledgers are auto-created under Trade Receivables when you save a customer.</p>
              <Link href="/masters/customers/new" className="text-brand-600 hover:underline font-medium">
                Go to Customer Master →
              </Link>
            </>
          )}
          {type === "Vendor" && (
            <>
              <p className="font-medium">Create from Vendor Master</p>
              <p>Vendor ledgers are auto-created under Trade Payables when you save a vendor.</p>
              <Link href="/masters/vendors/new" className="text-brand-600 hover:underline font-medium">
                Go to Vendor Master →
              </Link>
            </>
          )}
          {type === "Bank" && (
            <>
              <p className="font-medium">Create from Banking → Bank Accounts</p>
              <p>Bank ledgers are linked to bank groups in the Chart of Accounts.</p>
              <Link href="/accounts/banking/bank-accounts/new" className="text-brand-600 hover:underline font-medium">
                Go to Bank Accounts →
              </Link>
            </>
          )}
        </div>
      )}

      {(type === "Customer" || type === "Vendor") && (mode === "edit" || mode === "view") && (
        <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {type} Details
          </p>
          {type === "Customer" && (
            <Field label="Customer Code">
              <Input className="h-8 text-xs" disabled={readOnly} value={meta.customerCode} onChange={(e) => set({ customerCode: e.target.value })} />
            </Field>
          )}
          {type === "Vendor" && (
            <Field label="Vendor Code">
              <Input className="h-8 text-xs" disabled={readOnly} value={meta.vendorCode} onChange={(e) => set({ vendorCode: e.target.value })} />
            </Field>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Field label="GSTIN">
              <Input className="h-8 text-xs font-mono" disabled={readOnly} value={meta.gstin} onChange={(e) => set({ gstin: e.target.value })} />
            </Field>
            <Field label="PAN">
              <Input className="h-8 text-xs font-mono" disabled={readOnly} value={meta.pan} onChange={(e) => set({ pan: e.target.value })} />
            </Field>
          </div>
          {type === "Customer" && (
            <div className="grid grid-cols-2 gap-2">
              <Field label="Credit Limit">
                <Input className="h-8 text-xs" type="number" disabled={readOnly} value={meta.creditLimit} onChange={(e) => set({ creditLimit: e.target.value })} />
              </Field>
              <Field label="Credit Days">
                <Input className="h-8 text-xs" type="number" disabled={readOnly} value={meta.creditDays} onChange={(e) => set({ creditDays: e.target.value })} />
              </Field>
            </div>
          )}
          {type === "Vendor" && (
            <>
              <Field label="Payment Terms">
                <Input className="h-8 text-xs" disabled={readOnly} value={meta.paymentTerms} onChange={(e) => set({ paymentTerms: e.target.value })} placeholder="e.g. Net 30" />
              </Field>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <Checkbox checked={meta.tdsApplicableMeta} disabled={readOnly} onCheckedChange={(c) => set({ tdsApplicableMeta: !!c })} />
                TDS Applicable
              </label>
            </>
          )}
          <Field label="Address">
            <Textarea className="text-xs min-h-[52px] resize-none" disabled={readOnly} value={meta.address} onChange={(e) => set({ address: e.target.value })} />
          </Field>
          <Field label="Contact Person">
            <Input className="h-8 text-xs" disabled={readOnly} value={meta.contactPerson} onChange={(e) => set({ contactPerson: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mobile">
              <Input className="h-8 text-xs" disabled={readOnly} value={meta.mobile} onChange={(e) => set({ mobile: e.target.value })} />
            </Field>
            <Field label="Email">
              <Input className="h-8 text-xs" disabled={readOnly} value={meta.email} onChange={(e) => set({ email: e.target.value })} />
            </Field>
          </div>
        </div>
      )}

      {type === "Bank" && (mode === "edit" || mode === "view") && (
        <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Bank Details</p>
          <Field label="Bank Name">
            <Input className="h-8 text-xs" disabled={readOnly} value={meta.bankName} onChange={(e) => set({ bankName: e.target.value })} />
          </Field>
          <Field label="Account Number">
            <Input className="h-8 text-xs font-mono" disabled={readOnly} value={meta.accountNumber} onChange={(e) => set({ accountNumber: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-2">
            <Field label="IFSC">
              <Input className="h-8 text-xs font-mono" disabled={readOnly} value={meta.ifsc} onChange={(e) => set({ ifsc: e.target.value })} />
            </Field>
            <Field label="Branch">
              <Input className="h-8 text-xs" disabled={readOnly} value={meta.branchName} onChange={(e) => set({ branchName: e.target.value })} />
            </Field>
          </div>
          <Field label="Account Type">
            <Select value={meta.accountType} disabled={readOnly} onValueChange={(v) => set({ accountType: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Current", "Savings", "OD", "CC"].map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={meta.reconciliationEnabled} disabled={readOnly} onCheckedChange={(c) => set({ reconciliationEnabled: !!c })} />
            Reconciliation Enabled
          </label>
        </div>
      )}

      {type === "Expense" && (
        <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Expense Ledger</p>
          <Field label="Expense Category">
            <Input className="h-8 text-xs" disabled={readOnly} value={meta.expenseCategory} onChange={(e) => set({ expenseCategory: e.target.value })} placeholder="e.g. Office Rent, Travel" />
          </Field>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={meta.gstApplicableMeta} disabled={readOnly} onCheckedChange={(c) => set({ gstApplicableMeta: !!c })} />
            GST Applicable
          </label>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={meta.tdsApplicableMeta} disabled={readOnly} onCheckedChange={(c) => set({ tdsApplicableMeta: !!c })} />
            TDS Applicable
          </label>
        </div>
      )}

      {(type === "GST Input" || type === "GST Output" || type === "TDS") && (
        <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Tax Ledger</p>
          <Field label="Tax Type">
            <Select value={meta.taxType} disabled={readOnly} onValueChange={(v) => set({ taxType: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Input", "Output", "CGST", "SGST", "IGST", "TDS", "TCS"].map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field label="Tax Rate (%)">
            <Input className="h-8 text-xs" type="number" disabled={readOnly} value={meta.taxRate} onChange={(e) => set({ taxRate: e.target.value })} />
          </Field>
          <Field label="Usage">
            <Select value={meta.taxUsage} disabled={readOnly} onValueChange={(v) => set({ taxUsage: v })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Sales", "Purchase", "Both"].map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
      )}

      {type === "Employee Payable" && (
        <div className="rounded-lg border border-border/60 p-3 space-y-3 bg-muted/5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Employee Payable</p>
          <Field label="Employee Mapping">
            <Input className="h-8 text-xs" disabled={readOnly} value={meta.employeeMapping} onChange={(e) => set({ employeeMapping: e.target.value })} placeholder="Employee name or code" />
          </Field>
          <Field label="Department">
            <Input className="h-8 text-xs" disabled={readOnly} value={meta.department} onChange={(e) => set({ department: e.target.value })} />
          </Field>
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <Checkbox checked={meta.claimPayableEnabled} disabled={readOnly} onCheckedChange={(c) => set({ claimPayableEnabled: !!c })} />
            Claims Payable Enabled
          </label>
        </div>
      )}

      <Field label="Branch">
        <Input className="h-8 text-xs" disabled={readOnly} value={meta.branch} onChange={(e) => set({ branch: e.target.value })} placeholder="Optional branch" />
      </Field>
    </div>
  );
}
