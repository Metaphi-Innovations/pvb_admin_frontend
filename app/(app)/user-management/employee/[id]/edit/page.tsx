"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import EmployeeForm from "../../components/EmployeeForm";
import { type Employee } from "../../employee-data";
import {
  detailToEmployee,
  employeeToUpdatePayload,
  approvalUsersToOptions,
  usersDropdownToOptions,
  templatePermissionsToSets,
  roleDropdownToApiOptions,
  type ApiRoleOption,
  type GeographyLookupItem,
} from "../../user-api-data";
import { permissionsHaveEnabled } from "@/services/user-list.service";
import { cn } from "@/lib/utils";
import {
  useUser,
  useUpdateUser,
  useSaveUserPermissions,
  useToggleUserStatus,
  useApprovalUsers,
  useUsersDropdown,
  useDepartmentsDropdown,
  useRolesDropdown,
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

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const userId = params.id as string;

  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [geography, setGeography] = useState<GeographyLookupItem[]>([]);

  const userQuery = useUser(userId);
  const departmentsQuery = useDepartmentsDropdown();
  const rolesDropdownQuery = useRolesDropdown();
  const templatesQuery = useTemplatesDropdown();
  const usersDropdownQuery = useUsersDropdown();
  const approvalUsersQuery = useApprovalUsers(selectedRoleId);
  const updateMutation = useUpdateUser();
  const savePermissionsMutation = useSaveUserPermissions();
  const toggleStatusMutation = useToggleUserStatus();

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

  const employee = useMemo(
    () => (userQuery.data ? detailToEmployee(userQuery.data) : null),
    [userQuery.data],
  );

  React.useEffect(() => {
    if (employee?.roleId) {
      setSelectedRoleId(String(employee.roleId));
    }
  }, [employee?.roleId]);

  const departments = useMemo(
    () =>
      (departmentsQuery.data ?? []).map((d) => ({
        id: d.id,
        name: d.name,
      })),
    [departmentsQuery.data],
  );

  const apiRoles: ApiRoleOption[] | undefined = useMemo(
    () =>
      rolesDropdownQuery.data
        ? roleDropdownToApiOptions(rolesDropdownQuery.data)
        : undefined,
    [rolesDropdownQuery.data],
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
    () =>
      selectedRoleId
        ? approvalUsersToOptions(approvalUsersQuery.data ?? [])
        : undefined,
    [approvalUsersQuery.data, selectedRoleId],
  );

  const reportingManagerOptions = useMemo(
    () =>
      usersDropdownToOptions(
        (usersDropdownQuery.data ?? []).filter(
          (user) => user.userId !== userId,
        ),
      ),
    [usersDropdownQuery.data, userId],
  );

  const handleApplyPermissionTemplate = useCallback(async (templateId: string) => {
    const template = await TemplateListService.view(templateId);
    return templatePermissionsToSets(template);
  }, []);

  const handleSave = (updated: Employee) => {
    const selectedRole = apiRoles?.find((r) => String(r.id) === String(updated.roleId));
    const payload = employeeToUpdatePayload(updated, {
      roleGeoLevel: selectedRole?.geoLevel || "None",
      geography,
    });

    updateMutation.mutate(
      { id: userId, payload, documents: updated.documents },
      {
        onSuccess: async () => {
          if (permissionsHaveEnabled(updated.permissions)) {
            try {
              await savePermissionsMutation.mutateAsync({
                id: userId,
                permissions: updated.permissions,
              });
            } catch (error) {
              setToast({
                msg: getErrorMessage(error, "User updated but permissions could not be saved."),
                type: "error",
              });
              return;
            }
          }
          setToast({ msg: "User updated successfully", type: "success" });
          setTimeout(() => router.push(`/user-management/employee/${userId}`), 1500);
        },
        onError: (error) => {
          setToast({ msg: getErrorMessage(error, "Failed to update user."), type: "error" });
        },
      },
    );
  };

  const handleStatusSave = (updated: Employee) => {
    const active = updated.status === "active";
    toggleStatusMutation.mutate(
      { id: userId, active },
      {
        onSuccess: () => {
          setToast({
            msg: `User ${active ? "activated" : "deactivated"} successfully`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({ msg: getErrorMessage(error, "Failed to update user status."), type: "error" });
        },
      },
    );
  };

  if (userQuery.isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground text-sm">Loading user…</p>
      </div>
    );
  }

  if (userQuery.isError || !employee) {
    return (
      <div className="flex items-center justify-center h-96">
        <p className="text-muted-foreground text-sm">
          {getErrorMessage(userQuery.error, "User not found")}
        </p>
      </div>
    );
  }

  return (
    <>
      <EmployeeForm
        mode="edit"
        employee={employee}
        onSave={handleSave}
        onStatusSave={handleStatusSave}
        onCancel={() => router.push(`/user-management/employee/${userId}`)}
        departments={departments}
        apiRoles={apiRoles}
        permissionTemplateOptions={permissionTemplateOptions}
        onApplyPermissionTemplate={handleApplyPermissionTemplate}
        approvalUserOptions={approvalOptions}
        reportingManagerOptions={reportingManagerOptions}
        onRoleIdChange={setSelectedRoleId}
        isSubmitting={
          updateMutation.isPending ||
          savePermissionsMutation.isPending ||
          toggleStatusMutation.isPending
        }
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
