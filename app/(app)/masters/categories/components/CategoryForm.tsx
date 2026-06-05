"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { type CategoryStatus } from "../category-data";

export interface CategoryFormValues {
  categoryCode: string;
  categoryName: string;
  description: string;
  status: CategoryStatus;
}

export const DEFAULT_CATEGORY_FORM: CategoryFormValues = {
  categoryCode: "",
  categoryName: "",
  description: "",
  status: "active",
};

export function CategoryForm({
  form,
  onChange,
  errors,
  onClearError,
  readOnly,
}: {
  form: CategoryFormValues;
  onChange: (form: CategoryFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
}) {
  const set = <K extends keyof CategoryFormValues>(key: K, value: CategoryFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) => cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Category Details</p>
        <p className="text-[11px] text-muted-foreground">Keep category master details compact and consistent.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="space-y-1">
          <Label className="text-xs font-medium">Category Code</Label>
          <Input value={form.categoryCode} readOnly className={cn(inputCls("categoryCode"), "font-mono bg-muted/30 cursor-not-allowed")} />
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Category Name <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.categoryName}
            onChange={(e) => set("categoryName", e.target.value)}
            placeholder="e.g. Fertilizers"
            className={cn(inputCls("categoryName"), "bg-background")}
            disabled={readOnly}
          />
          {errors.categoryName && <p className="text-[11px] text-red-500">{errors.categoryName}</p>}
        </div>
        <div className="space-y-1">
          <Label className="text-xs font-medium">Status</Label>
          <Select value={form.status} onValueChange={(value) => set("status", value as CategoryStatus)} disabled={readOnly}>
            <SelectTrigger className={inputCls("status")}>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="hidden md:block" />
        <div className="space-y-1 md:col-span-2">
          <Label className="text-xs font-medium">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Short description..."
            className="min-h-[96px] text-xs resize-none rounded-lg"
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}

export function validateCategoryForm(form: CategoryFormValues) {
  const errors: Record<string, string> = {};
  if (!form.categoryName.trim()) errors.categoryName = "Category name is required";
  if (!form.categoryCode.trim()) errors.categoryCode = "Category code is required";
  return errors;
}

export function CategoryFormActions({
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

