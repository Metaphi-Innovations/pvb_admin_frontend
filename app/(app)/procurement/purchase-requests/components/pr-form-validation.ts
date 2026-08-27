import type { PRFormValues } from "./PurchaseRequestForm";

export type PRFormFieldKey =
  | "prDate"
  | "department"
  // | "priority" // Priority UI removed — restore with Priority dropdown if needed
  | "state"
  | "warehouseId"
  | "requiredByDate"
  | "lines";

export type PRFormErrors = Partial<Record<PRFormFieldKey | string, string>>;

export const PR_FIELD_ORDER: PRFormFieldKey[] = [
  "prDate",
  "department",
  // "priority",
  "state",
  "warehouseId",
  "requiredByDate",
  "lines",
];

export const PR_MSG = {
  required: "This field is required.",
  select: "Please select an option.",
  invalidNumber: "Please enter a valid number.",
  greaterThanZero: "Value must be greater than 0.",
  integerOnly: "Qty in Case must be a whole number.",
  invalidDate: "Please select a valid date.",
} as const;

function isValidIsoDate(value: string): boolean {
  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return false;
  const d = new Date(`${trimmed}T00:00:00`);
  if (Number.isNaN(d.getTime())) return false;
  const [y, m, day] = trimmed.split("-").map(Number);
  return (
    d.getFullYear() === y && d.getMonth() + 1 === m && d.getDate() === day
  );
}

function hasProductLines(form: PRFormValues): boolean {
  return form.lines.some(
    (l) => l.productId && String(l.productId) !== "0" && String(l.productId) !== "",
  );
}

/** Validate a single header field. Returns message or undefined. */
export function validatePRField(
  form: PRFormValues,
  field: PRFormFieldKey,
  mode: "submit" | "draft" = "submit",
): string | undefined {
  const requireAll = mode === "submit";

  switch (field) {
    case "prDate": {
      const v = form.prDate?.trim() ?? "";
      if (!v) return requireAll ? PR_MSG.required : undefined;
      if (!isValidIsoDate(v)) return PR_MSG.invalidDate;
      return undefined;
    }
    case "department": {
      if (!(form.department?.trim() ?? "")) {
        return requireAll ? PR_MSG.select : undefined;
      }
      return undefined;
    }
    // case "priority": {
    //   if (!(form.priority?.trim() ?? "")) {
    //     return requireAll ? PR_MSG.select : undefined;
    //   }
    //   return undefined;
    // }
    case "state": {
      if (!(form.state?.trim() ?? "")) {
        return requireAll ? PR_MSG.select : undefined;
      }
      return undefined;
    }
    case "warehouseId": {
      if (!form.warehouseId) {
        return requireAll ? PR_MSG.select : undefined;
      }
      return undefined;
    }
    case "requiredByDate": {
      const v = form.requiredByDate?.trim() ?? "";
      if (!v) return requireAll ? PR_MSG.required : undefined;
      if (!isValidIsoDate(v)) return PR_MSG.invalidDate;
      return undefined;
    }
    case "lines": {
      if (!hasProductLines(form)) {
        return requireAll ? PR_MSG.required : undefined;
      }
      for (const line of form.lines) {
        if (!line.productId || String(line.productId) === "0") continue;
        const qty = Number(line.requestedQty);
        if (!Number.isFinite(qty)) return PR_MSG.invalidNumber;
        if (!Number.isInteger(qty)) return PR_MSG.integerOnly;
        if (qty <= 0) return PR_MSG.greaterThanZero;
      }
      return undefined;
    }
    default:
      return undefined;
  }
}

export function validatePRForm(
  form: PRFormValues,
  mode: "submit" | "draft" = "submit",
): PRFormErrors {
  const errors: PRFormErrors = {};
  for (const field of PR_FIELD_ORDER) {
    const msg = validatePRField(form, field, mode);
    if (msg) errors[field] = msg;
  }

  // Per-line qty errors (submit + draft when line exists)
  for (const line of form.lines) {
    if (!line.productId || String(line.productId) === "0") continue;
    const qty = Number(line.requestedQty);
    const key = `lineQty:${line.uid}`;
    if (!Number.isFinite(qty)) errors[key] = PR_MSG.invalidNumber;
    else if (!Number.isInteger(qty)) errors[key] = PR_MSG.integerOnly;
    else if (qty <= 0) errors[key] = PR_MSG.greaterThanZero;
  }

  return errors;
}

export function getFirstPRErrorField(errors: PRFormErrors): string | null {
  for (const field of PR_FIELD_ORDER) {
    if (errors[field]) return field;
  }
  const lineKey = Object.keys(errors).find((k) => k.startsWith("lineQty:"));
  return lineKey ?? null;
}

export function focusPRField(fieldKey: string): void {
  if (typeof document === "undefined") return;
  const selector = fieldKey.startsWith("lineQty:")
    ? `[data-pr-field="${fieldKey}"], [data-pr-field="lines"]`
    : `[data-pr-field="${fieldKey}"]`;
  const el = document.querySelector<HTMLElement>(selector);
  if (!el) return;
  el.scrollIntoView({ behavior: "smooth", block: "center" });
  const focusable =
    el.matches("input,textarea,button,select,[tabindex]")
      ? el
      : el.querySelector<HTMLElement>("input,textarea,button,select,[tabindex]");
  focusable?.focus({ preventScroll: true });
}
