"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import {
  type TDSMaster,
  TDS_APPLICABLE_TO_OPTIONS,
  loadTDSMasters,
  saveTDSMasters,
  tdsToForm,
  formToTds,
  validateTdsForm,
  getTdsSectionCode,
} from "../../tds-data";
import { TdsRateInput } from "../../TdsRateInput";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

export default function EditTDSPage() {
  const router = useRouter();
  const params = useParams();
  const id = parseInt(params.id as string);

  const [record, setRecord] = useState<TDSMaster | null>(null);
  const [form, setForm] = useState(tdsToForm({
    id: 0,
    sectionCode: "",
    sectionName: "",
    tdsRate: "",
    applicableTo: [],
    status: "active",
    createdBy: "",
    createdDate: "",
    updatedBy: "",
    updatedDate: "",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});

  const applicableOptions = useMemo(
    () => TDS_APPLICABLE_TO_OPTIONS.map((o) => ({ value: o.value, label: o.label })),
    [],
  );

  useEffect(() => {
    const records = loadTDSMasters();
    const found = records.find((r) => r.id === id);
    if (!found) {
      router.push("/masters/tds");
      return;
    }
    setRecord(found);
    setForm(tdsToForm(found));
  }, [id, router]);

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key as string]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key as string];
        return copy;
      });
    }
  };

  const handleSave = () => {
    if (!record) return;
    const records = loadTDSMasters();
    const fieldErrors = validateTdsForm(form, records, record.id);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }
    const updated = records.map((r) =>
      r.id === id ? formToTds(form, id, record) : r,
    );
    saveTDSMasters(updated);
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
        <div className="sticky top-0 z-10 bg-white border-b border-border px-4 py-2 flex items-center gap-2.5 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-1 hover:bg-muted rounded transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none">Edit TDS Section</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Masters → TDS → {getTdsSectionCode(record)}
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {getTdsSectionCode(record)}
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

        <div className="flex-1 overflow-y-auto px-5 py-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                TDS Section Code <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.sectionCode}
                disabled
                readOnly
                className="h-8 text-xs font-mono bg-muted/30 cursor-not-allowed"
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-medium">
                TDS Rate % <span className="text-red-500">*</span>
              </Label>
              <TdsRateInput
                value={form.tdsRate}
                onChange={(value) => set("tdsRate", value)}
                className={cn("h-8 text-xs", errors.tdsRate && "border-red-400")}
              />
              <FieldError msg={errors.tdsRate} />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                TDS Section Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.sectionName}
                onChange={(e) => set("sectionName", e.target.value)}
                className={cn("h-8 text-xs", errors.sectionName && "border-red-400")}
              />
              <FieldError msg={errors.sectionName} />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Applicable To</Label>
              <AutocompleteSelect
                multiple
                options={applicableOptions}
                value={form.applicableTo}
                onChange={(value) =>
                  set("applicableTo", Array.isArray(value) ? value : [])
                }
                placeholder="Select applicable categories…"
                className="h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Threshold Limit (₹)</Label>
              <Input
                type="number"
                min={0}
                value={form.thresholdAmount}
                onChange={(e) => set("thresholdAmount", e.target.value)}
                className="h-8 text-xs"
                placeholder="Annual threshold — optional"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between rounded-lg border border-border px-3 py-2">
              <div>
                <p className="text-xs font-medium text-foreground">Status</p>
                <p className="text-[11px] text-muted-foreground">
                  {form.status === "active" ? "Active" : "Inactive"}
                </p>
              </div>
              <ActiveInactiveToggle
                active={form.status === "active"}
                onChange={(isActive) =>
                  set("status", isActive ? "active" : "inactive")
                }
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
