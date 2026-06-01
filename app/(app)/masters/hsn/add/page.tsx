"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Save,
  AlertCircle,
} from "lucide-react";
import {
  HSNMaster,
  loadHSNMasters,
  saveHSNMasters,
  nextHSNId,
  todayStr,
} from "../hsn-data";

export default function AddHSNPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    hsnCode: "",
    gstRate: 0,
    uom: "",
    status: "active" as "active" | "inactive",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

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
    if (!form.hsnCode.trim()) e.hsnCode = "HSN Code is required";
    if (form.gstRate === undefined || form.gstRate === null || form.gstRate < 0) {
      e.gstRate = "GST Rate is required and must be non-negative";
    }
    if (!form.uom.trim()) e.uom = "Unit of Measure is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const records = loadHSNMasters();
    const newRecord: HSNMaster = {
      id: nextHSNId(records),
      hsnCode: form.hsnCode,
      gstRate: form.gstRate,
      uom: form.uom,
      status: form.status,
      remarks: form.remarks,
      createdBy: "Admin",
      createdDate: todayStr(),
      updatedBy: "Admin",
      updatedDate: todayStr(),
      lastStatusChange: todayStr(),
    };
    saveHSNMasters([...records, newRecord]);
    router.push("/masters/hsn");
  };

  return (
    <AppLayout>
      {/* Sticky Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-border px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => router.back()}
          className="p-1.5 hover:bg-muted rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4 text-muted-foreground" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Add HSN Code</h2>
          <p className="text-[11px] text-muted-foreground">Masters → HSN → Create</p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="h-8 text-xs"
          onClick={() => router.back()}
        >
          Discard
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSave}
        >
          <Save className="w-3.5 h-3.5" /> Save
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex gap-0">
        <div className="flex-1 p-6 space-y-6 max-w-[600px]">
          {/* HSN Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              HSN Code <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.hsnCode}
              onChange={e => set("hsnCode", e.target.value)}
              placeholder="e.g., 1001, 1002"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.hsnCode && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.hsnCode && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.hsnCode}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Harmonized System of Nomenclature code</p>
          </div>

          {/* GST Rate */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              GST Rate (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={form.gstRate}
              onChange={e => set("gstRate", parseFloat(e.target.value))}
              placeholder="e.g., 5, 12, 18, 28"
              step="0.01"
              min="0"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.gstRate && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.gstRate && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.gstRate}
              </p>
            )}
          </div>

          {/* Unit of Measure */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Unit of Measure <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.uom}
              onChange={e => set("uom", e.target.value)}
              placeholder="e.g., KG, LITRE, PIECE"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.uom && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.uom && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.uom}
              </p>
            )}
          </div>

          {/* Status Toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active"
                  ? "Active and visible"
                  : "Inactive and hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span
                className={cn(
                  "text-xs font-medium",
                  form.status === "active"
                    ? "text-emerald-600"
                    : "text-muted-foreground"
                )}
              >
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={v =>
                  set("status", v ? "active" : "inactive")
                }
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={e => set("remarks", e.target.value)}
              placeholder="Optional notes about this HSN code"
              rows={3}
              className="text-sm rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground">Add any additional information or notes</p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-border bg-muted/20 p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
            <p className="text-xs text-muted-foreground mt-1">Click Save to create this HSN code</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700">Tip</p>
            <p className="text-[11px] text-blue-600 mt-1">HSN codes determine the tax classification of products</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
