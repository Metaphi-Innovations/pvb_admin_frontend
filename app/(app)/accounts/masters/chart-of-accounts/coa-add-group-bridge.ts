/** Lets the COA tree open the add/edit sub-group drawer owned by CoaAddGroupHost. */

import type { CoaNodeId } from "../../data";

type CoaAddGroupHandlers = {
  addUnderParent: ((parentGroupId: CoaNodeId) => void) | null;
  openGlobal: ((preferredParentId?: CoaNodeId | null) => void) | null;
  editGroup: ((groupId: CoaNodeId) => void) | null;
  deleteGroup: ((groupId: CoaNodeId) => void) | null;
};

let handlers: CoaAddGroupHandlers = {
  addUnderParent: null,
  openGlobal: null,
  editGroup: null,
  deleteGroup: null,
};

export function registerCoaAddGroupHandlers(next: CoaAddGroupHandlers): void {
  handlers = next;
}

export function requestCoaAddSubGroup(parentGroupId: CoaNodeId): void {
  if (handlers.addUnderParent) {
    handlers.addUnderParent(parentGroupId);
    return;
  }
}

export function requestCoaGlobalAddSubGroup(preferredParentId?: CoaNodeId | null): void {
  if (handlers.openGlobal) {
    handlers.openGlobal(preferredParentId);
    return;
  }
}

export function requestCoaEditGroup(groupId: CoaNodeId): void {
  if (handlers.editGroup) {
    handlers.editGroup(groupId);
    return;
  }
}

export function requestCoaDeleteGroup(groupId: CoaNodeId): void {
  if (handlers.deleteGroup) {
    handlers.deleteGroup(groupId);
    return;
  }
}
