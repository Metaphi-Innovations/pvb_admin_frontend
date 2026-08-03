/** Persist Working Financial Year id (UUID) for axios + FY provider. */

const FY_STORAGE_KEY = "dharitrisutra_selected_fy";

/** In-memory mirror so axios can read FY immediately after set (same tick). */
let memoryFyId: string | null = null;

export function getStoredFYId(): string | null {
  if (memoryFyId) return memoryFyId;
  if (typeof window === "undefined") return null;
  try {
    const stored = localStorage.getItem(FY_STORAGE_KEY);
    if (stored) memoryFyId = stored;
    return stored;
  } catch {
    return null;
  }
}

export function setStoredFYId(id: string): void {
  const trimmed = id?.trim();
  if (!trimmed) return;
  memoryFyId = trimmed;
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(FY_STORAGE_KEY, trimmed);
  } catch {
    // ignore
  }
}
