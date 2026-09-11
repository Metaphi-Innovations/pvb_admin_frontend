"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import EmployeeForm from "../../components/EmployeeForm";
import { type Employee } from "../../employee-data";
import {
  detailToEmployee,
  employeeToUpdatePayload,
  approvalUsersToOptions,
  usersDropdownToOptions,
  usersDropdownToGeographyOccupancy,
  templatePermissionsToSets,
  roleDropdownToApiOptions,
  type ApiRoleOption,
  type GeographyLookupItem,
} from "../../user-api-data";
import { permissionsHaveEnabled } from "@/services/user-list.service";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth/auth-context";
import { usePermissions } from "@/lib/auth/permissions-context";
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
import { BusinessGeographyService } from "@/services/business-geography.service";

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
  const { user: authUser } = useAuth();
  const { refresh: refreshPermissions } = usePermissions();

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
    Promise.all([
      BusinessGeographyService.lookupZones(),
      BusinessGeographyService.lookupRegions(),
      BusinessGeographyService.lookupAreas(),
      BusinessGeographyService.lookupTerritories(),
    ])
      .then(([zones, regions, areas, territories]) => {
        setGeography([
          ...zones.map((item) => ({ geography_id: item.id, name: item.label, level: "Zone", parent_id: null })),
          ...regions.map((item) => ({ geography_id: item.id, name: item.label, level: "Region", parent_id: item.parentId ?? null })),
          ...areas.map((item) => ({ geography_id: item.id, name: item.label, level: "Area", parent_id: item.parentId ?? null })),
          ...territories.map((item) => ({ geography_id: item.id, name: item.label, level: "Territory", parent_id: item.parentId ?? null })),
        ]);
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

  const geographyOccupancy = useMemo(
    () => usersDropdownToGeographyOccupancy(usersDropdownQuery.data ?? []),
    [usersDropdownQuery.data],
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
          if (authUser?.user_id === userId) {
            try {
              await refreshPermissions();
            } catch {
              // Nav will refresh on next route change if this fails.
            }
          }
          setToast({ msg: "User updated successfully", type: "success" });
          setTimeout(() => router.push("/user-management/employee"), 1500);
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
        businessGeography={geography}
        geographyOccupancy={geographyOccupancy}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
