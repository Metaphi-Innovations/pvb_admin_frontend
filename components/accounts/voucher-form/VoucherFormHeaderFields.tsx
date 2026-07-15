"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import type { FinancialYear } from "@/app/(app)/accounts/masters/masters-data";
import {
  RECEIPT_FIELD_DATE,
  RECEIPT_FIELD_MODE,
  RECEIPT_FIELD_NUMBER,
  RECEIPT_FIELD_REFERENCE,
  RECEIPT_INPUT_CLASS,
  RECEIPT_LABEL_CLASS,
  RECEIPT_PREVIEW_TEXT_CLASS,
  VOUCHER_FIELD_DATE,
  VOUCHER_FIELD_MODE,
  VOUCHER_FIELD_NUMBER,
  VOUCHER_FIELD_REFERENCE,
  VOUCHER_HEADER_GRID,
  VOUCHER_INPUT_CLASS,
  VOUCHER_PREVIEW_TEXT_CLASS,
  VoucherFormField,
  VoucherSelectContent,
} from "@/components/accounts/voucher-simple-form-ui";
import type { VoucherFormModel } from "@/lib/accounts/voucher-form-model";
import type { VoucherFormTypeConfig } from "@/lib/accounts/voucher-form-config";
import { cn } from "@/lib/utils";
import type { RecordStatus } from "@/app/(app)/accounts/data";

export interface VoucherFormHeaderFieldsProps {
  model: Pick<
    VoucherFormModel,
    | "voucherDate"
    | "voucherNumber"
    | "referenceNumber"
    | "transactionMode"
    | "financialYearId"
    | "financialYearName"
  >;
  config: VoucherFormTypeConfig;
  readOnly?: boolean;
  status?: RecordStatus;
  showStatus?: boolean;
  showFinancialYear?: boolean;
  financialYears?: FinancialYear[];
  onChange: (patch: Partial<VoucherFormModel>) => void;
  variant?: "default" | "receipt";
}

export function VoucherFormHeaderFields({
  model,
  config,
  readOnly = false,
  status,
  showStatus,
  showFinancialYear = false,
  financialYears = [],
  onChange,
  variant = "default",
}: VoucherFormHeaderFieldsProps) {
  const isReceipt = variant === "receipt";
  const inputClass = isReceipt ? RECEIPT_INPUT_CLASS : VOUCHER_INPUT_CLASS;
  const previewClass = isReceipt ? RECEIPT_PREVIEW_TEXT_CLASS : VOUCHER_PREVIEW_TEXT_CLASS;
  const labelClass = isReceipt ? RECEIPT_LABEL_CLASS : undefined;
  const fieldSpacing = isReceipt ? "space-y-1" : "space-y-1";
  const previewHeight = isReceipt ? "h-9" : "h-9";
  const fieldDate = isReceipt ? RECEIPT_FIELD_DATE : VOUCHER_FIELD_DATE;
  const fieldNumber = isReceipt ? RECEIPT_FIELD_NUMBER : VOUCHER_FIELD_NUMBER;
  const fieldReference = isReceipt ? RECEIPT_FIELD_REFERENCE : VOUCHER_FIELD_REFERENCE;
  const fieldMode = isReceipt ? RECEIPT_FIELD_MODE : VOUCHER_FIELD_MODE;
  const selectItemClass = isReceipt ? "text-[12px]" : "text-[13px]";

  const selectedFyId = model.financialYearId != null ? String(model.financialYearId) : "";

  return (
    <div className={VOUCHER_HEADER_GRID}>
      <VoucherFormField
        label="Voucher Date"
        required
        className={fieldDate}
        labelClassName={labelClass}
        spacingClassName={fieldSpacing}
      >
        <Input
          className={inputClass}
          type="date"
          value={model.voucherDate}
          onChange={(e) => onChange({ voucherDate: e.target.value })}
          disabled={readOnly}
        />
      </VoucherFormField>

      <VoucherFormField
        label={config.voucherNumberLabel}
        className={fieldNumber}
        labelClassName={labelClass}
        spacingClassName={fieldSpacing}
      >
        <Input
          className={cn(inputClass, "font-mono bg-muted/30")}
          value={model.voucherNumber}
          readOnly
          disabled
        />
      </VoucherFormField>

      <VoucherFormField
        label="Reference Number"
        className={fieldReference}
        labelClassName={labelClass}
        spacingClassName={fieldSpacing}
      >
        <Input
          className={inputClass}
          value={model.referenceNumber}
          onChange={(e) => onChange({ referenceNumber: e.target.value })}
          placeholder="Cheque / UTR / ref…"
          disabled={readOnly}
        />
      </VoucherFormField>

      {config.showTransactionMode !== false && (
        <VoucherFormField
          label={config.transactionModeLabel}
          className={fieldMode}
          labelClassName={labelClass}
          spacingClassName={fieldSpacing}
        >
          {readOnly ? (
            <p className={cn(previewHeight, "flex items-center", previewClass)}>
              {model.transactionMode || "—"}
            </p>
          ) : (
            <Select
              value={model.transactionMode}
              onValueChange={(v) => onChange({ transactionMode: v })}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <VoucherSelectContent>
                {config.transactionModeOptions.map((m) => (
                  <SelectItem key={m} value={m} className={selectItemClass}>
                    {m}
                  </SelectItem>
                ))}
              </VoucherSelectContent>
            </Select>
          )}
        </VoucherFormField>
      )}

      {showFinancialYear && (
        <VoucherFormField
          label="Financial Year"
          required
          className={fieldMode}
          labelClassName={labelClass}
          spacingClassName={fieldSpacing}
        >
          {readOnly ? (
            <p className={cn(previewHeight, "flex items-center", previewClass)}>
              {model.financialYearName || "—"}
            </p>
          ) : (
            <Select
              value={selectedFyId}
              onValueChange={(v) => {
                const fy = financialYears.find((f) => String(f.id) === v);
                onChange({
                  financialYearId: fy?.id ?? null,
                  financialYearName: fy?.name ?? "",
                });
              }}
            >
              <SelectTrigger className={inputClass}>
                <SelectValue placeholder="Select FY" />
              </SelectTrigger>
              <VoucherSelectContent>
                {financialYears.map((fy) => (
                  <SelectItem key={fy.id} value={String(fy.id)} className={selectItemClass}>
                    {fy.name} {fy.status === "active" ? "(Active)" : ""}
                  </SelectItem>
                ))}
              </VoucherSelectContent>
            </Select>
          )}
        </VoucherFormField>
      )}

      {showStatus && status && (
        <VoucherFormField label="Status" labelClassName={labelClass} spacingClassName={fieldSpacing}>
          <div className={cn(previewHeight, "flex items-center")}>
            <StatusBadge status={status} />
          </div>
        </VoucherFormField>
      )}
    </div>
  );
}

