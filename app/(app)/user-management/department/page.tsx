"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Eye, Edit2, Trash2,
  Building2, CheckCircle2, XCircle, X, AlertTriangle,
  Clock, MoreHorizontal,
} from "lucide-react";
import DepartmentSheet, { type Department } from "./components/DepartmentSheet";
import DepartmentDetailSheet from "./components/DepartmentDetailSheet";

// Listing Container and Master Listing Imports
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED: Department[] = [
  { id: 1, code: "DEPT-001", name: "Sales",        status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-10", updatedBy: "Admin", updatedDate: "2024-01-10", lastStatusChange: "2024-01-10" },
  { id: 2, code: "DEPT-002", name: "HR",           status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-12", updatedBy: "Admin", updatedDate: "2024-01-12", lastStatusChange: "2024-01-12" },
  { id: 3, code: "DEPT-003", name: "Accounts",     status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-15", updatedBy: "Admin", updatedDate: "2024-01-15", lastStatusChange: "2024-01-15" },
  { id: 4, code: "DEPT-004", name: "Procurement",  status: "inactive", remarks: "Under restructuring", createdBy: "Admin", createdDate: "2024-01-18", updatedBy: "Admin", updatedDate: "2024-01-20", lastStatusChange: "2024-01-20" },
  { id: 5, code: "DEPT-005", name: "Field Force",  status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-01-22", updatedBy: "Admin", updatedDate: "2024-01-22", lastStatusChange: "2024-01-22" },
  { id: 6, code: "DEPT-006", name: "Retail Sales", status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-02-01", updatedBy: "Admin", updatedDate: "2024-02-01", lastStatusChange: "2024-02-01" },
  { id: 7, code: "DEPT-007", name: "Territory",    status: "active",   remarks: "",                    createdBy: "Admin", createdDate: "2024-02-05", updatedBy: "Admin", updatedDate: "2024-02-05", lastStatusChange: "2024-02-05" },
  { id: 8, code: "DEPT-008", name: "Collections",  status: "inactive", remarks: "Merged with Accounts", createdBy: "Admin", createdDate: "2024-02-10", updatedBy: "Admin", updatedDate: "2024-02-15", lastStatusChange: "2024-02-15" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function nextId(list: Department[]) {
  return Math.max(0, ...list.map(d => d.id)) + 1;
}

// ── Toast ─────────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
        : <XCircle      className="flex-shrink-0 w-4 h-4" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Confirm Dialog ────────────────────────────────────────────────────────────
interface ConfirmProps {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}

function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel = "Confirm", destructive }: ConfirmProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              destructive ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200",
            )}>
              <AlertTriangle className={cn("w-4 h-4", destructive ? "text-red-500" : "text-amber-500")} />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5",
              destructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-brand-600 hover:bg-brand-700 text-white",
            )}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Status Configuration ──────────────────────────────────────────────────────
const STATUS_CFG: Record<string, { bg: string; text: string; dot: string }> = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  draft:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

function StatusToggle({ record, onToggle }: { record: Department; onToggle: (item: Department) => void }) {
  const active = record.status === "active";
  return (
    <button
      type="button"
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        onToggle(record);
      }}
      className={cn(
        "inline-flex items-center justify-center rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-colors",
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
          : "border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
      )}
    >
      {active ? "Active" : "Inactive"}
    </button>
  );
}

function AuditCell({ name, date }: { name?: string; date?: string }) {
  return (
    <div className="space-y-0.5">
      <p className="text-[11px] font-semibold leading-4 text-brand-700">
        {name || "—"}
      </p>
      <p className="text-[10px] font-mono leading-3 text-muted-foreground">
        {date || "—"}
      </p>
    </div>
  );
}

// ── KPI Card ──────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  bgClass?: string;
}

