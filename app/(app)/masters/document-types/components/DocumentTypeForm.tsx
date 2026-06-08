"use client";

import React from "react";
import { AlertCircle, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface DocumentTypeFormValues {
  title: string;
  description: string;
}

export const DEFAULT_DOCUMENT_TYPE_FORM: DocumentTypeFormValues = {
  title: "",
  description: "",
};

export function validateDocumentTypeForm(form: DocumentTypeFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.title.trim()) {
    errors.title = "Title is required";
  }
  return errors;
}

export function DocumentTypeForm({
  form,
  onChange,
  errors,
  onClearError,
  readOnly,
}: {
  form: DocumentTypeFormValues;
  onChange: (form: DocumentTypeFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
}) {
  const set = <K extends keyof DocumentTypeFormValues>(key: K, value: DocumentTypeFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <div className="w-full space-y-4">
      {/* Top Header Block matching standard master form layouts */}
      <div className="flex items-start gap-2.5 pb-3 border-b border-border">
        <div className="flex items-center justify-center flex-shrink-0 border rounded-lg w-7 h-7 bg-brand-50 border-brand-100">
          <FileText className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Document Type Master</p>
          <p className="text-[11px] text-muted-foreground">Manage predefined document types</p>
        </div>
      </div>

      <div className="pt-1 space-y-4">
        {/* Title */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">
            Title <span className="text-red-500">*</span>
          </Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. GST Registration Copy"
            className={inputCls("title")}
            disabled={readOnly}
          />
          {errors.title && (
            <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errors.title}
            </p>
          )}
        </div>

        {/* Description */}
        <div className="space-y-1">
          <Label className="text-xs font-medium">Description</Label>
          <Textarea
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Description..."
            className="min-h-[96px] text-xs resize-none rounded-lg"
            disabled={readOnly}
          />
        </div>
      </div>
    </div>
  );
}
