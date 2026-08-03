"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import { useGst, useUpdateGst } from "@/hooks/masters";
import {
  getErrorMessage,
  getMasterDetailErrorMessage,
} from "@/lib/masters/master-query-errors";

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="w-3 h-3 flex-shrink-0" />
      {msg}
    </p>
  );
}

export default function EditGSTPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [gstPercentage, setGstPercentage] = useState<number | null>(null);
  const [form, setForm] = useState({ gstPercentage: 0, remarks: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const detailQuery = useGst(id);
  const updateMutation = useUpdateGst();
  const loading = detailQuery.isFetching && !detailQuery.data;
  const loadError = detailQuery.isError
    ? getMasterDetailErrorMessage(
        detailQuery.error,
        "GST record not found.",
        "Failed to load GST record.",
      )
    : null;
  const saving = updateMutation.isPending;

  useEffect(() => {
    if (!detailQuery.data) return;
    setGstPercentage(detailQuery.data.gstPercentage);
    setForm({
      gstPercentage: detailQuery.data.gstPercentage,
      remarks: detailQuery.data.remark || "",
    });
  }, [detailQuery.data]);

  const set = (key: "gstPercentage" | "remarks", value: number | string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (errors[key]) {
      setErrors((prev) => {
        const copy = { ...prev };
        delete copy[key];
        return copy;
      });
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (form.gstPercentage < 0) {
      e.gstPercentage = "GST Percentage must be non-negative";
    } else if (form.gstPercentage > 100) {
      e.gstPercentage = "GST Percentage cannot exceed 100";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !id) return;

    updateMutation.mutate(
      {
        id,
        payload: {
          gstPercentage: form.gstPercentage,
          remark: form.remarks,
        },
      },
      {
        onSuccess: () => {
          router.push("/masters/gst");
        },
        onError: (error) => {
          setErrors({
            _form: getErrorMessage(error, "Failed to update GST record."),
          });
        },
      },
    );
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading GST record...</p>
        </div>
      </AppLayout>
    );
  }

  if (loadError || gstPercentage === null) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">{loadError || "GST record not found."}</p>
          <Link href="/masters/gst" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
            Back to listing
          </Link>
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
            <h2 className="text-sm font-semibold leading-none">Edit GST</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Masters → GST → {gstPercentage}%
            </p>
          </div>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {gstPercentage}%
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()} disabled={saving}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={saving}
          >
            <Save className="w-3 h-3" /> {saving ? "Updating..." : "Update GST"}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {errors._form && <p className="mb-3 text-xs text-red-600">{errors._form}</p>}
          <div className="grid grid-cols-4 gap-3">
            <div className="col-span-2 space-y-1">
              <Label className="text-xs font-medium">
                GST Percentage <span className="text-red-500">*</span>
              </Label>
              <Input
                type="number"
                value={form.gstPercentage}
                onChange={(e) => set("gstPercentage", parseFloat(e.target.value) || 0)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="e.g., 18.0"
                step="0.01"
                min="0"
                max="100"
                disabled={saving}
                className={cn(
                  "h-8 text-xs [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
                  errors.gstPercentage && "border-red-400 focus-visible:ring-red-300",
                )}
              />
              <FieldError msg={errors.gstPercentage} />
            </div>
            <div className="col-span-4 space-y-1">
              <Label className="text-xs font-medium">Remarks</Label>
              <Textarea
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Enter remarks"
                rows={3}
                disabled={saving}
                className="text-xs resize-none rounded-lg min-h-[72px]"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
