/** Persist Working Financial Year id (UUID) for axios + FY provider. */

const FY_STORAGE_KEY = "dharitrisutra_selected_fy";

export function getStoredFYId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return localStorage.getItem(FY_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredFYId(id: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FY_STORAGE_KEY, id);
  } catch {
    // ignore
  }
}
