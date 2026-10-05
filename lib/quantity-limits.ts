/** Max digits (before the decimal point) accepted while typing qty / amount inputs. */
export const MAX_ENTRY_DIGITS = 7;

/**
 * True when typed numeric text has more than `maxDigits` digits before the decimal point.
 * Exponent notation (e.g. "1e9" from number inputs) is always rejected.
 */
export function exceedsEntryDigits(
  raw: string | number,
  maxDigits: number = MAX_ENTRY_DIGITS,
): boolean {
  const text = String(raw ?? "");
  if (/e/i.test(text)) return true;
  const intPart = text.replace(/[^\d.]/g, "").split(".")[0] ?? "";
  return intPart.replace(/^0+(?=\d)/, "").length > maxDigits;
}
