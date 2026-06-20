"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  CheckCircle2,
  Edit2,
  Eye,
  Folder,
  X,
  XCircle,
  Trash2,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { MiniKPICard } from "@/components/ui/KPICard";
import { MasterListingSheets, buildSimpleMasterViewDrawer } from "@/components/masters/MasterListingSheets";

import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import { applyFilters } from "@/components/listing/filter-utils";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

interface EventType {
  id: number;
  eventTypeName: string;
  remark: string;
  status: "active" | "inactive";
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

const STORAGE_KEY = "pvb_event_types_v1";

const SEED: EventType[] = [
  {
    id: 1,
    eventTypeName: "Farmer Meeting",
    remark: "Gathering of local farmers for information sharing",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-19",
    updatedBy: "Admin",
    updatedDate: "2026-06-19",
  },
  {
    id: 2,
    eventTypeName: "Dealer Meet",
    remark: "Meeting with distributors and dealers",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-19",
    updatedBy: "Admin",
    updatedDate: "2026-06-19",
  },
  {
    id: 3,
    eventTypeName: "Field Demonstration",
    remark: "On-field demo of crops or products",
    status: "active",
    createdBy: "Admin",
    createdDate: "2026-06-19",
    updatedBy: "Admin",
    updatedDate: "2026-06-19",
  },
];

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

function loadEventTypes(): EventType[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return SEED;
    const parsed = JSON.parse(raw) as Partial<EventType>[];
    return parsed.map((item, idx) => ({
      id: item.id ?? idx + 1,
      eventTypeName: item.eventTypeName ?? "",
      remark: item.remark ?? "",
      status: item.status === "inactive" ? "inactive" : "active",
      createdBy: item.createdBy ?? "Admin",
      createdDate: item.createdDate ?? todayStr(),
      updatedBy: item.updatedBy ?? "Admin",
      updatedDate: item.updatedDate ?? todayStr(),
    }));
  } catch {
    return SEED;
  }
}

function saveEventTypes(items: EventType[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface EventTypeFormValues {
  eventTypeName: string;
  remark: string;
  status: "active" | "inactive";
}

const DEFAULT_EVENT_TYPE_FORM: EventTypeFormValues = {
  eventTypeName: "",
  remark: "",
  status: "active",
};

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
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100"><X className="h-3.5 w-3.5" /></button>
    </div>
  );
}

