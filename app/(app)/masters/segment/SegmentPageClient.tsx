"use client";

import React, { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  Edit2,
  Eye,
  PieChart,
  X,
  Trash2,
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
import {
  MasterListingSheets,
} from "@/components/masters/MasterListingSheets";
import { MasterDrawerSection } from "@/components/masters/MasterRecordDrawer";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  DEFAULT_SEGMENT_FORM,
  formToSegment,
  SEGMENT_SEED,
  SEGMENT_STORAGE_KEY,
  segmentToForm,
  validateSegmentForm,
  type SegmentForm,
  type SegmentRecord,
} from "./segment-data";
import {
  loadMasterRecords,
  saveMasterRecords,
  nextMasterCode,
  masterToday,
  type MasterStatus,
} from "@/lib/masters/common";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { ListingUserCell, AuditUserRow, ListingStatusToggle, isActiveStatus } from "@/components/listing";
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

export default function SegmentMasterPage() {
  const [records, setRecords] = useState<SegmentRecord[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "segmentCode", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusTab, setStatusTab] = useState<StatusTab>("all");

  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<SegmentRecord | null>(null);
  const [form, setForm] = useState<SegmentForm>(DEFAULT_SEGMENT_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<SegmentRecord | null>(null);

  useEffect(() => {
    setRecords(loadMasterRecords<SegmentRecord>(SEGMENT_STORAGE_KEY, SEGMENT_SEED));
    setStatusTab(readStoredStatusTab());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const handleStatusTabChange = (tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(SEGMENT_TAB_KEY, next);
    setPage(1);
  };

  const toggleStatus = (record: SegmentRecord) => {
    const nextStatus: MasterStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? {
            ...item,
            status: nextStatus,
            updatedBy: "Admin User",
            updatedAt: masterToday(),
          }
        : item,
    );
    setRecords(updated);
    saveMasterRecords(SEGMENT_STORAGE_KEY, updated);
    setToast({
      msg: `Segment status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const statusTabCounts = useMemo(
    () => ({
      all: records.length,
      active: records.filter((r) => r.status === "active").length,
      inactive: records.filter((r) => r.status === "inactive").length,
    }),
    [records],
  );

  const columns: ColumnConfig<SegmentRecord>[] = [
    {
      key: "segmentCode",
      header: "Segment Code",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "130px",
      render: (_val, row) => (
        <button
          type="button"
          onClick={() => openView(row)}
          className="font-mono text-xs font-semibold text-brand-700 hover:underline"
        >
          {row.segmentCode}
        </button>
      ),
    },
    {
      key: "segmentName",
      header: "Segment Name",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "200px",
      render: (_val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.segmentName}</span>
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
          onChange={() => toggleStatus(row)}
        />
      ),
    },
    {
      key: "createdBy",
      header: "Created By",
      sortable: true,
      width: "150px",
      render: (_val, row) => (
        <ListingUserCell name={row.createdBy} date={row.createdAt} />
      ),
    },
    {
      key: "updatedBy",
      header: "Updated By",
      sortable: true,
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
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => openEdit(row),
    },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  const filtered = useMemo(() => {
    let result = [...records];

    if (statusTab !== "all") {
      result = result.filter((r) => r.status === statusTab);
    }

    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.segmentCode.toLowerCase().includes(q) ||
          r.segmentName.toLowerCase().includes(q),
      );
    }

    result = applyFilters(result, filters);

    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof SegmentRecord] ?? "").toLowerCase();
        const bVal = String(b[sort.key as keyof SegmentRecord] ?? "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort, statusTab]);

  const paginated = useMemo(() => {
    const startOffset = (page - 1) * pageSize;
    return filtered.slice(startOffset, startOffset + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, statusTab]);

  const openAdd = () => {
    const codes = records.map((r) => r.segmentCode);
    const code = nextMasterCode("SEG-", codes);
    setForm({ ...DEFAULT_SEGMENT_FORM, segmentCode: code });
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: SegmentRecord) => {
    setForm(segmentToForm(row));
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: SegmentRecord) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const persist = () => {
    const mode = sheetMode === "add" ? "add" : "edit";
    const list = loadMasterRecords<SegmentRecord>(SEGMENT_STORAGE_KEY, SEGMENT_SEED);
    const fieldErrors = validateSegmentForm(
      form,
      list,
      mode === "edit" ? active?.id : undefined,
    );
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    let updatedList: SegmentRecord[];
    if (mode === "add") {
      const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
      updatedList = [...list, formToSegment(form, id)];
      setToast({ msg: "Segment added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id ? formToSegment(form, active.id, active) : r,
      );
      setToast({ msg: "Segment updated successfully", type: "success" });
    } else {
      return;
    }

    saveMasterRecords(SEGMENT_STORAGE_KEY, updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const updated = records.map((r) =>
      r.id === deleteTarget.id
        ? {
            ...r,
            status: "inactive" as MasterStatus,
            updatedBy: "Admin User",
            updatedAt: masterToday(),
          }
        : r,
    );
    saveMasterRecords(SEGMENT_STORAGE_KEY, updated);
    setRecords(updated);
    setDeleteTarget(null);
    setToast({ msg: `"${deleteTarget.segmentName}" marked as inactive`, type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = [
        "ID",
        "Segment Code",
        "Segment Name",
        "Description",
        "Status",
        "Created By",
        "Updated By",
        "Created At",
        "Updated At",
      ];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        csvRows.push(
          [
            r.id,
            `"${r.segmentCode.replace(/"/g, '""')}"`,
            `"${r.segmentName.replace(/"/g, '""')}"`,
            `"${(r.description || "").replace(/"/g, '""')}"`,
            r.status,
            r.createdBy,
            r.updatedBy,
            r.createdAt,
            r.updatedAt,
          ].join(","),
        );
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `segments_export_${masterToday()}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      setToast({ msg: "Segments exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export segments", type: "error" });
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
        subtitle: "Read-only segment details",
        recordCode: active.segmentCode,
        status: active.status,
        basicInfo: [
          { label: "Segment Code", value: active.segmentCode, mono: true },
          { label: "Segment Name", value: active.segmentName },
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
        label: `${t.label} (${statusTabCounts[t.value]})`,
      }))}
      activeTab={statusTab}
      onTabChange={handleStatusTabChange}
    >
      <MasterListing<SegmentRecord>
        columns={columns}
        data={paginated}
        totalRecords={filtered.length}
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
        searchPlaceholder="Search segment code or segment name..."
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
        viewDrawer={viewDrawer}
        statusActive={form.status === "active"}
        onStatusChange={
          sheetMode === "add" || sheetMode === "edit"
            ? (isActive) =>
                setForm((prev) => ({
                  ...prev,
                  status: isActive ? "active" : "inactive",
                }))
            : undefined
        }
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
                  code: errors.segmentCode,
                }}
                labels={{ name: "Segment Name", code: "Segment Code" }}
                codeDisabled={false}
                codeFirst
              />
            </MasterFormGrid>
          ) : null
        }
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Deactivate Segment?
            </DialogTitle>
            <DialogDescription className="text-xs pt-1">
              {deleteTarget && (
                <>
                  <strong className="text-foreground">{deleteTarget.segmentName}</strong>{" "}
                  ({deleteTarget.segmentCode}) will be marked as inactive. It will remain
                  visible in the All and Inactive tabs.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setDeleteTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs text-white bg-red-600 hover:bg-red-700"
              onClick={confirmDelete}
            >
              Mark Inactive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
