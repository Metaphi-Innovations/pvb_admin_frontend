/** Lets the COA tree open the add/edit sub-group drawer owned by CoaAddGroupHost. */

type CoaAddGroupHandlers = {
  addUnderParent: ((parentGroupId: number) => void) | null;
  openGlobal: ((preferredParentId?: number | null) => void) | null;
  editGroup: ((groupId: number) => void) | null;
  deleteGroup: ((groupId: number) => void) | null;
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

export function requestCoaAddSubGroup(parentGroupId: number): void {
  if (handlers.addUnderParent) {
    handlers.addUnderParent(parentGroupId);
    return;
  }
}

export function requestCoaGlobalAddSubGroup(preferredParentId?: number | null): void {
  if (handlers.openGlobal) {
    handlers.openGlobal(preferredParentId);
    return;
  }
}

export function requestCoaEditGroup(groupId: number): void {
  if (handlers.editGroup) {
    handlers.editGroup(groupId);
    return;
  }
}

export function requestCoaDeleteGroup(groupId: number): void {
  if (handlers.deleteGroup) {
    handlers.deleteGroup(groupId);
    return;
  }
}
