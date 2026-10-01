"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  AlertTriangle,
  Settings,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { HrPageShell } from "../../components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";

export function SettingsPageShell({
  title,
  description,
  actions,
  icon = Settings,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  icon?: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <HrPageShell
      title={title}
      description={description}
      icon={icon}
      actions={actions}
      breadcrumbs={hrBreadcrumb(
        { label: "Settings", href: "/hr/settings" },
        { label: "Organization Setup", href: "/hr/settings" },
        { label: title },
      )}
    >
      {children}
    </HrPageShell>
  );
}

export function OrgField({
  label,
  required,
  helper,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-xs text-red-500">{error}</p>}
      {helper && !error && <p className="text-[11px] text-muted-foreground">{helper}</p>}
    </div>
  );
}

export function OrgMasterTableShell({
  search,
  onSearchChange,
  searchPlaceholder,
  children,
  empty,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  searchPlaceholder: string;
  children: React.ReactNode;
  empty?: boolean;
}) {
  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={searchPlaceholder}
          className="h-9 pl-8 text-sm rounded-[10px]"
        />
      </div>
      <div className="bg-white border border-border rounded-[12px] shadow-sm overflow-hidden">
        {empty ? (
          <div className="py-14 text-center">
            <p className="text-sm font-semibold text-foreground">No records found</p>
            <p className="text-xs text-muted-foreground mt-1">Add your first entry to get started.</p>
          </div>
        ) : (
          <div className="[&_thead]:bg-muted/40 [&_thead]:border-b [&_thead]:border-border [&_th]:text-[11px] [&_th]:font-semibold [&_th]:text-foreground [&_tbody_tr]:border-b [&_tbody_tr]:border-border/60 [&_tbody_tr:hover]:bg-muted/20 [&_tbody_tr]:transition-colors">
            {children}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Row actions for org settings masters.
 * Activate/Deactivate removed — use HrActiveStatusSwitch in the Status column.
 */
export function OrgRowActions({
  onEdit,
  onDelete,
  deleteLabel = "Delete",
  editLabel = "Edit",
}: {
  onEdit: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  editLabel?: string;
}) {
  return (
    <div className="inline-flex items-center gap-0.5" onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        aria-label={editLabel}
        title={editLabel}
        onClick={onEdit}
        className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-transparent bg-transparent text-slate-600 hover:bg-muted hover:text-slate-800 hover:border-border transition-colors"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      {onDelete ? (
        <button
          type="button"
          aria-label={deleteLabel}
          title={deleteLabel}
          onClick={onDelete}
          className="h-8 w-8 inline-flex items-center justify-center rounded-lg border border-transparent bg-transparent text-slate-600 hover:bg-red-50 hover:text-red-600 hover:border-red-100 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ) : null}
    </div>
  );
}

export function OrgMasterSheet({
  open,
  onOpenChange,
  title,
  description,
  children,
  onSave,
  saveLabel = "Save",
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  description?: string;
  children: React.ReactNode;
  onSave: () => void;
  saveLabel?: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{title}</SheetTitle>
          {description && <SheetDescription>{description}</SheetDescription>}
        </SheetHeader>
        <SheetBody className="space-y-3">{children}</SheetBody>
        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white" onClick={onSave}>
            {saveLabel}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

export function OrgConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = "Confirm",
  destructive,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  destructive?: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm rounded-[18px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div
              className={cn(
                "w-8 h-8 rounded-[10px] flex items-center justify-center shrink-0",
                destructive ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200",
              )}
            >
              <AlertTriangle className={cn("w-4 h-4", destructive ? "text-red-500" : "text-amber-500")} />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn(
              "h-8 text-xs rounded-[10px] text-white",
              destructive ? "bg-red-600 hover:bg-red-700" : "bg-brand-600 hover:bg-brand-700",
            )}
            onClick={() => {
              onConfirm();
              onClose();
            }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function OrgStatusToggle({
  checked,
  onCheckedChange,
  activeLabel = "Active and available for assignment",
  inactiveLabel = "Inactive and hidden from new assignments",
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  activeLabel?: string;
  inactiveLabel?: string;
}) {
  return (
    <div className="flex items-center justify-between p-3 rounded-[14px] border border-border bg-muted/20">
      <div>
        <p className="text-xs font-medium text-foreground">Status</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">{checked ? activeLabel : inactiveLabel}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={cn("text-xs font-medium", checked ? "text-emerald-600" : "text-muted-foreground")}>
          {checked ? "Active" : "Inactive"}
        </span>
        <Switch checked={checked} onCheckedChange={onCheckedChange} />
      </div>
    </div>
  );
}

export { Input, Label, Textarea, Link, Plus, HrStatusBadge, Button };
