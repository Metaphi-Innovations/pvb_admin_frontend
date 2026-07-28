import type { CoaLedgerFormKind } from "@/lib/accounts/coa-ledger-behavior";
import type { CoaNodeId } from "../../data";

export type CoaMasterLinkedFormKind = Extract<
  CoaLedgerFormKind,
  "product" | "gst" | "employee"
>;

type OpenHandler =
  | ((kind: CoaMasterLinkedFormKind, parentGroupId: CoaNodeId) => void)
  | null;

let openHandler: OpenHandler = null;

export function registerCoaMasterLinkedFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestCoaMasterLinkedForm(
  kind: CoaMasterLinkedFormKind,
  parentGroupId: CoaNodeId,
): boolean {
  if (!openHandler) return false;
  openHandler(kind, parentGroupId);
  return true;
}
