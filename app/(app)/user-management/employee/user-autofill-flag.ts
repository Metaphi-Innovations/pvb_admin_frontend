/**
 * Dev helper: "Auto-fill Personal Details" on Add User.
 * Driven by NEXT_PUBLIC_ENABLE_USER_AUTOFILL (true / 1 / yes).
 * Default false — button stays hidden unless explicitly enabled.
 */
export function isUserAutofillEnabled(): boolean {
  const raw = process.env.NEXT_PUBLIC_ENABLE_USER_AUTOFILL?.trim().toLowerCase();
  if (!raw) return false;
  return raw === "true" || raw === "1" || raw === "yes";
}
