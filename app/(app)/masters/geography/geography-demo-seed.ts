/**
 * Geography module — schema version and optional demo customer data for impact preview only.
 * Postal / business geography are NOT seeded here — use India Post import + user setup.
 */

import type { GeographyRecord } from "./geography-master-data";

export const GEOGRAPHY_WORKFLOW_SCHEMA = "geography-v10-postal-perf";

/** @deprecated use GEOGRAPHY_WORKFLOW_SCHEMA */
export const DEMO_WORKFLOW_SCHEMA = GEOGRAPHY_WORKFLOW_SCHEMA;

export type SalesRole = "NSM" | "ZSM" | "RSM" | "ASM" | "TM" | "DO" | "Intern";
export type AssignmentStatus = "active" | "ended";
export type MappingStatus = "active" | "ended";

export interface MockSystemUser {
  id: string;
  userName: string;
  role: SalesRole;
  department: string;
  status: "active" | "inactive";
}

export interface PincodeCoverageMapping {
  id: number;
  pincodeKey: string;
  geographyId: number;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: MappingStatus;
}

export interface GeographyUserAssignment {
  id: number;
  geographyId: number;
  role: SalesRole;
  userName: string;
  parentManager: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: AssignmentStatus;
  allowSharedOwnership: boolean;
}

export interface DemoDistributor {
  id: string;
  code: string;
  firmName: string;
  customerType: string;
  pincode: string;
  town: string;
  city: string;
  district: string;
  state: string;
  isDemo: true;
}

export interface DemoFarmer {
  id: string;
  code: string;
  name: string;
  pincode: string;
  town: string;
  village: string;
}

export function pincodeComboKey(
  pincode: string,
  stateName: string,
  district: string,
  city: string,
  town: string,
): string {
  return [pincode.trim(), stateName.trim(), district.trim(), city.trim(), town.trim().toLowerCase()].join("|");
}

/** No demo business geographies — created via Business Geography setup. */
export function buildSeedGeographies(): GeographyRecord[] {
  return [];
}

export function buildSeedCoverageMappings(): PincodeCoverageMapping[] {
  return [];
}

export function buildSeedUserAssignments(): GeographyUserAssignment[] {
  return [];
}

export const MOCK_SYSTEM_USERS: MockSystemUser[] = [
  { id: "u1", userName: "Rajesh Mehta", role: "NSM", department: "Sales", status: "active" },
  { id: "u2", userName: "Priya Shah", role: "ZSM", department: "Sales", status: "active" },
  { id: "u3", userName: "Amit Deshmukh", role: "RSM", department: "Sales", status: "active" },
  { id: "u4", userName: "Sneha Kulkarni", role: "ASM", department: "Sales", status: "active" },
  { id: "u5", userName: "Anil Pawar", role: "ASM", department: "Sales", status: "active" },
  { id: "u6", userName: "Vikram Patil", role: "TM", department: "Sales", status: "active" },
  { id: "u7", userName: "Rahul Verma", role: "TM", department: "Sales", status: "active" },
  { id: "u8", userName: "Meera Iyer", role: "TM", department: "Sales", status: "active" },
  { id: "u9", userName: "Kiran Joshi", role: "DO", department: "Sales", status: "active" },
  { id: "u10", userName: "Neha Sharma", role: "TM", department: "Sales", status: "active" },
  { id: "u11", userName: "Sandeep More", role: "TM", department: "Sales", status: "active" },
  { id: "u12", userName: "Pooja Nair", role: "DO", department: "Sales", status: "active" },
  { id: "u13", userName: "Intern Demo User", role: "Intern", department: "Sales", status: "active" },
  { id: "u14", userName: "Karthik Reddy", role: "RSM", department: "Sales", status: "active" },
  { id: "u15", userName: "Hardik Shah", role: "ASM", department: "Sales", status: "active" },
];

export const DEMO_DISTRIBUTORS: DemoDistributor[] = [];
export const DEMO_FARMERS: DemoFarmer[] = [];
