/** Dispatched after Chart of Accounts is saved — keeps voucher forms and COA explorer in sync. */
export const COA_CHANGED_EVENT = "ds:coa-changed";

export function dispatchCoaChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(COA_CHANGED_EVENT));
}

export function subscribeCoaChanged(handler: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(COA_CHANGED_EVENT, handler);
  return () => window.removeEventListener(COA_CHANGED_EVENT, handler);
}
