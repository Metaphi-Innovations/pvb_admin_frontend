/**
 * Reusable typed master code generation (e.g. DIS-001, CG-002).
 * Prefix comes from the parent type's Initial Code field.
 */

export const INITIAL_CODE_PATTERN = /^[A-Z]{2,5}$/;

export function normalizeInitialCode(value: string): string {
  return value.replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 5);
}

export function validateInitialCode(
  value: string,
  existingCodes: string[],
  excludeCode?: string,
): string | null {
  const code = normalizeInitialCode(value);
  if (!code) return "Initial code is required.";
  if (code.length < 2) return "Initial code must be at least 2 characters.";
  if (!INITIAL_CODE_PATTERN.test(code)) {
    return "Use uppercase letters only (2–5 characters).";
  }
  const duplicate = existingCodes.find(
    (c) => c.toUpperCase() === code && c.toUpperCase() !== (excludeCode ?? "").toUpperCase(),
  );
  if (duplicate) return "Initial code must be unique.";
  return null;
}

export function isMasterCodeEmpty(code?: string | null): boolean {
  return !code || !String(code).trim();
}

/** Next code for a type prefix: DIS-001, CG-002, etc. */
export function generateTypedMasterCode(
  initialCode: string,
  existingCodes: string[],
  excludeCode?: string,
): string {
  const prefix = `${normalizeInitialCode(initialCode)}-`;
  let maxSeq = 0;

  for (const raw of existingCodes) {
    if (!raw || raw === excludeCode) continue;
    const code = raw.toUpperCase();
    if (!code.startsWith(prefix)) continue;
    const tail = code.slice(prefix.length);
    const match = tail.match(/^(\d+)$/);
    if (match) maxSeq = Math.max(maxSeq, parseInt(match[1], 10));
  }

  return `${prefix}${String(maxSeq + 1).padStart(3, "0")}`;
}

export function parseTypedMasterCodePrefix(code: string): string | null {
  const match = code.trim().toUpperCase().match(/^([A-Z]{2,5})-\d+$/);
  return match ? match[1] : null;
}
