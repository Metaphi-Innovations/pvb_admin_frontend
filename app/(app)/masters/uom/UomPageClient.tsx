"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Ruler,
  X,
  AlertTriangle,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import {
  DEFAULT_UNIT_FORM,
  unitToForm,
  validateUnitApiForm,
  type UnitForm,
  type UnitRecord,
} from "./uom-data";
import { sortStateToOrdering } from "@/services/unit-list.service";
import {
  useUnits,
  useUnit,
  useCreateUnit,
  useUpdateUnit,
  useToggleUnitStatus,
  useExportUnits,
  useUnitFilterDropdown,
  useParentUomDropdown,
} from "@/hooks/masters";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { MasterListing } from "@/components/listing/MasterListing";
import {
  ColumnConfig,
  FilterState,
  SortState,
  ActionItemConfig,
} from "@/components/listing/types";
import {
  ListingUserCell,
  AuditUserRow,
  ListingStatusToggle,
  isActiveStatus,
} from "@/components/listing";
import { ListingContainer } from "@/components/layout/ListingContainer";

type StatusTab = "all" | "active" | "inactive";
const UNIT_TAB_KEY = "unit-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(UNIT_TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function toUnitRow(item: {
  id: number;
  unitUuid: string;
  unitCode: string;
  unitName: string;
  shortName: string;
  uomId: string | null;
  parentUomName: string;
  conversionFactor: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): UnitRecord {
  return {
    id: item.id,
    unitUuid: item.unitUuid,
    unitCode: item.unitCode,
    unitName: item.unitName,
    shortName: item.shortName,
    uomId: item.uomId,
    parentUomName: item.parentUomName,
    conversionFactor: item.conversionFactor,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

function buildApiPayload(form: UnitForm) {
  const conversion = Number(form.conversionFactor.trim());
  return {
    unit_name: form.unitName.trim(),
    short_name: form.shortName.trim(),
    uom_id: form.uomId.trim() || null,
    conversion_factor: conversion,
  };
}

export default function UomPageClient() {
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "unitName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<UnitRecord | null>(null);
  const [form, setForm] = useState<UnitForm>(DEFAULT_UNIT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<UnitRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.unit, {
        statusTab,
      }),
    [debouncedFilters, statusTab],
  );
  const listStatus = useMemo(
    () => resolveListStatus(debouncedFilters, statusTab),
    [debouncedFilters, statusTab],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: debouncedSearch,
      status: listStatus,
      apiFilters,
      ordering,
    }),
    [page, pageSize, debouncedSearch, listStatus, apiFilters, ordering],
  );

  const listQuery = useUnits(listParams);
  const detailQuery = useUnit(viewId);
  const createMutation = useCreateUnit();
  const updateMutation = useUpdateUnit();
  const toggleStatusMutation = useToggleUnitStatus();
  const exportMutation = useExportUnits();

  const excludeUomId = sheetMode === "edit" ? active?.unitUuid : undefined;
  const parentUomQuery = useParentUomDropdown(excludeUomId);

  const unitCodeOptionsQuery = useUnitFilterDropdown("unit_code");
  const unitNameOptionsQuery = useUnitFilterDropdown("unit_name");
  const shortNameOptionsQuery = useUnitFilterDropdown("short_name");
  const parentUomOptionsQuery = useUnitFilterDropdown("uom__unit_name");
  const conversionOptionsQuery = useUnitFilterDropdown("conversion_factor");
  const statusOptionsQuery = useUnitFilterDropdown("is_active");
  const createdByOptionsQuery = useUnitFilterDropdown("created_by_user__username");
  const updatedByOptionsQuery = useUnitFilterDropdown("updated_by_user__username");

  const unitCodeOptions = useMemo(() => unitCodeOptionsQuery.data ?? [], [unitCodeOptionsQuery.data]);
  const unitNameOptions = useMemo(() => unitNameOptionsQuery.data ?? [], [unitNameOptionsQuery.data]);
  const shortNameOptions = useMemo(() => shortNameOptionsQuery.data ?? [], [shortNameOptionsQuery.data]);
  const parentUomFilterOptions = useMemo(
    () => parentUomOptionsQuery.data ?? [],
    [parentUomOptionsQuery.data],
  );
  const conversionOptions = useMemo(
    () => conversionOptionsQuery.data ?? [],
    [conversionOptionsQuery.data],
  );
  const statusOptions = useMemo(() => {
    if (statusOptionsQuery.data?.length) return statusOptionsQuery.data;
    return [
      { label: "Active", value: "active" },
      { label: "Inactive", value: "inactive" },
    ];
  }, [statusOptionsQuery.data]);
  const createdByOptions = useMemo(
    () => createdByOptionsQuery.data ?? [],
    [createdByOptionsQuery.data],
  );
  const updatedByOptions = useMemo(
    () => updatedByOptionsQuery.data ?? [],
    [updatedByOptionsQuery.data],
  );

  const parentUomSelectOptions = useMemo(() => {
    const fromApi = parentUomQuery.data ?? [];
    if (form.uomId && !fromApi.some((o) => o.value === form.uomId) && active?.parentUomName) {
      return [{ label: active.parentUomName, value: form.uomId }, ...fromApi];
    }
    return fromApi;
  }, [parentUomQuery.data, form.uomId, active?.parentUomName]);

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toUnitRow),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "units",
        notFoundMessage: "Unit list endpoint not found.",
        serverMessage: "Server error while loading units.",
      })
    : null;
  const viewLoading = Boolean(viewId) && detailQuery.isFetching;
  const saving = createMutation.isPending || updateMutation.isPending;
  const isFiltering = isDebouncing;

  useEffect(() => {
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize, statusTab, sort.key, sort.direction]);

  useEffect(() => {
    const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (page > totalPages) setPage(totalPages);
  }, [page, pageSize, totalRecords]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load unit details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toUnitRow(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(UNIT_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: UnitRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.unitUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "Unit id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    toggleStatusMutation.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `Unit status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update unit status."),
            type: "error",
          });
        },
        onSettled: () => setStatusTarget(null),
      },
    );
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_UNIT_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: UnitRecord) => {
    setForm(unitToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: UnitRecord) => {
    if (!row.unitUuid) {
      setToast({ msg: "Unit id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.unitUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<UnitRecord>[] = useMemo(
    () => [
      {
        key: "unitName",
        header: "Unit Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: unitNameOptions,
        width: "180px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="text-xs font-semibold text-brand-700 hover:underline text-left"
          >
            {row.unitName}
          </button>
        ),
      },
      {
        key: "unitCode",
        header: "Unit Code",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: unitCodeOptions,
        width: "110px",
        render: (val) => (
          <span className="font-mono text-xs text-muted-foreground">{String(val || "—")}</span>
        ),
      },
      {
        key: "shortName",
        header: "Short Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: shortNameOptions,
        width: "110px",
      },
      {
        key: "parentUomName",
        header: "UOM",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: parentUomFilterOptions,
        width: "160px",
        render: (val) => <span className="text-xs">{val ? String(val) : "—"}</span>,
      },
      {
        key: "conversionFactor",
        header: "Conversion",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: conversionOptions,
        width: "110px",
        render: (val) => <span className="text-xs font-mono">{val ? String(val) : "—"}</span>,
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "100px",
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => requestStatusToggle(row)}
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created By",
        sortable: true,
        filterable: true,
        filterType: "audit",
        auditUserOptions: createdByOptions,
        width: "150px",
        render: (_val, row) => (
          <ListingUserCell name={row.createdBy} date={row.createdAt} />
        ),
      },
      {
        key: "updatedBy",
        header: "Updated By",
        sortable: true,
        filterable: true,
        filterType: "audit",
        auditUserOptions: updatedByOptions,
        width: "150px",
        render: (_val, row) => (
          <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
        ),
      },
    ],
    [
      unitNameOptions,
      unitCodeOptions,
      shortNameOptions,
      parentUomFilterOptions,
      conversionOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<UnitRecord>[] = [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => openView(row),
      disabled: () => viewLoading,
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => openEdit(row),
    },
  ];

  const displayRecords = useMemo(() => {
    if (ordering || !sort.key || sort.direction === "none") return records;
    return [...records].sort((a, b) => {
      const aVal = String(a[sort.key as keyof UnitRecord] ?? "").toLowerCase();
      const bVal = String(b[sort.key as keyof UnitRecord] ?? "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort, ordering]);

  const persist = () => {
    const fieldErrors = validateUnitApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = buildApiPayload(form);

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(payload, {
        onSuccess: () => {
          setToast({ msg: "Unit added successfully", type: "success" });
          setPage(1);
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to create unit."));
        },
      });
      return;
    }

    if (!active?.unitUuid) {
      setFormError("Unit id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      { id: active.unitUuid, payload },
      {
        onSuccess: () => {
          setToast({ msg: "Unit updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update unit."));
        },
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: debouncedSearch,
        status: listStatus,
        ordering,
        apiFilters,
      },
      {
        onSuccess: () => setToast({ msg: "Units exported successfully", type: "success" }),
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export units"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add" ? "Add Unit" : sheetMode === "edit" ? "Edit Unit" : "View Unit";

  const viewDrawer = active
    ? {
        title: active.unitName,
        subtitle: active.unitCode || "Read-only unit details",
        status: active.status,
        basicInfo: [
          { label: "Unit Code", value: active.unitCode || "—", mono: true },
          { label: "Short Name", value: active.shortName || "—" },
          { label: "Parent UOM", value: active.parentUomName || "—" },
          { label: "Conversion Factor", value: active.conversionFactor || "—", mono: true },
        ],
        showDescription: false,
        children: (
          <MasterDrawerSection title="Audit Information">
            <div className="space-y-4">
              <AuditUserRow label="Created By" name={active.createdBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Created Date</p>
                <p className="text-sm font-medium text-foreground font-mono">{active.createdAt}</p>
              </div>
              <AuditUserRow label="Updated By" name={active.updatedBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Updated Date</p>
                <p className="text-sm font-medium text-foreground font-mono">{active.updatedAt}</p>
              </div>
            </div>
          </MasterDrawerSection>
        ),
      }
    : { title: "Unit", basicInfo: [] };

  return (
    <ListingContainer
      title="Unit Master"
      titleIcon={Ruler}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<UnitRecord>
        columns={columns}
        data={displayRecords}
        loading={loading || isFiltering}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={setFilters}
        actions={actions}
        onAdd={openAdd}
        addLabel="Add Unit"
        onExport={handleExport}
        emptyMessage="units"
        searchPlaceholder="Search unit name, short name..."
        currentFilters={filters}
        currentSort={sort}
        rowKey={(row) => row.unitUuid ?? String(row.id)}
      />

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Ruler}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <MasterFormGrid>
              <MasterField label="Unit Name" required className="sm:col-span-2">
                <Input
                  className={cn(compactInput(), errors.unitName && "border-red-400 focus-visible:ring-red-300")}
                  value={form.unitName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, unitName: e.target.value }));
                    setErrors((prev) => ({ ...prev, unitName: "" }));
                  }}
                  placeholder="e.g. Kilogram"
                />
                {errors.unitName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.unitName}</p>
                )}
              </MasterField>

              <MasterField label="Short Name" required>
                <Input
                  className={cn(compactInput(), errors.shortName && "border-red-400 focus-visible:ring-red-300")}
                  value={form.shortName}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, shortName: e.target.value }));
                    setErrors((prev) => ({ ...prev, shortName: "" }));
                  }}
                  placeholder="e.g. KG"
                />
                {errors.shortName && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.shortName}</p>
                )}
              </MasterField>

              <MasterField label="Conversion Factor" required>
                <Input
                  type="number"
                  step="any"
                  className={cn(compactInput(), errors.conversionFactor && "border-red-400 focus-visible:ring-red-300")}
                  value={form.conversionFactor}
                  onChange={(e) => {
                    setForm((prev) => ({ ...prev, conversionFactor: e.target.value }));
                    setErrors((prev) => ({ ...prev, conversionFactor: "" }));
                  }}
                  placeholder="e.g. 1000"
                />
                {errors.conversionFactor && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.conversionFactor}</p>
                )}
              </MasterField>

              <MasterField label="Parent UOM" className="sm:col-span-2">
                <AutocompleteSelect
                  options={parentUomSelectOptions}
                  value={form.uomId}
                  onChange={(val) =>
                    setForm((prev) => ({
                      ...prev,
                      uomId: typeof val === "string" ? val : "",
                    }))
                  }
                  placeholder={
                    parentUomQuery.isFetching ? "Loading UOM options…" : "Select parent UOM (optional)"
                  }
                  searchPlaceholder="Search UOM…"
                  disabled={parentUomQuery.isFetching}
                  className="h-8 text-xs rounded-lg"
                />
              </MasterField>
            </MasterFormGrid>
          ) : null
        }
      />

      <Dialog open={!!statusTarget} onOpenChange={(o) => !o && setStatusTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              {statusTarget?.status === "active" ? "Deactivate Unit?" : "Activate Unit?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.unitName}</strong> will be marked
                  as {statusTarget.status === "active" ? "inactive" : "active"}.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs text-white bg-brand-600 hover:bg-brand-700"
              onClick={confirmStatusChange}
            >
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
