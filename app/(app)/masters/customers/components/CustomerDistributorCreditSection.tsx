"use client";

import React from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { formatIndianRupeeDisplay } from "@/lib/currency/indian-rupee";
import { PaymentTermsFields } from "@/components/masters/erp/PaymentTermsFields";
import { ErpFormSection } from "@/components/masters/erp/ErpFormSection";
import type { CustomerFormValues } from "./CustomerForm";
import {
  CUSTOMER_CREDIT_STATUS_OPTIONS,
  hasCreditOverrideFromRecommended,
} from "@/lib/masters/customer-credit";
import { formatCategoryLabel } from "@/lib/distributor/distributor-scoring";

function ReadOnlyField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0 space-y-1">
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="text-xs font-medium text-foreground break-words">{value || "—"}</p>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="text-xs text-red-500">{msg}</p>;
}

export function CustomerDistributorCreditSection({
  form,
  errors,
  onChange,
  onClearError,
  readOnly,
  inputCls,
}: {
  form: CustomerFormValues;
  errors: Record<string, string>;
  onChange: (form: CustomerFormValues) => void;
  onClearError: (key: string) => void;
  readOnly?: boolean;
  inputCls: (key: string) => string;
}) {
  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key as string);
  };

  const showOverrideReason = hasCreditOverrideFromRecommended(form);
  const recommendedLimit = Number.parseFloat(form.recommendedCreditLimit) || 0;

  return (
    <div className="space-y-4">
      <ErpFormSection title="Distributor Derived Reference">
        <p className="mb-2 text-[11px] text-muted-foreground">
          System-calculated reference from Distributor Database — read only.
        </p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <ReadOnlyField label="Source" value="Converted from Distributor" />
          <ReadOnlyField label="Linked Distributor" value={form.linkedDistributorName} />
          <ReadOnlyField
            label="Distributor Score"
            value={form.distributorScore ? `${form.distributorScore}%` : "—"}
          />
          <ReadOnlyField
            label="Distributor Category"
            value={
              form.distributorCategory
                ? formatCategoryLabel(form.distributorCategory as "A" | "B" | "C")
                : "—"
            }
          />
          <ReadOnlyField
            label="Recommended Credit Limit"
            value={
              recommendedLimit > 0
                ? formatIndianRupeeDisplay(recommendedLimit)
                : "₹0"
            }
          />
          <ReadOnlyField
            label="Recommended Credit Days"
            value={form.recommendedCreditDays ? `${form.recommendedCreditDays} Days` : "0 Days"}
          />
          <ReadOnlyField
            label="Recommended Credit Status"
            value={form.recommendedCreditStatus || "—"}
          />
        </div>
      </ErpFormSection>

      <ErpFormSection title="Final Customer Credit">
        <p className="mb-2 text-[11px] text-muted-foreground">
          Operational credit used by Sales Orders.
        </p>
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Final Credit Limit</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={form.creditLimit}
              onChange={(e) => set("creditLimit", e.target.value)}
              placeholder="0.00"
              className={inputCls("creditLimit")}
              disabled={readOnly}
            />
            <FieldError msg={errors.creditLimit} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Final Credit Days</Label>
            <Input
              type="number"
              min={0}
              step="1"
              value={form.creditDays}
              onChange={(e) => set("creditDays", e.target.value)}
              placeholder="0"
              className={inputCls("creditDays")}
              disabled={readOnly || form.paymentType !== "credit"}
            />
            <FieldError msg={errors.creditDays} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Credit Status</Label>
            <select
              value={form.finalCreditStatus}
              onChange={(e) => set("finalCreditStatus", e.target.value)}
              disabled={readOnly}
              className={cn(
                "h-9 w-full rounded-lg border border-border bg-background px-3 text-sm",
                inputCls("finalCreditStatus"),
              )}
            >
              {CUSTOMER_CREDIT_STATUS_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-3">
          <PaymentTermsFields
            layout="embedded"
            values={{
              paymentType: form.paymentType,
              creditDays: form.creditDays,
              advancePercentage: form.advancePercentage,
            }}
            onChange={(patch) => {
              onChange({ ...form, ...patch });
              for (const key of Object.keys(patch)) {
                onClearError(key);
              }
            }}
            errors={{
              paymentType: errors.paymentType,
              creditDays: errors.creditDays,
              advancePercentage: errors.advancePercentage,
            }}
            readOnly={readOnly}
            inputClassName={inputCls("paymentType")}
            hideCreditDays
          />
        </div>

        {showOverrideReason && (
          <div className="mt-3 space-y-1.5">
            <Label className="text-xs font-medium">
              Override Reason <span className="text-red-500">*</span>
            </Label>
            <Textarea
              rows={2}
              value={form.creditOverrideReason}
              onChange={(e) => set("creditOverrideReason", e.target.value)}
              placeholder="Explain why final credit differs from distributor recommendation…"
              className={cn("text-sm", inputCls("creditOverrideReason"))}
              disabled={readOnly}
            />
            <FieldError msg={errors.creditOverrideReason} />
          </div>
        )}

        <div className="mt-3 flex items-start gap-2 rounded-lg border border-navy-200 bg-navy-50 px-3 py-2.5">
          <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-navy-600" />
          <p className="text-[11px] text-navy-700">
            Sales orders validate against <strong>Final Credit Limit</strong> and{" "}
            <strong>Final Credit Days</strong> only — not the recommended values above.
          </p>
        </div>
      </ErpFormSection>
    </div>
  );
}
