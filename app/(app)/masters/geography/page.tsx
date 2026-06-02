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
  Plus, Search, ChevronRight, ChevronDown, Edit2,
  Globe, CheckCircle2, XCircle, X, MapPin, Layers, Save, AlertTriangle,
} from "lucide-react";
import {
  type GeoNode, type GeoLevel,
  LEVELS, CHILD_LEVEL, loadGeoNodes, saveGeoNodes, todayStr,
  getAncestorPath,
} from "./geo-data";
import { LevelBadge, LEVEL_DOT } from "./components/LevelBadge";
import { GeographyBreadcrumb } from "./components/GeographyBreadcrumb";

// ── Types ─────────────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" }

interface QuickAddState {
  open: boolean;
  parentNode: GeoNode | null;   // the node that was clicked
  childLevel: GeoLevel;         // the level being created
}

interface QuickAddForm {
  name: string;
  code: string;
  pincode: string;
}

interface QuickAddErrors {
  name?: string;
  pincode?: string;
}

// ── Level card accent (summary cards) ─────────────────────────────────────────
const LEVEL_CARD: Record<GeoLevel, { bg: string; text: string; border: string }> = {
  Zone: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  State: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  Region: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  Area: { bg: "bg-amber-50", text: "text-amber-700", border: "border-amber-200" },
  Territory: { bg: "bg-orange-50", text: "text-orange-700", border: "border-orange-200" },
  Locality: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  City: { bg: "bg-slate-100", text: "text-slate-700", border: "border-slate-200" },
};

