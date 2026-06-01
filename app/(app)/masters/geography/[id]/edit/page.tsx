"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, AlertCircle, MapPin, Info } from "lucide-react";
import {
  type GeoNode, type GeoLevel,
  PARENT_LEVEL, loadGeoNodes, saveGeoNodes, todayStr,
} from "../../geo-data";
import { LevelBadge } from "../../components/LevelBadge";

// ── Placeholder per level ─────────────────────────────────────────────────────
const NAME_PLACEHOLDER: Record<GeoLevel, string> = {
  Zone: "e.g. West Zone", State: "e.g. Maharashtra", Region: "e.g. Mumbai Region",
  Area: "e.g. Mumbai Central Area", Territory: "e.g. Dadar-Parel Territory",
  Locality: "e.g. Dadar Locality", City: "e.g. Dadar",
};

// ── Status toggle ─────────────────────────────────────────────────────────────
function StatusToggle({ value, onChange }: { value: "active" | "inactive"; onChange: (v: "active" | "inactive") => void }) {
  return (
    <div className="flex rounded-lg border border-border overflow-hidden h-9">
      {(["active", "inactive"] as const).map(opt => (
        <button
          key={opt}
          type="button"
          onClick={() => onChange(opt)}
          className={cn(
            "flex-1 text-xs font-medium transition-colors px-3",
            value === opt
              ? opt === "active" ? "bg-emerald-600 text-white" : "bg-slate-500 text-white"
              : "text-muted-foreground hover:bg-muted",
          )}
        >
          {opt.charAt(0).toUpperCase() + opt.slice(1)}
        </button>
      ))}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function EditGeographyPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [nodes, setNodes] = useState<GeoNode[]>([]);
  const [existing, setExisting] = useState<GeoNode | null>(null);
  const [form, setForm] = useState({
    parentId: null as number | null,
    name: "",
    code: "",
    pincode: "",
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const all = loadGeoNodes();
    setNodes(all);
    const found = all.find(n => n.id === id) ?? null;
    setExisting(found);
    if (found) {
      setForm({
        parentId: found.parentId,
        name: found.name,
        code: found.code,
        pincode: found.pincode,
        status: found.status,
      });
    }
  }, [id]);

  // Parent options: same level as existing.level minus self
  const parentOptions = useMemo(() => {
    if (!existing) return [];
    const requiredParentLevel = PARENT_LEVEL[existing.level];
    if (!requiredParentLevel) return []; // Zone — no parent
    return nodes.filter(n => n.level === requiredParentLevel && n.status === "active" && n.id !== id);
  }, [existing, nodes, id]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) { e.name = "Name is required"; }
    if (form.name.trim().length > 100) { e.name = "Name must be 100 characters or less"; }
    if (existing && PARENT_LEVEL[existing.level] !== null && !form.parentId) {
      e.parentId = "Parent is required for this level";
    }
    if (existing?.level === "City" && !form.pincode.trim()) {
      e.pincode = "Pincode is required for City level";
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      e.pincode = "Pincode must be exactly 6 digits";
    }
    if (form.code && !/^[A-Z0-9]{1,10}$/.test(form.code)) {
      e.code = "Code must be alphanumeric, max 10 characters";
    }
    // Duplicate check (excluding self)
    if (existing && form.name.trim()) {
      const parent = form.parentId ? nodes.find(n => n.id === form.parentId) : null;
      const duplicate = nodes.find(n =>
        n.id !== id &&
        n.level === existing.level &&
        n.name.toLowerCase() === form.name.trim().toLowerCase() &&
        n.parentId === form.parentId,
      );
      if (duplicate) {
        e.name = `A ${existing.level} with this name already exists${parent ? ` under ${parent.name}` : ""}.`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !existing) return;
    const updated = nodes.map(n =>
      n.id === id
        ? {
            ...n,
            parentId: form.parentId,
            name: form.name.trim(),
            code: form.code,
            pincode: form.pincode,
            status: form.status,
            updatedDate: todayStr(),
          }
        : n,
    );
    saveGeoNodes(updated);
    router.push(`/masters/geography/${id}`);
  };

  if (nodes.length > 0 && !existing) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Geography node not found</p>
          <button onClick={() => router.push("/masters/geography")} className="text-xs text-brand-600 hover:underline">
            ← Back to Geography
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!existing) return null; // Loading

  const needsParent = PARENT_LEVEL[existing.level] !== null;
  const parentNode = form.parentId ? nodes.find(n => n.id === form.parentId) : null;

  return (
    <AppLayout>
      <div className="max-w-[560px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push(`/masters/geography/${id}`)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <p className="text-[11px] text-muted-foreground">Masters &rsaquo; Geography &rsaquo; Edit</p>
            <h2 className="text-sm font-semibold text-foreground leading-tight">Edit — {existing.name}</h2>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">Edit Geography Node</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Level: <strong>{existing.level}</strong></p>
            </div>
            <LevelBadge level={existing.level} />
          </div>

          <div className="p-5 space-y-4">

            {/* 1. Level — disabled with note */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Level</Label>
              <div className="h-9 px-3 border border-border rounded-lg bg-muted/30 flex items-center">
                <LevelBadge level={existing.level} />
              </div>
              <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">Level cannot be changed after creation.</p>
              </div>
            </div>

            {/* 2. Parent (enabled) */}
            {needsParent && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Parent ({PARENT_LEVEL[existing.level]}) <span className="text-red-500">*</span>
                </Label>
                <select
                  value={form.parentId ?? ""}
                  onChange={e => set("parentId", e.target.value ? Number(e.target.value) : null)}
                  className={cn(
                    "w-full h-9 px-3 text-sm border rounded-lg bg-background appearance-none cursor-pointer",
                    errors.parentId ? "border-red-400" : "border-border",
                  )}
                >
                  <option value="">Select {PARENT_LEVEL[existing.level]}…</option>
                  {parentOptions.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                {errors.parentId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.parentId}
                  </p>
                )}
              </div>
            )}

            {/* 3. Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={e => set("name", e.target.value)}
                placeholder={NAME_PLACEHOLDER[existing.level]}
                maxLength={100}
                className={cn("h-9 text-sm rounded-lg", errors.name && "border-red-400")}
              />
              {errors.name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.name}
                </p>
              )}
            </div>

            {/* 4. Code */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Code <span className="text-muted-foreground text-[11px]">(optional)</span></Label>
              <Input
                value={form.code}
                onChange={e => set("code", e.target.value.toUpperCase().slice(0, 10))}
                placeholder="e.g. WZ"
                maxLength={10}
                className={cn("h-9 text-sm rounded-lg font-mono", errors.code && "border-red-400")}
              />
              {errors.code && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.code}
                </p>
              )}
            </div>

            {/* 5. Pincode (City only) */}
            {existing.level === "City" && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.pincode}
                  onChange={e => {
                    const v = e.target.value.replace(/\D/g, "").slice(0, 6);
                    set("pincode", v);
                  }}
                  placeholder="e.g. 400014"
                  maxLength={6}
                  inputMode="numeric"
                  className={cn("h-9 text-sm rounded-lg font-mono", errors.pincode && "border-red-400")}
                />
                {errors.pincode && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.pincode}
                  </p>
                )}
              </div>
            )}

            {/* 6. Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <StatusToggle value={form.status} onChange={v => set("status", v)} />
            </div>

            {/* Record info */}
            <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{existing.createdDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated</span>
                  <p className="font-medium">{existing.updatedDate}</p>
                </div>
              </div>
            </div>

          </div>

          {/* Form footer */}
          <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => router.push(`/masters/geography/${id}`)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleSave}
            >
              <Save className="w-3.5 h-3.5" /> Save Changes
            </Button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
