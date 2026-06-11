"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  TDSMaster,
  loadTDSMasters,
  saveTDSMasters,
  todayStr,
} from "../../tds-data";

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

export default function EditTDSPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [record, setRecord] = useState<TDSMaster | null>(null);
  const [form, setForm] = useState({
    tdsCode: "",
    tdsRate: 0,
    status: "active" as "active" | "inactive",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    const records = loadTDSMasters();
    const found = records.find(r => r.id === id);
    if (!found) {
      router.push("/masters/tds");
      return;
    }
    setRecord(found);
    setForm({
      tdsCode: found.tdsCode,
      tdsRate: found.tdsRate,
      status: found.status === "archived" ? "inactive" : found.status,
      remarks: found.remarks || "",
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
    if (!form.tdsCode.trim()) e.tdsCode = "TDS Code is required";
    if (form.tdsRate === undefined || form.tdsRate === null || form.tdsRate < 0) {
      e.tdsRate = "TDS Rate is required and must be non-negative";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !record) return;
    const records = loadTDSMasters();
    const updated = records.map(r =>
      r.id === id
        ? {
            ...r,
            tdsCode: form.tdsCode,
            tdsRate: form.tdsRate,
            status: form.status,
            remarks: form.remarks,
            updatedBy: "Admin",
            updatedDate: todayStr(),
            lastStatusChange: form.status !== record.status ? todayStr() : r.lastStatusChange,
          }
        : r
    );
    saveTDSMasters(updated);
    
    // Set pending toast message for the listing page
    localStorage.setItem("tds_toast_message", "TDS updated successfully");
    
    router.push("/masters/tds");
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
            <h2 className="text-sm font-semibold leading-none">Edit TDS</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → TDS Master → Edit</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {record.tdsCode}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Update TDS
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <SectionHead label="TDS Details" />
          <div className="grid grid-cols-4 gap-3">
            {/* TDS Code */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                TDS Code <span className="text-red-500">*</span>
              </Label>
              <Input
                disabled
                readOnly
                value={form.tdsCode}
                onChange={e => set("tdsCode", e.target.value)}
                placeholder="Auto-generated code"
                className={cn("h-8 text-xs bg-muted/30 text-muted-foreground cursor-not-allowed", errors.tdsCode && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.tdsCode} />
            </div>

            {/* TDS Rate (%) */}
            <div className="col-span-1 space-y-1">
              <Label className="text-xs font-medium">
                TDS Rate (%) <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.tdsRate}
                onChange={e => set("tdsRate", parseFloat(e.target.value) || 0)}
                placeholder="e.g., 1, 5, 10"
                step="0.01"
                min="0"
                className={cn("h-8 text-xs", errors.tdsRate && "border-red-400 focus-visible:ring-red-300")}
              />
              <FieldError msg={errors.tdsRate} />
            </div>

            {/* Remarks */}
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={e => set("remarks", e.target.value)}
                placeholder="Optional notes about this TDS rate"
                rows={3}
                className="text-xs rounded-lg resize-none min-h-[38px]"
              />
            </div>
          </div>

          {/* Audit Info */}
          <div className="mt-6 border-t pt-4">
            <SectionHead label="Record Info" />
            <div className="grid grid-cols-4 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Created By</p>
                <p className="font-medium">{record.createdBy}</p>
                <p className="text-muted-foreground">{record.createdDate}</p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Updated By</p>
                <p className="font-medium">{record.updatedBy}</p>
                <p className="text-muted-foreground">{record.updatedDate}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