// ── Confirm Dialog ────────────────────────────────────────────────────────────
function ConfirmDialog({
  open, onClose, onConfirm, title, description, confirmLabel = "Confirm", destructive,
}: {
  open: boolean; onClose: () => void; onConfirm: () => void;
  title: string; description: string; confirmLabel?: string; destructive?: boolean;
}) {
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
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs gap-1.5",
              destructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white"
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

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
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
  const [form, setForm] = useState<QuickAddForm>({ name: "", code: "", pincode: "" });
  const [errors, setErrors] = useState<QuickAddErrors>({});

  // Reset form when dialog opens
  useEffect(() => {
    if (state.open) {
      setForm({ name: "", code: "", pincode: "" });
      setErrors({});
    }
  }, [state.open]);

  const validate = (): boolean => {
    const e: QuickAddErrors = {};
    if (!form.name.trim()) e.name = "Name is required";
    if (state.childLevel === "City" && form.pincode && !/^[1-9][0-9]{5}$/.test(form.pincode.trim())) {
      e.pincode = "Enter a valid 6-digit pincode";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
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

          {/* Name */}
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

          {/* Code (optional) */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Code <span className="text-muted-foreground font-normal">(optional)</span></Label>
            <Input
              placeholder="e.g. MUM"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
              className="h-9 text-sm rounded-lg font-mono"
            />
          </div>

          {/* Pincode — only for City */}
          {state.childLevel === "City" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Pincode <span className="text-muted-foreground font-normal">(optional)</span></Label>
              <Input
                placeholder="6-digit pincode"
                value={form.pincode}
                onChange={e => setForm(f => ({ ...f, pincode: e.target.value }))}
                maxLength={6}
                className={cn("h-9 text-sm rounded-lg font-mono", errors.pincode && "border-red-400 focus-visible:ring-red-300")}
              />
              {errors.pincode && (
                <p className="text-xs text-red-500">{errors.pincode}</p>
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

// ── Tree row component ────────────────────────────────────────────────────────
function TreeRow({
  node, depth, nodes, expandedIds, toggleExpand, onQuickAdd, onEdit, onToggleStatus, router,
}: {
  node: GeoNode;
  depth: number;
  nodes: GeoNode[];
  expandedIds: Set<number>;
  toggleExpand: (id: number) => void;
  onQuickAdd: (parentNode: GeoNode) => void;
  onEdit: (id: number) => void;
  onToggleStatus: (node: GeoNode) => void;
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
            {/* Code badge */}
            {node.code && (
              <span className="font-mono text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-px rounded flex-shrink-0">
                {node.code}
              </span>
            )}
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

        {/* Pincode */}
        <td className="px-3 py-2.5 flex-[0.8]">
          {node.level === "City" && node.pincode
            ? <span className="font-mono text-xs text-muted-foreground">{node.pincode}</span>
            : <span className="text-muted-foreground/30 text-xs">—</span>
          }
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
          onToggleStatus={onToggleStatus}
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
  onToggleStatus: (node: GeoNode) => void;
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
export default function GeographyListPage() {
  const router = useRouter();
  const [nodes, setNodes] = useState<GeoNode[]>([]);
  const [search, setSearch] = useState("");
  const [filterLevel, setFilterLevel] = useState<GeoLevel | "">("");
  // Tree expand state — default: Zone nodes expanded
  const [expandedIds, setExpandedIds] = useState<Set<number>>(new Set([1, 2]));

  // Quick add dialog state
  const [quickAdd, setQuickAdd] = useState<QuickAddState>({
    open: false,
    parentNode: null,
    childLevel: "State",
  });

  // Confirm dialog state
  const [confirmNode, setConfirmNode] = useState<GeoNode | null>(null);
  const [confirmMsg, setConfirmMsg] = useState({ title: "", description: "", isDeactivate: false });

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

  // Load on mount
  useEffect(() => { setNodes(loadGeoNodes()); }, []);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Summary counts per level
  const levelCounts = useMemo<Record<GeoLevel, number>>(() => {
    const counts = {} as Record<GeoLevel, number>;
    for (const l of LEVELS) {
      counts[l] = nodes.filter(n => n.level === l && n.status === "active").length;
    }
    return counts;
  }, [nodes]);

  // Are any filters active?
  const hasFilters = search.trim() !== "" || filterLevel !== "";

  // Filtered flat list (used when any filter active)
  const flatFiltered = useMemo(() => {
    if (!hasFilters) return [];
    let r = [...nodes];
    if (search.trim()) {
      const t = search.toLowerCase();
      r = r.filter(n =>
        n.name.toLowerCase().includes(t) ||
        n.code.toLowerCase().includes(t) ||
        (n.pincode && n.pincode.includes(t)),
      );
    }
    if (filterLevel) r = r.filter(n => n.level === filterLevel);
    return r;
  }, [nodes, search, filterLevel, hasFilters]);

  // ── Status toggle logic ──────────────────────────────────────────────────────
  const handleToggleStatus = (node: GeoNode) => {
    if (node.status === "active") {
      // Deactivate: check active children
      const hasActiveChildren = nodes.some(n => n.parentId === node.id && n.status === "active");
      if (hasActiveChildren) {
        showToast("Cannot deactivate. Deactivate all children first.", "error");
        return;
      }
      setConfirmMsg({
        title: `Deactivate "${node.name}"?`,
        description: "This will hide it from all assignment dropdowns.",
        isDeactivate: true,
      });
      setConfirmNode(node);
    } else {
      // Activate: check parent is active
      if (node.parentId !== null) {
        const parent = nodes.find(n => n.id === node.parentId);
        if (parent && parent.status !== "active") {
          showToast(`Cannot activate. Parent "${parent.name}" is inactive. Activate the parent first.`, "error");
          return;
        }
      }
      // Activate directly
      const updated = nodes.map(n =>
        n.id === node.id ? { ...n, status: "active" as const, updatedDate: todayStr() } : n,
      );
      setNodes(updated);
      saveGeoNodes(updated);
      showToast("Geography activated successfully.");
    }
  };

  const confirmDeactivate = () => {
    if (!confirmNode) return;
    const updated = nodes.map(n =>
      n.id === confirmNode.id ? { ...n, status: "inactive" as const, updatedDate: todayStr() } : n,
    );
    setNodes(updated);
    saveGeoNodes(updated);
    showToast("Geography deactivated successfully.");
  };

  const handleEdit = (id: number) => router.push(`/masters/geography/${id}/edit`);

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
    const newId = Math.max(0, ...allNodes.map(n => n.id)) + 1;
    const newNode: GeoNode = {
      id: newId,
      level: quickAdd.childLevel,
      name: form.name.trim(),
      code: form.code.trim(),
      parentId: quickAdd.parentNode?.id ?? null,
      pincode: form.pincode.trim(),
      status: "active",
      createdDate: todayStr(),
      updatedDate: todayStr(),
    };
    const updated = [...allNodes, newNode];
    saveGeoNodes(updated);
    setNodes(updated);
    setQuickAdd({ open: false, parentNode: null, childLevel: "State" });
    showToast(`${quickAdd.childLevel} "${form.name.trim()}" added successfully.`);
  };

  const closeQuickAdd = () => {
    setQuickAdd(prev => ({ ...prev, open: false }));
  };

  const clearFilters = () => { setSearch(""); setFilterLevel(""); };

  return (
    <AppLayout>
      <div className="space-y-4">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] text-muted-foreground mb-0.5">
              User Management &rsaquo; Geography
            </p>
            <h1 className="text-xl font-bold text-foreground">Geography</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage the 7-level geography hierarchy</p>
          </div>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => router.push("/masters/geography/add")}
          >
            <Plus className="w-3.5 h-3.5" /> Add Geography
          </Button>
        </div>

        {/* ── Level summary cards ── */}
        <div className="grid grid-cols-7 gap-2">
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

        {/* ── Filter bar ── */}
        <div className="bg-white rounded-xl border border-border px-4 py-2 flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search name, code, pincode…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>

          {/* Level dropdown */}
          <select
            value={filterLevel}
            onChange={e => setFilterLevel(e.target.value as GeoLevel | "")}
            className="h-8 px-2 text-xs border border-border rounded-lg bg-background text-foreground appearance-none pr-7 cursor-pointer"
            style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%236b7280'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 6px center", backgroundSize: "14px" }}
          >
            <option value="">All Levels</option>
            {LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>

          {/* Clear filters */}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="text-xs text-brand-600 hover:text-brand-700 hover:underline"
            >
              Clear Filters
            </button>
          )}

          {/* Count */}
          <p className="ml-auto text-[11px] text-muted-foreground whitespace-nowrap">
            {hasFilters
              ? `${flatFiltered.length} result${flatFiltered.length !== 1 ? "s" : ""}`
              : `${nodes.length} total nodes`
            }
          </p>
        </div>

        {/* ── Table ── */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border flex">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground flex-[1.5]">Name</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground flex-[0.8]">Level</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-foreground flex-[0.8]">Pincode</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground flex-shrink-0 w-32">Actions</th>
                </tr>
              </thead>
              <tbody>
                {nodes.length === 0 ? (
                  /* Loading skeleton */
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border">
                      {Array.from({ length: 3 }).map((_, j) => (
                        <td key={j} className="px-4 py-3">
                          <div className="h-3 bg-muted animate-pulse rounded w-24" />
                        </td>
                      ))}
                    </tr>
                  ))
                ) : hasFilters ? (
                  /* ── FLAT LIST (filters active) ── */
                  flatFiltered.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-16 text-center">
                        <div className="flex flex-col items-center gap-2">
                          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                            <Globe className="w-5 h-5 text-muted-foreground" />
                          </div>
                          <p className="text-sm font-medium text-foreground">No results found</p>
                          <p className="text-xs text-muted-foreground">Try adjusting your filters.</p>
                          <button onClick={clearFilters} className="text-xs text-brand-600 hover:underline mt-1">
                            Clear filters
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    flatFiltered.map(node => {
                      const path = getAncestorPath(node, nodes);
                      const childLevel = CHILD_LEVEL[node.level];
                      return (
                        <tr key={node.id} className="border-b border-border/50 hover:bg-brand-50/30 transition-colors group flex">
                          {/* Name + breadcrumb */}
                          <td className="px-4 py-2 flex-[1.5] min-w-0">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={cn("w-2 h-2 rounded-full flex-shrink-0", LEVEL_DOT[node.level])} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <span className="text-xs font-semibold text-foreground truncate">
                                    {node.name}
                                  </span>
                                  {node.code && (
                                    <span className="font-mono text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-px rounded flex-shrink-0">
                                      {node.code}
                                    </span>
                                  )}
                                  {/* Quick add */}
                                  {childLevel && (
                                    <button
                                      onClick={() => handleQuickAdd(node)}
                                      className="opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-opacity h-5 px-1.5 text-[10px] font-semibold border border-brand-200 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded flex items-center gap-0.5 flex-shrink-0"
                                    >
                                      <Plus className="w-2.5 h-2.5" />
                                      {childLevel}
                                    </button>
                                  )}
                                </div>
                                {/* Ancestor breadcrumb */}
                                {path.length > 1 && (
                                  <div className="mt-0.5">
                                    <GeographyBreadcrumb path={path} excludeLast linked />
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="px-3 py-2.5 whitespace-nowrap flex-[0.8]">
                            <LevelBadge level={node.level} />
                          </td>

                          <td className="px-3 py-2.5 flex-[0.8]">
                            {node.level === "City" && node.pincode
                              ? <span className="font-mono text-xs text-muted-foreground">{node.pincode}</span>
                              : <span className="text-muted-foreground/30 text-xs">—</span>
                            }
                          </td>

                          <td className="px-4 py-2 whitespace-nowrap flex-shrink-0 w-32">
                            <button
                              onClick={() => handleEdit(node.id)}
                              className="h-7 px-2.5 text-[11px] font-medium border border-border rounded-md hover:bg-muted transition-colors flex items-center gap-1"
                            >
                              <Edit2 className="w-3 h-3" /> Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )
                ) : (
                  /* ── TREE VIEW (no filters) ── */
                  <TreeRows
                    nodes={nodes}
                    parentId={null}
                    depth={0}
                    expandedIds={expandedIds}
                    toggleExpand={toggleExpand}
                    onQuickAdd={handleQuickAdd}
                    onEdit={handleEdit}
                    onToggleStatus={handleToggleStatus}
                    router={router}
                  />
                )}
              </tbody>
            </table>
          </div>

          {/* Footer note */}
          <div className="flex items-center gap-2 px-4 py-2.5 border-t border-border bg-muted/20">
            <Layers className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
            <p className="text-[11px] text-muted-foreground">
              Hover over any node to reveal the <strong>quick add</strong> button for its child level.
            </p>
          </div>
        </div>

      </div>

      {/* ── Quick Add Dialog ── */}
      <QuickAddDialog
        state={quickAdd}
        onClose={closeQuickAdd}
        onSave={handleQuickAddSave}
      />

      {/* ── Deactivate Confirm Dialog ── */}
      <ConfirmDialog
        open={!!confirmNode}
        onClose={() => setConfirmNode(null)}
        onConfirm={confirmDeactivate}
        title={confirmMsg.title}
        description={confirmMsg.description}
        confirmLabel="Deactivate"
        destructive
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