function KpiCard({ label, value, icon: Icon, bgClass = "bg-brand-600" }: KpiCardProps) {
  return (
    <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        bgClass,
      )}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-base font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function DepartmentPage() {
  const [departments, setDepartments] = useState<Department[]>(SEED);

  // Listing State
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "name", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Drawers
  const [sheetMode,  setSheetMode]  = useState<"add" | "edit" | null>(null);
  const [viewDept,   setViewDept]   = useState<Department | null>(null);
  const [activeDept, setActiveDept] = useState<Department | null>(null);

  // Confirm
  type ConfirmType = "toggle-status" | "delete";
  const [confirmTarget, setConfirmTarget] = useState<{ type: ConfirmType; dept: Department } | null>(null);

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Filtered + sorted list ──────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let r = departments.filter(d => d.status !== "archived");

    const searchVal = filters.search as string;
    if (searchVal?.trim()) {
      const t = searchVal.toLowerCase();
      r = r.filter(d =>
        d.name.toLowerCase().includes(t),
      );
    }

    const statusVal = filters.status as string[];
    if (statusVal && statusVal.length > 0) {
      r = r.filter(d => statusVal.includes(d.status));
    }

    if (sort.key && sort.direction !== "none") {
      r = [...r].sort((a, b) => {
        const av = a[sort.key as keyof Department];
        const bv = b[sort.key as keyof Department];
        const c = String(av).localeCompare(String(bv));
        return sort.direction === "asc" ? c : -c;
      });
    }

    return r;
  }, [departments, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const summary = useMemo(() => ({
    total:    departments.filter(d => d.status !== "archived").length,
    active:   departments.filter(d => d.status === "active").length,
    inactive: departments.filter(d => d.status === "inactive").length,
  }), [departments]);

  // ── Handlers ────────────────────────────────────────────────────────────────
  const openAdd  = () => { setActiveDept(null); setSheetMode("add"); };
  const openEdit = (dept: Department) => { setActiveDept(dept); setSheetMode("edit"); };
  const closeSheet = () => { setSheetMode(null); setActiveDept(null); };

  const handleSave = (data: { name: string; status: string; remarks: string }) => {
    if (sheetMode === "add") {
      const newDept: Department = {
        id: nextId(departments),
        code:    "",
        name:    data.name,
        status:  data.status,
        remarks: data.remarks,
        createdBy:        "Admin",
        createdDate:      todayStr(),
        updatedBy:        "Admin",
        updatedDate:      todayStr(),
        lastStatusChange: todayStr(),
      };
      setDepartments(p => [newDept, ...p]);
      showToast("Department created successfully");
    } else if (sheetMode === "edit" && activeDept) {
      setDepartments(p => p.map(d =>
        d.id === activeDept.id
          ? { ...d, ...data, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: data.status !== d.status ? todayStr() : d.lastStatusChange }
          : d,
      ));
      showToast("Department updated successfully");
    }
    closeSheet();
  };

  const toggleStatus = (dept: Department) => {
    const nextStatus = dept.status === "active" ? "inactive" : "active";
    setDepartments(p => p.map(d =>
      d.id === dept.id
        ? { ...d, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : d,
    ));
    showToast(`Department status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`);
  };

  const handleQuickToggle = (dept: Department) => {
    setConfirmTarget({ type: "toggle-status", dept });
  };

  const confirmToggleStatus = () => {
    if (!confirmTarget) return;
    const { dept } = confirmTarget;
    const newStatus = dept.status === "active" ? "inactive" : "active";
    setDepartments(p => p.map(d =>
      d.id === dept.id
        ? { ...d, status: newStatus, updatedBy: "Admin", updatedDate: todayStr(), lastStatusChange: todayStr() }
        : d,
    ));
    showToast(`Department ${newStatus === "active" ? "activated" : "deactivated"}`);
  };

  const handleDelete = (dept: Department) => {
    setConfirmTarget({ type: "delete", dept });
  };

  const confirmDelete = () => {
    if (!confirmTarget) return;
    setDepartments(p => p.map(d =>
      d.id === confirmTarget.dept.id
        ? { ...d, status: "archived", updatedBy: "Admin", updatedDate: todayStr() }
        : d,
    ));
    showToast("Department archived");
  };

  const confirmConfig = confirmTarget ? (
    confirmTarget.type === "delete"
      ? {
          title:        "Delete Department?",
          description:  `"${confirmTarget.dept.name}" will be archived and removed from the listing.`,
          confirmLabel: "Archive",
          destructive:  true,
          onConfirm:    confirmDelete,
        }
      : {
          title: confirmTarget.dept.status === "active"
            ? "Deactivate Department?"
            : "Activate Department?",
          description: confirmTarget.dept.status === "active"
            ? `"${confirmTarget.dept.name}" will be marked inactive.`
            : `"${confirmTarget.dept.name}" will be marked active.`,
          confirmLabel: confirmTarget.dept.status === "active" ? "Deactivate" : "Activate",
          destructive:  confirmTarget.dept.status === "active",
          onConfirm:    confirmToggleStatus,
        }
  ) : null;

  const columns: ColumnConfig<Department>[] = [
    {
      key: "name",
      header: "Department Name",
      sortable: true,
      render: (val, row) => (
        <button
          className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
          onClick={() => setViewDept(row)}
        >
          {row.name}
        </button>
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
      render: (val, row) => <StatusToggle record={row} onToggle={toggleStatus} />,
    },
    {
      key: "createdDate",
      header: "Created By",
      render: (val, row) => <AuditCell name={row.createdBy} date={row.createdDate} />,
    },
    {
      key: "updatedDate",
      header: "Updated",
      render: (val, row) => <AuditCell name={row.updatedBy} date={row.updatedDate} />,
    },
    {
      key: "actions",
      header: "",
      align: "right",
      sticky: true,
      render: (val, row) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
              <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 z-[200]">
            <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
              Actions
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => setViewDept(row)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row)} className="cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleQuickToggle(row)} className="cursor-pointer">
              {row.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleDelete(row)} className="cursor-pointer text-red-600 focus:bg-red-50 focus:text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListingContainer
      title="Department"
      titleIcon={Building2}
      metrics={
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Departments" value={summary.total}    icon={Building2}    bgClass="bg-brand-600" />
          <KpiCard label="Active"            value={summary.active}   icon={CheckCircle2} bgClass="bg-emerald-600" />
          <KpiCard label="Inactive"          value={summary.inactive} icon={XCircle}      bgClass="bg-slate-400" />
        </div>
      }
    >
      <div>
        <MasterListing<Department>
          columns={columns}
          data={paginated}
          totalRecords={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
          onSortChange={setSort}
          onFilterChange={setFilters}
          emptyMessage="departments"
          searchPlaceholder="Search department…"
          onAdd={openAdd}
          addLabel="Add Department"
          onExport={undefined}
          currentFilters={filters}
          currentSort={sort}
        />
      </div>

      {/* ── Drawers ── */}
      <DepartmentSheet
        open={sheetMode !== null}
        onClose={closeSheet}
        onSave={handleSave}
        dept={sheetMode === "edit" ? activeDept : null}
      />

      <DepartmentDetailSheet
        open={!!viewDept}
        onClose={() => setViewDept(null)}
        dept={viewDept}
        onEdit={(dept) => { setViewDept(null); openEdit(dept); }}
      />

      {/* ── Confirm Dialog ── */}
      {confirmConfig && (
        <ConfirmDialog
          open={!!confirmTarget}
          onClose={() => setConfirmTarget(null)}
          onConfirm={confirmConfig.onConfirm}
          title={confirmConfig.title}
          description={confirmConfig.description}
          confirmLabel={confirmConfig.confirmLabel}
          destructive={confirmConfig.destructive}
        />
      )}

      {/* ── Toast ── */}
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
