"use client";

import React, { useState, useMemo } from "react";
import { AlertCircle, X, User } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type CustomerTypeDocument } from "../customer-type-data";
import { loadDocumentTypes } from "../../document-types/document-type-data";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

export interface CustomerTypeFormValues {
  customerTypeCode: string;
  customerType: string;
  description: string;
  documentTypes: CustomerTypeDocument[];
}

export const DEFAULT_CUSTOMER_TYPE_FORM: CustomerTypeFormValues = {
  customerTypeCode: "",
  customerType: "",
  description: "",
  documentTypes: [],
};

export function validateCustomerTypeForm(form: CustomerTypeFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  if (!form.customerType.trim()) {
    errors.customerType = "Customer type is required";
  }
  if (!form.customerTypeCode.trim()) {
    errors.customerTypeCode = "Customer type code is required";
  }
  if (!form.documentTypes || form.documentTypes.length === 0) {
    errors.documentTypes = "At least one document type is required";
  }
  return errors;
}

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

export function CustomerTypeForm({
  form,
  onChange,
  errors,
  onClearError,
  readOnly,
  triggerToast,
}: {
  form: CustomerTypeFormValues;
  onChange: (form: CustomerTypeFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
  triggerToast?: (message: string, type: "success" | "error") => void;
}) {
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);

  const docTypesList = useMemo(() => {
    return loadDocumentTypes().filter((d) => d.status === "Active");
  }, []);

  const autocompleteOptions = useMemo(() => {
    return docTypesList.map((d) => ({
      value: d.id,
      label: d.title,
    }));
  }, [docTypesList]);

  const set = <K extends keyof CustomerTypeFormValues>(key: K, value: CustomerTypeFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const handleAddDocument = () => {
    if (selectedDocIds.length === 0) {
      triggerToast?.("Please select at least one document type", "error");
      return;
    }
    const existingIds = new Set((form.documentTypes || []).map((d) => d.documentTypeId));
    const selectedDocs = docTypesList.filter((d) => selectedDocIds.includes(d.id));
    const newDocs = selectedDocs.filter((d) => !existingIds.has(d.id));

    if (newDocs.length === 0) {
      triggerToast?.("Selected document types are already added", "error");
      return;
    }

    const updated = [
      ...(form.documentTypes || []),
      ...newDocs.map((doc) => ({
        id: `DOC-${Math.floor(100000 + Math.random() * 900000)}`,
        documentTypeId: doc.id,
        documentName: doc.title,
      })),
    ];
    set("documentTypes", updated);
    setSelectedDocIds([]);
    triggerToast?.(
      newDocs.length === 1 ? "Document type added" : "Document types added",
      "success",
    );
  };

  const handleRemoveDocument = (id: string) => {
    const updated = (form.documentTypes || []).filter((d) => d.id !== id);
    set("documentTypes", updated);
    triggerToast?.("Document type removed", "success");
  };

  const inputCls = (key: string) =>
    cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <div className="w-full space-y-4">
      {/* Top Header Block */}
      <div className="flex items-start gap-2.5 pb-3 border-b border-border">
        <div className="flex items-center justify-center flex-shrink-0 border rounded-lg w-7 h-7 bg-brand-50 border-brand-100">
          <User className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">Customer Type Master</p>
          <p className="text-[11px] text-muted-foreground">Customer type classification and document requirements</p>
        </div>
      </div>

      <div className="pt-1 space-y-5">
        <div>
          <SectionHead label="Customer Type Details" />
          <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
            {/* Customer Type Code */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Customer Type Code <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.customerTypeCode}
                onChange={(e) => set("customerTypeCode", e.target.value.toUpperCase())}
                placeholder="Auto-generated code"
                className={cn(inputCls("customerTypeCode"), "font-mono")}
                disabled={readOnly}
                readOnly
              />
              {errors.customerTypeCode && (
                <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.customerTypeCode}
                </p>
              )}
            </div>

            {/* Customer Type */}
            <div className="space-y-1">
              <Label className="text-xs font-medium">
                Customer Type <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.customerType}
                onChange={(e) => set("customerType", e.target.value)}
                placeholder="e.g. Farmer"
                className={inputCls("customerType")}
                disabled={readOnly}
              />
              {errors.customerType && (
                <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
                  {errors.customerType}
                </p>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1 md:col-span-2 md:col-start-1">
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

        {/* Document Type Checklist */}
        <div className="pt-4 space-y-3 border-t border-border/60">
          <div>
            <SectionHead
              label="Document Type Required"
              sub="Add list of documents required for this customer type."
            />
          </div>

          {/* Add Controls */}
          {!readOnly && (
            <div className="flex items-end gap-3 p-3 border rounded-lg bg-muted/20 border-border">
              {/* Document Type Dropdown */}
              <div className="flex-1 space-y-1">
                <Label className="text-[11px] font-medium text-muted-foreground">Document Details</Label>
                <AutocompleteSelect
                  options={autocompleteOptions}
                  value={selectedDocIds}
                  onChange={(val) => setSelectedDocIds(Array.isArray(val) ? val : [])}
                  multiple
                  placeholder="Select Document Type"
                  searchPlaceholder="Search document type..."
                  className="h-8 text-xs bg-white border-border"
                />
              </div>

              <Button
                type="button"
                onClick={handleAddDocument}
                size="sm"
                className="flex-shrink-0 h-8 px-4 text-xs text-white bg-brand-600 hover:bg-brand-700"
              >
                Add
              </Button>
            </div>
          )}

          {errors.documentTypes && (
            <p className="flex items-center gap-1 text-[11px] text-red-500">
              <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
              {errors.documentTypes}
            </p>
          )}

          {/* Document Checklist Table */}
          <div className="overflow-hidden bg-white border rounded-lg border-border">
            <table className="min-w-full divide-y table-fixed divide-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-12 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Sr.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Document Details</th>
                  {!readOnly && <th className="w-20 px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground">Action</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {!form.documentTypes || form.documentTypes.length === 0 ? (
                  <tr>
                    <td colSpan={readOnly ? 2 : 3} className="px-3 py-6 text-xs text-center text-muted-foreground">
                      No documents added yet.
                    </td>
                  </tr>
                ) : (
                  form.documentTypes.map((doc, idx) => (
                    <tr key={doc.id} className="transition-colors hover:bg-muted/10">
                      <td className="px-3 py-2.5 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                      <td className="px-3 py-2.5 text-xs text-foreground font-medium break-words whitespace-normal font-mono">
                        {doc.documentName}
                      </td>
                      {!readOnly && (
                        <td className="px-3 py-2 text-center">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveDocument(doc.id)}
                            className="w-6 h-6 p-0 text-red-600 rounded-md hover:text-red-700 hover:bg-red-50"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
