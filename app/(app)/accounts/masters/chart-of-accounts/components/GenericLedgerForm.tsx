"use client";

import React, { useMemo } from "react";
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
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import type { ChartOfAccount } from "../../../data";
import {
  defaultBalanceTypeForParent,
  parentGroupLabel,
  type LedgerFormValues,
} from "../chart-of-accounts-data";
import { CoaAddLedgerParentSelect } from "./CoaAddLedgerParentSelect";
import {
  getActiveTDSMasters,
  toTdsSelectOptions,
} from "@/app/(app)/masters/tds/tds-data";
import { SearchableSelect } from "@/app/(app)/masters/customers/components/SearchableSelect";
import {
  GST_REGISTRATION_TYPE_DEFAULT,
  GST_REGISTRATION_TYPE_OPTIONS,
} from "@/lib/masters/gst-compliance";
import { cn } from "@/lib/utils";

/** Generic-Ledger-only TCS options until a shared TCS Master exists. */
const GENERIC_LEDGER_TCS_OPTIONS = [
  {
    value: "206C_1",
    label: "1% 206C – Scrap / Timber",
    sublabel: "TCS on scrap and timber",
  },
  {
    value: "206C_1H",
    label: "0.1% 206C(1H) – Sale of Goods",
    sublabel: "TCS on sale of goods exceeding threshold",
  },
  {
    value: "206C_1F",
    label: "1% 206C(1F) – Motor Vehicle",
    sublabel: "TCS on sale of motor vehicle",
  },
  {
    value: "206CQ",
    label: "1% 206CQ – LRS Remittance",
    sublabel: "TCS on Liberalised Remittance Scheme",
  },
] as const;

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border mb-2.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function YesNoField({
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
    <div className="flex h-8 items-center justify-between gap-3 rounded-lg border border-border/60 px-3">
      <Label className="min-w-0 text-xs font-medium leading-none">{label}</Label>
      <CompactToggle
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
        showLabel={false}
      />
    </div>
  );
}

export interface GenericLedgerFormProps {
  mode: "add" | "edit";
  form: LedgerFormValues;
  formError: string | null;
  previewCode: string;
  records: ChartOfAccount[];
  active?: ChartOfAccount | null;
  readOnly?: boolean;
  /** When true, parent group is pre-selected and cannot be changed */
  parentGroupLocked?: boolean;
  onChange: (form: LedgerFormValues) => void;
}

