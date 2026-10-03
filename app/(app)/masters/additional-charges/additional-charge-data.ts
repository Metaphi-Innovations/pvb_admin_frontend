import type { AdditionalChargeListRecord } from "@/services/additional-charge-list.service";
import type { AdditionalChargeFormValues } from "./components/AdditionalChargeForm";

export type AdditionalChargeRecord = AdditionalChargeListRecord;

export function toAdditionalChargeRecord(
  item: AdditionalChargeListRecord,
): AdditionalChargeRecord {
  return {
    ...item,
    createdBy: item.createdBy || "—",
    updatedBy: item.updatedBy || "—",
  };
}

export function additionalChargeToForm(
  record: AdditionalChargeRecord,
): AdditionalChargeFormValues {
  return {
    chargeCode: record.chargeCode || "",
    chargeName: record.chargeName || "",
    gstApplicable: true,
    defaultGstRateId: record.defaultGstRateId || "",
    hsnId: record.hsnId || "",
    hsnSacCode: record.hsnSacCode || "",
    description: record.description || "",
  };
}

export function formatGstRateDisplay(rate: string): string {
  const trimmed = rate.trim();
  if (!trimmed) return "—";
  return trimmed.includes("%") ? trimmed : `${trimmed}%`;
}