/** Lets the COA sidebar tree open add/edit ledgers via CoaAddLedgerHost. */

import type { CoaNodeId } from "../../data";

type CoaAddLedgerHandlers = {
  addUnderParent: ((parentGroupId: CoaNodeId) => void) | null;
  openGlobal: ((preferredParentId?: CoaNodeId | null) => void) | null;
};

let handlers: CoaAddLedgerHandlers = {
  addUnderParent: null,
  openGlobal: null,
};

type PendingAddLedger =
  | { kind: "under"; parentGroupId: CoaNodeId }
  | { kind: "global"; preferredParentId?: CoaNodeId | null };

let pending: PendingAddLedger | null = null;

function flushPendingAddLedger(): void {
  if (!pending) return;
  if (pending.kind === "under" && handlers.addUnderParent) {
    handlers.addUnderParent(pending.parentGroupId);
    pending = null;
    return;
  }
  if (pending.kind === "global" && handlers.openGlobal) {
    handlers.openGlobal(pending.preferredParentId);
    pending = null;
  }
}

export function registerCoaAddLedgerHandlers(next: CoaAddLedgerHandlers): void {
  handlers = next;
  flushPendingAddLedger();
}

/** @deprecated Use registerCoaAddLedgerHandlers */
export function registerCoaAddLedgerHandler(
  handler: ((parentGroupId: CoaNodeId) => void) | null,
): void {
  handlers = { ...handlers, addUnderParent: handler };
  flushPendingAddLedger();
}

/**
 * Kept for call-site compatibility. Party (customer/vendor) routing is handled in
 * CoaAddLedgerHost via resolveCoaLedgerBehavior — this stub must stay import-light
 * to avoid circular/heavy module graphs that block the COA page chunk.
 */
export function requestCoaSpecializedLedgerForm(_parentId: CoaNodeId): boolean {
  return false;
}

export function requestCoaAddLedger(parentGroupId: CoaNodeId): void {
  if (handlers.addUnderParent) {
    handlers.addUnderParent(parentGroupId);
    return;
  }
  pending = { kind: "under", parentGroupId };
  flushPendingAddLedger();
}

export function requestCoaGlobalAddLedger(preferredParentId?: CoaNodeId | null): void {
  if (handlers.openGlobal) {
    handlers.openGlobal(preferredParentId);
    return;
  }
  pending = { kind: "global", preferredParentId };
  flushPendingAddLedger();
}
