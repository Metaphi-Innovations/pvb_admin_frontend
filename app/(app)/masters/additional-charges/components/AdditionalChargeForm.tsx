"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { MasterField, MasterFormGrid, compactInput } from "@/components/masters/MasterModule";
import { cn } from "@/lib/utils";

export interface AdditionalChargeFormValues {
  chargeCode: string;
  chargeName: string;
  /** Always true — GST is always applicable for additional charges. */
  gstApplicable: true;
  defaultGstRateId: string;
  hsnId: string;
  hsnSacCode: string;
  description: string;
}

export const DEFAULT_ADDITIONAL_CHARGE_FORM: AdditionalChargeFormValues = {
  chargeCode: "",
  chargeName: "",
  gstApplicable: true,
  defaultGstRateId: "",
  hsnId: "",
  hsnSacCode: "",
  description: "",
};

export function validateAdditionalChargeForm(
  form: AdditionalChargeFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};

  if (!form.chargeName.trim()) {
    errors.chargeName = "Charge name is required";
  } else if (form.chargeName.trim().length > 255) {
    errors.chargeName = "Charge name must be 255 characters or fewer";
  }

  if (!form.hsnId.trim()) {
    errors.hsnId = "HSN / SAC is required";
  }

  if (!form.defaultGstRateId.trim()) {
    errors.defaultGstRateId =
      "GST rate is required — select an HSN / SAC to auto-fill";
  }

  if (form.description.trim().length > 5000) {
    errors.description = "Description must be 5000 characters or fewer";
  }

  return errors;
}

export function AdditionalChargeForm({
  form,
  onChange,
  errors,
  onClearError,
  hsnOptions,
  hsnLoading,
  gstOptions,
}: {
  form: AdditionalChargeFormValues;
  onChange: (form: AdditionalChargeFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  hsnOptions: { value: string; label: string; gstId?: string; hsnCode?: string }[];
  hsnLoading?: boolean;
  gstOptions: { value: string; label: string }[];
}) {
  const set = <K extends keyof AdditionalChargeFormValues>(
    key: K,
    value: AdditionalChargeFormValues[K],
  ) => {
    onChange({ ...form, gstApplicable: true, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) =>
    cn(compactInput(), errors[key] && "border-red-400 focus-visible:ring-red-300");

  const gstDisplayLabel = useMemo(() => {
    if (!form.defaultGstRateId) return "";
    return (
      gstOptions.find((g) => g.value === form.defaultGstRateId)?.label ||
      form.defaultGstRateId
    );
  }, [form.defaultGstRateId, gstOptions]);

  const handleHsnChange = (hsnId: string) => {
    const selected = hsnOptions.find((o) => o.value === hsnId);
    onChange({
      ...form,
      gstApplicable: true,
      hsnId,
      hsnSacCode: selected?.hsnCode || "",
      defaultGstRateId: selected?.gstId || "",
    });
    onClearError("hsnId");
    onClearError("hsnSacCode");
    onClearError("defaultGstRateId");
  };

  return (
    <div className="w-full space-y-4">
      <MasterFormGrid>
        <MasterField label="Charge Code">
          <Input
            value={form.chargeCode}
            placeholder="Auto-generated"
            className={inputCls("chargeCode")}
            disabled
            readOnly
          />
        </MasterField>

        <MasterField label="Charge Name" required error={errors.chargeName}>
          <Input
            value={form.chargeName}
            onChange={(e) => set("chargeName", e.target.value)}
            placeholder="e.g. Freight Charges"
            className={inputCls("chargeName")}
          />
        </MasterField>

        <MasterField label="HSN / SAC" required error={errors.hsnId || errors.hsnSacCode}>
          <AutocompleteSelect
            options={hsnOptions}
            value={form.hsnId}
            onChange={handleHsnChange}
            placeholder={hsnLoading ? "Loading HSN/SAC..." : "Select from HSN Master"}
            disabled={hsnLoading}
            className={cn(
              "h-8 text-xs",
              (errors.hsnId || errors.hsnSacCode) &&
                "border-red-400 focus-visible:ring-red-300",
            )}
          />
        </MasterField>

        <MasterField
          label="Default GST Rate"
          required
          error={errors.defaultGstRateId}
        >
          <Input
            value={gstDisplayLabel}
            placeholder="Auto-filled from HSN / SAC"
            className={inputCls("defaultGstRateId")}
            disabled
            readOnly
          />
        </MasterField>

        <MasterField
          label="Description"
          error={errors.description}
          className="sm:col-span-2"
        >
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Description..."
            className={cn(
              "min-h-[96px] text-xs resize-none rounded-lg",
              errors.description && "border-red-400 focus-visible:ring-red-300",
            )}
          />
        </MasterField>
      </MasterFormGrid>
    </div>
  );
}
