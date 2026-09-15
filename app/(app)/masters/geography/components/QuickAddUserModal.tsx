"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import EmployeeForm from "@/app/(app)/user-management/employee/components/EmployeeForm";
import { type Employee } from "@/app/(app)/user-management/employee/employee-data";
import {
  employeeToCreatePayload,
  approvalUsersToOptions,
  usersDropdownToOptions,
  usersDropdownToGeographyOccupancy,
  templatePermissionsToSets,
  roleDropdownToApiOptions,
  type ApiRoleOption,
  type GeographyLookupItem,
} from "@/app/(app)/user-management/employee/user-api-data";
import { permissionsHaveEnabled } from "@/services/user-list.service";
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
import { toast } from "sonner";

interface QuickAddUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  roleCode?: string; // e.g. "ZSM", "RSM", "ASM", "TM"
  onUserCreated: (newUser: { id: string; fullName: string; roleName?: string }) => void;
}

export function QuickAddUserModal({
  open,
  onOpenChange,
  roleCode,
  onUserCreated,
}: QuickAddUserModalProps) {
  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [geography, setGeography] = useState<GeographyLookupItem[]>([]);

  const nextEmployeeIdQuery = useNextEmployeeId(open);

  // Always refresh next employee ID when the modal opens
  useEffect(() => {
    if (!open) return;
    void nextEmployeeIdQuery.refetch();
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const departmentsQuery = useDepartmentsDropdown();
  const rolesDropdownQuery = useRolesDropdown();
  const templatesQuery = useTemplatesDropdown();
  const usersDropdownQuery = useUsersDropdown();
  const approvalUsersQuery = useApprovalUsers(selectedRoleId);
  const createMutation = useCreateUser();
  const savePermissionsMutation = useSaveUserPermissions();

  // Load geography nodes
  useEffect(() => {
    if (!open) return;
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
  }, [open]);

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

  // Pre-match role code if passed
  useEffect(() => {
    if (!open || !roleCode || !apiRoles?.length) return;
    const norm = roleCode.trim().toUpperCase();
    const match = apiRoles.find(
      (r) =>
        r.name.toUpperCase().includes(norm) ||
        r.geoLevel.toUpperCase() === norm
    );
    if (match) {
      setSelectedRoleId(match.id);
    }
  }, [open, roleCode, apiRoles]);

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

  const handleApplyPermissionTemplate = React.useCallback(async (templateId: string) => {
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
              toast.error(getErrorMessage(error, "User created but permissions could not be saved."));
            }
          }
          const fullName = employee.fullName || `${employee.firstName} ${employee.lastName}`.trim();
          toast.success(`User ${fullName} created successfully!`);
          onUserCreated({
            id: result.userId,
            fullName,
            roleName: selectedRole?.name,
          });
          onOpenChange(false);
        },
        onError: (error) => {
          toast.error(getErrorMessage(error, "Failed to create user."));
        },
      },
    );
  };

  // Initial employee default state pre-selecting role and autofilling non-colliding personal details
  const initialEmployee = useMemo(() => {
    const match = selectedRoleId && apiRoles?.length
      ? apiRoles.find((r) => String(r.id) === String(selectedRoleId))
      : undefined;

    const roleTag = (roleCode || match?.name || "user").replace(/[^a-zA-Z0-9]/g, "").slice(0, 4).toLowerCase();
    const uniqueSuffix = `${Date.now().toString().slice(-4)}${Math.floor(100 + Math.random() * 900)}`;
    const randomFirstNames = ["Rohan", "Vikram", "Aarav", "Amit", "Karan", "Pooja", "Ananya", "Neha", "Rahul", "Suresh"];
    const randomLastNames = ["Sharma", "Verma", "Patel", "Mehta", "Singh", "Joshi", "Deshmukh", "Gupta", "Rao", "Nair"];
    const firstName = randomFirstNames[Math.floor(Math.random() * randomFirstNames.length)];
    const lastName = randomLastNames[Math.floor(Math.random() * randomLastNames.length)];
    const fullName = `${firstName} ${lastName}`;
    const uniqueMobile = `9${Math.floor(100000000 + Math.random() * 900000000)}`;
    const uniqueEmail = `${firstName.toLowerCase()}.${lastName.toLowerCase()}.${roleTag}${uniqueSuffix}@pvb.com`;
    const emergencyMobile = `8${Math.floor(100000000 + Math.random() * 900000000)}`;

    return {
      firstName,
      lastName,
      fullName,
      email: uniqueEmail,
      mobile: uniqueMobile,
      countryCode: "+91",
      dob: "1994-06-15",
      gender: "Male",
      bloodGroup: "O+",
      emergencyContactName: `${lastName} Family`,
      emergencyContactRelation: "Spouse",
      emergencyContactMobile: emergencyMobile,
      currentAddressLine1: "Plot 42, Tech Park Road",
      currentAddressLine2: "Sector 5",
      currentPincode: "400001",
      currentCity: "Mumbai",
      currentTown: "Mumbai",
      currentDistrict: "Mumbai",
      currentState: "Maharashtra",
      sameAsCurrentAddress: true,
      roleId: match ? match.id : undefined,
      role: match ? match.name : (roleCode || ""),
      departmentId: match?.departmentId ? match.departmentId : undefined,
    } as unknown as Employee;
  }, [selectedRoleId, apiRoles, roleCode]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl w-[95vw] h-[90vh] p-0 flex flex-col overflow-hidden">
        <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20 shrink-0">
          <DialogTitle className="text-base font-semibold">
            Create User {roleCode ? `· Required Role: ${roleCode}` : ""}
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Complete the full user registration form with personal, employment, permissions, and documents.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-slate-50/50">
          <div className="max-w-5xl mx-auto">
            <EmployeeForm
              key={
                open
                  ? `quick-add-${nextEmployeeIdQuery.dataUpdatedAt || 0}-${nextEmployeeIdQuery.data || "pending"}`
                  : "quick-add-closed"
              }
              mode="add"
              employee={initialEmployee}
              onSave={handleSave}
              onCancel={() => onOpenChange(false)}
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
                toast.error(first || "Please fix the highlighted fields before saving.");
              }}
              isSubmitting={createMutation.isPending || savePermissionsMutation.isPending}
              businessGeography={geography}
              geographyOccupancy={geographyOccupancy}
            />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
