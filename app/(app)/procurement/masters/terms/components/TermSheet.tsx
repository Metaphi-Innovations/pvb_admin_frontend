"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { APPLICABLE_TO_OPTIONS, type TermsMaster } from "../terms-data";

export interface TermFormState {
  termTitle: string;
  termContent: string;
  applicableTo: "pr" | "po" | "both";
  defaultTerm: boolean;
  status: "active" | "inactive";
}

const EMPTY: TermFormState = {
  termTitle: "",
  termContent: "",
  applicableTo: "po",
  defaultTerm: false,
  status: "active",
};

export default function TermSheet({
  open,
  onClose,
  onSave,
  term,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (data: TermFormState) => void;
  term?: TermsMaster | null;
}) {
  const [form, setForm] = useState<TermFormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (term) {
      setForm({
        termTitle: term.termTitle,
        termContent: term.termContent,
        applicableTo: term.applicableTo,
        defaultTerm: term.defaultTerm,
        status: term.status,
      });
    } else setForm(EMPTY);
    setErrors({});
  }, [term, open]);

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.termTitle.trim()) e.termTitle = "Required";
    if (!form.termContent.trim()) e.termContent = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{term ? "Edit Term" : "Add Term"}</SheetTitle>
          <SheetDescription>Terms & Conditions master</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs">Term Title *</Label>
            <Input value={form.termTitle} onChange={(e) => setForm((p) => ({ ...p, termTitle: e.target.value }))} className="h-8 text-xs" />
            {errors.termTitle && <p className="text-[11px] text-red-600">{errors.termTitle}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Term Content *</Label>
            <Textarea value={form.termContent} onChange={(e) => setForm((p) => ({ ...p, termContent: e.target.value }))} className="text-xs min-h-[100px]" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Applicable To</Label>
            <AutocompleteSelect
              options={APPLICABLE_TO_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              value={form.applicableTo}
              onChange={(v) => setForm((p) => ({ ...p, applicableTo: v as TermFormState["applicableTo"] }))}
              placeholder="Select applicable to…"
              className="h-8 text-xs"
            />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Default Term</Label>
            <Switch checked={form.defaultTerm} onCheckedChange={(c) => setForm((p) => ({ ...p, defaultTerm: c }))} />
          </div>
          <div className="flex items-center justify-between">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.status === "active"} onCheckedChange={(c) => setForm((p) => ({ ...p, status: c ? "active" : "inactive" }))} />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => validate() && onSave(form)}>
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
