"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle, ChevronsUpDown, Check } from "lucide-react";
import {
  UOMMaster,
  loadUOMMasters,
  saveUOMMasters,
  todayStr,
} from "../../uom-data";

// ── Autocomplete (matches EmployeeForm AC) ────────────────────────────────────
interface ACOption { label: string; value: string }
function AC({ label, value, onChange, options, placeholder, required, error, disabled }: {
  label: string; value: string; onChange: (v: string) => void;
  options: ACOption[]; placeholder?: string; required?: boolean; error?: string;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const filtered = q ? options.filter(o => o.label.toLowerCase().includes(q.toLowerCase())) : options;
  const selected = options.find(o => o.value === value);
  return (
    <div className="space-y-1">
      <Label className="text-xs font-medium">
        {label}{required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      <Popover open={open && !disabled} onOpenChange={v => { if (!disabled) { setOpen(v); if (!v) setQ(""); } }}>
        <PopoverTrigger asChild>
          <button disabled={disabled} className={cn(
            "w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between transition-colors",
            disabled ? "opacity-50 cursor-not-allowed bg-muted/30" : "hover:bg-muted/30",
            error && "border-red-400",
          )}>
            <span className={selected ? "text-foreground" : "text-muted-foreground"}>
              {selected?.label || placeholder || "Select…"}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <div className="p-1.5 border-b border-border">
            <Input placeholder="Search…" value={q} onChange={e => setQ(e.target.value)}
              className="h-7 text-xs focus-visible:ring-0" autoFocus />
          </div>
          <div className="max-h-48 overflow-y-auto py-1">
            {filtered.length === 0
              ? <p className="px-3 py-4 text-center text-xs text-muted-foreground">No options</p>
              : filtered.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                    selected?.value === opt.value && "bg-brand-50"
                  )}>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                  </div>
                  {selected?.value === opt.value && <Check className="w-3 h-3 text-brand-600 flex-shrink-0" />}
                </button>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="w-3 h-3 flex-shrink-0" />{error}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export default function EditUOMPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [record, setRecord] = useState<UOMMaster | null>(null);
  const [form, setForm] = useState({
    unitName: "",
    shortName: "",
    decimalAllowed: false,
    baseUnit: false,
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const records = loadUOMMasters();
    const found = records.find(r => r.id === id);
    if (!found) {
      router.push("/masters/uom");
      return;
    }
    setRecord(found);
    setForm({
      unitName: found.unitName,
      shortName: found.shortName,
      decimalAllowed: found.decimalAllowed,
      baseUnit: found.baseUnit,
      status: found.status,
    });
  }, [id, router]);

  const set = (key: string, value: any) => {
    setForm(prev => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors(prev => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.unitName.trim()) e.unitName = "Unit Name is required";
    if (!form.shortName.trim()) e.shortName = "Unit Short Name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !record) return;
    const records = loadUOMMasters();
    const updated = records.map(r =>
      r.id === id
        ? {
            ...r,
            unitName: form.unitName,
            shortName: form.shortName,
            decimalAllowed: form.decimalAllowed,
            baseUnit: form.baseUnit,
            status: form.status,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : r
    );
    saveUOMMasters(updated);
    router.push("/masters/uom");
  };

  if (!record) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground text-xs">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-2 flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none">Edit Unit</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Unit Master → {record.uomId}</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {record.uomId}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Update Unit
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SectionHead label="Unit Details" />
          <div className="grid grid-cols-4 gap-3">
            {/* Unit ID (Read Only) */}
            <div className="col-span-1 space-y-1">
              <Label className="text-xs font-medium">Unit ID</Label>
              <Input
                value={record.uomId}
                disabled
                className="h-8 text-xs bg-muted/30 text-muted-foreground cursor-not-allowed"
              />
            </div>

            {/* Status */}
            <div className="col-span-1">
              <AC
                label="Status"
                required
                value={form.status}
                onChange={v => set("status", v)}
                options={[
                  { value: "active", label: "Active" },
                  { value: "inactive", label: "Inactive" },
                ]}
                placeholder="Select status…"
              />
            </div>

            {/* Unit Name */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                Unit Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.unitName}
                onChange={e => set("unitName", e.target.value)}
                placeholder="e.g., Kilogram"
                className={cn("h-8 text-xs", errors.unitName && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.unitName} />
            </div>

            {/* Unit Short Name */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                Unit Short Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.shortName}
                onChange={e => set("shortName", e.target.value)}
                placeholder="e.g., KG"
                className={cn("h-8 text-xs", errors.shortName && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.shortName} />
            </div>

            {/* Decimal Allowed Checkbox */}
            <div className="col-span-1 flex items-center pt-5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="decimalAllowed"
                  checked={form.decimalAllowed}
                  onCheckedChange={v => set("decimalAllowed", !!v)}
                />
                <Label htmlFor="decimalAllowed" className="text-xs font-medium cursor-pointer select-none">
                  Decimal Allowed
                </Label>
              </div>
            </div>

            {/* Base Unit Checkbox */}
            <div className="col-span-1 flex items-center pt-5">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="baseUnit"
                  checked={form.baseUnit}
                  onCheckedChange={v => set("baseUnit", !!v)}
                />
                <Label htmlFor="baseUnit" className="text-xs font-medium cursor-pointer select-none">
                  Base Unit
                </Label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
