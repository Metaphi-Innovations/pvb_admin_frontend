"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle, ChevronsUpDown, Check } from "lucide-react";
import {
  GSTMaster,
  loadGSTMasters,
  saveGSTMasters,
  todayStr,
} from "../../gst-data";

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

export default function EditGSTPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [record, setRecord] = useState<GSTMaster | null>(null);
  const [form, setForm] = useState({
    gstName: "",
    gstPercentage: 0,
    gstType: "CGST" as "CGST" | "SGST" | "IGST" | "UTGST",
    applicableFromDate: "",
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const records = loadGSTMasters();
    const found = records.find(r => r.id === id);
    if (!found) {
      router.push("/masters/gst");
      return;
    }
    setRecord(found);
    setForm({
      gstName: found.gstName,
      gstPercentage: found.gstPercentage,
      gstType: found.gstType,
      applicableFromDate: found.applicableFromDate,
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
    if (!form.gstName.trim()) e.gstName = "GST Name is required";
    if (form.gstPercentage === undefined || form.gstPercentage === null || form.gstPercentage < 0) {
      e.gstPercentage = "GST Percentage is required and must be non-negative";
    }
    if (!form.applicableFromDate) e.applicableFromDate = "Applicable From Date is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !record) return;
    const records = loadGSTMasters();
    const updated = records.map(r =>
      r.id === id
        ? {
            ...r,
            gstName: form.gstName,
            gstPercentage: form.gstPercentage,
            gstType: form.gstType,
            applicableFromDate: form.applicableFromDate,
            status: form.status,
            updatedBy: "Admin",
            updatedDate: todayStr(),
          }
        : r
    );
    saveGSTMasters(updated);
    router.push("/masters/gst");
  };

  if (!record) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="flex flex-col" style={{ minHeight: "calc(100vh - 104px)" }}>
        {/* Sticky Header - matches Customer/User Management */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-2 flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none">Edit GST</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → GST → {record.gstId}</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {record.gstId}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3 h-3" /> Update GST
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SectionHead label="GST Details" />
          <div className="grid grid-cols-4 gap-3">
            {/* GST ID (Read Only) */}
            <div className="col-span-1 space-y-1">
              <Label className="text-xs font-medium">GST ID</Label>
              <Input
                value={record.gstId}
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

            {/* GST Name */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                GST Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.gstName}
                onChange={e => set("gstName", e.target.value)}
                placeholder="e.g., Standard IGST"
                className={cn("h-8 text-xs", errors.gstName && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.gstName} />
            </div>

            {/* GST Percentage */}
            <div className="col-span-1 space-y-1">
              <Label className="text-xs font-medium">
                GST Percentage <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.gstPercentage}
                onChange={e => set("gstPercentage", parseFloat(e.target.value) || 0)}
                placeholder="e.g., 18.0"
                step="0.01"
                min="0"
                className={cn("h-8 text-xs", errors.gstPercentage && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.gstPercentage} />
            </div>

            {/* GST Type */}
            <div className="col-span-1">
              <AC
                label="GST Type"
                required
                value={form.gstType}
                onChange={v => set("gstType", v)}
                options={[
                  { value: "CGST", label: "CGST" },
                  { value: "SGST", label: "SGST" },
                  { value: "IGST", label: "IGST" },
                  { value: "UTGST", label: "UTGST" },
                ]}
                placeholder="Select type…"
              />
            </div>

            {/* Applicable From Date */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                Applicable From Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                value={form.applicableFromDate}
                onChange={e => set("applicableFromDate", e.target.value)}
                className={cn("h-8 text-xs", errors.applicableFromDate && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.applicableFromDate} />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
