"use client";

import React, { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { useCategoryDropdown } from "@/hooks/masters/use-categories";
import { toCategoryIdSelectOptions } from "@/services/category-list.service";
import { useCropFilterDropdown } from "@/hooks/masters/use-crops";
import {
  DEFAULT_CROP_FORM,
  FIELD_TYPES,
  SEASONS,
  type CropForm,
} from "../crop-data";

export type CropFormValues = CropForm;

export { DEFAULT_CROP_FORM };

export function CropForm({
  form,
  onChange,
  errors,
  onClearError,
  readOnly,
}: {
  form: CropFormValues;
  onChange: (form: CropFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
}) {
  const categoryQuery = useCategoryDropdown();
  const fieldTypeOptionsQuery = useCropFilterDropdown("field_type");
  const seasonOptionsQuery = useCropFilterDropdown("season");

  const set = <K extends keyof CropFormValues>(key: K, value: CropFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  const selectedCategoryName = useMemo(() => {
    const match = (categoryQuery.data ?? []).find((item) => item.id === form.categoryId);
    return match?.categoryName;
  }, [categoryQuery.data, form.categoryId]);

  const categoryOptions = useMemo(
    () =>
      toCategoryIdSelectOptions(
        categoryQuery.data ?? [],
        form.categoryId,
        selectedCategoryName,
      ),
    [categoryQuery.data, form.categoryId, selectedCategoryName],
  );

  const fieldTypeOptions = useMemo(() => {
    if (fieldTypeOptionsQuery.data?.length) return fieldTypeOptionsQuery.data;
    return FIELD_TYPES.map((ft) => ({ label: ft, value: ft }));
  }, [fieldTypeOptionsQuery.data]);

  const seasonOptions = useMemo(() => {
    if (seasonOptionsQuery.data?.length) return seasonOptionsQuery.data;
    return SEASONS.map((s) => ({ label: s, value: s }));
  }, [seasonOptionsQuery.data]);

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          Crop Details
        </p>
        <p className="text-[11px] text-muted-foreground">
          Keep crop master details compact and consistent.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs font-medium">
            Crop Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.cropName}
            onChange={(e) => set("cropName", e.target.value)}
            placeholder="e.g. Mango"
            className={cn(inputCls("cropName"), "bg-background")}
            disabled={readOnly}
          />
          {errors.cropName && <p className="text-[11px] text-red-500">{errors.cropName}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Field Type <span className="text-red-500">*</span>
          </Label>
          <AutocompleteSelect
            options={fieldTypeOptions}
            value={form.fieldType}
            onChange={(v) => set("fieldType", v)}
            placeholder="Select Field Type"
            disabled={readOnly}
            error={!!errors.fieldType}
            className="h-8 text-xs rounded-lg"
          />
          {errors.fieldType && <p className="text-[11px] text-red-500">{errors.fieldType}</p>}
        </div>

        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Category <span className="text-red-500">*</span>
          </Label>
          <AutocompleteSelect
            options={categoryOptions}
            value={form.categoryId}
            onChange={(v) => set("categoryId", v)}
            placeholder={categoryQuery.isFetching ? "Loading categories..." : "Select Category"}
            disabled={readOnly || categoryQuery.isFetching}
            error={!!errors.categoryId}
            className="h-8 text-xs rounded-lg"
          />
          {errors.categoryId && <p className="text-[11px] text-red-500">{errors.categoryId}</p>}
        </div>

        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs font-medium">
            Season / Period <span className="text-red-500">*</span>
          </Label>
          <AutocompleteSelect
            options={seasonOptions}
            value={form.season}
            onChange={(v) => set("season", v)}
            placeholder="Select Season(s)"
            disabled={readOnly}
            multiple={true}
            error={!!errors.season}
            className="h-8 text-xs rounded-lg"
            renderTriggerLabel={(selectedOpts) => {
              if (Array.isArray(selectedOpts)) {
                return selectedOpts.length > 0
                  ? selectedOpts.map((o) => o.label).join(", ")
                  : "Select Season(s)";
              }
              return "Select Season(s)";
            }}
          />
          {errors.season && <p className="text-[11px] text-red-500">{errors.season}</p>}
        </div>
      </div>
    </div>
  );
}

export function validateCropForm(form: CropFormValues) {
  const errors: Record<string, string> = {};
  if (!form.cropName.trim()) errors.cropName = "Crop name is required";
  if (!form.fieldType) errors.fieldType = "Field type is required";
  if (!form.categoryId) errors.categoryId = "Category is required";
  if (!form.season || form.season.length === 0) {
    errors.season = "At least one season must be selected";
  }
  return errors;
}
