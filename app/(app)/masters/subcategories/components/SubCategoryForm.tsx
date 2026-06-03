"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type SubCategoryStatus } from "../subcategory-data";

export interface SubCategoryFormValues {
  subCategoryCode: string;
  subCategoryName: string;
  categoryName: string;
  description: string;
  status: SubCategoryStatus;
}

export const DEFAULT_SUBCATEGORY_FORM: SubCategoryFormValues = {
  subCategoryCode: "",
  subCategoryName: "",
  categoryName: "",
  description: "",
  status: "active",
};

export function SubCategoryForm({
  form,
  onChange,
  errors,
  onClearError,
  categoryOptions,
}: {
  form: SubCategoryFormValues;
  onChange: (form: SubCategoryFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  categoryOptions: { label: string; value: string }[];
}) {
  const set = <K extends keyof SubCategoryFormValues>(key: K, value: SubCategoryFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) => cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Sub Category Details</p>
        <p className="text-[11px] text-muted-foreground">Keep sub category details compact and aligned with Category Master.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Sub Category Code</Label>
          <Input value={form.subCategoryCode} readOnly className={cn(inputCls("subCategoryCode"), "font-mono bg-muted/40")} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Sub Category Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.subCategoryName}
            onChange={(e) => set("subCategoryName", e.target.value)}
            placeholder="e.g. Hybrid Seeds"
            className={inputCls("subCategoryName")}
          />
          {errors.subCategoryName && <p className="text-[11px] text-red-500">{errors.subCategoryName}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Category <span className="text-red-500">*</span>
          </Label>
          <Select value={form.categoryName} onValueChange={(value) => set("categoryName", value)}>
            <SelectTrigger className={inputCls("categoryName")}>
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categoryOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.categoryName && <p className="text-[11px] text-red-500">{errors.categoryName}</p>}
        </div>
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs font-medium">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description..."
            className="min-h-[96px] text-xs resize-none"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Status</Label>
          <Select value={form.status} onValueChange={(value) => set("status", value as SubCategoryStatus)}>
            <SelectTrigger className={inputCls("status")}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}

export function validateSubCategoryForm(form: SubCategoryFormValues) {
  const errors: Record<string, string> = {};
  if (!form.subCategoryName.trim()) errors.subCategoryName = "Sub category name is required";
  if (!form.subCategoryCode.trim()) errors.subCategoryCode = "Sub category code is required";
  if (!form.categoryName.trim()) errors.categoryName = "Category is required";
  return errors;
}

export function SubCategoryFormActions({
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
      <Button variant="outline" size="sm" className="h-7 px-3 text-[11px]" onClick={onCancel}>
        Discard
      </Button>
      <Button size="sm" className="h-7 gap-1.5 bg-brand-600 px-3 text-[11px] text-white hover:bg-brand-700" onClick={onSave}>
        {saveLabel}
      </Button>
    </div>
  );
}

