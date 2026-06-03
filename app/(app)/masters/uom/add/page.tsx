"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  nextUOMId,
  generateUOMCode,
  todayStr,
} from "../uom-data";

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
              className="text-xs h-7 focus-visible:ring-0" autoFocus />
          </div>
          <div className="py-1 overflow-y-auto max-h-48">
            {filtered.length === 0
              ? <p className="px-3 py-4 text-xs text-center text-muted-foreground">No options</p>
              : filtered.map(opt => (
                <button key={opt.value} onClick={() => { onChange(opt.value); setOpen(false); setQ(""); }}
                  className={cn(
                    "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                    selected?.value === opt.value && "bg-brand-50"
                  )}>
                  <div className="flex-1 min-w-0">
                    <span className="block truncate">{opt.label}</span>
                  </div>
                  {selected?.value === opt.value && <Check className="flex-shrink-0 w-3 h-3 text-brand-600" />}
                </button>
              ))}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="flex items-center gap-1 text-[11px] text-red-500"><AlertCircle className="flex-shrink-0 w-3 h-3" />{error}</p>}
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="flex-shrink-0 w-3 h-3" />
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

export default function AddUOMPage() {
  const router = useRouter();
  const [records, setRecords] = useState<UOMMaster[]>([]);
  const [form, setForm] = useState({
    unitName: "",
    shortName: "",
    decimalAllowed: false,
    baseUnit: false,
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    setRecords(loadUOMMasters());
  }, []);

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
    if (!validate()) return;
    const nextIdVal = nextUOMId(records);
    const newRecord: UOMMaster = {
      id: nextIdVal,
      uomId: generateUOMCode(nextIdVal),
      unitName: form.unitName,
      shortName: form.shortName,
      decimalAllowed: form.decimalAllowed,
      baseUnit: form.baseUnit,
      status: form.status,
      createdBy: "Admin",
      createdDate: todayStr(),
      updatedBy: "Admin",
      updatedDate: todayStr(),
    };
    saveUOMMasters([...records, newRecord]);
    router.push("/masters/uom");
  };

  const autoUomId = generateUOMCode(nextUOMId(records));

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        {/* Sticky Header */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-2 flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-shrink-0 p-1 transition-colors rounded hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none">Add Unit</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Unit Master → Create</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {autoUomId}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-5 py-4 overflow-y-auto">
          <SectionHead label="Unit Details" />
          <div className="grid grid-cols-5 gap-3">
            {/* Unit ID (Read Only) */}
            <div className="col-span-1 space-y-1">
              <Label className="text-xs font-medium">Unit ID (Auto)</Label>
              <Input
                value={autoUomId}
                disabled
                className="h-8 text-xs cursor-not-allowed bg-muted/30 text-muted-foreground"
              />
            </div>

            {/* Status */}
            {/* <div className="col-span-1">
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
            </div> */}

            {/* Unit Name */}
            <div className="col-span-1 space-y-1">
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
            <div className="col-span-1 space-y-1">
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
            <div className="flex items-center col-span-1 pt-5">
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
            <div className="flex items-center col-span-1 pt-5">
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
