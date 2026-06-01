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
  GSTMaster,
  loadGSTMasters,
  saveGSTMasters,
  nextGSTId,
  todayStr,
} from "../gst-data";

export default function AddGSTPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    gstCode: "",
    gstPercentage: 0,
    cgst: 0,
    sgst: 0,
    igst: 0,
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
    if (!form.gstCode.trim()) e.gstCode = "GST Code is required";
    if (form.gstPercentage === undefined || form.gstPercentage === null || form.gstPercentage < 0) {
      e.gstPercentage = "GST Percentage is required and must be non-negative";
    }
    if (form.cgst === undefined || form.cgst === null || form.cgst < 0) {
      e.cgst = "CGST % is required and must be non-negative";
    }
    if (form.sgst === undefined || form.sgst === null || form.sgst < 0) {
      e.sgst = "SGST % is required and must be non-negative";
    }
    if (form.igst === undefined || form.igst === null || form.igst < 0) {
      e.igst = "IGST % is required and must be non-negative";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const records = loadGSTMasters();
    const newRecord: GSTMaster = {
      id: nextGSTId(records),
      gstCode: form.gstCode,
      gstPercentage: form.gstPercentage,
      cgst: form.cgst,
      sgst: form.sgst,
      igst: form.igst,
      status: form.status,
      remarks: form.remarks,
      createdBy: "Admin",
      createdDate: todayStr(),
      updatedBy: "Admin",
      updatedDate: todayStr(),
      lastStatusChange: todayStr(),
    };
    saveGSTMasters([...records, newRecord]);
    router.push("/masters/gst");
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
          <h2 className="text-sm font-semibold">Add GST Rate</h2>
          <p className="text-[11px] text-muted-foreground">Masters → GST → Create</p>
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
          {/* GST Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              GST Code <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.gstCode}
              onChange={e => set("gstCode", e.target.value)}
              placeholder="e.g., GST-18"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.gstCode && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.gstCode && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.gstCode}
              </p>
            )}
            <p className="text-[11px] text-muted-foreground">Standard format: GST-0, GST-5, GST-12, GST-18, GST-28</p>
          </div>

          {/* GST Percentage */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              GST Percentage <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={form.gstPercentage}
              onChange={e => set("gstPercentage", parseFloat(e.target.value))}
              placeholder="e.g., 18"
              step="0.01"
              min="0"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.gstPercentage && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.gstPercentage && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.gstPercentage}
              </p>
            )}
          </div>

          {/* CGST, SGST, IGST */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                CGST % <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.cgst}
                onChange={e => set("cgst", parseFloat(e.target.value))}
                placeholder="e.g., 9"
                step="0.01"
                min="0"
                className={cn(
                  "h-9 text-sm rounded-lg",
                  errors.cgst && "border-red-400 focus-visible:ring-red-300"
                )}
              />
              {errors.cgst && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Required
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                SGST % <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.sgst}
                onChange={e => set("sgst", parseFloat(e.target.value))}
                placeholder="e.g., 9"
                step="0.01"
                min="0"
                className={cn(
                  "h-9 text-sm rounded-lg",
                  errors.sgst && "border-red-400 focus-visible:ring-red-300"
                )}
              />
              {errors.sgst && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Required
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                IGST % <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.igst}
                onChange={e => set("igst", parseFloat(e.target.value))}
                placeholder="e.g., 18"
                step="0.01"
                min="0"
                className={cn(
                  "h-9 text-sm rounded-lg",
                  errors.igst && "border-red-400 focus-visible:ring-red-300"
                )}
              />
              {errors.igst && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  Required
                </p>
              )}
            </div>
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
              placeholder="Optional notes about this GST rate"
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
            <p className="text-xs text-muted-foreground mt-1">Click Save to create this GST rate</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700">Tip</p>
            <p className="text-[11px] text-blue-600 mt-1">CGST + SGST should equal half of IGST</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
