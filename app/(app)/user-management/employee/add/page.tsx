"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import EmployeeForm from "../components/EmployeeForm";
import { type Employee } from "../employee-data";
import {
  employeeToCreatePayload,
  approvalUsersToOptions,
  templatePermissionsToSets,
  type ApiRoleOption,
  type GeographyLookupItem,
} from "../user-api-data";
import { cn } from "@/lib/utils";
import {
  useCreateUser,
  useSaveUserPermissions,
  useNextEmployeeId,
  useApprovalUsers,
  useDepartmentsDropdown,
  useRoles,
  useTemplatesDropdown,
} from "@/hooks/user-management";
import { TemplateListService } from "@/services/template-list.service";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success" ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" /> : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function AddEmployeePage() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [geography, setGeography] = useState<GeographyLookupItem[]>([]);

  const nextEmployeeIdQuery = useNextEmployeeId();
  const departmentsQuery = useDepartmentsDropdown();
  const rolesQuery = useRoles({
    page: 1,
    pageSize: 500,
    search: "",
    status: "active",
    ordering: "role_name",
    apiFilters: {},
  });
  const templatesQuery = useTemplatesDropdown();
  const approvalUsersQuery = useApprovalUsers(selectedRoleId);
  const createMutation = useCreateUser();
  const savePermissionsMutation = useSaveUserPermissions();

  React.useEffect(() => {
    axiosInstance
      .get(API_ENDPOINTS.USER_MANAGEMENT.GEOGRAPHY.DROPDOWN)
      .then((response) => {
        const payload = response.data as Record<string, unknown>;
        const data = payload.data;
        if (!Array.isArray(data)) return;
        setGeography(
          data.map((row) => {
            const item = (row ?? {}) as Record<string, unknown>;
            return {
              geography_id: String(item.geography_id ?? ""),
              name: String(item.name ?? ""),
              level: String(item.level ?? ""),
              parent_id: item.parent_id ? String(item.parent_id) : null,
            };
          }),
        );
      })
      .catch(() => undefined);
  }, []);

  React.useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const departments = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
      })),
    [departmentsQuery.data],
  );

  const apiRoles: ApiRoleOption[] = useMemo(
    () =>
      (rolesQuery.data?.items ?? []).map((role) => ({
        id: role.roleUuid,
        name: role.roleName,
        geoLevel: role.geoLevel || "None",
        departmentId: role.departmentId,
      })),
    [rolesQuery.data],
  );

  const permissionTemplateOptions = useMemo(
    () =>
      (templatesQuery.data ?? []).map((tpl) => ({
        value: tpl.id,
        label: tpl.label,
      })),
    [templatesQuery.data],
  );

  const approvalOptions = useMemo(
    () => approvalUsersToOptions(approvalUsersQuery.data ?? []),
    [approvalUsersQuery.data],
  );

  const handleApplyPermissionTemplate = useCallback(async (templateId: string) => {
    const template = await TemplateListService.view(templateId);
    return templatePermissionsToSets(template);
  }, []);

  const handleSave = (employee: Employee) => {
    const selectedRole = apiRoles.find((r) => String(r.id) === String(employee.roleId));
    const payload = employeeToCreatePayload(employee, {
      password: employee.password,
      roleGeoLevel: selectedRole?.geoLevel || "None",
      geography,
    });

    createMutation.mutate(payload, {
      onSuccess: async (result) => {
        if (employee.permissions && result.userId) {
          try {
            await savePermissionsMutation.mutateAsync({
              id: result.userId,
              permissions: employee.permissions,
            });
          } catch (error) {
            setToast({
              msg: getErrorMessage(error, "User created but permissions could not be saved."),
              type: "error",
            });
            return;
          }
        }
        setToast({ msg: "User created successfully", type: "success" });
        setTimeout(() => router.push("/user-management/employee"), 1500);
      },
      onError: (error) => {
        setToast({ msg: getErrorMessage(error, "Failed to create user."), type: "error" });
      },
    });
  };

  return (
    <>
      <EmployeeForm
        mode="add"
        onSave={handleSave}
        onCancel={() => router.push("/user-management/employee")}
        departments={departments}
        generatedEmployeeId={nextEmployeeIdQuery.data}
        apiRoles={apiRoles}
        permissionTemplateOptions={permissionTemplateOptions}
        onApplyPermissionTemplate={handleApplyPermissionTemplate}
        approvalUserOptions={approvalOptions}
        onRoleIdChange={setSelectedRoleId}
        isSubmitting={createMutation.isPending || savePermissionsMutation.isPending}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
