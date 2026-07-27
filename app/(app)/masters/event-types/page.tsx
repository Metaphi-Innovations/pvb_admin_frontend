"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  CheckCircle2,
  Edit2,
  Eye,
  CalendarDays,
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
  DEFAULT_EVENT_TYPE_FORM,
  eventTypeToForm,
  toEventTypeRecord,
  validateEventTypeApiForm,
  type EventTypeForm,
  type EventTypeRecord,
} from "./event-type-data";
import { sortStateToOrdering } from "@/services/event-type-list.service";
import {
  useEventTypes,
  useEventType,
  useCreateEventType,
  useUpdateEventType,
  useToggleEventTypeStatus,
  useExportEventTypes,
  useEventTypeFilterDropdown,
} from "@/hooks/masters";
import {
  MASTER_FILTER_FIELD_MAPS,
  mergeListRequestFilters,
  resolveListStatus,
} from "@/lib/masters/list-api-filters";
import { useAppliedListFilters } from "@/lib/masters/use-applied-list-filters";
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
const EVENT_TYPE_TAB_KEY = "event-type-list-status-tab";

const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(EVENT_TYPE_TAB_KEY);
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

export default function EventTypeMasterPage() {
  const {
    draftFilters: filters,
    setDraftFilters: setFilters,
    appliedFilters,
    applyFilters,
    appliedSearch,
  } = useAppliedListFilters();
  const [sort, setSort] = useState<SortState>({ key: "eventTypeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [viewId, setViewId] = useState<string | null>(null);

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<EventTypeRecord | null>(null);
  const [form, setForm] = useState<EventTypeForm>(DEFAULT_EVENT_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<EventTypeRecord | null>(null);

  const ordering = useMemo(
    () => sortStateToOrdering(sort.key, sort.direction),
    [sort.key, sort.direction],
  );
  const apiFilters = useMemo(
    () =>
      mergeListRequestFilters(appliedFilters, MASTER_FILTER_FIELD_MAPS.eventType, {
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

  const listQuery = useEventTypes(listParams);
  const detailQuery = useEventType(viewId);
  const createMutation = useCreateEventType();
  const updateMutation = useUpdateEventType();
  const toggleStatusMutation = useToggleEventTypeStatus();
  const exportMutation = useExportEventTypes();

  const eventTypeNameOptionsQuery = useEventTypeFilterDropdown("event_type_name");
  const remarkOptionsQuery = useEventTypeFilterDropdown("remark");
  const statusOptionsQuery = useEventTypeFilterDropdown("is_active");
  const createdByOptionsQuery = useEventTypeFilterDropdown("created_by_user__username");
  const updatedByOptionsQuery = useEventTypeFilterDropdown("updated_by_user__username");

  const eventTypeNameOptions = useMemo(
    () => eventTypeNameOptionsQuery.data ?? [],
    [eventTypeNameOptionsQuery.data],
  );
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

  const records = useMemo(
    () => (listQuery.data?.items ?? []).map(toEventTypeRecord),
    [listQuery.data],
  );
  const totalRecords = listQuery.data?.total ?? 0;
  const loading = listQuery.isFetching;
  const listError = listQuery.isError
    ? getMasterListErrorMessage(listQuery.error, {
        resource: "event types",
        notFoundMessage: "Event type list endpoint not found.",
        serverMessage: "Server error while loading event types.",
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
    if (!viewId) return;
    if (detailQuery.isError) {
      setToast({
        msg: getErrorMessage(detailQuery.error, "Failed to load event type details."),
        type: "error",
      });
      setViewId(null);
      return;
    }
    if (detailQuery.data) {
      setActive(toEventTypeRecord(detailQuery.data));
      setSheetMode("view");
    }
  }, [viewId, detailQuery.data, detailQuery.isError, detailQuery.error]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(EVENT_TYPE_TAB_KEY, next);
    setPage(1);
  };

  const requestStatusToggle = (record: EventTypeRecord) => {
    setStatusTarget(record);
  };

  const confirmStatusChange = () => {
    const id = statusTarget?.eventTypeUuid;
    if (!statusTarget || !id) {
      setToast({ msg: "Event type id missing. Unable to update status.", type: "error" });
      setStatusTarget(null);
      return;
    }

    const nextActive = statusTarget.status !== "active";

    toggleStatusMutation.mutate(id, {
      onSuccess: () => {
        setToast({
          msg: `Event type status updated to ${nextActive ? "Active" : "Inactive"}`,
          type: "success",
        });
      },
      onError: (error) => {
        setToast({
          msg: getErrorMessage(error, "Failed to update event type status."),
          type: "error",
        });
      },
      onSettled: () => {
        setStatusTarget(null);
      },
    });
  };

  const openAdd = () => {
    setForm({ ...DEFAULT_EVENT_TYPE_FORM });
    setErrors({});
    setFormError(null);
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: EventTypeRecord) => {
    setForm(eventTypeToForm(row));
    setErrors({});
    setFormError(null);
    setActive(row);
    setSheetMode("edit");
  };

  const openView = useCallback((row: EventTypeRecord) => {
    if (!row.eventTypeUuid) {
      setToast({ msg: "Event type id missing. Unable to load details.", type: "error" });
      return;
    }
    setViewId(row.eventTypeUuid);
  }, []);

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setViewId(null);
    setErrors({});
    setFormError(null);
  };

  const columns: ColumnConfig<EventTypeRecord>[] = useMemo(
    () => [
      {
        key: "eventTypeName",
        header: "Event Type",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: eventTypeNameOptions,
        width: "250px",
        render: (_val, row) => (
          <button
            type="button"
            onClick={() => openView(row)}
            className="text-xs font-semibold text-brand-700 hover:underline text-left"
          >
            {row.eventTypeName}
          </button>
        ),
      },
      {
        key: "remark",
        header: "Remark",
        sortable: true,
        filterable: true,
        filterType: "dropdown",
        filterOptions: remarkOptions,
        width: "350px",
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
      eventTypeNameOptions,
      remarkOptions,
      statusOptions,
      createdByOptions,
      updatedByOptions,
      openView,
    ],
  );

  const actions: ActionItemConfig<EventTypeRecord>[] = [
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
      const aVal = String(a[sort.key as keyof EventTypeRecord] ?? "").toLowerCase();
      const bVal = String(b[sort.key as keyof EventTypeRecord] ?? "").toLowerCase();
      const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
      return sort.direction === "asc" ? cmp : -cmp;
    });
  }, [records, sort, ordering]);

  const persist = () => {
    const fieldErrors = validateEventTypeApiForm(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    if (sheetMode === "add") {
      setFormError(null);
      createMutation.mutate(
        {
          event_type_name: form.eventTypeName,
          remark: form.remark || null,
        },
        {
          onSuccess: () => {
            setToast({ msg: "Event type added successfully", type: "success" });
            setPage(1);
            closeSheet();
          },
          onError: (error) => {
            setFormError(getErrorMessage(error, "Failed to create event type."));
          },
        },
      );
      return;
    }

    if (!active?.eventTypeUuid) {
      setFormError("Event type id missing. Unable to update.");
      return;
    }

    setFormError(null);
    updateMutation.mutate(
      {
        id: active.eventTypeUuid,
        payload: {
          event_type_name: form.eventTypeName,
          remark: form.remark || null,
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Event type updated successfully", type: "success" });
          closeSheet();
        },
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update event type."));
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
          setToast({ msg: "Event types exported successfully", type: "success" });
        },
        onError: (error) => {
          setToast({
            msg: getErrorMessage(error, "Failed to export event types"),
            type: "error",
          });
        },
      },
    );
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Event Type"
      : sheetMode === "edit"
        ? "Edit Event Type"
        : "View Event Type";

  const viewDrawer = active
    ? {
        title: active.eventTypeName,
        subtitle: "Read-only event type details",
        status: active.status,
        basicInfo: [
          {
            label: "Remark",
            value: active.remark?.trim() ? active.remark : "—",
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
    : { title: "Event Type", basicInfo: [] };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <ListingContainer
      title="Event Type Master"
      titleIcon={CalendarDays}
      tabs={STATUS_TABS.map((t) => ({
        value: t.value,
        label: t.value === statusTab ? `${t.label} (${totalRecords})` : t.label,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      {listError ? <p className="mb-2 text-xs text-red-600">{listError}</p> : null}

      <MasterListing<EventTypeRecord>
        columns={columns}
        data={displayRecords}
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
        addLabel="Add Event Type"
        onExport={handleExport}
        emptyMessage="event types"
        searchPlaceholder="Search event type name, remark..."
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
        icon={CalendarDays}
        formError={formError ?? undefined}
        saving={saving}
        viewDrawer={viewDrawer}
        formContent={
          sheetMode !== "view" ? (
            <div className="space-y-4">
              <div className="space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Event Type Details
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Define event type name and remark.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs font-medium">
                    Event Type Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={form.eventTypeName}
                    onChange={(e) => {
                      setForm({ ...form, eventTypeName: e.target.value });
                      if (errors.eventTypeName) {
                        setErrors((prev) => {
                          const copy = { ...prev };
                          delete copy.eventTypeName;
                          return copy;
                        });
                      }
                    }}
                    placeholder="e.g. Farmer Meeting"
                    className={cn(inputCls("eventTypeName"), "bg-background")}
                  />
                  {errors.eventTypeName && (
                    <p className="text-[11px] text-red-500">{errors.eventTypeName}</p>
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
              {statusTarget?.status === "active"
                ? "Deactivate Event Type?"
                : "Activate Event Type?"}
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {statusTarget && (
                <>
                  <strong className="text-foreground">{statusTarget.eventTypeName}</strong>{" "}
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
