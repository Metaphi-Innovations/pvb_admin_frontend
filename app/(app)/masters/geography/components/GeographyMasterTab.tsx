"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Edit2,
  Eye,
  FolderOpen,
  Globe,
  History,
  MapPin,
  Plus,
  Users,
  X,
  XCircle,
} from "lucide-react";
import { MasterListing } from "@/components/listing/MasterListing";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";
import {
  type GeographyRecord,
  INDIA_GEOGRAPHY_ID,
  getAncestorPath,
  getDistinctGeographyTypes,
  getGeographyById,
  getGeographySummary,
  getParentName,
  loadGeographies,
  setGeographyStatus,
} from "../geography-master-data";
import { GeographyFolderBreadcrumb } from "./GeographyFolderBreadcrumb";
import { GeographyFormDialog } from "./GeographyFormDialog";
import { GeographyDetailSheet, type GeographyDetailTab } from "./GeographyDetailSheet";

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
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
      ) : (
        <XCircle className="w-4 h-4 flex-shrink-0" />
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

export function GeographyMasterTab() {
  const [records, setRecords] = useState<GeographyRecord[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<number | null>(INDIA_GEOGRAPHY_ID);

  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [draftSearch, setDraftSearch] = useState("");
  const [draftStatus, setDraftStatus] = useState("");
  const [draftType, setDraftType] = useState("");

  const [appliedSearch, setAppliedSearch] = useState("");
  const [appliedStatus, setAppliedStatus] = useState("");
  const [appliedType, setAppliedType] = useState("");

  const [formOpen, setFormOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<GeographyRecord | null>(null);
  const [defaultParentId, setDefaultParentId] = useState<number | null>(null);

  const [viewRecord, setViewRecord] = useState<GeographyRecord | null>(null);
  const [detailTab, setDetailTab] = useState<GeographyDetailTab>("overview");

  const [toast, setToast] = useState<ToastState | null>(null);
  const [statusConfirmTarget, setStatusConfirmTarget] = useState<GeographyRecord | null>(null);

  const refresh = useCallback(() => setRecords(loadGeographies()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const summary = useMemo(() => getGeographySummary(records), [records]);
  const typeOptions = useMemo(() => getDistinctGeographyTypes(records), [records]);

  const breadcrumbPath = useMemo(() => {
    if (currentFolderId === null) return [];
    const folder = getGeographyById(currentFolderId);
    if (!folder) return [];
    return getAncestorPath(folder, records);
  }, [currentFolderId, records]);

  const folderChildren = useMemo(() => {
    return records.filter((g) => g.parentId === currentFolderId);
  }, [records, currentFolderId]);

  const filtered = useMemo(() => {
    let r = [...folderChildren];

    if (appliedSearch.trim()) {
      const q = appliedSearch.toLowerCase();
      r = r.filter(
        (row) =>
          row.name.toLowerCase().includes(q) ||
          row.geographyType.toLowerCase().includes(q),
      );
    }
    if (appliedStatus) r = r.filter((row) => row.status === appliedStatus);
    if (appliedType) r = r.filter((row) => row.geographyType === appliedType);

    if (sort.key && sort.direction !== "none") {
      r.sort((a, b) => {
        let av = "";
        let bv = "";
        if (sort.key === "parentName") {
          av = getParentName(a.parentId, records);
          bv = getParentName(b.parentId, records);
        } else {
          const key = sort.key as keyof GeographyRecord;
          av = String(a[key] ?? "");
          bv = String(b[key] ?? "");
        }
        const c = av.localeCompare(bv);
        return sort.direction === "asc" ? c : -c;
      });
    }
    return r;
  }, [folderChildren, appliedSearch, appliedStatus, appliedType, sort, records]);

  useEffect(() => {
    setPage(1);
  }, [appliedSearch, appliedStatus, appliedType, sort, pageSize, currentFolderId]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const applyFilters = () => {
    setAppliedSearch(draftSearch);
    setAppliedStatus(draftStatus);
    setAppliedType(draftType);
    setFilters({
      search: draftSearch,
      status: draftStatus,
      geographyType: draftType,
    });
  };

  const resetFilters = () => {
    setDraftSearch("");
    setDraftStatus("");
    setDraftType("");
    setAppliedSearch("");
    setAppliedStatus("");
    setAppliedType("");
    setFilters({});
  };

  const openFolder = useCallback((id: number) => {
    setCurrentFolderId(id);
    resetFilters();
  }, []);

  const navigateBreadcrumb = useCallback((folderId: number | null) => {
    setCurrentFolderId(folderId);
    resetFilters();
  }, []);

  const openAddForm = useCallback((parentId?: number | null) => {
    setEditRecord(null);
    setDefaultParentId(parentId ?? currentFolderId);
    setFormOpen(true);
  }, [currentFolderId]);

  const openView = useCallback((row: GeographyRecord, tab: GeographyDetailTab = "overview") => {
    setDetailTab(tab);
    setViewRecord(row);
  }, []);

  const requestStatusToggle = useCallback((row: GeographyRecord) => {
    setStatusConfirmTarget(row);
  }, []);

  const confirmStatusToggle = useCallback(() => {
    if (!statusConfirmTarget) return;
    const nextActive = statusConfirmTarget.status !== "active";
    setGeographyStatus(statusConfirmTarget.id, nextActive ? "active" : "inactive");
    setStatusConfirmTarget(null);
    refresh();
    showToast(`Geography ${nextActive ? "activated" : "deactivated"} successfully.`);
  }, [statusConfirmTarget, refresh, showToast]);

  const actions = useMemo<ActionItemConfig<GeographyRecord>[]>(
    () => [
      {
        label: "Open",
        action: "open",
        icon: FolderOpen,
        onClick: (row) => openFolder(row.id),
      },
      {
        label: "View",
        action: "view",
        icon: Eye,
        onClick: (row) => openView(row, "overview"),
      },
      {
        label: "Edit",
        action: "edit",
        icon: Edit2,
        onClick: (row) => {
          setEditRecord(row);
          setDefaultParentId(row.parentId);
          setFormOpen(true);
        },
      },
      {
        label: "Add Child",
        action: "add-child",
        icon: Plus,
        onClick: (row) => openAddForm(row.id),
      },
      {
        label: "History",
        action: "history",
        icon: History,
        onClick: (row) => openView(row, "history"),
      },
    ],
    [openFolder, openView, openAddForm],
  );

  const columns = useMemo<ColumnConfig<GeographyRecord>[]>(
    () => [
      {
        key: "name",
        header: "Geography Name",
        sortable: true,
        render: (val, row) => (
          <button
            type="button"
            onClick={() => openFolder(row.id)}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-700 hover:underline"
          >
            <FolderOpen className="w-3.5 h-3.5 flex-shrink-0" />
            {val}
          </button>
        ),
      },
      {
        key: "geographyType",
        header: "Geography Type",
        sortable: true,
        render: (val) => <span className="text-xs">{val}</span>,
      },
      {
        key: "parentName",
        header: "Parent Geography",
        sortable: true,
        render: (_val, row) => (
          <span className="text-xs text-muted-foreground">
            {getParentName(row.parentId, records)}
          </span>
        ),
      },
      {
        key: "coverageCount",
        header: "Coverage Count",
        sortable: true,
        align: "right",
        render: (val) => <span className="text-xs font-mono">{val}</span>,
      },
      {
        key: "assignedUsers",
        header: "Assigned Users",
        sortable: true,
        align: "right",
        render: (val) => <span className="text-xs font-mono">{val}</span>,
      },
      {
        key: "effectiveFrom",
        header: "Effective From",
        sortable: true,
        render: (val) => <span className="text-xs font-mono">{val}</span>,
      },
      {
        key: "status",
        header: "Status",
        width: "120px",
        render: (_val, row) => (
          <ListingStatusToggle
            active={isActiveStatus(row.status)}
            onChange={() => requestStatusToggle(row)}
          />
        ),
      },
    ],
    [records, openFolder, requestStatusToggle],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold text-foreground">Geography Master</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Manage business geography structure and coverage hierarchy.
          </p>
        </div>
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5 flex-shrink-0"
          onClick={() => openAddForm()}
        >
          <Plus className="w-3.5 h-3.5" />
          Add Geography
        </Button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        <KpiCard label="Total Geographies" value={summary.total} icon={Globe} bgClass="bg-brand-600" />
        <KpiCard label="Active Geographies" value={summary.active} icon={CheckCircle2} bgClass="bg-emerald-600" />
        <KpiCard label="Users Assigned" value={summary.usersAssigned} icon={Users} bgClass="bg-indigo-600" />
        <KpiCard label="Coverage Mapped" value={summary.coverageMapped} icon={MapPin} bgClass="bg-teal-600" />
        <KpiCard label="Unmapped Pincodes" value={summary.unmappedPincodes} icon={MapPin} bgClass="bg-amber-600" />
        <KpiCard label="Pending Changes" value={summary.pendingChanges} icon={Clock} bgClass="bg-slate-500" />
      </div>

      <div className="rounded-xl border border-border bg-white px-4 py-3">
        <p className="text-[11px] font-medium text-muted-foreground mb-1.5">Current folder</p>
        <GeographyFolderBreadcrumb path={breadcrumbPath} onNavigate={navigateBreadcrumb} />
      </div>

      <div className="rounded-xl border border-border bg-white p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Search</Label>
            <Input
              className="h-9 text-sm"
              placeholder="Search geography name or type…"
              value={draftSearch}
              onChange={(e) => setDraftSearch(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && applyFilters()}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Status</Label>
            <Select
              value={draftStatus || "__all__"}
              onValueChange={(v) => setDraftStatus(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">All Statuses</SelectItem>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <Select
              value={draftType || "__all__"}
              onValueChange={(v) => setDraftType(v === "__all__" ? "" : v)}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__" className="text-xs">All Types</SelectItem>
                {typeOptions.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={applyFilters}
          >
            Search
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={resetFilters}>
            Reset Filters
          </Button>
        </div>
      </div>

      <MasterListing<GeographyRecord>
        columns={columns}
        data={paginated}
        totalRecords={filtered.length}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onSortChange={setSort}
        onFilterChange={(f) => {
          setFilters(f);
          const s = (f.search as string) || "";
          setAppliedSearch(s);
          setDraftSearch(s);
        }}
        emptyMessage="geographies in this folder"
        searchPlaceholder="Search geography name or type…"
        currentFilters={filters}
        currentSort={sort}
        actions={actions}
      />

      <GeographyFormDialog
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditRecord(null);
        }}
        record={editRecord}
        defaultParentId={defaultParentId}
        onSaved={() => {
          refresh();
          showToast(editRecord ? "Geography updated successfully." : "Geography added successfully.");
        }}
      />

      <GeographyDetailSheet
        open={!!viewRecord}
        onClose={() => setViewRecord(null)}
        record={viewRecord}
        initialTab={detailTab}
        onOpenChild={(child) => {
          setViewRecord(null);
          openFolder(child.id);
        }}
        onEdit={() => {
          if (!viewRecord) return;
          setEditRecord(viewRecord);
          setDefaultParentId(viewRecord.parentId);
          setViewRecord(null);
          setFormOpen(true);
        }}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}

      <Dialog open={!!statusConfirmTarget} onOpenChange={() => setStatusConfirmTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Change Status
            </DialogTitle>
            <DialogDescription className="pt-1">
              Are you sure you want to change the status of &quot;{statusConfirmTarget?.name}&quot;?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setStatusConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={confirmStatusToggle}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
