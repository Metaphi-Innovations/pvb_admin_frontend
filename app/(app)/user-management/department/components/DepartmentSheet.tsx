"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import type { Department, DepartmentFormState } from "../department-data";

interface Errors {
  name?: string;
}

interface DepartmentSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: DepartmentFormState) => void;
  dept?: Department | null;
  saving?: boolean;
  formError?: string | null;
}

export default function DepartmentSheet({
  open,
  onClose,
  onSave,
  dept,
  saving = false,
  formError,
}: DepartmentSheetProps) {
  const isEdit = !!dept;

  const [form, setForm] = useState<DepartmentFormState>({
    name: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    if (dept) {
      setForm({
        name: dept.name,
        remarks: dept.remarks,
      });
    } else {
      setForm({ name: "", remarks: "" });
    }
    setErrors({});
  }, [dept, open]);

  const set = (field: keyof DepartmentFormState, value: string) => {
    setForm((p) => ({ ...p, [field]: value }));
    if (errors[field as keyof Errors]) setErrors((p) => ({ ...p, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.name.trim()) e.name = "Department name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(form);
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Department" : "Add Department"}</SheetTitle>
          <SheetDescription>
            {isEdit ? `Updating ${dept?.name}` : "Create a new department"}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {formError ? <p className="text-xs text-red-600">{formError}</p> : null}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Sales, HR, Accounts"
              className={cn(
                "h-9 text-sm rounded-lg",
                errors.name && "border-red-400 focus-visible:ring-red-300",
              )}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={(e) => set("remarks", e.target.value)}
              placeholder="Any additional notes or remarks…"
              className="text-sm rounded-lg resize-none"
              rows={2}
            />
          </div>

          {isEdit && dept && (
            <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
                Record Info
              </p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <span className="text-muted-foreground">Created By</span>
                  <p className="font-medium text-foreground">{dept.createdBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created Date</span>
                  <p className="font-medium text-foreground">{dept.createdDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated By</span>
                  <p className="font-medium text-foreground">{dept.updatedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated Date</span>
                  <p className="font-medium text-foreground">{dept.updatedDate}</p>
                </div>
              </div>
            </div>
          )}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
            disabled={saving}
          >
            <Check className="w-3.5 h-3.5" />
            {isEdit ? "Save Changes" : "Create Department"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export type { Department };
