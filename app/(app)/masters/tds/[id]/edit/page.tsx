"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";
import {
  tdsApiToForm,
  validateTdsApiForm,
  type TdsApiForm,
  DEFAULT_TDS_API_FORM,
  mergeApplicableToSelectOptions,
} from "../../tds-data";
import { TdsRateInput } from "../../TdsRateInput";
import { useTds, useUpdateTds, useCategoryDropdown, useTdsFilterDropdown } from "@/hooks/masters";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

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
  const id = params.id as string;

  const detailQuery = useTds(id);
  const updateMutation = useUpdateTds();
  const categoryQuery = useCategoryDropdown();
  const applicableToOptionsQuery = useTdsFilterDropdown("applicable_to");
  const [form, setForm] = useState<TdsApiForm>(DEFAULT_TDS_API_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const applicableOptions = useMemo(
    () =>
      mergeApplicableToSelectOptions(
        categoryQuery.data ?? [],
        form.applicableTo,
        applicableToOptionsQuery.data,
      ),
    [categoryQuery.data, form.applicableTo, applicableToOptionsQuery.data],
  );

  useEffect(() => {
    if (detailQuery.isError) {
      router.push("/masters/tds");
      return;
    }
    if (detailQuery.data) {
      setForm(tdsApiToForm({
        id: detailQuery.data.id,
        tdsUuid: detailQuery.data.tdsUuid,
        sectionCode: detailQuery.data.sectionCode,
        sectionName: detailQuery.data.sectionName,
        tdsRate: detailQuery.data.tdsRate,
        applicableTo: detailQuery.data.applicableTo,
        description: detailQuery.data.description,
        status: detailQuery.data.status,
        createdBy: detailQuery.data.createdBy,
        createdAt: detailQuery.data.createdAt,
        updatedBy: detailQuery.data.updatedBy,
        updatedAt: detailQuery.data.updatedAt,
      }));
    }
  }, [detailQuery.data, detailQuery.isError, router]);

  const set = <K extends keyof TdsApiForm>(key: K, value: TdsApiForm[K]) => {
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
    const fieldErrors = validateTdsApiForm(form);
    if (Object.keys(fieldErrors).length > 0) {
      setErrors(fieldErrors);
      return;
    }

    const rate = Number(form.tdsRate.trim().replace(/%$/, ""));
    setFormError(null);
    updateMutation.mutate(
      {
        id,
        payload: {
          tds_rate: rate,
          tds_section_name: form.sectionName.trim() || null,
          applicable_to: form.applicableTo.trim() || null,
          description: form.description.trim() || null,
        },
      },
      {
        onSuccess: () => router.push("/masters/tds"),
        onError: (error) => {
          setFormError(getErrorMessage(error, "Failed to update TDS record."));
        },
      },
    );
  };

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <AppLayout>
        <div className="flex items-center justify-center h-screen">
          <p className="text-muted-foreground text-xs">Loading...</p>
        </div>
      </AppLayout>
    );
  }

  const record = detailQuery.data;

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
              Masters → TDS → {record.sectionCode}
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {record.sectionCode}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            className="h-7 text-[11px] px-3 gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" /> Update TDS
          </Button>
        </div>

        {formError ? (
          <p className="px-5 pt-3 text-xs text-red-600">{formError}</p>
        ) : null}

        <div className="flex-1 overflow-y-auto px-5 py-4 max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs font-medium">TDS Code</Label>
              <Input
                value={record.sectionCode}
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
                placeholder="e.g. 10"
              />
              <FieldError msg={errors.tdsRate} />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-medium">TDS Section Name</Label>
              <Input
                value={form.sectionName}
                onChange={(e) => set("sectionName", e.target.value)}
                className="h-8 text-xs"
                placeholder="e.g. Professional Fees"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Category</Label>
              <AutocompleteSelect
                options={applicableOptions}
                value={form.applicableTo}
                onChange={(value) => set("applicableTo", typeof value === "string" ? value : "")}
                placeholder={
                  categoryQuery.isFetching ? "Loading categories…" : "Select category"
                }
                searchPlaceholder="Search categories…"
                disabled={categoryQuery.isFetching}
                className="h-8 text-xs"
              />
            </div>

            <div className="sm:col-span-2 space-y-1">
              <Label className="text-xs font-medium">Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) => set("description", e.target.value)}
                className="min-h-[72px] text-xs"
                placeholder="Optional description"
              />
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
