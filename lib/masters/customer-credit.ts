import type { Customer, CustomerCreditAuditEntry } from "@/app/(app)/masters/customers/customer-data";
import type { CustomerFormValues } from "@/app/(app)/masters/customers/components/CustomerForm";

export const CUSTOMER_CREDIT_STATUS_OPTIONS = [
  "Credit Allowed",
  "Cash & Carry",
  "Credit Blocked",
] as const;

export type CustomerFinalCreditStatus = (typeof CUSTOMER_CREDIT_STATUS_OPTIONS)[number];

export function isDistributorConvertedCustomer(
  customer: Pick<Customer, "creditSource" | "linkedDistributorId">,
): boolean {
  return (
    customer.creditSource === "distributor_conversion" ||
    (customer.linkedDistributorId != null && customer.linkedDistributorId > 0)
  );
}

export function isDistributorConvertedForm(form: CustomerFormValues): boolean {
  return form.creditSource === "distributor_conversion";
}

export function parseFormAmount(value: string): number {
  const n = Number.parseFloat(value.replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export function parseFormDays(value: string): number {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : 0;
}

/** Final operational credit limit for sales orders */
export function getFinalCreditLimit(customer: Customer): number {
  return Math.max(0, customer.creditLimit ?? 0);
}

/** Final operational credit days for sales orders */
export function getFinalCreditDays(customer: Customer): number {
  return Math.max(0, customer.creditDays ?? 0);
}

export function hasCreditOverrideFromRecommended(form: CustomerFormValues): boolean {
  if (!isDistributorConvertedForm(form)) return false;
  const finalLimit = parseFormAmount(form.creditLimit);
  const finalDays = parseFormDays(form.creditDays);
  const recommendedLimit = parseFormAmount(form.recommendedCreditLimit);
  const recommendedDays = parseFormDays(form.recommendedCreditDays);
  return finalLimit !== recommendedLimit || finalDays !== recommendedDays;
}

export function validateDistributorCreditOverride(
  form: CustomerFormValues,
): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!isDistributorConvertedForm(form)) return errors;

  if (hasCreditOverrideFromRecommended(form) && !form.creditOverrideReason.trim()) {
    errors.creditOverrideReason =
      "Override reason is required when final credit differs from distributor recommendation";
  }

  if (form.creditLimit.trim() && Number.isNaN(parseFormAmount(form.creditLimit))) {
    errors.creditLimit = "Invalid amount";
  }

  return errors;
}

export function buildCreditAuditEntriesOnSave(params: {
  form: CustomerFormValues;
  existing?: Customer | null;
  savedBy?: string;
}): CustomerCreditAuditEntry[] {
  const { form, existing, savedBy = "Admin" } = params;
  const log = [...(existing?.creditAuditLog ?? [])];
  if (!isDistributorConvertedForm(form)) return log;

  const today = new Date().toISOString().slice(0, 10);
  const finalLimit = parseFormAmount(form.creditLimit);
  const finalDays = parseFormDays(form.creditDays);
  const recommendedLimit = parseFormAmount(form.recommendedCreditLimit);
  const recommendedDays = parseFormDays(form.recommendedCreditDays);

  const prevLimit = existing?.creditLimit ?? recommendedLimit;
  const prevDays = existing?.creditDays ?? recommendedDays;

  const reason = form.creditOverrideReason.trim();

  if (finalLimit !== prevLimit && (finalLimit !== recommendedLimit || reason)) {
    log.push({
      date: today,
      by: savedBy,
      field: "creditLimit",
      previousValue: String(prevLimit),
      newValue: String(finalLimit),
      reason: reason || "Updated credit limit",
    });
  }

  if (finalDays !== prevDays && (finalDays !== recommendedDays || reason)) {
    log.push({
      date: today,
      by: savedBy,
      field: "creditDays",
      previousValue: String(prevDays),
      newValue: String(finalDays),
      reason: reason || "Updated credit days",
    });
  }

  const prevStatus = existing?.finalCreditStatus ?? form.recommendedCreditStatus;
  if (form.finalCreditStatus && form.finalCreditStatus !== prevStatus) {
    log.push({
      date: today,
      by: savedBy,
      field: "finalCreditStatus",
      previousValue: prevStatus || "—",
      newValue: form.finalCreditStatus,
      reason: reason || "Credit status updated",
    });
  }

  return log;
}

export function getCreditSourceLabel(
  customer: Pick<Customer, "creditSource" | "linkedDistributorId">,
): string {
  return isDistributorConvertedCustomer(customer)
    ? "Converted from Distributor"
    : "Direct Customer";
}