/** Full-page Generic Ledger fields — accounting-only, compact 3-column master layout. */
export function GenericLedgerForm({
  mode,
  form,
  formError,
  previewCode,
  records,
  active = null,
  readOnly = false,
  parentGroupLocked = false,
  onChange,
}: GenericLedgerFormProps) {
  const parentGroupError =
    !form.parentGroupId && formError === "Please select a Parent Group."
      ? formError
      : null;

  const tdsOptions = useMemo(() => getActiveTDSMasters(), []);
  const tdsSelectOptions = useMemo(() => {
    const baseOptions = toTdsSelectOptions(tdsOptions);
    return baseOptions.map((option, index) => ({
      ...option,
      label: `${option.label} – ${tdsOptions[index].sectionName}`,
      sublabel: tdsOptions[index].description,
    }));
  }, [tdsOptions]);
  const tcsSelectOptions = useMemo(
    () => GENERIC_LEDGER_TCS_OPTIONS.map((o) => ({ ...o })),
    [],
  );

  const setForm = (patch: Partial<LedgerFormValues>) =>
    onChange({ ...form, ...patch });

  const ledgerCode =
    mode === "add" ? previewCode : active?.accountCode ?? previewCode;

  return (
    <div className="space-y-4">
      {formError && !parentGroupError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-md px-3 py-2">
          {formError}
        </p>
      )}

      {/* Basic Information */}
      <section>
        <SectionHeading label="Basic Information" />
        <div
          className="grid max-w-[1084px] grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-[minmax(320px,480px)_minmax(160px,220px)_minmax(240px,360px)]"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Ledger Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className="h-9 text-sm rounded-lg"
              disabled={readOnly}
              value={form.ledgerName}
              onChange={(e) => setForm({ ledgerName: e.target.value })}
              placeholder="e.g. Office Rent, Audit Fees, Interest Income"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Ledger Code</Label>
            <Input
              className="h-9 text-sm rounded-lg bg-muted/30 font-mono"
              disabled
              readOnly
              value={ledgerCode}
            />
            <p className="text-[11px] text-muted-foreground">Auto-generated</p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Alias</Label>
            <Input
              className="h-9 text-sm rounded-lg"
              disabled={readOnly}
              value={form.alias}
              onChange={(e) => setForm({ alias: e.target.value })}
              placeholder="Optional short name"
            />
          </div>
        </div>

        <div className="mt-3 w-full max-w-[800px] space-y-1.5">
          <Label className="text-xs font-medium">
            Parent Group / Level 3 <span className="text-red-500">*</span>
          </Label>
          {parentGroupLocked && form.parentGroupId ? (
            <Input
              className="h-9 text-sm rounded-lg bg-muted/30"
              disabled
              readOnly
              value={parentGroupLabel(records, form.parentGroupId)}
            />
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
            <Input
              className="h-9 text-sm rounded-lg bg-muted/30"
              disabled
              readOnly
              value={
                form.parentGroupId
                  ? parentGroupLabel(records, form.parentGroupId)
                  : "—"
              }
            />
          )}
        </div>
      </section>

      {/* Accounting Details */}
      <section>
        <SectionHeading label="Accounting Details" />
        <div
          className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(280px,320px)_minmax(220px,260px)]"
        >
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Opening Balance</Label>
            <AccountsMoneyInput
              className="h-9 text-sm rounded-lg"
              disabled={readOnly}
              value={form.openingBalance}
              onChange={(v) => setForm({ openingBalance: String(v) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Balance Type</Label>
            <Select
              value={form.balanceType}
              disabled={readOnly}
              onValueChange={(v) => setForm({ balanceType: v as "Debit" | "Credit" })}
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
        </div>
      </section>

      {/* Tax Configuration */}
      <section>
        <SectionHeading label="Tax Configuration" />
        <div className="max-w-[900px] space-y-3">
          {/* GST */}
          <div className="space-y-2">
            <div className="w-full max-w-[320px]">
              <YesNoField
                label="GST Applicable"
                checked={form.gstApplicable}
                disabled={readOnly}
                onChange={(v) =>
                  setForm({
                    gstApplicable: v,
                    ...(v
                      ? {
                          gstRegistrationType:
                            form.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT,
                        }
                      : {
                          defaultGstRate: "",
                          defaultHsnSac: "",
                          gstin: "",
                          registeredLegalName: "",
                          registeredGstAddress: "",
                          gstRegistrationType: GST_REGISTRATION_TYPE_DEFAULT,
                        }),
                  })
                }
              />
            </div>

            {form.gstApplicable ? (
              <div
                className="space-y-2 pl-0.5"
              >
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:max-w-[640px]">
                  <div className="space-y-1 max-w-[320px]">
                    <Label className="text-xs font-medium">Registration Type</Label>
                    <AutocompleteSelect
                      options={GST_REGISTRATION_TYPE_OPTIONS.map((o) => ({
                        value: o.value,
                        label: o.label,
                      }))}
                      value={form.gstRegistrationType || GST_REGISTRATION_TYPE_DEFAULT}
                      onChange={(value) =>
                        setForm({ gstRegistrationType: String(value) })
                      }
                      placeholder="Select type…"
                      searchPlaceholder="Search…"
                      disabled={readOnly}
                      className="h-8 rounded-lg text-xs"
                    />
                  </div>
                  <div className="space-y-1 max-w-[320px]">
                    <Label className="text-xs font-medium">GSTIN Number</Label>
                    <Input
                      className="h-8 rounded-lg text-xs font-mono uppercase"
                      disabled={readOnly}
                      value={form.gstin}
                      onChange={(e) =>
                        setForm({ gstin: e.target.value.toUpperCase().slice(0, 15) })
                      }
                      placeholder="27AABCU9603R1ZX"
                      maxLength={15}
                    />
                  </div>
                </div>
                <div className="space-y-1 max-w-[640px]">
                  <Label className="text-xs font-medium">
                    Registered GST Address{" "}
                    <span className="font-normal text-muted-foreground">(optional)</span>
                  </Label>
                  <Textarea
                    className="min-h-[56px] h-[56px] resize-none rounded-lg text-xs"
                    disabled={readOnly}
                    value={form.registeredGstAddress}
                    onChange={(e) => setForm({ registeredGstAddress: e.target.value })}
                    placeholder="Optional registered GST address"
                    rows={2}
                  />
                </div>
              </div>
            ) : null}
          </div>

          {/* TDS — toggle + section on same row */}
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row sm:items-center",
              form.tdsApplicable ? "sm:gap-3" : "",
            )}
          >
            <div className="w-full max-w-[320px] flex-shrink-0">
              <YesNoField
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
            </div>
            {form.tdsApplicable ? (
              <div className="w-full max-w-[320px] space-y-1">
                <Label className="text-xs font-medium sm:sr-only">TDS Section</Label>
                <SearchableSelect
                  value={form.defaultTdsSection}
                  onChange={(value) => setForm({ defaultTdsSection: value })}
                  options={tdsSelectOptions}
                  placeholder="Select TDS section…"
                  searchPlaceholder="Search section, rate or description…"
                  disabled={readOnly}
                  emptyMessage="No active TDS sections"
                />
              </div>
            ) : null}
          </div>

          {/* TCS — toggle + section on same row */}
          <div
            className={cn(
              "flex flex-col gap-2 sm:flex-row sm:items-center",
              form.tcsApplicable ? "sm:gap-3" : "",
            )}
          >
            <div className="w-full max-w-[320px] flex-shrink-0">
              <YesNoField
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
            </div>
            {form.tcsApplicable ? (
              <div className="w-full max-w-[320px] space-y-1">
                <Label className="text-xs font-medium sm:sr-only">TCS Section</Label>
                <SearchableSelect
                  value={form.defaultTcsSection}
                  onChange={(value) => setForm({ defaultTcsSection: value })}
                  options={tcsSelectOptions}
                  placeholder="Select TCS section…"
                  searchPlaceholder="Search section, rate or description…"
                  disabled={readOnly}
                  emptyMessage="No TCS sections"
                />
              </div>
            ) : null}
          </div>
        </div>
      </section>

      {/* Controls */}
      <section>
        <SectionHeading label="Controls" />
        <div
          className="grid max-w-[760px] grid-cols-1 gap-3 md:grid-cols-2"
        >
          <YesNoField
            label="Cost Centre Applicable"
            checked={form.costCenterApplicable}
            disabled={readOnly}
            onChange={(v) => setForm({ costCenterApplicable: v })}
          />
          <YesNoField
            label="Bill-wise Accounting"
            checked={form.billWiseAccounting}
            disabled={readOnly}
            onChange={(v) => setForm({ billWiseAccounting: v })}
          />
        </div>
      </section>

      {/* Narration */}
      <section>
        <SectionHeading label="Narration" />
        <div className="w-full max-w-[800px] space-y-1.5">
          <Label className="text-xs font-medium">Narration</Label>
          <Textarea
            className="h-[88px] min-h-[88px] resize-none rounded-lg text-sm"
            disabled={readOnly}
            value={form.description}
            onChange={(e) => setForm({ description: e.target.value })}
            placeholder="Enter default narration (optional)"
          />
        </div>
      </section>
    </div>
  );
}
