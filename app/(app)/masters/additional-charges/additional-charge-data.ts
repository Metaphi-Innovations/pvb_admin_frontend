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
    ledgerName: record.ledgerName || "",
  };
}

export function formatGstApplicableLabel(value: boolean): string {
  return value ? "Yes" : "No";
}

export function formatGstRateDisplay(rate: string): string {
  const trimmed = rate.trim();
  if (!trimmed) return "—";
  return trimmed.includes("%") ? trimmed : `${trimmed}%`;
}

export function formatLedgerDisplay(code: string, name: string): string {
  const c = code.trim();
  const n = name.trim();
  if (c && n) return `${c} — ${n}`;
  return c || n || "—";
}
