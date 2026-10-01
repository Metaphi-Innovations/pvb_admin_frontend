"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, Eye, Edit2, Trash2,
  Shield, CheckCircle2, XCircle, X, AlertTriangle,
  Clock, MoreHorizontal
} from "lucide-react";
import {
  type Role, type RolePermissionTemplate, DEPARTMENTS, MOCK_USER_COUNTS,
  loadRoles, saveRoles, todayStr,
  loadPermissionTemplates, savePermissionTemplates,
  type PermissionTemplate, loadNewPermissionTemplates, saveNewPermissionTemplates,
} from "./roles-data";
import RoleDetailSheet from "./components/RoleDetailSheet";
import { type UserPermissions } from "../employee/employee-data";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

// Listing Container and Master Listing Imports
import { ListingContainer } from "@/components/layout/ListingContainer";
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState } from "@/components/listing/types";
import { ListingAuditCell, ListingStatusToggle, isActiveStatus } from "@/components/listing";

// ── Types ────────────────────────────────────────────────────────────────────
type ConfirmKind = "toggle-status" | "delete";

interface ConfirmTarget {
  kind: ConfirmKind;
  role: Role;
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

interface ConfirmConfig {
  title: string;
  description: string;
  confirmLabel: string;
  destructive: boolean;
  onConfirm: () => void;
}

// ── Pure helpers ─────────────────────────────────────────────────────────────
function getConfirmConfig(
  target: ConfirmTarget | null,
  onDelete: () => void,
  onToggle: () => void,
): ConfirmConfig | null {
  if (target === null) {
    return null;
  }
  if (target.kind === "delete") {
    return {
      title: "Delete Role?",
      description: target.role.roleName + " will be archived.",
      confirmLabel: "Archive",
      destructive: true,
      onConfirm: onDelete,
    };
  }
  const isActive = target.role.status === "active";
  return {
    title: isActive ? "Deactivate Role?" : "Activate Role?",
    description: isActive
      ? target.role.roleName + " will be marked inactive."
      : target.role.roleName + " will be marked active again.",
    confirmLabel: isActive ? "Deactivate" : "Activate",
    destructive: isActive,
    onConfirm: onToggle,
  };
}

// ── GeoBadge ─────────────────────────────────────────────────────────────────
function GeoBadge({ level }: { level: string }) {
  if (level === "None") {
    return <span className="text-[11px] text-muted-foreground">—</span>;
  }
  return (
    <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-100 font-medium">
      {level}
    </span>
  );
}

// ── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const bg = toast.type === "success" ? "bg-emerald-600" : "bg-red-600";
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      bg,
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
        : <XCircle className="flex-shrink-0 w-4 h-4" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── ConfirmDialog ────────────────────────────────────────────────────────────
interface ConfirmDialogProps {
  open: boolean;
  onClose: () => void;
  config: ConfirmConfig;
}

function ConfirmDialog({ open, onClose, config }: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              config.destructive
                ? "bg-red-50 border border-red-200"
                : "bg-amber-50 border border-amber-200",
            )}>
              <AlertTriangle className={cn("w-4 h-4", config.destructive ? "text-red-500" : "text-amber-500")} />
            </div>
            {config.title}
          </DialogTitle>
          <DialogDescription className="pt-1">{config.description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs gap-1.5",
              config.destructive
                ? "bg-red-600 hover:bg-red-700 text-white"
                : "bg-brand-600 hover:bg-brand-700 text-white",
            )}
            onClick={() => { config.onConfirm(); onClose(); }}
          >
            {config.confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── KPI Card ─────────────────────────────────────────────────────────────────
interface KpiCardProps {
  label: string;
  value: number;
  icon: React.ElementType;
  bgClass?: string;
}

function KpiCard({ label, value, icon: Icon, bgClass = "bg-brand-600" }: KpiCardProps) {
  return (
    <div className="flex items-center gap-3 p-3 bg-white border rounded-xl border-border">
      <div className={cn(
        "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
        bgClass,
      )}>
        <Icon className="w-4 h-4 text-white" />
      </div>
      <div>
        <p className="text-base font-bold leading-none text-foreground">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight">{label}</p>
      </div>
    </div>
  );
}

// ── RolesPage (main) ─────────────────────────────────────────────────────────
export default function RolesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get("tab") || "roles";
  const [activeTab, setActiveTab] = useState(defaultTab);

  const [roles,         setRoles]         = useState<Role[]>([]);
  const [permTemplates, setPermTemplates] = useState<Record<string | number, RolePermissionTemplate>>({});
  const [newTemplates,  setNewTemplates]  = useState<PermissionTemplate[]>([]);
  
  // Listing state
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "roleName", direction: "asc" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // New Templates listing state
  const [templateFilters, setTemplateFilters] = useState<FilterState>({});
  const [templateSort, setTemplateSort] = useState<SortState>({ key: "templateName", direction: "asc" });
  const [templatePage, setTemplatePage] = useState(1);
  const [templatePageSize, setTemplatePageSize] = useState(10);

  const [viewRole,      setViewRole]      = useState<Role | null>(null);
  const [toast,         setToast]         = useState<ToastState | null>(null);
  const [confirmTarget, setConfirmTarget] = useState<ConfirmTarget | null>(null);

  useEffect(() => {
    setRoles(loadRoles());
    setPermTemplates(loadPermissionTemplates());
    setNewTemplates(loadNewPermissionTemplates());
  }, []);

  const toggleTemplateStatus = (tpl: PermissionTemplate) => {
    const nextStatus: "Active" | "Inactive" = tpl.status === "Active" ? "Inactive" : "Active";
    const next = newTemplates.map(t =>
      t.id === tpl.id ? { ...t, status: nextStatus, updatedAt: todayStr() } : t
    );
    setNewTemplates(next);
    saveNewPermissionTemplates(next);
    showToast("Template status updated to " + nextStatus);
  };

  const handleTemplateDelete = (tpl: PermissionTemplate) => {
    if (confirm(`Are you sure you want to delete template "${tpl.templateName}"?`)) {
      const next = newTemplates.filter(t => t.id !== tpl.id);
      setNewTemplates(next);
      saveNewPermissionTemplates(next);
      showToast("Template deleted successfully");
    }
  };

  const filteredTemplates = useMemo(() => {
    let t = [...newTemplates];
    const searchVal = templateFilters.search as string;
    if (searchVal?.trim()) {
      const q = searchVal.toLowerCase();
      t = t.filter(x => x.templateName.toLowerCase().includes(q));
    }
    if (templateSort.key && templateSort.direction !== "none") {
      t.sort((a, b) => {
        const av = String(a[templateSort.key as keyof PermissionTemplate] ?? "").toLowerCase();
        const bv = String(b[templateSort.key as keyof PermissionTemplate] ?? "").toLowerCase();
        return templateSort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return t;
  }, [newTemplates, templateFilters, templateSort]);

  const paginatedTemplates = useMemo(() => {
    const start = (templatePage - 1) * templatePageSize;
    return filteredTemplates.slice(start, start + templatePageSize);
  }, [filteredTemplates, templatePage, templatePageSize]);

  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const filtered = useMemo(() => {
    let r = roles.filter(role => role.status !== "archived");
    
    const searchVal = filters.search as string;
    if (searchVal?.trim()) {
      const q = searchVal.toLowerCase();
      r = r.filter(role =>
        role.roleName.toLowerCase().includes(q) ||
        role.department.toLowerCase().includes(q),
      );
    }
    
    const deptIds = (filters.department as string[])?.map(Number) || [];
    if (deptIds.length > 0) {
      r = r.filter(role => deptIds.includes(role.departmentId ?? -1));
    }
    
    const statusVal = filters.status as string[];
    if (statusVal && statusVal.length > 0) {
      r = r.filter(role => statusVal.includes(role.status));
    }

    if (sort.key && sort.direction !== "none") {
      r = [...r].sort((a, b) => {
        const av = String(a[sort.key as keyof Role] ?? "").toLowerCase();
        const bv = String(b[sort.key as keyof Role] ?? "").toLowerCase();
        return sort.direction === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [roles, filters, sort]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

  const visible  = roles.filter(r => r.status !== "archived");
  const total    = visible.length;
  const active   = visible.filter(r => r.status === "active").length;
  const inactive = visible.filter(r => r.status === "inactive").length;

  const openAdd  = () => router.push("/user-management/roles/add");
  const openEdit = (role: Role) => router.push("/user-management/roles/" + role.id + "/edit");

  const toggleStatus = (role: Role) => {
    const nextStatus = role.status === "active" ? "inactive" : "active";
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (nextStatus === "inactive" && count > 0) {
      showToast("Cannot deactivate: " + count + " user(s) assigned to this role", "error");
      return;
    }
    const next = roles.map(r =>
      r.id === role.id
        ? { ...r, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    ) as Role[];
    setRoles(next);
    saveRoles(next);
    showToast("Role status updated to " + (nextStatus === "active" ? "Active" : "Inactive"));
  };

  const handleQuickToggle = (role: Role) => setConfirmTarget({ kind: "toggle-status", role });
  const handleDelete      = (role: Role) => {
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (count > 0) { showToast("Cannot delete: " + count + " user(s) assigned to this role", "error"); return; }
    setConfirmTarget({ kind: "delete", role });
  };

  const confirmDelete = () => {
    if (!confirmTarget) return;
    const next = roles.map(r =>
      r.id === confirmTarget.role.id
        ? { ...r, status: "archived", updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    ) as Role[];
    setRoles(next); saveRoles(next); showToast("Role archived");
  };

  const confirmToggleStatus = () => {
    if (!confirmTarget) return;
    const role = confirmTarget.role;
    const newStatus = role.status === "active" ? "inactive" : "active";
    const count = MOCK_USER_COUNTS[role.id] ?? 0;
    if (newStatus === "inactive" && count > 0) {
      showToast("Cannot deactivate: " + count + " user(s) assigned to this role", "error"); return;
    }
    const next = roles.map(r =>
      r.id === role.id
        ? { ...r, status: newStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : r,
    ) as Role[];
    setRoles(next); saveRoles(next);
    showToast("Role " + (newStatus === "active" ? "activated" : "deactivated"));
  };
  const handleOpenPermissionTemplate = (role: Role) => {
    router.push(`/user-management/roles/${role.id}/permissions`);
  };

  const templateColumns: ColumnConfig<PermissionTemplate>[] = [
    {
      key: "templateName",
      header: "Template Name",
      sortable: true,
      render: (val, row) => (
        <span className="text-xs font-semibold text-foreground">
          {row.templateName}
        </span>
      ),
    },
    {
      key: "accessType",
      header: "Access Type",
      sortable: true,
      render: (val, row) => (
        <span className={cn(
          "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium border capitalize",
          row.accessType === "web"
            ? "bg-brand-50 border-brand-100 text-brand-700"
            : "bg-blue-50 border-blue-100 text-blue-700"
        )}>
          {row.accessType === "web" ? "Web Portal" : "Mobile App"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      sortable: true,
      render: (val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => toggleTemplateStatus(row)}
        />
      ),
    },
    {
      key: "createdAt",
      header: "Created",
      render: (val, row) => (
        <ListingAuditCell name="Admin" date={row.createdAt} variant="created" />
      ),
    },
    {
      key: "updatedAt",
      header: "Updated",
      render: (val, row) => (
        <ListingAuditCell name="Admin" date={row.updatedAt} variant="updated" />
      ),
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
            <DropdownMenuItem onClick={() => router.push(`/user-management/roles/templates/${row.id}/view`)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/user-management/roles/templates/${row.id}/edit`)} className="cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleTemplateDelete(row)} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  const cfg = getConfirmConfig(confirmTarget, confirmDelete, confirmToggleStatus);

  const columns: ColumnConfig<Role>[] = [
    {
      key: "roleName",
      header: "Role Name",
      sortable: true,
      render: (val, row) => (
        <button
          className="text-xs font-semibold text-left transition-colors text-foreground hover:text-brand-600"
          onClick={() => router.push(`/user-management/roles/${row.id}`)}
        >
          {row.roleName}
        </button>
      ),
    },
    {
      key: "department",
      header: "Department",
      sortable: true,
      filterable: true,
      filterType: "dropdown",
      filterOptions: DEPARTMENTS.map(d => ({ label: d.name, value: String(d.id) })),
      render: (val, row) => (
        <span className="text-xs text-foreground">{row.department}</span>
      ),
    },
    {
      key: "geoLevel",
      header: "Geo Level",
      sortable: true,
      render: (val, row) => <GeoBadge level={row.geoLevel} />,
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
      render: (val, row) => (
        <ListingStatusToggle
          active={isActiveStatus(row.status)}
          onChange={() => toggleStatus(row)}
        />
      ),
    },
    {
      key: "createdBy",
      header: "Created",
      render: (val, row) => (
        <ListingAuditCell name={row.createdBy} date={row.createdDate} variant="created" />
      ),
    },
    {
      key: "updatedDate",
      header: "Updated",
      render: (val, row) => (
        <ListingAuditCell name={row.updatedBy} date={row.updatedDate} variant="updated" />
      ),
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
            <DropdownMenuItem onClick={() => router.push(`/user-management/roles/${row.id}`)} className="cursor-pointer">
              <Eye className="w-3.5 h-3.5 mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openEdit(row)} className="cursor-pointer">
              <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            {/* <DropdownMenuItem onClick={() => handleQuickToggle(row)} className="cursor-pointer">
              {row.status === "active" ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator /> */}
            <DropdownMenuItem onClick={() => handleDelete(row)} className="text-red-600 cursor-pointer focus:bg-red-50 focus:text-red-600">
              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  return (
    <ListingContainer
      title="Roles"
      titleIcon={Shield}
      metrics={
        <div className="grid grid-cols-3 gap-3">
          <KpiCard label="Total Roles" value={total}    icon={Shield}       bgClass="bg-brand-600" />
          <KpiCard label="Active"      value={active}   icon={CheckCircle2} bgClass="bg-emerald-600" />
          <KpiCard label="Inactive"    value={inactive} icon={XCircle}      bgClass="bg-slate-400" />
        </div>
      }
    >
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="border-b border-border w-full justify-start rounded-none h-auto p-0 bg-transparent space-x-6">
          <TabsTrigger
            value="roles"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none hover:text-brand-650 transition-all"
          >
            Roles
          </TabsTrigger>
          <TabsTrigger
            value="templates"
            className="rounded-none border-b-2 border-transparent px-1 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none hover:text-brand-650 transition-all"
          >
            Template
          </TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="m-0 outline-none">
          <MasterListing<Role>
            columns={columns}
            data={paginated}
            totalRecords={filtered.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            onFilterChange={setFilters}
            emptyMessage="roles"
            searchPlaceholder="Search role or department…"
            onAdd={openAdd}
            addLabel="Add Role"
            onExport={undefined}
            currentFilters={filters}
            currentSort={sort}
          />
        </TabsContent>

        <TabsContent value="templates" className="m-0 outline-none">
          <MasterListing<PermissionTemplate>
            columns={templateColumns}
            data={paginatedTemplates}
            totalRecords={filteredTemplates.length}
            page={templatePage}
            pageSize={templatePageSize}
            onPageChange={setTemplatePage}
            onPageSizeChange={setTemplatePageSize}
            onSortChange={setTemplateSort}
            onFilterChange={setTemplateFilters}
            emptyMessage="templates"
            searchPlaceholder="Search template name…"
            onAdd={() => router.push("/user-management/roles/templates/add")}
            addLabel="Add Template"
            onExport={undefined}
            currentFilters={templateFilters}
            currentSort={templateSort}
          />
        </TabsContent>
      </Tabs>

      <RoleDetailSheet
        open={viewRole !== null}
        onClose={() => setViewRole(null)}
        role={viewRole}
        onEdit={(role) => { setViewRole(null); openEdit(role); }}
      />


      {cfg !== null && (
        <ConfirmDialog
          open={confirmTarget !== null}
          onClose={() => setConfirmTarget(null)}
          config={cfg}
        />
      )}

      {toast !== null && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </ListingContainer>
  );
}
