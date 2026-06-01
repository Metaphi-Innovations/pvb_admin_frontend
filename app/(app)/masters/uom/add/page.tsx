"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle, Search } from "lucide-react";
import {
  UOMMaster,
  loadUOMMasters,
  saveUOMMasters,
  nextUOMId,
  todayStr,
} from "../uom-data";

export default function AddUOMPage() {
  const router = useRouter();
  const [allUnits, setAllUnits] = useState<UOMMaster[]>([]);
  const [baseSearch, setBaseSearch] = useState("");
  const [baseDropOpen, setBaseDropOpen] = useState(false);

  const [form, setForm] = useState({
    unitCode: "",
    unitName: "",
    shortName: "",
    description: "",
    baseUnit: "",
    conversionFactor: 1,
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { setAllUnits(loadUOMMasters()); }, []);

  const set = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) setErrors(prev => { const c = { ...prev }; delete c[key]; return c; });
  };

  const filteredBaseUnits = allUnits.filter(u =>
    u.baseUnit === "" && // only true base units available as base
    (u.unitCode.toLowerCase().includes(baseSearch.toLowerCase()) ||
     u.unitName.toLowerCase().includes(baseSearch.toLowerCase()))
  );

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.unitCode.trim()) e.unitCode = "Unit Code is required";
    if (!form.unitName.trim()) e.unitName = "Unit Name is required";
    if (!form.shortName.trim()) e.shortName = "Short Name is required";
    if (form.baseUnit && (form.conversionFactor <= 0 || isNaN(form.conversionFactor))) {
      e.conversionFactor = "Conversion Factor must be greater than 0";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const records = loadUOMMasters();
    const newRecord: UOMMaster = {
      id: nextUOMId(records),
      unitCode: form.unitCode.toUpperCase().trim(),
      unitName: form.unitName.trim(),
      shortName: form.shortName.toUpperCase().trim(),
      description: form.description.trim(),
      baseUnit: form.baseUnit,
      conversionFactor: form.baseUnit ? form.conversionFactor : 1,
      status: form.status,
      createdBy: "Admin",
      createdDate: todayStr(),
      updatedBy: "Admin",
      updatedDate: todayStr(),
      lastStatusChange: todayStr(),
    };
    saveUOMMasters([...records, newRecord]);
    router.push("/masters/uom");
  };

  return (
    <AppLayout>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-3 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-1.5 hover:bg-muted rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Add Unit</h2>
          <p className="text-[11px] text-muted-foreground">Masters → Unit Master → Create</p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.back()}>
          Discard
        </Button>
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
          <Save className="w-3.5 h-3.5" /> Save
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex gap-0">
        <div className="flex-1 p-6 space-y-6 max-w-[600px]">

          {/* ── Basic Information ── */}
          <div className="pb-3 border-b border-border">
            <p className="text-xs font-bold text-foreground">Basic Information</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Code, name and short name for this unit</p>
          </div>

          {/* Unit Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Unit Code <span className="text-red-500">*</span></Label>
            <Input
              value={form.unitCode}
              onChange={e => set("unitCode", e.target.value)}
              placeholder="e.g., KG, LTR, PCS"
              className={cn("h-9 text-sm rounded-lg uppercase", errors.unitCode && "border-red-400 focus-visible:ring-red-300")}
            />
            {errors.unitCode && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.unitCode}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Unique identifier — will be auto-uppercased</p>
          </div>

          {/* Unit Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Unit Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.unitName}
              onChange={e => set("unitName", e.target.value)}
              placeholder="e.g., Kilogram, Litre, Piece"
              className={cn("h-9 text-sm rounded-lg", errors.unitName && "border-red-400 focus-visible:ring-red-300")}
            />
            {errors.unitName && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.unitName}
              </p>
            )}
          </div>

          {/* Short Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Short Name <span className="text-red-500">*</span></Label>
            <Input
              value={form.shortName}
              onChange={e => set("shortName", e.target.value)}
              placeholder="e.g., KG, LTR"
              className={cn("h-9 text-sm rounded-lg uppercase", errors.shortName && "border-red-400 focus-visible:ring-red-300")}
            />
            {errors.shortName && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.shortName}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Abbreviation shown in documents and reports</p>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={form.description}
              onChange={e => set("description", e.target.value)}
              placeholder="Optional description of this unit"
              rows={2}
              className="text-sm rounded-lg"
            />
          </div>

          {/* ── Conversion Details ── */}
          <div className="pb-3 border-b border-border pt-2">
            <p className="text-xs font-bold text-foreground">Conversion Details</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Leave Base Unit empty if this is itself a base unit (e.g., KG, LTR, PCS)
            </p>
          </div>

          {/* Base Unit — searchable select */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Base Unit</Label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setBaseDropOpen(o => !o)}
                className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors"
              >
                <span className={form.baseUnit ? "text-foreground font-mono font-medium" : "text-muted-foreground"}>
                  {form.baseUnit || "None — this is a base unit"}
                </span>
                <Search className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              {baseDropOpen && (
                <div className="absolute top-[calc(100%+4px)] left-0 right-0 z-20 bg-white border border-border rounded-xl shadow-lg overflow-hidden">
                  <div className="p-2 border-b border-border">
                    <input
                      autoFocus
                      placeholder="Search base units…"
                      value={baseSearch}
                      onChange={e => setBaseSearch(e.target.value)}
                      className="w-full text-sm px-2 py-1 focus:outline-none bg-transparent"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    <button
                      type="button"
                      onClick={() => { set("baseUnit", ""); setBaseDropOpen(false); setBaseSearch(""); }}
                      className="w-full text-left px-3 py-2 text-xs text-muted-foreground italic hover:bg-muted/60 rounded-lg"
                    >
                      None — this is a base unit
                    </button>
                    {filteredBaseUnits.map(u => (
                      <button
                        key={u.id}
                        type="button"
                        onClick={() => { set("baseUnit", u.unitCode); setBaseDropOpen(false); setBaseSearch(""); }}
                        className={cn(
                          "w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-brand-50 transition-colors",
                          form.baseUnit === u.unitCode && "bg-brand-50",
                        )}
                      >
                        <span className="font-mono text-xs font-semibold text-brand-700 w-10">{u.unitCode}</span>
                        <span className="text-foreground truncate">{u.unitName}</span>
                      </button>
                    ))}
                    {filteredBaseUnits.length === 0 && (
                      <p className="px-3 py-3 text-xs text-muted-foreground">No base units found</p>
                    )}
                  </div>
                </div>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">e.g., GM is derived from KG as base</p>
          </div>

          {/* Conversion Factor — only shown when base unit selected */}
          {form.baseUnit && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Conversion Factor <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">1 {form.unitCode || "this unit"} =</span>
                <Input
                  type="number"
                  value={form.conversionFactor}
                  onChange={e => set("conversionFactor", parseFloat(e.target.value))}
                  step="0.001"
                  min="0"
                  className={cn("h-9 text-sm rounded-lg w-32", errors.conversionFactor && "border-red-400 focus-visible:ring-red-300")}
                />
                <span className="text-xs font-mono font-semibold text-brand-700">{form.baseUnit}</span>
              </div>
              {errors.conversionFactor && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />{errors.conversionFactor}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Example: 1 GM = 0.001 KG &nbsp;|&nbsp; 1 MT = 1000 KG &nbsp;|&nbsp; 1 BOX = 12 PCS
              </p>
            </div>
          )}

          {/* ── Status ── */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active" ? "Active and visible" : "Inactive and hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("text-xs font-medium", form.status === "active" ? "text-emerald-600" : "text-muted-foreground")}>
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={v => set("status", v ? "active" : "inactive")}
              />
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-border bg-muted/20 p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
            <p className="text-xs text-muted-foreground mt-1">Fill in the details and click Save</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 space-y-1.5">
            <p className="text-xs font-medium text-blue-700">Tip — Conversion</p>
            <p className="text-[11px] text-blue-600">1 KG = 1000 GM</p>
            <p className="text-[11px] text-blue-600">1 MT = 1000 KG</p>
            <p className="text-[11px] text-blue-600">1 BOX = 12 PCS</p>
            <p className="text-[11px] text-blue-600">1 CTN = 24 BTL</p>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
            <p className="text-xs font-medium text-amber-700">Base Units</p>
            <p className="text-[11px] text-amber-600 mt-1">
              If this unit is the root (e.g., KG, LTR, PCS), leave Base Unit empty.
            </p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
