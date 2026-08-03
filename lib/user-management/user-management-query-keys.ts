import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";

export const userManagementKeys = {
  all: ["user-management"] as const,

  departments: {
    all: () => [...userManagementKeys.all, "departments"] as const,
    lists: () => [...userManagementKeys.departments.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...userManagementKeys.departments.lists(), params] as const,
    details: () => [...userManagementKeys.departments.all(), "detail"] as const,
    detail: (id: string) => [...userManagementKeys.departments.details(), id] as const,
    dropdown: () => [...userManagementKeys.departments.all(), "dropdown"] as const,
    filterDropdowns: () => [...userManagementKeys.departments.all(), "filter"] as const,
    filterDropdown: (fieldName: string) =>
      [...userManagementKeys.departments.filterDropdowns(), fieldName] as const,
  },

  roles: {
    all: () => [...userManagementKeys.all, "roles"] as const,
    lists: () => [...userManagementKeys.roles.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...userManagementKeys.roles.lists(), params] as const,
    details: () => [...userManagementKeys.roles.all(), "detail"] as const,
    detail: (id: string) => [...userManagementKeys.roles.details(), id] as const,
    dropdown: () => [...userManagementKeys.roles.all(), "dropdown"] as const,
    filterDropdowns: () => [...userManagementKeys.roles.all(), "filter"] as const,
    filterDropdown: (fieldName: string) =>
      [...userManagementKeys.roles.filterDropdowns(), fieldName] as const,
  },

  templates: {
    all: () => [...userManagementKeys.all, "templates"] as const,
    lists: () => [...userManagementKeys.templates.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...userManagementKeys.templates.lists(), params] as const,
    details: () => [...userManagementKeys.templates.all(), "detail"] as const,
    detail: (id: string) => [...userManagementKeys.templates.details(), id] as const,
    dropdown: () => [...userManagementKeys.templates.all(), "dropdown"] as const,
  },

  users: {
    all: () => [...userManagementKeys.all, "users"] as const,
    lists: () => [...userManagementKeys.users.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...userManagementKeys.users.lists(), params] as const,
    details: () => [...userManagementKeys.users.all(), "detail"] as const,
    detail: (id: string) => [...userManagementKeys.users.details(), id] as const,
    filterDropdowns: () => [...userManagementKeys.users.all(), "filter"] as const,
    filterDropdown: (fieldName: string) =>
      [...userManagementKeys.users.filterDropdowns(), fieldName] as const,
    approvalUsers: (roleId: string) =>
      [...userManagementKeys.users.all(), "approval-users", roleId] as const,
    nextEmployeeId: () => [...userManagementKeys.users.all(), "next-employee-id"] as const,
    dropdown: () => [...userManagementKeys.users.all(), "dropdown"] as const,
  },
};
