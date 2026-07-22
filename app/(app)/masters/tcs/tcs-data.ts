"use client";

import type { MasterStatus } from "@/lib/masters/common";

export interface TcsApiRecord {
  id: number;
  tcsUuid: string;
  sectionName: string;
  tcsRate: string;
  applicableTo: string;
  description: string;
  status: MasterStatus;
  createdBy: string;
  createdAt: string;
  updatedBy: string;
  updatedAt: string;
}

export interface TcsApiForm {
  sectionName: string;
  tcsRate: string;
  applicableTo: string;
  description: string;
}

export const DEFAULT_TCS_API_FORM: TcsApiForm = {
  sectionName: "",
  tcsRate: "",
  applicableTo: "",
  description: "",
};

export function tcsApiToForm(record: TcsApiRecord): TcsApiForm {
  return {
    sectionName: record.sectionName,
    tcsRate: record.tcsRate,
    applicableTo: record.applicableTo,
    description: record.description,
  };
}

export function validateTcsApiForm(form: TcsApiForm): Record<string, string> {
  const errors: Record<string, string> = {};
  const rate = form.tcsRate.trim().replace(/%$/, "");
  const num = Number(rate);

  if (!rate) {
    errors.tcsRate = "TCS rate is required.";
  } else if (!Number.isFinite(num) || num <= 0) {
    errors.tcsRate = "Enter a valid TCS rate greater than zero.";
  } else if (rate.includes(".") && rate.split(".")[1]?.length > 2) {
    errors.tcsRate = "TCS rate can have at most 2 decimal places.";
  }

  return errors;
}

export function formatTcsRateDisplay(value: string): string {
  const trimmed = value.trim().replace(/%$/, "");
  if (!trimmed) return "—";
  const num = Number(trimmed);
  if (!Number.isFinite(num)) return trimmed;
  return `${num}%`;
}

export function formatApplicableToLabel(value: string): string {
  const trimmed = value.trim();
  return trimmed || "—";
}

export function sanitizeTcsRateInput(value: string): string {
  const cleaned = value.replace(/[^\d.]/g, "");
  const parts = cleaned.split(".");
  if (parts.length <= 1) return cleaned;
  return `${parts[0]}.${parts.slice(1).join("").slice(0, 2)}`;
}

export function showTcsRatePercentSuffix(value: string): boolean {
  const trimmed = value.trim();
  return trimmed.length > 0 && !trimmed.endsWith(".");
}

export type ApplicableToSelectOption = { label: string; value: string };

export function mergeApplicableToSelectOptions(
  categories: { categoryName: string }[],
  currentValue?: string,
  extraFromApi?: ApplicableToSelectOption[],
): ApplicableToSelectOption[] {
  const seen = new Set<string>();
  const options: ApplicableToSelectOption[] = [];

  const push = (value: string, label?: string) => {
    const trimmed = value.trim();
    if (!trimmed || seen.has(trimmed)) return;
    seen.add(trimmed);
    options.push({ value: trimmed, label: label?.trim() || trimmed });
  };

  for (const category of categories) push(category.categoryName);
  if (currentValue) push(currentValue);
  for (const option of extraFromApi ?? []) push(option.value, option.label);

  return options.sort((a, b) => a.label.localeCompare(b.label));
}
