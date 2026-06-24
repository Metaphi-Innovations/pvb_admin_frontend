"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, ChevronRight, ChevronDown,
  CheckCircle2, XCircle, X, MapPin, Layers, Save,
  Eye, Edit2, Trash2,
} from "lucide-react";
import { StatusBadge } from "@/components/record-detail/StatusBadge";
import { ListingStatusToggle } from "@/components/listing/ListingStatusToggle";
import {
  type GeoNode, type GeoLevel,
  LEVELS, CHILD_LEVEL, loadGeoNodes, saveGeoNodes, todayStr,
  getAncestorPath, DEFAULT_GEO_USER,
} from "../geo-data";
import { LevelBadge, LEVEL_DOT } from "./LevelBadge";
import { GeographyBreadcrumb } from "./GeographyBreadcrumb";
import { GeographyDeleteDialog } from "./GeographyDeleteDialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type StatusTab = "all" | "active" | "inactive";
const GEO_LIST_TAB_KEY = "geography-list-status-tab";
const STATUS_TABS: { value: StatusTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

function readStoredStatusTab(): StatusTab {
  if (typeof window === "undefined") return "all";
  const v = sessionStorage.getItem(GEO_LIST_TAB_KEY);
  return v === "active" || v === "inactive" ? v : "all";
}

/** Nearest visible ancestor for tree display when intermediate parents are filtered out */
function displayParentId(
  node: GeoNode,
  visibleIds: Set<number>,
  allNodes: GeoNode[],
): number | null {
  if (node.parentId === null) return null;
  let cur: number | null = node.parentId;
  while (cur !== null) {
    if (visibleIds.has(cur)) return cur;
    const parent = allNodes.find((n) => n.id === cur);
    cur = parent?.parentId ?? null;
  }
  return null;
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" }

interface QuickAddState {
  open: boolean;
  parentNode: GeoNode | null;   // the node that was clicked
  childLevel: GeoLevel;         // the level being created
}

interface QuickAddForm {
  name: string;
  pincode: string;
}

interface QuickAddErrors {
  name?: string;
  pincode?: string;
}

// ── Level card accent (summary cards) ─────────────────────────────────────────
const LEVEL_CARD: Record<GeoLevel, { bg: string; text: string; border: string }> = {
  Zone: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  Region: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  State: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  Area: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Territory: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  District: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  City: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  Town: { bg: "bg-violet-50", text: "text-violet-700", border: "border-violet-200" },
  Pincode: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-top-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Quick Add Dialog ──────────────────────────────────────────────────────────
function QuickAddDialog({
  state, onClose, onSave,
}: {
  state: QuickAddState;
  onClose: () => void;
  onSave: (form: QuickAddForm) => void;
}) {
  const [form, setForm] = useState<QuickAddForm>({ name: "", pincode: "" });
  const [errors, setErrors] = useState<QuickAddErrors>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (state.open) {
      setForm({ name: "", pincode: "" });
      setErrors({});
    }
  }, [state.open]);

  const validate = (): boolean => {
    const e: QuickAddErrors = {};
    const isPincode = state.childLevel === "Pincode";
    if (isPincode) {
      if (!form.pincode.trim()) e.pincode = "Pincode is required";
      else if (!/^\d{6}$/.test(form.pincode.trim())) e.pincode = "Enter a valid 6-digit pincode";
    } else if (!form.name.trim()) {
      e.name = "Name is required";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handlePincodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: digits, name: digits }));
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  const parentName = state.parentNode?.name ?? "";

  return (
    <Dialog open={state.open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-brand-50 border border-brand-100">
              <MapPin className="w-4 h-4 text-brand-600" />
            </div>
            Add {state.childLevel}
          </DialogTitle>
          <DialogDescription className="pt-0.5">
            Under <span className="font-semibold text-foreground">{parentName}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-1">
          {/* Parent — read-only */}
          <div className="bg-muted/30 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Parent</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{parentName}</p>
            </div>
            <div className="ml-auto">
              <LevelBadge level={state.parentNode?.level ?? "Zone"} />
            </div>
          </div>

          {/* Level — read-only */}
          <div className="bg-muted/30 rounded-lg px-3 py-2.5 flex items-center gap-2.5">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Creating Level</p>
              <p className="text-xs font-semibold text-foreground mt-0.5">{state.childLevel}</p>
            </div>
            <div className="ml-auto">
              <LevelBadge level={state.childLevel} />
            </div>
          </div>

          {state.childLevel === "Pincode" ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Pincode <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder="e.g. 411038"
                value={form.pincode}
                onChange={(e) => handlePincodeChange(e.target.value)}
                maxLength={6}
                inputMode="numeric"
                className={cn("h-9 text-sm rounded-lg font-mono", errors.pincode && "border-red-400 focus-visible:ring-red-300")}
                autoFocus
              />
              {errors.pincode && (
                <p className="text-xs text-red-500">{errors.pincode}</p>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                {state.childLevel} Name <span className="text-red-500">*</span>
              </Label>
              <Input
                placeholder={`e.g. Mumbai ${state.childLevel}`}
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className={cn("h-9 text-sm rounded-lg", errors.name && "border-red-400 focus-visible:ring-red-300")}
                autoFocus
              />
              {errors.name && (
                <p className="text-xs text-red-500">{errors.name}</p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-3">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Save {state.childLevel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ── Tree row component (legacy — kept for reference; listing uses MasterListing) ──
function TreeRow({
  node, depth, nodes, expandedIds, toggleExpand, onQuickAdd, onEdit, router,
}: {
  node: GeoNode;
  depth: number;
  nodes: GeoNode[];
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onQuickAdd: (parentNode: GeoNode) => void;
  onEdit: (id: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const children = nodes.filter(n => n.parentId === node.id);
  const hasChildren = children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const indentPx = depth * 20 + 16;
  const childLevel = CHILD_LEVEL[node.level];

  return (
    <>
      <tr className="border-b border-border/50 hover:bg-brand-50/30 transition-colors group flex">
        {/* Name cell */}
        <td className="py-2.5 pr-4 flex-[1.5] min-w-0" style={{ paddingLeft: indentPx }}>
          <div className="flex items-center gap-2 min-w-0">
            {/* Expand/collapse button */}
            <button
              onClick={() => hasChildren && toggleExpand(node.id)}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                hasChildren
                  ? "hover:bg-muted text-muted-foreground cursor-pointer"
                  : "cursor-default opacity-0 pointer-events-none",
              )}
            >
              {hasChildren && (
                isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            {/* Dot */}
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", LEVEL_DOT[node.level])} />
            {/* Name */}
            <span className="text-xs font-semibold text-foreground truncate">
              {node.name}
            </span>
            {/* Quick add button — only appears on row hover, only if there's a child level */}
            {childLevel && (
              <button
                onClick={() => onQuickAdd(node)}
                className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity ml-1 h-5 px-1.5 text-[10px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded flex items-center gap-0.5 flex-shrink-0"
              >
                <Plus className="w-2.5 h-2.5" />
                {childLevel}
              </button>
            )}
          </div>
        </td>

        {/* Level badge */}
        <td className="px-3 py-2.5 whitespace-nowrap flex-[0.8]">
          <LevelBadge level={node.level} />
        </td>

        {/* Status */}
        <td className="px-3 py-2.5 flex-[0.8]">
          <StatusBadge status={node.status} />
        </td>

        {/* Actions */}
        <td className="px-4 py-2 whitespace-nowrap flex-shrink-0 w-32">
          <button
            onClick={() => onEdit(node.id)}
            className="h-7 px-2.5 text-[11px] font-medium border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-1"
          >
            <Edit2 className="w-3 h-3" /> Edit
          </button>
        </td>
      </tr>

      {/* Children (recursive) */}
      {hasChildren && isExpanded && (
        <TreeRows
          nodes={nodes}
          parentId={node.id}
          depth={depth + 1}
          expandedIds={expandedIds}
          toggleExpand={toggleExpand}
          onQuickAdd={onQuickAdd}
          onEdit={onEdit}
          router={router}
        />
      )}
    </>
  );
}

// Renders all direct children of parentId
function TreeRows(props: {
  nodes: GeoNode[];
  parentId: number | null;
  depth: number;
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onQuickAdd: (parentNode: GeoNode) => void;
  onEdit: (id: number) => void;
  router: ReturnType<typeof useRouter>;
}) {
  const { nodes, parentId, depth, ...rest } = props;
  const children = nodes.filter(n => n.parentId === parentId);
  return (
    <>
      {children.map(node => (
        <TreeRow key={node.id} node={node} depth={depth} nodes={nodes} {...rest} />
      ))}
    </>
  );
}

// ── Main List Page ─────────────────────────────────────────────────────────────
// ── Listing Container and Master Listing Imports ─────────────────────────────────
import { MasterListing } from "@/components/listing/MasterListing";
import { ColumnConfig, FilterState, SortState, ActionItemConfig } from "@/components/listing/types";

// ── Geography Master Tab (unchanged listing behaviour) ─────────────────────────
export function GeographyMasterTab() {
  const router = useRouter();
  const [nodes, setNodes] = useState<GeoNode[]>([]);
  const [filters, setFilters] = useState<FilterState>({});
  const [sort, setSort] = useState<SortState>({ key: "", direction: "none" });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Tree expand state — default: Zone nodes expanded
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([1, 2]));

  const [statusTab, setStatusTab] = useState<StatusTab>("all");
  const [deleteTarget, setDeleteTarget] = useState<GeoNode | null>(null);

  // Quick add dialog state
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    open: false,
    parentNode: null,
    childLevel: "Region",
  });

  // Confirm dialog state — removed (status changes via Edit form only)

  // Toast
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // Load on mount + restore status tab
  useEffect(() => {
    setNodes(loadGeoNodes());
    setStatusTab(readStoredStatusTab());
  }, []);

  // Refresh data when returning to the page (e.g. after edit)
  useEffect(() => {
    const onFocus = () => setNodes(loadGeoNodes());
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const handleStatusTabChange = useCallback((tab: string) => {
    const next = tab as StatusTab;
    setStatusTab(next);
    sessionStorage.setItem(GEO_LIST_TAB_KEY, next);
  }, []);

  const statusTabCounts = useMemo(() => ({
    all: nodes.length,
    active: nodes.filter((n) => n.status === "active").length,
    inactive: nodes.filter((n) => n.status === "inactive").length,
  }), [nodes]);

  const visibleNodes = useMemo(() => {
    if (statusTab === "all") return nodes;
    return nodes.filter((n) => n.status === statusTab);
  }, [nodes, statusTab]);

  const visibleIds = useMemo(
    () => new Set(visibleNodes.map((n) => n.id)),
    [visibleNodes],
  );

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Summary counts per level (respects status tab)
  const levelCounts = useMemo<Record<GeoLevel, number>>(() => {
    const counts = {} as Record<GeoLevel, number>;
    for (const l of LEVELS) {
      counts[l] = visibleNodes.filter((n) => n.level === l).length;
    }
    return counts;
  }, [visibleNodes]);

  const searchVal = (filters.search as string) || "";
  const filterLevel = (filters.level as string) || "";
  const hasFilters = searchVal.trim() !== "" || filterLevel !== "";

  const setFilterLevel = (lvl: string) => {
    setFilters(prev => {
      const next = { ...prev };
      if (!lvl) {
        delete next.level;
      } else {
        next.level = lvl;
      }
      return next;
    });
  };

  // Tree expand structure flattened for MasterListing
  const treeData = useMemo(() => {
    const result: (GeoNode & { depth: number })[] = [];
    function traverse(displayParent: number | null, depth: number) {
      const children = visibleNodes.filter(
        (n) => displayParentId(n, visibleIds, nodes) === displayParent,
      );
      for (const child of children) {
        result.push({ ...child, depth });
        if (expandedIds.has(child.id)) {
          traverse(child.id, depth + 1);
        }
      }
    }
    traverse(null, 0);
    return result;
  }, [visibleNodes, visibleIds, nodes, expandedIds]);

  const displayData = useMemo(() => {
    if (hasFilters) {
      let r = [...visibleNodes];
      if (searchVal.trim()) {
        const t = searchVal.toLowerCase();
        r = r.filter(n =>
          n.name.toLowerCase().includes(t) ||
          (n.pincode && n.pincode.includes(t)),
        );
      }
      if (filterLevel) {
        r = r.filter(n => n.level === filterLevel);
      }
      return r.map(n => ({ ...n, depth: 0 }));
    }
    return treeData;
  }, [visibleNodes, hasFilters, searchVal, filterLevel, treeData]);

  useEffect(() => {
    setPage(1);
  }, [filters, sort, pageSize, statusTab]);

  const paginatedData = useMemo(() => {
    const start = (page - 1) * pageSize;
    return displayData.slice(start, start + pageSize);
  }, [displayData, page, pageSize]);

  const handleView = (id: number) => router.push(`/masters/geography/${id}`);
  const handleEdit = (id: number) => router.push(`/masters/geography/${id}/edit`);

  const actions = useMemo<ActionItemConfig<GeoNode & { depth: number }>[]>(() => [
    {
      label: "View",
      action: "view",
      icon: Eye,
      onClick: (row) => handleView(row.id),
    },
    {
      label: "Edit",
      action: "edit",
      icon: Edit2,
      onClick: (row) => handleEdit(row.id),
    },
    {
      label: "Delete",
      action: "delete",
      icon: Trash2,
      variant: "destructive",
      onClick: (row) => setDeleteTarget(row),
    },
  ], []);

  const handleDeleted = (deactivatedCount: number) => {
    setNodes(loadGeoNodes());
    setDeleteTarget(null);
    showToast(
      deactivatedCount > 1
        ? `Geography and ${deactivatedCount - 1} child record(s) deactivated.`
        : "Geography deactivated successfully.",
    );
  };

  const handleToggleStatus = useCallback((row: GeoNode, active: boolean) => {
    if (active === (row.status === "active")) return;

    if (active) {
      if (row.parentId !== null) {
        const parent = nodes.find((n) => n.id === row.parentId);
        if (parent && parent.status !== "active") {
          showToast(`Cannot activate. Parent "${parent.name}" is inactive. Activate the parent first.`, "error");
          return;
        }
      }
    } else {
      const hasActiveChildren = nodes.some(
        (n) => n.parentId === row.id && n.status === "active",
      );
      if (hasActiveChildren) {
        showToast("Deactivate all child nodes before deactivating this geography.", "error");
        return;
      }
    }

    const updated = nodes.map((n) =>
      n.id === row.id
        ? {
            ...n,
            status: active ? ("active" as const) : ("inactive" as const),
            updatedDate: todayStr(),
            updatedBy: DEFAULT_GEO_USER,
          }
        : n,
    );
    saveGeoNodes(updated);
    setNodes(updated);
    showToast(`Geography ${active ? "activated" : "deactivated"} successfully.`);
  }, [nodes, showToast]);

  // ── Quick Add ─────────────────────────────────────────────────────────────
  const handleQuickAdd = (parentNode: GeoNode) => {
    const childLevel = CHILD_LEVEL[parentNode.level];
    if (!childLevel) return;
    // Auto-expand parent so user sees the new item after save
    setExpandedIds(prev => new Set([...prev, parentNode.id]));
    setQuickAdd({ open: true, parentNode, childLevel });
  };

  const handleQuickAddSave = (form: QuickAddForm) => {
    const allNodes = loadGeoNodes();
    const isPincode = quickAdd.childLevel === "Pincode";
    const name = isPincode ? form.pincode.trim() : form.name.trim();
    const newId = Math.max(0, ...allNodes.map(n => n.id)) + 1;
    const newNode: GeoNode = {
      id: newId,
      level: quickAdd.childLevel,
      name,
      parentId: quickAdd.parentNode?.id ?? null,
      pincode: isPincode ? form.pincode.trim() : form.pincode.trim(),
      status: "active",
      createdBy: DEFAULT_GEO_USER,
      createdDate: todayStr(),
      updatedBy: DEFAULT_GEO_USER,
      updatedDate: todayStr(),
    };
    const updated = [...allNodes, newNode];
    saveGeoNodes(updated);
    setNodes(updated);
    setQuickAdd({ open: false, parentNode: null, childLevel: "State" });
    showToast(`${quickAdd.childLevel} "${name}" added successfully.`);
  };

  const closeQuickAdd = () => {
    setQuickAdd(prev => ({ ...prev, open: false }));
  };

  const columns = useMemo<ColumnConfig<GeoNode & { depth: number }>[]>(() => [
    {
      key: "name",
      header: "Geography Name",
      render: (val, row) => {
        const hasChildren = visibleNodes.some(
          (n) => displayParentId(n, visibleIds, nodes) === row.id,
        );
        const isExpanded = expandedIds.has(row.id);
        const childLevel = CHILD_LEVEL[row.level];
        const indentPx = row.depth * 20 + 16;

        if (hasFilters) {
          const path = getAncestorPath(row, nodes);
          return (
            <div className="flex items-center gap-2 min-w-0">
              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", LEVEL_DOT[row.level])} />
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="text-xs font-semibold text-foreground truncate">
                    {row.name}
                  </span>
                  {childLevel && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleQuickAdd(row);
                      }}
                      className="opacity-0 group-hover:opacity-100 transition-opacity h-5 px-1.5 text-[10px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded flex items-center gap-0.5 flex-shrink-0"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      {childLevel}
                    </button>
                  )}
                </div>
                {path.length > 1 && (
                  <div className="mt-0.5">
                    <GeographyBreadcrumb path={path} excludeLast linked />
                  </div>
                )}
              </div>
            </div>
          );
        }

        return (
          <div className="flex items-center gap-2 min-w-0" style={{ paddingLeft: indentPx }}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (hasChildren) toggleExpand(row.id);
              }}
              className={cn(
                "w-5 h-5 rounded flex items-center justify-center flex-shrink-0 transition-colors",
                hasChildren
                  ? "hover:bg-muted text-muted-foreground cursor-pointer"
                  : "cursor-default opacity-0 pointer-events-none",
              )}
            >
              {hasChildren && (
                isExpanded
                  ? <ChevronDown className="w-3.5 h-3.5" />
                  : <ChevronRight className="w-3.5 h-3.5" />
              )}
            </button>
            <span className={cn("w-2 h-2 rounded-full flex-shrink-0", LEVEL_DOT[row.level])} />
            <span className="text-xs font-semibold text-foreground truncate">
              {row.name}
            </span>
            {childLevel && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuickAdd(row);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity h-5 px-1.5 text-[10px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded flex items-center gap-0.5 flex-shrink-0"
              >
                <Plus className="w-2.5 h-2.5" />
                {childLevel}
              </button>
            )}
          </div>
        );
      }
    },
    {
      key: "level",
      header: "Level",
      filterable: true,
      filterType: "dropdown",
      width: "120px",
      filterOptions: LEVELS.map(l => ({ label: l, value: l })),
      render: (val, row) => <LevelBadge level={row.level} />
    },
    {
      key: "status",
      header: "Status",
      width: "140px",
      render: (_val, row) => (
        <ListingStatusToggle
          active={row.status === "active"}
          onChange={(active) => handleToggleStatus(row, active)}
        />
      ),
    },
  ], [nodes, visibleNodes, visibleIds, expandedIds, hasFilters, handleToggleStatus]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-9 gap-2">
        {LEVELS.map(level => {
          const cfg = LEVEL_CARD[level];
          const isActive = filterLevel === level;
          return (
            <button
              key={level}
              onClick={() => setFilterLevel(isActive ? "" : level)}
              className={cn(
                "rounded-xl border p-3 text-left transition-all duration-150",
                isActive
                  ? `${cfg.bg} ${cfg.border} ring-2 ring-brand-400 ring-offset-1`
                  : `bg-white border-border hover:${cfg.bg} hover:${cfg.border}`,
              )}
            >
              <p className={cn("text-xl font-bold leading-none", isActive ? cfg.text : "text-foreground")}>
                {levelCounts[level]}
              </p>
              <p className={cn("text-[11px] font-medium mt-1", isActive ? cfg.text : "text-muted-foreground")}>
                {level}{levelCounts[level] !== 1 ? "s" : ""}
              </p>
            </button>
          );
        })}
      </div>

      <Tabs value={statusTab} onValueChange={handleStatusTabChange} className="space-y-4">
        <TabsList>
          {STATUS_TABS.map((t) => (
            <TabsTrigger key={t.value} value={t.value} className="text-xs">
              {t.label} ({statusTabCounts[t.value]})
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="space-y-4">
          <MasterListing<GeoNode & { depth: number }>
            columns={columns}
            data={paginatedData}
            totalRecords={displayData.length}
            page={page}
            pageSize={pageSize}
            onPageChange={setPage}
            onPageSizeChange={setPageSize}
            onSortChange={setSort}
            onFilterChange={setFilters}
            onAdd={() => router.push("/masters/geography/add")}
            addLabel="Add Geography"
            emptyMessage="geography nodes"
            searchPlaceholder="Search geography name or pincode…"
            currentFilters={filters}
            currentSort={sort}
            actions={actions}
          />

          {!hasFilters && (
            <div className="flex items-center gap-2 px-4 py-2.5 border border-border rounded-xl bg-muted/20">
              <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
              <p className="text-[11px] text-muted-foreground">
                Hover over any node to reveal the <strong>quick add</strong> button for its child level.
              </p>
            </div>
          )}
        </div>
      </Tabs>

      <QuickAddDialog
        state={quickAdd}
        onClose={closeQuickAdd}
        onSave={handleQuickAddSave}
      />

      <GeographyDeleteDialog
        node={deleteTarget}
        nodes={nodes}
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onDeleted={handleDeleted}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
