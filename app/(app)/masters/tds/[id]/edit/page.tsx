"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
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
  TDSMaster,
  loadTDSMasters,
  saveTDSMasters,
  todayStr,
} from "../../tds-data";

export default function EditTDSPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [record, setRecord] = useState<TDSMaster | null>(null);
  const [form, setForm] = useState({
    tdsCode: "",
    tdsRate: 0,
    status: "active" as "active" | "inactive" | "archived",
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
      status: found.status,
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
    if (!validate()) return;
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
            lastStatusChange: form.status !== record?.status ? todayStr() : r.lastStatusChange,
          }
        : r
    );
    saveTDSMasters(updated);
    router.push("/masters/tds");
  };

  if (!record) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </AppLayout>
    );
  }

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
          <h2 className="text-sm font-semibold">Edit TDS Rate</h2>
          <p className="text-[11px] text-muted-foreground">Masters → TDS → {record.tdsCode}</p>
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
          <Save className="w-3.5 h-3.5" /> Save Changes
        </Button>
      </div>

      {/* Form Content */}
      <div className="flex gap-0">
        <div className="flex-1 p-6 space-y-6 max-w-[600px]">
          {/* TDS Code */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              TDS Code <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.tdsCode}
              onChange={e => set("tdsCode", e.target.value)}
              placeholder="e.g., 194C, 194J"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.tdsCode && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.tdsCode && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.tdsCode}
              </p>
            )}
          </div>

          {/* TDS Rate */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              TDS Rate (%) <span className="text-red-500">*</span>
            </Label>
            <Input
              type="number"
              value={form.tdsRate}
              onChange={e => set("tdsRate", parseFloat(e.target.value))}
              placeholder="e.g., 1, 5, 10"
              step="0.01"
              min="0"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.tdsRate && "border-red-400 focus-visible:ring-red-300"
              )}
            />
            {errors.tdsRate && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                {errors.tdsRate}
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
              placeholder="Optional notes about this TDS rate"
              rows={3}
              className="text-sm rounded-lg"
            />
          </div>

          {/* Audit Info */}
          <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
            <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
            <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
              <div>
                <span className="text-muted-foreground">Created By</span>
                <p className="font-medium text-foreground">{record.createdBy}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created Date</span>
                <p className="font-medium text-foreground">{record.createdDate}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Updated By</span>
                <p className="font-medium text-foreground">{record.updatedBy}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Updated Date</span>
                <p className="font-medium text-foreground">{record.updatedDate}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="w-64 flex-shrink-0 border-l border-border bg-muted/20 p-5 space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Quick Actions</p>
            <p className="text-xs text-muted-foreground mt-1">Click Save Changes to update this TDS rate</p>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <p className="text-xs font-medium text-blue-700">Tip</p>
            <p className="text-[11px] text-blue-600 mt-1">Changes to TDS rates will affect future calculations</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