export default function EventTypeMasterPage() {
  const [records, setRecords] = useState<EventType[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "eventTypeName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [toast, setToast] = useState<ToastState | null>(null);

  // Sheet & Dialog states
  const [sheetMode, setSheetMode] = useState<"add" | "edit" | "view" | null>(null);
  const [active, setActive] = useState<EventType | null>(null);
  const [form, setForm] = useState<EventTypeFormValues>(DEFAULT_EVENT_TYPE_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<EventType | null>(null);

  useEffect(() => {
    setRecords(loadEventTypes());
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const toggleStatus = (record: EventType) => {
    const nextStatus: "active" | "inactive" = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveEventTypes(updated);
    setToast({ msg: `Event Type status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  const columns: ColumnConfig<EventType>[] = [
    {
      key: "eventTypeName",
      header: "Event Type",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "250px",
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">{row.eventTypeName}</span>
      ),
    },
    {
      key: "remark",
      header: "Remark",
      sortable: true,
      filterable: true,
      filterType: "text",
      width: "350px",
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
      width: "110px",
      render: (val, row) => (
        <ListingStatusToggle active={isActiveStatus(row.status)} onChange={() => toggleStatus(row)} />
      ),
    },
    {
      key: "createdDate",
      header: "Created",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />,
    },
    {
      key: "updatedDate",
      header: "Updated",
      sortable: true,
      filterable: true,
      filterType: "date",
      width: "120px",
      render: (val, row) => <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />,
    },
  ];

  const actions: ActionItemConfig<EventType>[] = [
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

    // Search filter
    if (filters.search) {
      const q = String(filters.search).trim().toLowerCase();
      result = result.filter(
        (r) =>
          r.eventTypeName.toLowerCase().includes(q) ||
          r.remark.toLowerCase().includes(q)
      );
    }

    // Apply column filters
    result = applyFilters(result, filters);

    // Sorting
    if (sort.key && sort.direction !== "none") {
      result.sort((a, b) => {
        const aVal = String(a[sort.key as keyof EventType] || "").toLowerCase();
        const bVal = String(b[sort.key as keyof EventType] || "").toLowerCase();
        const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        return sort.direction === "asc" ? cmp : -cmp;
      });
    }

    return result;
  }, [records, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize]);

  const openAdd = () => {
    setForm(DEFAULT_EVENT_TYPE_FORM);
    setErrors({});
    setActive(null);
    setSheetMode("add");
  };

  const openEdit = (row: EventType) => {
    setForm({
      eventTypeName: row.eventTypeName,
      remark: row.remark,
      status: row.status,
    });
    setErrors({});
    setActive(row);
    setSheetMode("edit");
  };

  const openView = (row: EventType) => {
    setActive(row);
    setSheetMode("view");
  };

  const closeSheet = () => {
    setSheetMode(null);
    setActive(null);
    setErrors({});
  };

  const validateForm = (val: EventTypeFormValues) => {
    const errs: Record<string, string> = {};
    if (!val.eventTypeName.trim()) errs.eventTypeName = "Event type name is required";
    return errs;
  };

  const persist = () => {
    const mode = sheetMode === "add" ? "add" : "edit";
    const errs = validateForm(form);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const list = loadEventTypes();
    let updatedList: EventType[];
    if (mode === "add") {
      const id = list.reduce((max, item) => Math.max(max, item.id), 0) + 1;
      const newRecord: EventType = {
        id,
        eventTypeName: form.eventTypeName.trim(),
        remark: form.remark.trim(),
        status: form.status,
        createdBy: "Admin",
        createdDate: todayStr(),
        updatedBy: "Admin",
        updatedDate: todayStr(),
      };
      updatedList = [...list, newRecord];
      setToast({ msg: "Event type added successfully", type: "success" });
    } else if (active) {
      updatedList = list.map((r) =>
        r.id === active.id
          ? {
              ...r,
              eventTypeName: form.eventTypeName.trim(),
              remark: form.remark.trim(),
              status: form.status,
              updatedBy: "Admin",
              updatedDate: todayStr(),
            }
          : r,
      );
      setToast({ msg: "Event type updated successfully", type: "success" });
    } else {
      return;
    }
    saveEventTypes(updatedList);
    setRecords(updatedList);
    closeSheet();
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    const list = loadEventTypes().filter((r) => r.id !== deleteTarget.id);
    saveEventTypes(list);
    setRecords(list);
    setDeleteTarget(null);
    setToast({ msg: "Event type deleted successfully", type: "success" });
  };

  const handleExport = () => {
    try {
      const headers = ["ID", "Event Type Name", "Remark", "Status", "Created By", "Created Date", "Updated By", "Updated Date"];
      const csvRows = [headers.join(",")];
      for (const r of records) {
        const row = [
          r.id,
          `"${r.eventTypeName.replace(/"/g, '""')}"`,
          `"${r.remark.replace(/"/g, '""')}"`,
          r.status,
          r.createdBy,
          r.createdDate,
          r.updatedBy,
          r.updatedDate,
        ];
        csvRows.push(row.join(","));
      }
      const blob = new Blob([csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `event_types_export_${todayStr()}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setToast({ msg: "Event types exported successfully", type: "success" });
    } catch {
      setToast({ msg: "Failed to export event types", type: "error" });
    }
  };

  const sheetTitle =
    sheetMode === "add"
      ? "Add Event Type"
      : sheetMode === "edit"
      ? "Edit Event Type"
      : "View Event Type";

  return (
    <AppLayout>
      <div className="space-y-5">
        <div>
          <h1 className="text-xl font-bold text-foreground">Event Type Master</h1>
          <p className="mt-0.5 text-xs text-muted-foreground">Manage marketing and field event types</p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <MiniKPICard label="Total Event Types" value={records.length} icon={Folder} accent={true} />
          <MiniKPICard label="Active" value={records.filter((r) => r.status === "active").length} icon={CheckCircle2} accent={false} />
          <MiniKPICard label="Inactive" value={records.filter((r) => r.status === "inactive").length} icon={XCircle} accent={false} />
        </div>

        <MasterListing<EventType>
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
          addLabel="Add Event Type"
          onExport={handleExport}
          emptyMessage="event types"
          searchPlaceholder="Search event type name, remark..."
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      <MasterListingSheets
        sheetMode={sheetMode}
        active={active}
        onClose={closeSheet}
        onEdit={() => active && openEdit(active)}
        onSave={persist}
        sheetTitle={sheetTitle}
        icon={Folder}
        viewDrawer={
          active
            ? buildSimpleMasterViewDrawer<EventType>({
                drawerTitle: "Event Type",
                getRecordCode: () => "",
                basicInfo: (r) => [
                  { label: "Event Type Name", value: r.eventTypeName },
                  { label: "Remark", value: r.remark },
                ],
                description: () => "",
                showDescription: false,
              })(active)
            : { title: "Event Type", basicInfo: [] }
        }
        formContent={
          <div className="space-y-4">
            <div className="space-y-1">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Event Type Details</p>
              <p className="text-[11px] text-muted-foreground">Define event type name and remark.</p>
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
                  className={cn("h-8 text-xs bg-background", errors.eventTypeName && "border-red-400 focus-visible:ring-red-300")}
                  disabled={sheetMode === "view"}
                />
                {errors.eventTypeName && <p className="text-[11px] text-red-500">{errors.eventTypeName}</p>}
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">Remark</Label>
                <Textarea
                  value={form.remark}
                  onChange={(e) => setForm({ ...form, remark: e.target.value })}
                  placeholder="Additional remarks..."
                  className="min-h-[96px] text-xs resize-none rounded-lg"
                  disabled={sheetMode === "view"}
                />
              </div>
            </div>
          </div>
        }
        statusActive={form.status === "active"}
        onStatusChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete record?</DialogTitle>
            <DialogDescription className="text-xs">
              This action cannot be undone. The record will be permanently removed.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs text-white bg-red-600 hover:bg-red-700" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
