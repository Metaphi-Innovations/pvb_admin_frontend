"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

/** Compact drawer width for small masters */
export const MASTER_DRAWER_CLASS = "max-w-[400px] w-full sm:max-w-[400px]";

export interface MasterDrawerField {
  label: string;
  value?: React.ReactNode;
  /** Render value in monospace (codes) */
  mono?: boolean;
}

export interface MasterDrawerAuditInfo {
  createdBy?: string;
  createdOn?: string;
  updatedBy?: string;
  updatedOn?: string;
}

export interface MasterRecordDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onClose: () => void;
  onEdit?: () => void;
  title: string;
  subtitle?: string;
  icon: LucideIcon;
  recordCode?: string;
  status?: "active" | "inactive" | "archived" | string;
  basicInfo?: MasterDrawerField[];
  description?: string | null;
  /** Show description section even when empty (default true) */
  showDescription?: boolean;
  auditInfo?: MasterDrawerAuditInfo;
  /** Optional extra sections below audit */
  children?: React.ReactNode;
  editLabel?: string;
  backLabel?: string;
}

export function MasterDrawerSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
        {title}
      </h3>
      {children}
    </section>
  );
}

function DrawerField({ label, value, mono }: MasterDrawerField) {
  return (
    <div className="space-y-1">
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <div
        className={cn(
          "text-sm font-medium text-foreground leading-snug",
          mono && "font-mono text-[13px]",
        )}
      >
        {value ?? "—"}
      </div>
    </div>
  );
}

function resolveStatusKey(status: string): StatusKey {
  if (status === "active" || status === "inactive") return status;
  if (status === "archived") return "inactive";
  if (status === "Active") return "active";
  if (status === "Inactive") return "inactive";
  return "draft";
}

export function MasterRecordDrawer({
  open,
  onOpenChange,
  onClose,
  onEdit,
  title,
  subtitle = "Read-only details",
  icon: Icon,
  recordCode,
  status,
  basicInfo = [],
  description,
  showDescription = true,
  auditInfo,
  children,
  editLabel = "Edit",
  backLabel = "Back",
}: MasterRecordDrawerProps) {
  const hasDescription = description != null && String(description).trim().length > 0;
  const statusKey = status ? resolveStatusKey(status) : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className={MASTER_DRAWER_CLASS}>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
              <Icon className="h-4 w-4 text-brand-600" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <SheetTitle className="text-base leading-tight">{title}</SheetTitle>
                {recordCode && (
                  <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5">
                    {recordCode}
                  </span>
                )}
              </div>
              <SheetDescription className="text-xs mt-0.5">{subtitle}</SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6">
          {(basicInfo.length > 0 || statusKey) && (
            <MasterDrawerSection title="Basic Information">
              <div className="space-y-4">
                {basicInfo.map((field) => (
                  <DrawerField key={field.label} {...field} />
                ))}
                {statusKey && (
                  <div className="space-y-1">
                    <p className="text-[11px] text-muted-foreground">Status</p>
                    <StatusBadge status={statusKey} size="sm" />
                  </div>
                )}
              </div>
            </MasterDrawerSection>
          )}

          {showDescription && (
            <MasterDrawerSection title="Description">
              {hasDescription ? (
                <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">
                  {description}
                </p>
              ) : (
                <div className="space-y-0.5">
                  <p className="text-sm text-muted-foreground">—</p>
                  <p className="text-[11px] text-muted-foreground/80 italic">
                    No description available
                  </p>
                </div>
              )}
            </MasterDrawerSection>
          )}

          {auditInfo && (
            <MasterDrawerSection title="Audit Information">
              <div className="space-y-4">
                <DrawerField label="Created By" value={auditInfo.createdBy || "—"} />
                <DrawerField label="Created On" value={auditInfo.createdOn || "—"} />
                <DrawerField label="Updated By" value={auditInfo.updatedBy || "—"} />
                <DrawerField label="Updated On" value={auditInfo.updatedOn || "—"} />
              </div>
            </MasterDrawerSection>
          )}

          {children}
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            {backLabel}
          </Button>
          {onEdit && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onEdit}
            >
              {editLabel}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/** Map common master record audit field names */
export function masterAuditFromRecord(record: {
  createdBy?: string;
  createdAt?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedAt?: string;
  updatedDate?: string;
}): MasterDrawerAuditInfo {
  return {
    createdBy: record.createdBy,
    createdOn: record.createdAt ?? record.createdDate,
    updatedBy: record.updatedBy,
    updatedOn: record.updatedAt ?? record.updatedDate,
  };
}
