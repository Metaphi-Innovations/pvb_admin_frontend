type OpenHandler = ((parentGroupId: number) => void) | null;

let openHandler: OpenHandler = null;

export function registerCoaBankFormHandler(handler: OpenHandler): void {
  openHandler = handler;
}

export function requestCoaBankForm(parentGroupId: number): boolean {
  if (!openHandler) return false;
  openHandler(parentGroupId);
  return true;
}
