"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { type CropStatus, FIELD_TYPES, SEASONS, getCategoryOptions } from "../crop-data";

export interface CropFormValues {
  cropName: string;
  fieldType: string;
  categoryName: string;
  season: string[];
  status: CropStatus;
}

export const DEFAULT_CROP_FORM: CropFormValues = {
  cropName: "",
  fieldType: "",
  categoryName: "",
  season: [],
  status: "active",
};

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
  const set = <K extends keyof CropFormValues>(key: K, value: CropFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) => cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  const categoryOptions = getCategoryOptions();
  const fieldTypeOptions = FIELD_TYPES.map((ft) => ({ label: ft, value: ft }));
  const seasonOptions = SEASONS.map((s) => ({ label: s, value: s }));

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Crop Details</p>
        <p className="text-[11px] text-muted-foreground">Keep crop master details compact and consistent.</p>
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
            value={form.categoryName}
            onChange={(v) => set("categoryName", v)}
            placeholder="Select Category"
            disabled={readOnly}
            error={!!errors.categoryName}
            className="h-8 text-xs rounded-lg"
          />
          {errors.categoryName && <p className="text-[11px] text-red-500">{errors.categoryName}</p>}
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
  if (!form.categoryName) errors.categoryName = "Category is required";
  if (!form.season || form.season.length === 0) errors.season = "At least one season must be selected";
  return errors;
}

export function CropFormActions({
  onCancel,
  onSave,
  saveLabel,
}: {
  onCancel: () => void;
  onSave: () => void;
  saveLabel: string;
}) {
  return (
    <div className="flex items-center justify-end gap-2">
      <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={onCancel}>
        Discard
      </Button>
      <Button size="sm" className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700" onClick={onSave}>
        {saveLabel}
      </Button>
    </div>
  );
}
