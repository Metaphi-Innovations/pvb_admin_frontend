"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  MasterRecordDrawer,
  MASTER_DRAWER_CLASS,
  masterAuditFromRecord,
  type MasterDrawerAuditInfo,
  type MasterDrawerField,
  type MasterRecordDrawerProps,
} from "./MasterRecordDrawer";
import type { MasterStatus } from "@/lib/masters/common";

export type SheetMode = "add" | "edit" | "view" | null;

/** View drawer + compact add/edit sheet for listing pages that manage their own state */
export function MasterListingSheets({
  sheetMode,
  active,
  onClose,
  onEdit,
  onSave,
  sheetTitle,
  icon: Icon,
  viewDrawer,
  formContent,
  formError,
  saving = false,
  statusActive,
  onStatusChange,
}: {
  sheetMode: SheetMode;
  active: unknown | null;
  onClose: () => void;
  onEdit: () => void;
  onSave: () => void;
  sheetTitle: string;
  icon: LucideIcon;
  viewDrawer: Omit<
    MasterRecordDrawerProps,
    "open" | "onOpenChange" | "onClose" | "onEdit" | "icon"
  >;
  formContent: React.ReactNode;
  formError?: string;
  saving?: boolean;
  statusActive?: boolean;
  onStatusChange?: (active: boolean) => void;
}) {
  return (
    <>
      <MasterRecordDrawer
        open={sheetMode === "view" && !!active}
        onOpenChange={(o) => !o && onClose()}
        onClose={onClose}
        onEdit={onEdit}
        icon={Icon}
        {...viewDrawer}
      />

      <Sheet open={sheetMode === "add" || sheetMode === "edit"} onOpenChange={(o) => !o && onClose()}>
        <SheetContent className={MASTER_DRAWER_CLASS}>
          <SheetHeader>
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                <Icon className="h-4 w-4 text-brand-600" />
              </div>
              <div>
                <SheetTitle className="text-base">{sheetTitle}</SheetTitle>
                <SheetDescription className="text-xs">Compact master form</SheetDescription>
              </div>
            </div>
          </SheetHeader>
          <SheetBody>
            <div className="space-y-4">
              {formError && <p className="text-xs text-red-600">{formError}</p>}
              {formContent}
              {onStatusChange !== undefined && (
                <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
                  <div>
                    <p className="text-xs font-medium">Status</p>
                    <p className="text-[11px] text-muted-foreground">
                      {statusActive ? "Active" : "Inactive"}
                    </p>
                  </div>
                  <Switch checked={!!statusActive} onCheckedChange={onStatusChange} />
                </div>
              )}
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onSave}
              disabled={saving}
            >
              {saving ? "Saving..." : "Save"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}

export function buildSimpleMasterViewDrawer<T extends {
  status: string;
  createdBy?: string;
  createdAt?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedAt?: string;
  updatedDate?: string;
}>(opts: {
  drawerTitle: string;
  getRecordCode?: (r: T) => string | undefined;
  basicInfo: (r: T) => MasterDrawerField[];
  description?: (r: T) => string | null | undefined;
  showDescription?: boolean;
  auditInfo?: (r: T) => MasterDrawerAuditInfo;
}) {
  return (record: T) => ({
    title: opts.drawerTitle,
    recordCode: opts.getRecordCode?.(record),
    status: record.status,
    basicInfo: opts.basicInfo(record),
    description: opts.description?.(record),
    showDescription: opts.showDescription ?? opts.description !== undefined,
    auditInfo: opts.auditInfo?.(record) ?? masterAuditFromRecord(record),
  });
}
