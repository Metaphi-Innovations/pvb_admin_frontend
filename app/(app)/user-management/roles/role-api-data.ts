import type { RoleListRecord } from "@/services/role-list.service";

export type RoleStatus = "active" | "inactive";

export interface RoleRecord {
  id: number;
  roleUuid: string;
  roleName: string;
  departmentId: string;
  department: string;
  description: string;
  geoLevel: string;
  status: RoleStatus;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface RoleFormState {
  roleName: string;
  departmentId: string | null;
  geoLevel: string;
  description: string;
}

export const DEFAULT_ROLE_FORM: RoleFormState = {
  roleName: "",
  departmentId: null,
  geoLevel: "None",
  description: "",
};

export function toRoleRecord(item: RoleListRecord): RoleRecord {
  return {
    id: item.id,
    roleUuid: item.roleUuid,
    roleName: item.roleName,
    departmentId: item.departmentId,
    department: item.department,
    description: item.description,
    geoLevel: item.geoLevel,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt,
  };
}

export function roleToForm(record: RoleRecord): RoleFormState {
  return {
    roleName: record.roleName,
    departmentId: record.departmentId || null,
    geoLevel: record.geoLevel || "None",
    description: record.description,
  };
}

export function validateRoleForm(form: RoleFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.roleName.trim()) errors.roleName = "Role name is required.";
  if (!form.departmentId) errors.departmentId = "Department is required.";
  return errors;
}

/** Map API role record to legacy Role shape used by detail sheet */
export function toLegacyRole(record: RoleRecord) {
  return {
    id: record.id,
    roleName: record.roleName,
    departmentId: null,
    department: record.department,
    description: record.description,
    geoLevel: (record.geoLevel || "None") as import("./roles-data").GeoLevel,
    approvalChain: [],
    status: record.status,
    createdBy: record.createdBy,
    createdDate: record.createdDate,
    updatedBy: record.updatedBy,
    updatedDate: record.updatedDate,
  };
}
