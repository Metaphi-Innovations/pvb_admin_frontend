import {
  DEMO_WORKSPACE_MANIFEST_KEY,
  DEMO_WORKSPACE_MARKER,
  isDemoEmployeeCode,
} from "./demo-workspace-constants";

export interface DemoWorkspaceManifest {
  version: 1;
  marker: typeof DEMO_WORKSPACE_MARKER;
  seededAt: string;
  employeeIds: number[];
  employeeCodes: string[];
  /** Org master ids added by demo (never touch pre-existing). */
  departmentIds: number[];
  designationIds: number[];
  leaveRequestIds: string[];
  attendanceRecordIds: number[];
  travelRequestIds: number[];
  travelClaimIds: number[];
  letterDocumentIds: string[];
  offboardingIds: string[];
  payrollRunIds: string[];
  notificationIds: string[];
  notes: string[];
  counts: Record<string, number>;
}

export function emptyManifest(): DemoWorkspaceManifest {
  return {
    version: 1,
    marker: DEMO_WORKSPACE_MARKER,
    seededAt: "",
    employeeIds: [],
    employeeCodes: [],
    departmentIds: [],
    designationIds: [],
    leaveRequestIds: [],
    attendanceRecordIds: [],
    travelRequestIds: [],
    travelClaimIds: [],
    letterDocumentIds: [],
    offboardingIds: [],
    payrollRunIds: [],
    notificationIds: [],
    notes: [],
    counts: {},
  };
}

export function loadDemoManifest(): DemoWorkspaceManifest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DEMO_WORKSPACE_MANIFEST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DemoWorkspaceManifest;
    if (parsed?.version !== 1 || parsed.marker !== DEMO_WORKSPACE_MARKER) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function saveDemoManifest(m: DemoWorkspaceManifest): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(DEMO_WORKSPACE_MANIFEST_KEY, JSON.stringify(m));
}

export function clearDemoManifest(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(DEMO_WORKSPACE_MANIFEST_KEY);
}

export function isDemoOwnedEmployeeCode(code: string, manifest?: DemoWorkspaceManifest | null): boolean {
  if (isDemoEmployeeCode(code)) return true;
  const m = manifest ?? loadDemoManifest();
  return !!m?.employeeCodes.includes(code);
}
