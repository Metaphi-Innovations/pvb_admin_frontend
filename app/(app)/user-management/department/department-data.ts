import type { DepartmentListRecord } from "@/services/department-list.service";

export type DepartmentStatus = "active" | "inactive";

export interface Department {
  id: number;
  departmentUuid: string;
  name: string;
  status: DepartmentStatus;
  remarks: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

export interface DepartmentFormState {
  name: string;
  remarks: string;
}

export const DEFAULT_DEPARTMENT_FORM: DepartmentFormState = {
  name: "",
  remarks: "",
};

export function toDepartmentRecord(item: DepartmentListRecord): Department {
  return {
    id: item.id,
    departmentUuid: item.departmentUuid,
    name: item.name,
    status: item.status,
    remarks: item.remarks,
    createdBy: item.createdBy || "—",
    createdDate: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedDate: item.updatedAt,
  };
}

export function departmentToForm(record: Department): DepartmentFormState {
  return {
    name: record.name,
    remarks: record.remarks,
  };
}

export function validateDepartmentForm(form: DepartmentFormState): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.name.trim()) errors.name = "Department name is required.";
  return errors;
}
