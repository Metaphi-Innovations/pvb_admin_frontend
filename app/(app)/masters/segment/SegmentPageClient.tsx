"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Edit2,
  Eye,
  PieChart,
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
import { MasterFormGrid } from "@/components/masters/MasterModule";
import { MasterListingSheets } from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_SEGMENT_FORM,
  segmentToForm,
  validateSegmentApiForm,
  type SegmentForm,
  type SegmentRecord,
} from "./segment-data";
import {
  SegmentListService,
  sortStateToOrdering,
} from "@/services/segment-list.service";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useDebouncedFilters } from "@/lib/masters/use-debounced-filters";
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
const SEGMENT_TAB_KEY = "segment-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(SEGMENT_TAB_KEY);
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

function toSegmentRow(item: {
  id: number;
  segmentUuid: string;
  segmentName: string;
  segmentCode: string;
  description: string;
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): SegmentRecord {
  return {
    id: item.id,
    segmentUuid: item.segmentUuid,
    segmentName: item.segmentName,
    segmentCode: item.segmentCode,
    description: item.description,
    status: item.status,
    createdBy: item.createdBy || "—",
    createdAt: item.createdAt,
    updatedBy: item.updatedBy || "—",
    updatedAt: item.updatedAt,
  };
}

export default function SegmentMasterPage() {
  const [records, setRecords] = useState<SegmentRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterState>({});
  const { debouncedFilters, debouncedSearch, isDebouncing } = useDebouncedFilters(filters);
  const [sort, setSort] = useState<SortState>({ key: "segmentName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [reloadKey, setReloadKey] = useState(0);
  const [viewLoading, setViewLoading] = useState(false);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<SegmentRecord | null>(null);
  const [form, setForm] = useState<SegmentForm>(DEFAULT_SEGMENT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusTarget, setStatusTarget] = useState<SegmentRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(debouncedFilters, MASTER_FILTER_FIELD_MAPS.segment, {
        statusTab,
      }),
    [debouncedFilters, statusTab],
  );
  const listStatus = useMemo(
    () => resolveListStatus(debouncedFilters, statusTab),
    [debouncedFilters, statusTab],
  );

  useEffect(() => {
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError(null);

    SegmentListService.list({
      page,
      pageSize,
      search: debouncedSearch,
      ordering,
      status: listStatus,
      apiFilters,
      signal: controller.signal,
    })
      .then((result) => {
        setRecords(result.items.map(toSegmentRow));
        setTotalRecords(result.total);
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        const err = error as { status?: number; message?: string } | undefined;
        const message =
          err?.status === 401
            ? "Unauthorized. Please login again."
            : err?.status === 403
              ? "Forbidden. You do not have access."
              : err?.status === 404
                ? "Segment list endpoint not found."
                : err?.status === 500
                  ? "Server error while loading segments."
                  : SegmentListService.extractErrorMessage(
                      error,
                      "Unable to load segments.",
                    );
        setListError(message);
        setRecords([]);
        setTotalRecords(0);
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [page, pageSize, debouncedSearch, ordering, apiFilters, listStatus, reloadKey]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, apiFilters, pageSize, statusTab, sort.key, sort.direction]);

  const isFiltering = isDebouncing;

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(SEGMENT_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: SegmentRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = async () => {
    if (!statusTarget?.segmentUuid) {
      setToast({ msg: "Segment id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    try {
      await SegmentListService.updateStatus(statusTarget.segmentUuid, nextActive);
      setToast({
        msg: `Segment status updated to ${nextActive ? "Active" : "Inactive"}`,
        type: "success",
      });
      setReloadKey((prev) => prev + 1);
    } catch (error: unknown) {
      setToast({
        msg: SegmentListService.extractErrorMessage(
          error,
          "Failed to update segment status.",
        ),
        type: "error",
      });
    } finally {
      setStatusTarget(null);
    }
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_SEGMENT_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: SegmentRecord) => {
    setForm(segmentToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback(async (row: SegmentRecord) => {
    if (!row.segmentUuid) {
      setToast({ msg: "Segment id missing. Unable to load details.", type: "error" });
      return;
    }

    try {
      setViewLoading(true);
      const detail = await SegmentListService.view(row.segmentUuid);
      setActive(toSegmentRow(detail));
      setSheetMode("view");
    } catch (error: unknown) {
      setToast({
        msg: SegmentListService.extractErrorMessage(
          error,
          "Failed to load segment details.",
        ),
        type: "error",
      });
    } finally {
      setViewLoading(false);
    }
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<SegmentRecord>[] = [
    {
      key: "segmentName",
      header: "Segment Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "200px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="text-xs font-semibold text-brand-700 hover:underline text-left"
        >
          {row.segmentName}
        </button>
      ),
    },
    {
      key: "description",
      header: "Description",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "280px",
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
      filterOptions: [
        { label: "Active", value: "active" },
        { label: "Inactive", value: "inactive" },
      ],
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
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.updatedBy} date={row.updatedAt} />
      ),
    },
  ];

  const actions: ActionItemConfig<SegmentRecord>[] = [
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
      const aVal = String(a[sort.key as keyof SegmentRecord] ?? "").toLowerCase();
      const bVal = String(b[sort.key as keyof SegmentRecord] ?? "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort, ordering]);

  const persist = async () => {
    const fieldErrors = validateSegmentApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (sheetMode === "add") {
      try {
        setSaving(true);
        setFormError(null);
        await SegmentListService.create({
          segment_name: form.segmentName,
          description: form.description || null,
        });
        setToast({ msg: "Segment added successfully", type: "success" });
        setPage(1);
        setReloadKey((prev) => prev + 1);
        closeSheet();
      } catch (error: unknown) {
        setFormError(
          SegmentListService.extractErrorMessage(error, "Failed to create segment."),
        );
      } finally {
        setSaving(false);
      }
      return;
    }

    if (!active?.segmentUuid) {
      setFormError("Segment id missing. Unable to update.");
      return;
    }

    try {
      setSaving(true);
      setFormError(null);
      await SegmentListService.update(active.segmentUuid, {
        segment_name: form.segmentName,
        description: form.description || null,
      });
      setToast({ msg: "Segment updated successfully", type: "success" });
      setReloadKey((prev) => prev + 1);
      closeSheet();
    } catch (error: unknown) {
      setFormError(
        SegmentListService.extractErrorMessage(error, "Failed to update segment."),
      );
    } finally {
      setSaving(false);
    }
  };

  const handleExport = async () => {
    try {
      await SegmentListService.export({
        search: debouncedSearch,
        status: listStatus,
        ordering,
        apiFilters,
      });
      setToast({ msg: "Segments exported successfully", type: "success" });
    } catch (error: unknown) {
      setToast({
        msg: SegmentListService.extractErrorMessage(error, "Failed to export segments"),
        type: "error",
      });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Segment"
      : sheetMode === "edit"
        ? "Edit Segment"
        : "View Segment";

  const viewDrawer = active
    ? {
        title: active.segmentName,
        subtitle: active.segmentCode || "Read-only segment details",
        status: active.status,
        basicInfo: [
          { label: "Segment Code", value: active.segmentCode || "—", mono: true },
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
    : { title: "Segment", basicInfo: [] };

  return (
    <ListingContainer
      title="Segment Master"
      titleIcon={PieChart}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<SegmentRecord>
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
        addLabel="Add Segment"
        onExport={handleExport}
        emptyMessage="segments"
        searchPlaceholder="Search segment name or description..."
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
        icon={PieChart}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <MasterFormGrid>
              <NameCodeDescriptionFields
                form={{
                  name: form.segmentName,
                  code: form.segmentCode,
                  description: form.description,
                }}
                setForm={(u) =>
                  setForm((prev) => {
                    const n =
                      typeof u === "function"
                        ? u({
                            name: prev.segmentName,
                            code: prev.segmentCode,
                            description: prev.description,
                          })
                        : u;
                    return {
                      ...prev,
                      segmentName: n.name,
                      segmentCode: n.code,
                      description: n.description,
                    };
                  })
                }
                errors={{
                  name: errors.segmentName,
                }}
                labels={{ name: "Segment Name", code: "Segment Code" }}
                hideCode={sheetMode === "add"}
                codeDisabled
              />
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
              {statusTarget?.status === "active" ? "Deactivate Segment?" : "Activate Segment?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.segmentName}</strong>{" "}
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
