"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  CheckCircle2,
  X,
  Edit2,
  Percent,
  Eye,
  AlertTriangle,
} from "lucide-react";
import {
  type TcsApiRecord,
  type TcsApiForm,
  DEFAULT_TCS_API_FORM,
  tcsApiToForm,
  validateTcsApiForm,
  formatTcsRateDisplay,
  formatApplicableToLabel,
  mergeApplicableToSelectOptions,
} from "./tcs-data";
import { TcsRateInput } from "./TcsRateInput";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { sortStateToOrdering } from "@/services/tcs-list.service";
import {
  useTcsList,
  useTcs,
  useCreateTcs,
  useUpdateTcs,
  useToggleTcsStatus,
  useExportTcs,
  useTcsFilterDropdown,
  useCategoryDropdown,
} from "@/hooks/masters";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
import { useLazyFilterColumns } from "@/lib/masters/use-lazy-filter-columns";
import {
  getErrorMessage,
  getMasterListErrorMessage,
} from "@/lib/masters/master-query-errors";
import type { MasterListKeyParams } from "@/lib/masters/master-query-keys";
import { MasterListing } from "@/components/listing/MasterListing";
import {
  ColumnConfig,
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
const TCS_TAB_KEY = "tcs-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(TCS_TAB_KEY);
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

function toTcsRow(item: {
  id: number;
  tcsUuid: string;
  sectionName: string;
  tcsRate: string;
  applicableTo: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): TcsApiRecord {
  return {
    id: item.id,
    tcsUuid: item.tcsUuid,
    sectionName: item.sectionName,
    tcsRate: item.tcsRate,
    applicableTo: item.applicableTo,
    description: item.description,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

function buildApiPayload(form: TcsApiForm) {
  const rate = Number(form.tcsRate.trim().replace(/%$/, ""));
  return {
    tcs_rate: rate,
    tcs_section_name: form.sectionName.trim() || null,
    applicable_to: form.applicableTo.trim() || null,
    description: form.description.trim() || null,
  };
}

export default function TcsPageClient() {
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const { handleOpenFilter, isFilterOpen } = useLazyFilterColumns();
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<TcsApiRecord | null>(null);
  const [form, setForm] = useState<TcsApiForm>(DEFAULT_TCS_API_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<TcsApiRecord | null>(null);

  const categoryQuery = useCategoryDropdown();

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.tcs, {
        statusTab,
      }),
    [appliedFilters, statusTab],
  );
  const listStatus = useMemo(
    () => resolveListStatus(appliedFilters, statusTab),
    [appliedFilters, statusTab],
  );

  const listParams = useMemo<MasterListKeyParams>(
    () => ({
      page,
      pageSize,
      search: appliedSearch,
      status: listStatus,
      apiFilters,
      ordering,
    }),
    [page, pageSize, appliedSearch, listStatus, apiFilters, ordering],
  );

  const listQuery = useTcsList(listParams);
  const detailQuery = useTcs(viewId);
  const createMutation = useCreateTcs();
  const updateMutation = useUpdateTcs();
  const toggleStatusMutation = useToggleTcsStatus();
  const exportMutation = useExportTcs();

  const sectionNameOptionsQuery = useTcsFilterDropdown("tcs_section_name", {
    enabled: isFilterOpen("sectionName"),
  });
  const tcsRateOptionsQuery = useTcsFilterDropdown("tcs_rate", { enabled: isFilterOpen("tcsRate") });
  const applicableToOptionsQuery = useTcsFilterDropdown("applicable_to", {
    enabled: isFilterOpen("applicableTo"),
  });
  const descriptionOptionsQuery = useTcsFilterDropdown("description", {
    enabled: isFilterOpen("description"),
  });
  const statusOptionsQuery = useTcsFilterDropdown("is_active", { enabled: isFilterOpen("status") });
  const createdByOptionsQuery = useTcsFilterDropdown("created_by_user__username", {
    enabled: isFilterOpen("createdBy"),
  });
  const updatedByOptionsQuery = useTcsFilterDropdown("updated_by_user__username", {
    enabled: isFilterOpen("updatedBy"),
  });

  const sectionNameOptions = useMemo(
    () => sectionNameOptionsQuery.data ?? [],
    [sectionNameOptionsQuery.data],
  );
  const tcsRateOptions = useMemo(
    () => tcsRateOptionsQuery.data ?? [],
    [tcsRateOptionsQuery.data],
  );
  const applicableOptions = useMemo(
    () =>
      mergeApplicableToSelectOptions(
        categoryQuery.data ?? [],
        form.applicableTo,
        applicableToOptionsQuery.data,
      ),
    [categoryQuery.data, form.applicableTo, applicableToOptionsQuery.data],
  );
  const applicableToFilterOptions = useMemo(
    () =>
      mergeApplicableToSelectOptions(
        categoryQuery.data ?? [],
        undefined,
        applicableToOptionsQuery.data,
      ),
    [categoryQuery.data, applicableToOptionsQuery.data],
  );
  const descriptionOptions = useMemo(
    () => descriptionOptionsQuery.data ?? [],
    [descriptionOptionsQuery.data],
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
    () => (listQuery.data?.items ?? []).map(toTcsRow),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "TCS records",
        notFoundMessage: "TCS list endpoint not found.",
        serverMessage: "Server error while loading TCS records.",
      })
    : null;
  const viewLoading = Boolean(viewId) && detailQuery.isFetching;
  const saving = createMutation.isPending || updateMutation.isPending;

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
  }, [appliedSearch, apiFilters, pageSize, statusTab, sort.key, sort.direction]);

  useEffect(() => {
    const maxPage = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [totalRecords, pageSize, page]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load TCS details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toTcsRow(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(TCS_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: TcsApiRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.tcsUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "TCS id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    toggleStatusMutation.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `TCS status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update TCS status."),
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
    setForm({ ...DEFAULT_TCS_API_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: TcsApiRecord) => {
    setForm(tcsApiToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: TcsApiRecord) => {
    if (!row.tcsUuid) {
      setToast({ msg: "TCS id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.tcsUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<TcsApiRecord>[] = useMemo(
    () => [
      {
        key: "sectionName",
        header: "Section Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: sectionNameOptions,
        width: "180px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="text-xs font-medium text-brand-700 hover:underline text-left"
          >
            {row.sectionName || "—"}
          </button>
        ),
      },
      {
        key: "tcsRate",
        header: "TCS Rate",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: tcsRateOptions,
        width: "90px",
        render: (_val, row) => (
          <span className="text-xs font-semibold text-foreground">
            {formatTcsRateDisplay(row.tcsRate)}
          </span>
        ),
      },
      {
        key: "applicableTo",
        header: "Applicable To",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: applicableToFilterOptions,
        width: "140px",
        render: (_val, row) => (
          <span className="text-xs text-muted-foreground">
            {formatApplicableToLabel(row.applicableTo)}
          </span>
        ),
      },
      {
        key: "description",
        header: "Description",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: descriptionOptions,
        width: "180px",
        render: (val) => (
          <span className="text-xs text-muted-foreground line-clamp-2">
            {val ? String(val) : "—"}
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
      sectionNameOptions,
      tcsRateOptions,
      applicableToFilterOptions,
      descriptionOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<TcsApiRecord>[] = [
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

  const persist = () => {
    const fieldErrors = validateTcsApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = buildApiPayload(form);

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(payload, {
        onSuccess: () => {
          setToast({ msg: "TCS section added successfully", type: "success" });
          setPage(1);
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to create TCS record."));
        },
      });
      return;
    }

    if (!active?.tcsUuid) {
      setFormError("TCS id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      { id: active.tcsUuid, payload },
      {
        onSuccess: () => {
          setToast({ msg: "TCS section updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update TCS record."));
        },
      },
    );
  };

  const handleExport = () => {
    exportMutation.mutate(
      {
        search: appliedSearch,
        status: listStatus,
        ordering,
        apiFilters,
      },
      {
        onSuccess: () => {
          setToast({ msg: "TCS records exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export TCS records"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add TCS Section"
      : sheetMode === "edit"
        ? "Edit TCS Section"
        : "View TCS Section";

  const viewDrawer = active
    ? {
        title: active.sectionName || "TCS Section",
        subtitle: formatTcsRateDisplay(active.tcsRate),
        status: active.status,
        basicInfo: [
          { label: "Section Name", value: active.sectionName || "—" },
          { label: "TCS Rate", value: formatTcsRateDisplay(active.tcsRate) },
          { label: "Applicable To", value: formatApplicableToLabel(active.applicableTo) },
        ],
        showDescription: !!active.description?.trim(),
        description: active.description,
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
    : { title: "TCS", basicInfo: [] };

  return (
    <ListingContainer
      title="TCS Master"
      titleIcon={Percent}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<TcsApiRecord>
        rowKey={(row) => row.tcsUuid || String(row.id)}
        columns={columns}
        data={records}
        loading={loading}
        totalRecords={totalRecords}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={(next) => {
          setFilters(next);
          applyFilters(next);
        }}
        actions={actions}
        onAdd={openAdd}
        addLabel="Add TCS"
        onExport={handleExport}
        emptyMessage="TCS sections"
        searchPlaceholder="Search section, rate, category..."
        currentFilters={filters}
        currentSort={sort}
        onOpenFilter={handleOpenFilter}
      />

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Percent}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <MasterFormGrid>
              <MasterField label="TCS Rate %" required error={errors.tcsRate}>
                <TcsRateInput
                  className={compactInput()}
                  value={form.tcsRate}
                  onChange={(value) => setForm((prev) => ({ ...prev, tcsRate: value }))}
                  placeholder="e.g. 1"
                />
              </MasterField>

              <MasterField label="TCS Section Name" className="sm:col-span-2">
                <Input
                  className={compactInput()}
                  value={form.sectionName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sectionName: e.target.value }))
                  }
                  placeholder="e.g. 206C(1H)"
                />
              </MasterField>

              <MasterField label="Applicable To" className="sm:col-span-2">
                <AutocompleteSelect
                  options={applicableOptions}
                  value={form.applicableTo}
                  onChange={(value) =>
                    setForm((prev) => ({
                      ...prev,
                      applicableTo: typeof value === "string" ? value : "",
                    }))
                  }
                  placeholder={
                    categoryQuery.isFetching ? "Loading categories..." : "Select category"
                  }
                  searchPlaceholder="Search categories..."
                  disabled={categoryQuery.isFetching}
                  className="h-8 text-xs"
                />
              </MasterField>

              <MasterField label="Description" className="sm:col-span-2">
                <Textarea
                  className="min-h-[72px] text-xs"
                  value={form.description}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  placeholder="Optional description"
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
              {statusTarget?.status === "active" ? "Deactivate TCS?" : "Activate TCS?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">
                    {statusTarget.sectionName || "TCS section"}
                  </strong>{" "}
                  will be marked as{" "}
                  {statusTarget.status === "active" ? "inactive" : "active"}.
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
