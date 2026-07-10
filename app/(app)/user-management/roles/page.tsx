"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Eye,
  Edit2,
  Shield,
  CheckCircle2,
  XCircle,
  X,
  AlertTriangle,
  MoreHorizontal,
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import RoleDetailSheet from "./components/RoleDetailSheet";
import { toRoleRecord, toLegacyRole, type RoleRecord } from "./role-api-data";
import { sortStateToOrdering } from "@/services/role-list.service";
import {
  type TemplateListRecord,
  templateSortStateToOrdering,
} from "@/services/template-list.service";
import {
  useRoles,
  useRole,
  useToggleRoleStatus,
  useExportRoles,
  useRoleFilterDropdown,
  useTemplates,
  useToggleTemplateStatus,
  useExportTemplates,
} from "@/hooks/user-management";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
  buildStatusFilter,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

type ConfirmTarget = RoleRecord | null;

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function extractAuditFilter(
  value: unknown,
): { user: string; fromDate: string; toDate: string } {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { user: "", fromDate: "", toDate: "" };
  }
  const record = value as Record<string, unknown>;
  return {
    user: typeof record.user === "string" ? record.user.trim() : "",
    fromDate: typeof record.fromDate === "string" ? record.fromDate : "",
    toDate: typeof record.toDate === "string" ? record.toDate : "",
  };
}

