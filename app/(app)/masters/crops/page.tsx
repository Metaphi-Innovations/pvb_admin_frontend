"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Folder,
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
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import {
  DEFAULT_CROP_FORM,
  cropToForm,
  toCropRecord,
  validateCropApiForm,
  type CropForm as CropFormValues,
  type CropRecord,
} from "./crop-data";
import { CropForm } from "./components/CropForm";
import { sortStateToOrdering, CropListService } from "@/services/crop-list.service";
import {
  useCrops,
  useCrop,
  useCreateCrop,
  useUpdateCrop,
  useToggleCropStatus,
  useExportCrops,
  useCropFilterDropdown,
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
const CROP_TAB_KEY = "crop-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(CROP_TAB_KEY);
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

export default function CropMasterPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "cropName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<CropRecord | null>(null);
  const [form, setForm] = useState<CropFormValues>(DEFAULT_CROP_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<CropRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.crop, {
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

  const listQuery = useCrops(listParams);
  const detailQuery = useCrop(viewId);
  const createMutation = useCreateCrop();
  const updateMutation = useUpdateCrop();
  const toggleStatusMutation = useToggleCropStatus();
  const exportMutation = useExportCrops();

  const cropNameOptionsQuery = useCropFilterDropdown("crop_name");
  const fieldTypeOptionsQuery = useCropFilterDropdown("field_type");
  const categoryOptionsQuery = useCropFilterDropdown("category__categoryName");
  const seasonOptionsQuery = useCropFilterDropdown("season");
  const statusOptionsQuery = useCropFilterDropdown("is_active");
  const createdByOptionsQuery = useCropFilterDropdown("created_by_user__username");
  const updatedByOptionsQuery = useCropFilterDropdown("updated_by_user__username");

  const cropNameOptions = useMemo(
    () => cropNameOptionsQuery.data ?? [],
    [cropNameOptionsQuery.data],
  );
  const fieldTypeOptions = useMemo(
    () => fieldTypeOptionsQuery.data ?? [],
    [fieldTypeOptionsQuery.data],
  );
  const categoryOptions = useMemo(
    () => categoryOptionsQuery.data ?? [],
    [categoryOptionsQuery.data],
  );
  const seasonOptions = useMemo(
    () => seasonOptionsQuery.data ?? [],
    [seasonOptionsQuery.data],
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

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toCropRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "crops",
        notFoundMessage: "Crop list endpoint not found.",
        serverMessage: "Server error while loading crops.",
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
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load crop details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toCropRecord(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(CROP_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: CropRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.cropUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "Crop id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    toggleStatusMutation.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `Crop status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update crop status."),
            type: "error",
          });
        },
        onSettled: () => {
          setStatusTarget(null);
        },
      },
    );
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_CROP_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: CropRecord) => {
    setForm(cropToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: CropRecord) => {
    if (!row.cropUuid) {
      setToast({ msg: "Crop id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.cropUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<CropRecord>[] = useMemo(
    () => [
      {
        key: "cropName",
        header: "Crop Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: cropNameOptions,
        width: "220px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="text-xs font-semibold text-brand-700 hover:underline text-left"
          >
            {row.cropName}
          </button>
        ),
      },
      {
        key: "fieldType",
        header: "Field Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: fieldTypeOptions,
        width: "180px",
      },
      {
        key: "categoryName",
        header: "Category",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: categoryOptions,
        width: "180px",
      },
      {
        key: "season",
        header: "Season/Period",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: seasonOptions,
        width: "220px",
        render: (_val, row) => (
          <span className="text-xs text-foreground truncate max-w-[210px] block">
            {row.season.length > 0 ? row.season.join(", ") : "—"}
          </span>
        ),
      },
      {
        key: "status",
        header: "Status",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: statusOptions,
        width: "110px",
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => requestStatusToggle(row)}
          />
        ),
      },
      {
        key: "createdBy",
        header: "Created",
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
        header: "Updated",
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
      cropNameOptions,
      fieldTypeOptions,
      categoryOptions,
      seasonOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<CropRecord>[] = [
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
      let aVal = "";
      let bVal = "";
      if (sort.key === "season") {
        aVal = a.season.join(", ").toLowerCase();
        bVal = b.season.join(", ").toLowerCase();
      } else {
        aVal = String(a[sort.key as keyof CropRecord] ?? "").toLowerCase();
        bVal = String(b[sort.key as keyof CropRecord] ?? "").toLowerCase();
      }
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort, ordering]);

  const persist = () => {
    const fieldErrors = validateCropApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const season = CropListService.seasonToApiValue(form.season);

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(
        {
          crop_name: form.cropName,
          field_type: form.fieldType,
          season,
          category_id: form.categoryId,
        },
        {
          onSuccess: () => {
            setToast({ msg: "Crop added successfully", type: "success" });
            setPage(1);
            closeSheet();
          },
          onError: (error) => {
            setFormError(getErrorMessage(error, "Failed to create crop."));
          },
        },
      );
      return;
    }

    if (!active?.cropUuid) {
      setFormError("Crop id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      {
        id: active.cropUuid,
        payload: {
          crop_name: form.cropName,
          field_type: form.fieldType,
          season,
          category_id: form.categoryId,
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Crop updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update crop."));
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
        onSuccess: () => {
          setToast({ msg: "Crops exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export crops"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Crop"
      : sheetMode === "edit"
        ? "Edit Crop"
        : "View Crop";

  const viewDrawer = active
    ? {
        title: active.cropName,
        subtitle: active.categoryName || "Read-only crop details",
        status: active.status,
        basicInfo: [
          { label: "Field Type", value: active.fieldType || "—" },
          { label: "Category", value: active.categoryName || "—" },
          {
            label: "Season / Period",
            value: active.season.length > 0 ? active.season.join(", ") : "—",
          },
          {
            label: "Description",
            value: active.description?.trim() ? active.description : "—",
          },
        ],
        showDescription: false,
        children: (
          <MasterDrawerSection title="Audit Information">
            <div className="space-y-4">
              <AuditUserRow label="Created By" name={active.createdBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Created Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.createdAt}
                </p>
              </div>
              <AuditUserRow label="Updated By" name={active.updatedBy} />
              <div className="space-y-1">
                <p className="text-[11px] text-muted-foreground">Updated Date</p>
                <p className="text-sm font-medium text-foreground font-mono">
                  {active.updatedAt}
                </p>
              </div>
            </div>
          </MasterDrawerSection>
        ),
      }
    : { title: "Crop", basicInfo: [] };

  return (
    <ListingContainer
      title="Crop Master"
      titleIcon={Folder}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<CropRecord>
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
        addLabel="Add Crop"
        onExport={handleExport}
        emptyMessage="crops"
        searchPlaceholder="Search crop name, field type, category, season..."
        currentFilters={filters}
        currentSort={sort}
      />

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Folder}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <CropForm
              form={form}
              onChange={setForm}
              errors={errors}
              onClearError={(key: string) =>
                setErrors((prev) => {
                  const copy = { ...prev };
                  delete copy[key];
                  return copy;
                })
              }
            />
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
              {statusTarget?.status === "active" ? "Deactivate Crop?" : "Activate Crop?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.cropName}</strong> will be
                  marked as {statusTarget.status === "active" ? "inactive" : "active"}.
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
