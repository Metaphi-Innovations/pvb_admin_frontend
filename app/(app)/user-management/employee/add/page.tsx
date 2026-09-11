"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle, X } from "lucide-react";
import EmployeeForm from "../components/EmployeeForm";
import { type Employee } from "../employee-data";
import {
  employeeToCreatePayload,
  approvalUsersToOptions,
  usersDropdownToOptions,
  usersDropdownToGeographyOccupancy,
  templatePermissionsToSets,
  roleDropdownToApiOptions,
  type ApiRoleOption,
  type GeographyLookupItem,
} from "../user-api-data";
import { permissionsHaveEnabled } from "@/services/user-list.service";
import { cn } from "@/lib/utils";
import {
  useCreateUser,
  useSaveUserPermissions,
  useNextEmployeeId,
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

export default function AddEmployeePage() {
  const router = useRouter();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [geography, setGeography] = useState<GeographyLookupItem[]>([]);

  const nextEmployeeIdQuery = useNextEmployeeId();
  const departmentsQuery = useDepartmentsDropdown();
  const rolesDropdownQuery = useRolesDropdown();
  const templatesQuery = useTemplatesDropdown();
  const usersDropdownQuery = useUsersDropdown();
  const approvalUsersQuery = useApprovalUsers(selectedRoleId);
  const createMutation = useCreateUser();
  const savePermissionsMutation = useSaveUserPermissions();

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
    () => usersDropdownToOptions(usersDropdownQuery.data ?? []),
    [usersDropdownQuery.data],
  );

  const geographyOccupancy = useMemo(
    () => usersDropdownToGeographyOccupancy(usersDropdownQuery.data ?? []),
    [usersDropdownQuery.data],
  );

  const handleApplyPermissionTemplate = useCallback(async (templateId: string) => {
    const template = await TemplateListService.view(templateId);
    return templatePermissionsToSets(template);
  }, []);

  const handleSave = (employee: Employee) => {
    const selectedRole = apiRoles?.find((r) => String(r.id) === String(employee.roleId));
    const payload = employeeToCreatePayload(employee, {
      password: employee.password,
      roleGeoLevel: selectedRole?.geoLevel || "None",
      geography,
    });

    createMutation.mutate(
      { payload, documents: employee.documents },
      {
        onSuccess: async (result) => {
          if (result.userId && permissionsHaveEnabled(employee.permissions)) {
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
      },
    );
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
        reportingManagerOptions={reportingManagerOptions}
        onRoleIdChange={setSelectedRoleId}
        onValidationFail={(errors) => {
          const first = Object.values(errors)[0];
          setToast({
            msg: first || "Please fix the highlighted fields before saving.",
            type: "error",
          });
        }}
        isSubmitting={createMutation.isPending || savePermissionsMutation.isPending}
        businessGeography={geography}
        geographyOccupancy={geographyOccupancy}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
