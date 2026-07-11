"use client";

import { Input } from "@/components/ui/input";
import { Select, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import type { FinancialYear } from "@/app/(app)/accounts/masters/masters-data";
import {
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
}: VoucherFormHeaderFieldsProps) {
  const selectedFyId = model.financialYearId != null ? String(model.financialYearId) : "";

  return (
    <div className={VOUCHER_HEADER_GRID}>
      <VoucherFormField label="Voucher Date" required className={VOUCHER_FIELD_DATE}>
        <Input
          className={VOUCHER_INPUT_CLASS}
          type="date"
          value={model.voucherDate}
          onChange={(e) => onChange({ voucherDate: e.target.value })}
          disabled={readOnly}
        />
      </VoucherFormField>

      <VoucherFormField label={config.voucherNumberLabel} className={VOUCHER_FIELD_NUMBER}>
        <Input
          className={cn(VOUCHER_INPUT_CLASS, "font-mono bg-muted/30")}
          value={model.voucherNumber}
          readOnly
          disabled
        />
      </VoucherFormField>

      <VoucherFormField label="Reference Number" className={VOUCHER_FIELD_REFERENCE}>
        <Input
          className={VOUCHER_INPUT_CLASS}
          value={model.referenceNumber}
          onChange={(e) => onChange({ referenceNumber: e.target.value })}
          placeholder="Cheque / UTR / ref…"
          disabled={readOnly}
        />
      </VoucherFormField>

      <VoucherFormField label={config.transactionModeLabel} className={VOUCHER_FIELD_MODE}>
        {readOnly ? (
          <p className={cn("h-9 flex items-center text-[13px]", VOUCHER_PREVIEW_TEXT_CLASS)}>
            {model.transactionMode || "—"}
          </p>
        ) : (
          <Select
            value={model.transactionMode}
            onValueChange={(v) => onChange({ transactionMode: v })}
          >
            <SelectTrigger className={VOUCHER_INPUT_CLASS}>
              <SelectValue placeholder="Select mode" />
            </SelectTrigger>
            <VoucherSelectContent>
              {config.transactionModeOptions.map((m) => (
                <SelectItem key={m} value={m} className="text-[13px]">
                  {m}
                </SelectItem>
              ))}
            </VoucherSelectContent>
          </Select>
        )}
      </VoucherFormField>

      {showFinancialYear && (
        <VoucherFormField label="Financial Year" required className={VOUCHER_FIELD_MODE}>
          {readOnly ? (
            <p className={cn("h-9 flex items-center text-[13px]", VOUCHER_PREVIEW_TEXT_CLASS)}>
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
              <SelectTrigger className={VOUCHER_INPUT_CLASS}>
                <SelectValue placeholder="Select FY" />
              </SelectTrigger>
              <VoucherSelectContent>
                {financialYears.map((fy) => (
                  <SelectItem key={fy.id} value={String(fy.id)} className="text-[13px]">
                    {fy.name} {fy.status === "active" ? "(Active)" : ""}
                  </SelectItem>
                ))}
              </VoucherSelectContent>
            </Select>
          )}
        </VoucherFormField>
      )}

      {showStatus && status && (
        <VoucherFormField label="Status">
          <div className="h-9 flex items-center">
            <StatusBadge status={status} />
          </div>
        </VoucherFormField>
      )}
    </div>
  );
}
