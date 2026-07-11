import type { CoaLedgerFormKind } from "@/lib/accounts/coa-ledger-behavior";

export type CoaMasterLinkedFormKind = Extract<
  CoaLedgerFormKind,
  "product" | "gst" | "employee"
>;

type OpenHandler =
  | ((kind: CoaMasterLinkedFormKind, parentGroupId: number) => void)
  | null;

let openHandler: OpenHandler = null;

export function registerCoaMasterLinkedFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestCoaMasterLinkedForm(
  kind: CoaMasterLinkedFormKind,
  parentGroupId: number,
): boolean {
  if (!openHandler) return false;
  openHandler(kind, parentGroupId);
  return true;
}
