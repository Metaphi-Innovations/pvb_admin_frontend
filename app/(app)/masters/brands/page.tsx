"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Tag,
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
  DEFAULT_BRAND_FORM,
  DEFAULT_BRAND_TYPES,
  brandToForm,
  toBrandRecord,
  validateBrandApiForm,
  type BrandForm,
  type BrandRecord,
} from "./brand-data";
import { sortStateToOrdering } from "@/services/brand-list.service";
import {
  useBrands,
  useBrand,
  useCreateBrand,
  useUpdateBrand,
  useToggleBrandStatus,
  useExportBrands,
  useBrandFilterDropdown,
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
const BRAND_TAB_KEY = "brand-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(BRAND_TAB_KEY);
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

export default function BrandMasterPage() {
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "brandName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<BrandRecord | null>(null);
  const [form, setForm] = useState<BrandForm>(DEFAULT_BRAND_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<BrandRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.brand, {
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

  const listQuery = useBrands(listParams);
  const detailQuery = useBrand(viewId);
  const createMutation = useCreateBrand();
  const updateMutation = useUpdateBrand();
  const toggleStatusMutation = useToggleBrandStatus();
  const exportMutation = useExportBrands();

  const brandNameOptionsQuery = useBrandFilterDropdown("brand_name");
  const brandTypeOptionsQuery = useBrandFilterDropdown("brand_type");
  const remarkOptionsQuery = useBrandFilterDropdown("remark");
  const statusOptionsQuery = useBrandFilterDropdown("is_active");
  const createdByOptionsQuery = useBrandFilterDropdown("created_by_user__username");
  const updatedByOptionsQuery = useBrandFilterDropdown("updated_by_user__username");

  const brandNameOptions = useMemo(
    () => brandNameOptionsQuery.data ?? [],
    [brandNameOptionsQuery.data],
  );
  const brandTypeOptions = useMemo(() => {
    if (brandTypeOptionsQuery.data?.length) return brandTypeOptionsQuery.data;
    return DEFAULT_BRAND_TYPES.map((type) => ({ label: type, value: type }));
  }, [brandTypeOptionsQuery.data]);
  const remarkOptions = useMemo(
    () => remarkOptionsQuery.data ?? [],
    [remarkOptionsQuery.data],
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

  const formBrandTypeOptions = useMemo(() => {
    if (form.brandType && !brandTypeOptions.some((o) => o.value === form.brandType)) {
      return [{ label: form.brandType, value: form.brandType }, ...brandTypeOptions];
    }
    return brandTypeOptions;
  }, [brandTypeOptions, form.brandType]);

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toBrandRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "brands",
        notFoundMessage: "Brand list endpoint not found.",
        serverMessage: "Server error while loading brands.",
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
        msg: getErrorMessage(detailQuery.error, "Failed to load brand details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toBrandRecord(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(BRAND_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: BrandRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.brandUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "Brand id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    toggleStatusMutation.mutate(id, {
      onSuccess: () => {
        setToast({
          msg: `Brand status updated to ${nextActive ? "Active" : "Inactive"}`,
          type: "success",
        });
      },
      onError: (error) => {
        setToast({
          msg: getErrorMessage(error, "Failed to update brand status."),
          type: "error",
        });
      },
      onSettled: () => {
        setStatusTarget(null);
      },
    });
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_BRAND_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: BrandRecord) => {
    setForm(brandToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: BrandRecord) => {
    if (!row.brandUuid) {
      setToast({ msg: "Brand id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.brandUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<BrandRecord>[] = useMemo(
    () => [
      {
        key: "brandName",
        header: "Brand Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: brandNameOptions,
        width: "250px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="text-xs font-semibold text-brand-700 hover:underline text-left"
          >
            {row.brandName}
          </button>
        ),
      },
      {
        key: "brandType",
        header: "Brand Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: brandTypeOptions,
        width: "160px",
      },
      {
        key: "remark",
        header: "Remark",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: remarkOptions,
        width: "320px",
        render: (val) => (
          <span className="text-xs text-muted-foreground">{val ? String(val) : "—"}</span>
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
      brandNameOptions,
      brandTypeOptions,
      remarkOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<BrandRecord>[] = [
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
      const aVal = String(a[sort.key as keyof BrandRecord] ?? "").toLowerCase();
      const bVal = String(b[sort.key as keyof BrandRecord] ?? "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort, ordering]);

  const persist = () => {
    const fieldErrors = validateBrandApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(
        {
          brand_name: form.brandName,
          brand_type: form.brandType,
          remark: form.remark || null,
        },
        {
          onSuccess: () => {
            setToast({ msg: "Brand added successfully", type: "success" });
            setPage(1);
            closeSheet();
          },
          onError: (error) => {
            setFormError(getErrorMessage(error, "Failed to create brand."));
          },
        },
      );
      return;
    }

    if (!active?.brandUuid) {
      setFormError("Brand id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      {
        id: active.brandUuid,
        payload: {
          brand_name: form.brandName,
          brand_type: form.brandType,
          remark: form.remark || null,
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Brand updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update brand."));
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
          setToast({ msg: "Brands exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export brands"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Brand"
      : sheetMode === "edit"
        ? "Edit Brand"
        : "View Brand";

  const viewDrawer = active
    ? {
        title: active.brandName,
        subtitle: active.brandType || "Read-only brand details",
        status: active.status,
        basicInfo: [
          { label: "Brand Type", value: active.brandType || "—" },
          { label: "Remark", value: active.remark?.trim() ? active.remark : "—" },
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
    : { title: "Brand", basicInfo: [] };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <ListingContainer
      title="Brand Master"
      titleIcon={Tag}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<BrandRecord>
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
        addLabel="Add Brand"
        onExport={handleExport}
        emptyMessage="brands"
        searchPlaceholder="Search brand name, type, remark..."
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
        icon={Tag}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Brand Details
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Define brand name, type, and remark.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Brand Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.brandName}
                    onChange={(e) => {
                      setForm({ ...form, brandName: e.target.value });
                      if (errors.brandName) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.brandName;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. AgroChem"
                    className={cn(inputCls("brandName"), "bg-background")}
                  />
                  {errors.brandName && (
                    <p className="text-[11px] text-red-500">{errors.brandName}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Brand Type <span className="text-red-500">*</span>
                  </Label>
                  <AutocompleteSelect
                    options={formBrandTypeOptions}
                    value={form.brandType}
                    onChange={(v) => {
                      setForm({ ...form, brandType: v });
                      if (errors.brandType) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.brandType;
                          return copy;
                        });
                      }
                    }}
                    placeholder="Select brand type"
                    error={!!errors.brandType}
                    className="h-8 text-xs rounded-lg"
                  />
                  {errors.brandType && (
                    <p className="text-[11px] text-red-500">{errors.brandType}</p>
                  )}
                </div>

                <div className="space-y-1">
                  <Label className="text-xs font-medium">Remark</Label>
                  <Textarea
                    value={form.remark}
                    onChange={(e) => setForm({ ...form, remark: e.target.value })}
                    placeholder="Additional remarks..."
                    className="min-h-[96px] text-xs resize-none rounded-lg"
                  />
                </div>
              </div>
            </div>
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
              {statusTarget?.status === "active" ? "Deactivate Brand?" : "Activate Brand?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.brandName}</strong> will be
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