function GeoBadge({ level }: { level: string }) {
  if (level === "None") return <span className="text-[11px] text-muted-foreground">—</span>;
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-medium">
      {level}
    </span>
  );
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const bg = toast.type === "success" ? "bg-emerald-600" : "bg-red-600";
  return (
    <div
      className={cn(
        "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
        bg,
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  bgClass = "bg-brand-600",
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  bgClass?: string;
}) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", bgClass)}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

const COUNT_PARAMS = { page: 1, pageSize: 1, search: "", ordering: "" };

export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get("tab") || "roles");

  const {
    draftFilters: roleFilters,
    setDraftFilters: setRoleFilters,
    appliedFilters: roleAppliedFilters,
    applyFilters: applyRoleFilters,
    appliedSearch: roleAppliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [roleSort, setRoleSort] = useState<SortState>({ key: "roleName", direction: "asc" });
  const [rolePage, setRolePage] = useState(1);
  const [rolePageSize, setRolePageSize] = useState(10);
  const [viewId, setViewId] = useState<string | null>(null);
  const [viewRole, setViewRole] = useState<RoleRecord | null>(null);
  const [confirmRoleStatus, setConfirmRoleStatus] = useState<ConfirmTarget>(null);

  const {
    draftFilters: templateFilters,
    setDraftFilters: setTemplateFilters,
    appliedFilters: templateAppliedFilters,
    applyFilters: applyTemplateFilters,
    appliedSearch: templateAppliedSearch,
  } = useAppliedListFilters();
  const [templateSort, setTemplateSort] = useState<SortState>({
    key: "templateName",
    direction: "asc",
  });
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(10);

  const [toast, setToast] = useState<ToastState | null>(null);

  const roleOrdering = useMemo(
    () => sortStateToOrdering(roleSort.key, roleSort.direction),
    [roleSort.key, roleSort.direction],
  );
  const roleApiFilters = useMemo(
    () => mergeListRequestFilters(roleAppliedFilters, MASTER_FILTER_FIELD_MAPS.role),
    [roleAppliedFilters],
  );
  const roleStatus = useMemo(() => resolveListStatus(roleAppliedFilters), [roleAppliedFilters]);

  const roleParams = useMemo<MasterListKeyParams>(
    () => ({
      page: rolePage,
      pageSize: rolePageSize,
      search: roleAppliedSearch,
      status: roleStatus,
      apiFilters: roleApiFilters,
      ordering: roleOrdering,
    }),
    [rolePage, rolePageSize, roleAppliedSearch, roleStatus, roleApiFilters, roleOrdering],
  );

  const templateOrdering = useMemo(
    () => templateSortStateToOrdering(templateSort.key, templateSort.direction),
    [templateSort.key, templateSort.direction],
  );
  const templateStatus = useMemo(
    () => resolveListStatus(templateAppliedFilters),
    [templateAppliedFilters],
  );
  const templateApiFilters = useMemo(() => {
    const filters: Record<string, unknown> = {};
    const nameRaw = templateAppliedFilters.templateName;
    const statusRaw = templateAppliedFilters.status;
    const createdAudit = extractAuditFilter(templateAppliedFilters.createdAt);
    const updatedAudit = extractAuditFilter(templateAppliedFilters.updatedAt);
    if (typeof nameRaw === "string" && nameRaw.trim()) filters.name = nameRaw.trim();
    if (Array.isArray(nameRaw) && nameRaw.length === 1 && String(nameRaw[0]).trim()) {
      filters.name = String(nameRaw[0]).trim();
    }
    if (typeof statusRaw === "string") {
      if (statusRaw.toLowerCase() === "active") filters.is_active = true;
      if (statusRaw.toLowerCase() === "inactive") filters.is_active = false;
    }
    if (createdAudit.user) {
      filters.created_by_user = { username: createdAudit.user };
    }
    if (createdAudit.fromDate || createdAudit.toDate) {
      filters.range = {
        ...(filters.range as Record<string, unknown> | undefined),
        created_at: {
          from: createdAudit.fromDate || undefined,
          to: createdAudit.toDate || undefined,
        },
      };
    }
    if (updatedAudit.user) {
      filters.updated_by_user = { username: updatedAudit.user };
    }
    if (updatedAudit.fromDate || updatedAudit.toDate) {
      filters.range = {
        ...(filters.range as Record<string, unknown> | undefined),
        updated_at: {
          from: updatedAudit.fromDate || undefined,
          to: updatedAudit.toDate || undefined,
        },
      };
    }
    return { ...filters, ...buildStatusFilter(templateStatus, "is_active") };
  }, [templateAppliedFilters, templateStatus]);

  const templateParams = useMemo<MasterListKeyParams>(
    () => ({
      page: templatePage,
      pageSize: templatePageSize,
      search: templateAppliedSearch,
      status: templateStatus,
      apiFilters: templateApiFilters,
      ordering: templateOrdering,
    }),
    [
      templatePage,
      templatePageSize,
      templateAppliedSearch,
      templateStatus,
      templateApiFilters,
      templateOrdering,
    ],
  );

  const rolesQuery = useRoles(roleParams, { enabled: activeTab === "roles" });
  const roleDetailQuery = useRole(viewId);
  const toggleRoleStatus = useToggleRoleStatus();
  const exportRoles = useExportRoles();
  const allCountQuery = useRoles({ ...COUNT_PARAMS, status: "all", apiFilters: {} });
  const activeCountQuery = useRoles({
    ...COUNT_PARAMS,
    status: "active",
    apiFilters: buildStatusFilter("active", "is_active"),
  });
  const inactiveCountQuery = useRoles({
    ...COUNT_PARAMS,
    status: "inactive",
    apiFilters: buildStatusFilter("inactive", "is_active"),
  });
  const roleNameOptionsQuery = useRoleFilterDropdown("role_name", { enabled: isFilterOpen("roleName") });
  const departmentOptionsQuery = useRoleFilterDropdown("department__department_name", {
    enabled: isFilterOpen("department"),
  });
  const geoLevelOptionsQuery = useRoleFilterDropdown("geography_level", {
    enabled: isFilterOpen("geoLevel"),
  });
  const createdByOptionsQuery = useRoleFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useRoleFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });

  const templatesQuery = useTemplates(templateParams, { enabled: activeTab === "templates" });
  const toggleTemplateStatus = useToggleTemplateStatus();
  const exportTemplates = useExportTemplates();

  const roleRecords = useMemo(
    () => (rolesQuery.data?.items ?? []).map(toRoleRecord),
    [rolesQuery.data],
  );
  const templateRecords = useMemo(() => templatesQuery.data?.items ?? [], [templatesQuery.data]);
  // Access type is derived from JSON permissions — filter client-side until backend supports it.
  const visibleTemplateRecords = useMemo(() => {
    const accessFilterRaw = templateAppliedFilters.accessType;
    const accessFilter = Array.isArray(accessFilterRaw)
      ? String(accessFilterRaw[0] ?? "").trim().toLowerCase()
      : String(accessFilterRaw ?? "").trim().toLowerCase();
    if (!accessFilter) return templateRecords;
    return templateRecords.filter((row) => row.accessType.toLowerCase() === accessFilter);
  }, [templateRecords, templateAppliedFilters.accessType]);
  const templateNameOptions = useMemo(
    () =>
      Array.from(new Set(templateRecords.map((row) => row.templateName)))
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v })),
    [templateRecords],
  );
  const templateAccessTypeOptions = useMemo(
    () => [
      { label: "Web Portal", value: "web" },
      { label: "Mobile App", value: "mobile" },
    ],
    [],
  );
  const templateCreatedByOptions = useMemo(
    () =>
      Array.from(new Set(templateRecords.map((row) => row.createdBy).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v })),
    [templateRecords],
  );
  const templateUpdatedByOptions = useMemo(
    () =>
      Array.from(new Set(templateRecords.map((row) => row.updatedBy).filter(Boolean)))
        .sort((a, b) => a.localeCompare(b))
        .map((v) => ({ label: v, value: v })),
    [templateRecords],
  );

  const summary = useMemo(
    () => ({
      total: allCountQuery.data?.total ?? 0,
      active: activeCountQuery.data?.total ?? 0,
      inactive: inactiveCountQuery.data?.total ?? 0,
    }),
    [allCountQuery.data?.total, activeCountQuery.data?.total, inactiveCountQuery.data?.total],
  );

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setRolePage(1);
  }, [roleAppliedSearch, roleApiFilters, rolePageSize, roleSort.key, roleSort.direction]);

  useEffect(() => {
    setTemplatePage(1);
  }, [
    templateAppliedSearch,
    templateApiFilters,
    templatePageSize,
    templateSort.key,
    templateSort.direction,
  ]);

  useEffect(() => {
    if (!viewId) return;
    if (roleDetailQuery.isError) {
      showToast(getErrorMessage(roleDetailQuery.error, "Failed to load role details."), "error");
      setViewId(null);
      return;
    }
    if (roleDetailQuery.data) setViewRole(toRoleRecord(roleDetailQuery.data));
  }, [viewId, roleDetailQuery.data, roleDetailQuery.isError, roleDetailQuery.error, showToast]);

  const openRoleView = (row: RoleRecord) => {
    if (!row.roleUuid) return;
    setViewRole(row);
    setViewId(row.roleUuid);
  };

  const confirmRoleStatusChange = () => {
    const id = confirmRoleStatus?.roleUuid;
    if (!confirmRoleStatus || !id) return;
    const nextActive = confirmRoleStatus.status !== "active";
    toggleRoleStatus.mutate(id, {
      onSuccess: () =>
        showToast(`Role status updated to ${nextActive ? "Active" : "Inactive"}`),
      onError: (error) =>
        showToast(getErrorMessage(error, "Failed to update role status."), "error"),
      onSettled: () => setConfirmRoleStatus(null),
    });
  };

  const roleColumns: ColumnConfig<RoleRecord>[] = [
    {
      key: "roleName",
      header: "Role Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: roleNameOptionsQuery.data ?? [],
      render: (_val, row) => (
        <button
          className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
          onClick={() => openRoleView(row)}
        >
          {row.roleName}
        </button>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: departmentOptionsQuery.data ?? [],
      render: (_val, row) => <span className="text-xs text-foreground">{row.department}</span>,
    },
    {
      key: "geoLevel",
      header: "Geo Level",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: geoLevelOptionsQuery.data ?? [],
      render: (_val, row) => <GeoBadge level={row.geoLevel} />,
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      render: (_val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => setConfirmRoleStatus(row)}
        />
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: createdByOptionsQuery.data ?? [],
      render: (_val, row) => (
        <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: updatedByOptionsQuery.data ?? [],
      render: (_val, row) => (
        <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => openRoleView(row)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/user-management/roles/${row.roleUuid}/edit`)}
              className="cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const templateColumns: ColumnConfig<TemplateListRecord>[] = [
    {
      key: "templateName",
      header: "Template Name",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: templateNameOptions,
      render: (_val, row) => (
        <button
          className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
          onClick={() => router.push(`/user-management/roles/templates/${row.templateUuid}/view`)}
        >
          {row.templateName}
        </button>
      ),
    },
    {
      key: "accessType",
      header: "Access Type",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: templateAccessTypeOptions,
      render: (_val, row) => (
        <span
          className={cn(
            "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border capitalize",
            row.accessType === "web"
              ? "bg-brand-50 border-brand-100 text-brand-700"
              : "bg-blue-50 border-blue-100 text-blue-700",
          )}
        >
          {row.accessType === "web" ? "Web Portal" : "Mobile App"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
      render: (_val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() =>
            toggleTemplateStatus.mutate(row.templateUuid, {
              onSuccess: () =>
                showToast(
                  `Template status updated to ${row.status === "active" ? "Inactive" : "Active"}`,
                ),
              onError: (error) =>
                showToast(getErrorMessage(error, "Failed to update template status."), "error"),
            })
          }
        />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: templateCreatedByOptions,
      render: (_val, row) => (
        <ListingAuditCell name={row.createdBy} date={row.createdAt} variant="created" />
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "audit",
      auditUserOptions: templateUpdatedByOptions,
      render: (_val, row) => (
        <ListingAuditCell name={row.updatedBy} date={row.updatedAt} variant="updated" />
      ),
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (_val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => router.push(`/user-management/roles/templates/${row.templateUuid}/view`)}
              className="cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => router.push(`/user-management/roles/templates/${row.templateUuid}/edit`)}
              className="cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListingContainer
      title="Roles"
      titleIcon={Shield}
      metrics={
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Roles" value={summary.total} icon={Shield} bgClass="bg-brand-600" />
          <KpiCard label="Active" value={summary.active} icon={CheckCircle2} bgClass="bg-emerald-600" />
          <KpiCard label="Inactive" value={summary.inactive} icon={XCircle} bgClass="bg-slate-400" />
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="border-b border-border w-full justify-start rounded-none h-auto p-0 bg-transparent space-x-6">
          <TabsTrigger value="roles" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none hover:text-brand-650 transition-all">Roles</TabsTrigger>
          <TabsTrigger value="templates" className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none hover:text-brand-650 transition-all">Template</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="m-0 outline-none">
          {rolesQuery.isError ? (
            <p className="mb-2 text-xs text-red-600">
              {getMasterListErrorMessage(rolesQuery.error, {
                resource: "roles",
                notFoundMessage: "Role list endpoint not found.",
                serverMessage: "Server error while loading roles.",
              })}
            </p>
          ) : null}
          <MasterListing<RoleRecord>
            columns={roleColumns}
            data={roleRecords}
            loading={rolesQuery.isFetching}
            totalRecords={rolesQuery.data?.total ?? 0}
            page={rolePage}
            pageSize={rolePageSize}
            onPageChange={setRolePage}
            onPageSizeChange={setRolePageSize}
            onSortChange={setRoleSort}
            onFilterChange={(next) => {
              setRoleFilters(next);
              applyRoleFilters(next);
            }}
            emptyMessage="roles"
            searchPlaceholder="Search role or department…"
            onAdd={() => router.push("/user-management/roles/add")}
            addLabel="Add Role"
            onExport={() =>
              exportRoles.mutate(
                { search: appliedSearch, status: roleStatus, ordering: roleOrdering, apiFilters: roleApiFilters },
                {
                  onSuccess: () => showToast("Roles exported successfully"),
                  onError: (error) => showToast(getErrorMessage(error, "Failed to export roles"), "error"),
                },
              )
            }
            currentFilters={roleFilters}
            currentSort={roleSort}
            onOpenFilter={handleOpenFilter}
          />
        </TabsContent>

        <TabsContent value="templates" className="m-0 outline-none">
          <MasterListing<TemplateListRecord>
            columns={templateColumns}
            data={visibleTemplateRecords}
            loading={templatesQuery.isFetching}
            totalRecords={visibleTemplateRecords.length}
            page={templatePage}
            pageSize={templatePageSize}
            onPageChange={setTemplatePage}
            onPageSizeChange={setTemplatePageSize}
            onSortChange={setTemplateSort}
            onFilterChange={(next) => {
              setTemplateFilters(next);
              applyTemplateFilters(next);
            }}
            emptyMessage="templates"
            searchPlaceholder="Search template name…"
            onAdd={() => router.push("/user-management/roles/templates/add")}
            addLabel="Add Template"
            onExport={() =>
              exportTemplates.mutate(
                {
                  search: templateAppliedSearch,
                  status: templateStatus,
                  ordering: templateOrdering,
                  apiFilters: templateApiFilters,
                },
                {
                  onSuccess: () => showToast("Templates exported successfully"),
                  onError: (error) => showToast(getErrorMessage(error, "Failed to export templates"), "error"),
                },
              )
            }
            currentFilters={templateFilters}
            currentSort={templateSort}
          />
        </TabsContent>
      </Tabs>

      <RoleDetailSheet
        open={viewRole !== null}
        onClose={() => {
          setViewRole(null);
          setViewId(null);
        }}
        role={viewRole ? toLegacyRole(viewRole) : null}
        onEdit={() => {
          if (viewRole) router.push(`/user-management/roles/${viewRole.roleUuid}/edit`);
        }}
      />

      <Dialog open={confirmRoleStatus !== null} onOpenChange={(open) => !open && setConfirmRoleStatus(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              {confirmRoleStatus?.status === "active" ? "Deactivate Role?" : "Activate Role?"}
            </DialogTitle>
            <DialogDescription className="pt-1">
              {confirmRoleStatus?.roleName} will be marked {confirmRoleStatus?.status === "active" ? "inactive" : "active"}.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmRoleStatus(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700" onClick={confirmRoleStatusChange}>
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
    </ListingContainer>
  );
}
