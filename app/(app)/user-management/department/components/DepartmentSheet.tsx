"use client";

import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";

export interface Department {
  id: number;
  code: string;
  name: string;
  status: string;
  remarks: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
  lastStatusChange: string;
}

interface FormState {
  name: string;
  status: string;
  remarks: string;
}

interface Errors {
  name?: string;
}

interface DepartmentSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: FormState) => void;
  dept?: Department | null;
}

export default function DepartmentSheet({ open, onClose, onSave, dept }: DepartmentSheetProps) {
  const isEdit = !!dept;

  const [form, setForm] = useState<FormState>({
    name: "", status: "active", remarks: "",
  });
  const [errors, setErrors] = useState<Errors>({});

  // Populate on open / dept change
  useEffect(() => {
    if (dept) {
      setForm({
        name:    dept.name,
        status:  dept.status,
        remarks: dept.remarks,
      });
    } else {
      setForm({ name: "", status: "active", remarks: "" });
    }
    setErrors({});
  }, [dept, open]);

  const set = (field: keyof FormState, value: string) => {
    setForm(p => ({ ...p, [field]: value }));
    if (errors[field as keyof Errors]) setErrors(p => ({ ...p, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Errors = {};
    if (!form.name.trim())          e.name = "Department name is required";
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
          {/* Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Department Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.name}
              onChange={e => set("name", e.target.value)}
              placeholder="e.g. Sales, HR, Accounts"
              className={cn("h-9 text-sm rounded-lg", errors.name && "border-red-400 focus-visible:ring-red-300")}
              autoFocus
            />
            {errors.name && <p className="text-xs text-red-500">{errors.name}</p>}
          </div>

          {/* Status toggle */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active" ? "Department is active and visible" : "Department is inactive and hidden from selection"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn(
                "text-xs font-medium",
                form.status === "active" ? "text-emerald-600" : "text-muted-foreground",
              )}>
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={v => set("status", v ? "active" : "inactive")}
              />
            </div>
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Remarks</Label>
            <Textarea
              value={form.remarks}
              onChange={e => set("remarks", e.target.value)}
              placeholder="Any additional notes or remarks…"
              className="text-sm rounded-lg resize-none"
              rows={2}
            />
          </div>

          {/* Audit info (edit mode) */}
          {isEdit && dept && (
            <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
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
          >
            <Check className="w-3.5 h-3.5" />
            {isEdit ? "Save Changes" : "Create Department"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
