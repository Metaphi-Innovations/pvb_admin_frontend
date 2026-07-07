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
  type TdsApiRecord,
  type TdsApiForm,
  DEFAULT_TDS_API_FORM,
  tdsApiToForm,
  validateTdsApiForm,
  formatTdsRateDisplay,
  formatApplicableToLabel,
  mergeApplicableToSelectOptions,
} from "./tds-data";
import { TdsRateInput } from "./TdsRateInput";
import { MasterFormGrid, MasterField, compactInput } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { sortStateToOrdering } from "@/services/tds-list.service";
import {
  useTdsList,
  useTds,
  useCreateTds,
  useUpdateTds,
  useToggleTdsStatus,
  useExportTds,
  useTdsFilterDropdown,
  useCategoryDropdown,
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
const TDS_TAB_KEY = "tds-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(TDS_TAB_KEY);
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

function toTdsRow(item: {
  id: number;
  tdsUuid: string;
  sectionCode: string;
  sectionName: string;
  tdsRate: string;
  applicableTo: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): TdsApiRecord {
  return {
    id: item.id,
    tdsUuid: item.tdsUuid,
    sectionCode: item.sectionCode,
    sectionName: item.sectionName,
    tdsRate: item.tdsRate,
    applicableTo: item.applicableTo,
    description: item.description,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

function buildApiPayload(form: TdsApiForm) {
  const rate = Number(form.tdsRate.trim().replace(/%$/, ""));
  return {
    tds_rate: rate,
    tds_section_name: form.sectionName.trim() || null,
    applicable_to: form.applicableTo.trim() || null,
    description: form.description.trim() || null,
  };
}

export default function TdsPageClient() {
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "sectionCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<TdsApiRecord | null>(null);
  const [form, setForm] = useState<TdsApiForm>(DEFAULT_TDS_API_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<TdsApiRecord | null>(null);

  const categoryQuery = useCategoryDropdown();

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.tds, {
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

  const listQuery = useTdsList(listParams);
  const detailQuery = useTds(viewId);
  const createMutation = useCreateTds();
  const updateMutation = useUpdateTds();
  const toggleStatusMutation = useToggleTdsStatus();
  const exportMutation = useExportTds();

  const sectionCodeOptionsQuery = useTdsFilterDropdown("tds_code");
  const sectionNameOptionsQuery = useTdsFilterDropdown("tds_section_name");
  const tdsRateOptionsQuery = useTdsFilterDropdown("tds_rate");
  const applicableToOptionsQuery = useTdsFilterDropdown("applicable_to");
  const descriptionOptionsQuery = useTdsFilterDropdown("description");
  const statusOptionsQuery = useTdsFilterDropdown("is_active");
  const createdByOptionsQuery = useTdsFilterDropdown("created_by_user__username");
  const updatedByOptionsQuery = useTdsFilterDropdown("updated_by_user__username");

  const sectionCodeOptions = useMemo(
    () => sectionCodeOptionsQuery.data ?? [],
    [sectionCodeOptionsQuery.data],
  );
  const sectionNameOptions = useMemo(
    () => sectionNameOptionsQuery.data ?? [],
    [sectionNameOptionsQuery.data],
  );
  const tdsRateOptions = useMemo(
    () => tdsRateOptionsQuery.data ?? [],
    [tdsRateOptionsQuery.data],
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
    () => (listQuery.data?.items ?? []).map(toTdsRow),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "TDS records",
        notFoundMessage: "TDS list endpoint not found.",
        serverMessage: "Server error while loading TDS records.",
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
    const maxPage = Math.max(1, Math.ceil(totalRecords / pageSize));
    if (page > maxPage) setPage(maxPage);
  }, [totalRecords, pageSize, page]);

  useEffect(() => {
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load TDS details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toTdsRow(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(TDS_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: TdsApiRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.tdsUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "TDS id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    toggleStatusMutation.mutate(
      { id, isActive: nextActive },
      {
        onSuccess: () => {
          setToast({
            msg: `TDS status updated to ${nextActive ? "Active" : "Inactive"}`,
            type: "success",
          });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to update TDS status."),
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
    setForm({ ...DEFAULT_TDS_API_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: TdsApiRecord) => {
    setForm(tdsApiToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: TdsApiRecord) => {
    if (!row.tdsUuid) {
      setToast({ msg: "TDS id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.tdsUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<TdsApiRecord>[] = useMemo(
    () => [
      {
        key: "sectionCode",
        header: "TDS Code",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: sectionCodeOptions,
        width: "110px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="font-mono text-xs font-semibold text-brand-700 hover:underline"
          >
            {row.sectionCode}
          </button>
        ),
      },
      {
        key: "sectionName",
        header: "Section Name",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: sectionNameOptions,
        width: "200px",
        render: (_val, row) => (
          <span className="text-xs font-medium text-foreground">{row.sectionName || "—"}</span>
        ),
      },
      {
        key: "tdsRate",
        header: "TDS Rate",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: tdsRateOptions,
        width: "100px",
        render: (_val, row) => (
          <span className="text-xs font-semibold text-foreground">
            {formatTdsRateDisplay(row.tdsRate)}
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
        width: "160px",
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
        width: "200px",
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
      sectionCodeOptions,
      sectionNameOptions,
      tdsRateOptions,
      applicableToFilterOptions,
      descriptionOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<TdsApiRecord>[] = [
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
    const fieldErrors = validateTdsApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    const payload = buildApiPayload(form);

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(payload, {
        onSuccess: () => {
          setToast({ msg: "TDS section added successfully", type: "success" });
          setPage(1);
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to create TDS record."));
        },
      });
      return;
    }

    if (!active?.tdsUuid) {
      setFormError("TDS id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      { id: active.tdsUuid, payload },
      {
        onSuccess: () => {
          setToast({ msg: "TDS section updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update TDS record."));
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
          setToast({ msg: "TDS records exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export TDS records"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add TDS Section"
      : sheetMode === "edit"
        ? "Edit TDS Section"
        : "View TDS Section";

  const viewDrawer = active
    ? {
        title: active.sectionCode,
        subtitle: active.sectionName || "Read-only TDS details",
        status: active.status,
        basicInfo: [
          { label: "TDS Code", value: active.sectionCode, mono: true },
          { label: "Section Name", value: active.sectionName || "—" },
          { label: "TDS Rate", value: formatTdsRateDisplay(active.tdsRate) },
          {
            label: "Applicable To",
            value: formatApplicableToLabel(active.applicableTo),
          },
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
    : { title: "TDS", basicInfo: [] };

  return (
    <ListingContainer
      title="TDS Master"
      titleIcon={Percent}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<TdsApiRecord>
        rowKey={(row) => row.tdsUuid || String(row.id)}
        columns={columns}
        data={records}
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
        addLabel="Add TDS"
        onExport={handleExport}
        emptyMessage="TDS sections"
        searchPlaceholder="Search TDS code, section name, rate..."
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
        icon={Percent}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <MasterFormGrid>
              {sheetMode === "edit" && active ? (
                <MasterField label="TDS Code" className="sm:col-span-2">
                  <Input
                    className={cn(compactInput(), "font-mono bg-muted/30")}
                    value={active.sectionCode}
                    disabled
                    readOnly
                  />
                </MasterField>
              ) : null}

              <MasterField label="TDS Rate %" required error={errors.tdsRate}>
                <TdsRateInput
                  className={compactInput()}
                  value={form.tdsRate}
                  onChange={(value) => setForm((prev) => ({ ...prev, tdsRate: value }))}
                  placeholder="e.g. 10"
                />
              </MasterField>

              <MasterField
                label="TDS Section Name"
                className="sm:col-span-2"
              >
                <Input
                  className={compactInput()}
                  value={form.sectionName}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, sectionName: e.target.value }))
                  }
                  placeholder="e.g. Professional Fees"
                />
              </MasterField>

              <MasterField label="Category" className="sm:col-span-2">
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
                    categoryQuery.isFetching ? "Loading categories…" : "Select category"
                  }
                  searchPlaceholder="Search categories…"
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
              {statusTarget?.status === "active" ? "Deactivate TDS?" : "Activate TDS?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground font-mono">{statusTarget.sectionCode}</strong>{" "}
                  — {statusTarget.sectionName || "TDS section"} will be marked as{" "}
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
