"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FolderPlus } from "lucide-react";
import type { ChartOfAccount } from "../../../data";
import {
  accountTypeToPrimaryLabel,
  parentGroupLabel,
  resolveInheritedAccountType,
  type GroupFormValues,
} from "../chart-of-accounts-data";
import { CoaAddLedgerParentSelect } from "./CoaAddLedgerParentSelect";

type SheetMode = "add" | "edit";

interface GroupSheetProps {
  open: boolean;
  mode: SheetMode;
  form: GroupFormValues;
  formError: string | null;
  previewCode: string;
  records: ChartOfAccount[];
  active: ChartOfAccount | null;
  onClose: () => void;
  onSave: () => void;
  onFormChange: (form: GroupFormValues) => void;
  canEdit: boolean;
  parentGroupLocked?: boolean;
}

export function GroupSheet({
  open,
  mode,
  form,
  formError,
  previewCode,
  records,
  active,
  onClose,
  onSave,
  onFormChange,
  canEdit,
  parentGroupLocked = false,
}: GroupSheetProps) {
  const readOnly = !canEdit;
  const inheritedType = resolveInheritedAccountType(records, form.parentGroupId);
  const inheritedLabel = accountTypeToPrimaryLabel(inheritedType);

  const setForm = (patch: Partial<GroupFormValues>) =>
    onFormChange({ ...form, ...patch });

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="w-full sm:max-w-[440px] flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-4 border-b border-border/60">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
              <FolderPlus className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <SheetTitle className="text-base">
                {mode === "add" ? "Add Sub-Group" : "Edit Sub-Group"}
              </SheetTitle>
              <SheetDescription className="text-[11px] mt-0.5">
                {mode === "add"
                  ? "Create a nested group under the chart of accounts"
                  : active?.accountCode}
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-3 px-5 py-4">
          {mode === "add" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Group Code</Label>
              <Input
                value={previewCode}
                readOnly
                className="h-9 text-sm rounded-lg bg-muted/30 font-mono text-brand-700"
              />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Sub-Group Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.groupName}
              onChange={(e) => setForm({ groupName: e.target.value })}
              placeholder="e.g. Private Banks, Institutional Customers"
              disabled={readOnly}
              className="h-9 text-sm rounded-lg"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Parent Group <span className="text-red-500">*</span>
            </Label>
            {parentGroupLocked && form.parentGroupId ? (
              <Input
                value={parentGroupLabel(records, form.parentGroupId)}
                readOnly
                className="h-9 text-sm rounded-lg bg-muted/30"
              />
            ) : (
              <CoaAddLedgerParentSelect
                records={records}
                value={form.parentGroupId}
                onChange={(id) => setForm({ parentGroupId: id })}
                disabled={readOnly}
                filterMode="subgroup"
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Accounting Nature</Label>
            <Input
              value={inheritedLabel}
              readOnly
              className="h-9 text-sm rounded-lg bg-muted/30"
            />
            <p className="text-[11px] text-muted-foreground">
              Inherited from the root primary group and cannot be changed.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Description</Label>
            <Textarea
              value={form.description}
              onChange={(e) => setForm({ description: e.target.value })}
              rows={2}
              disabled={readOnly}
              className="text-sm rounded-lg resize-none"
              placeholder="Optional notes about this sub-group"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active" ? "Active and visible" : "Inactive and hidden"}
              </p>
            </div>
            <ActiveInactiveToggle
              active={form.status === "active"}
              onChange={(v) => setForm({ status: v ? "active" : "inactive" })}
              disabled={readOnly}
            />
          </div>

          {formError && (
            <p className="text-xs text-red-500">{formError}</p>
          )}
        </SheetBody>

        <SheetFooter className="px-5 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          {canEdit && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onSave}
            >
              {mode === "add" ? "Create Sub-Group" : "Save Changes"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
