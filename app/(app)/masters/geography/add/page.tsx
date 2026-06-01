"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, AlertCircle, MapPin } from "lucide-react";
import {
  type GeoNode, type GeoLevel,
  LEVELS, PARENT_LEVEL, loadGeoNodes, saveGeoNodes, nextGeoId, todayStr,
} from "../geo-data";
import { LevelBadge } from "../components/LevelBadge";

// ── Placeholder per level ─────────────────────────────────────────────────────
const NAME_PLACEHOLDER: Record<GeoLevel, string> = {
  Zone: "e.g. West Zone", State: "e.g. Maharashtra", Region: "e.g. Mumbai Region",
  Area: "e.g. Mumbai Central Area", Territory: "e.g. Dadar-Parel Territory",
  Locality: "e.g. Dadar Locality", City: "e.g. Dadar",
};

// ── Toggle button: Active / Inactive ─────────────────────────────────────────
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
              ? opt === "active"
                ? "bg-emerald-600 text-white"
                : "bg-slate-500 text-white"
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
export default function AddGeographyPage() {
  const router = useRouter();
  const nodes = loadGeoNodes();

  const [form, setForm] = useState({
    level: "" as GeoLevel | "",
    parentId: null as number | null,
    name: "",
    code: "",
    pincode: "",
    status: "active" as "active" | "inactive",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Nodes eligible as parent (one level above, active only)
  const parentOptions = useMemo(() => {
    if (!form.level) return [];
    const requiredParentLevel = PARENT_LEVEL[form.level];
    if (!requiredParentLevel) return []; // Zone
    return nodes.filter(n => n.level === requiredParentLevel && n.status === "active");
  }, [form.level, nodes]);

  const set = (k: string, v: unknown) => setForm(f => ({ ...f, [k]: v }));

  const handleLevelChange = (level: GeoLevel | "") => {
    set("level", level);
    set("parentId", null); // Clear parent when level changes
    setErrors({});
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.level) { e.level = "Level is required"; }
    if (!form.name.trim()) { e.name = "Name is required"; }
    if (form.name.trim().length > 100) { e.name = "Name must be 100 characters or less"; }
    if (form.level && PARENT_LEVEL[form.level] !== null && !form.parentId) {
      e.parentId = "Parent is required for this level";
    }
    if (form.level === "City" && !form.pincode.trim()) {
      e.pincode = "Pincode is required for City level";
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      e.pincode = "Pincode must be exactly 6 digits";
    }
    if (form.code && !/^[A-Z0-9]{1,10}$/.test(form.code)) {
      e.code = "Code must be alphanumeric, max 10 characters";
    }
    // Duplicate check
    if (form.level && form.name.trim()) {
      const parent = form.parentId ? nodes.find(n => n.id === form.parentId) : null;
      const duplicate = nodes.find(n =>
        n.level === form.level &&
        n.name.toLowerCase() === form.name.trim().toLowerCase() &&
        n.parentId === form.parentId,
      );
      if (duplicate) {
        e.name = `A ${form.level} with this name already exists${parent ? ` under ${parent.name}` : ""}.`;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const all = loadGeoNodes();
    const newNode: GeoNode = {
      id: nextGeoId(all),
      level: form.level as GeoLevel,
      name: form.name.trim(),
      code: form.code,
      parentId: form.parentId,
      pincode: form.pincode,
      status: form.status,
      createdDate: todayStr(),
      updatedDate: todayStr(),
    };
    saveGeoNodes([...all, newNode]);
    router.push("/masters/geography");
  };

  return (
    <AppLayout>
      <div className="max-w-[560px] mx-auto">

        {/* ── Header ── */}
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/masters/geography")}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <p className="text-[11px] text-muted-foreground">Masters &rsaquo; Geography &rsaquo; Add</p>
            <h2 className="text-sm font-semibold text-foreground leading-tight">Add Geography Node</h2>
          </div>
        </div>

        {/* ── Form card ── */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">New Geography Node</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Zone → State → Region → Area → Territory → Locality → City</p>
            </div>
          </div>

          <div className="p-5 space-y-4">

            {/* 1. Level */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Level <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map(l => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLevelChange(l)}
                    className={cn(
                      "h-8 px-3 rounded-lg border text-xs font-medium transition-colors",
                      form.level === l
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {errors.level && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.level}
                </p>
              )}
            </div>

            {/* 2. Parent (hidden for Zone) */}
            {form.level && PARENT_LEVEL[form.level] !== null && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Parent ({PARENT_LEVEL[form.level]}) <span className="text-red-500">*</span>
                </Label>
                <select
                  value={form.parentId ?? ""}
                  onChange={e => set("parentId", e.target.value ? Number(e.target.value) : null)}
                  className={cn(
                    "w-full h-9 px-3 text-sm border rounded-lg bg-background appearance-none cursor-pointer",
                    errors.parentId ? "border-red-400" : "border-border",
                  )}
                >
                  <option value="">Select {PARENT_LEVEL[form.level]}…</option>
                  {parentOptions.map(n => (
                    <option key={n.id} value={n.id}>{n.name}</option>
                  ))}
                </select>
                {parentOptions.length === 0 && form.level && (
                  <p className="text-[11px] text-amber-600">
                    No active {PARENT_LEVEL[form.level]} nodes found. Add one first.
                  </p>
                )}
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
                placeholder={form.level ? NAME_PLACEHOLDER[form.level] : "Select a level first"}
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
              <p className="text-[11px] text-muted-foreground">Auto-converts to uppercase. Max 10 characters.</p>
            </div>

            {/* 5. Pincode (City only) */}
            {form.level === "City" && (
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
                <p className="text-[11px] text-muted-foreground">Exactly 6 numeric digits.</p>
              </div>
            )}

            {/* 6. Status */}
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <StatusToggle value={form.status} onChange={v => set("status", v)} />
            </div>

          </div>

          {/* Form footer */}
          <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
            <Button
              variant="outline" size="sm" className="h-8 text-xs"
              onClick={() => router.push("/masters/geography")}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleSave}
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </div>

      </div>
    </AppLayout>
  );
}
