"use client";

import { History, User } from "lucide-react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { cn } from "@/lib/utils";
import type { AuditTrailRecord } from "@/lib/accounts/audit-trail-data";
import { AUDIT_TRAIL_CATEGORY_LABELS } from "@/lib/accounts/audit-trail-data";

function InfoField({
  label,
  value,
  mono,
  className,
}: {
  label: string;
  value: string;
  mono?: boolean;
  className?: string;
}) {
  return (
    <div className={className}>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
        {label}
      </p>
      <p className={cn("text-xs font-medium text-foreground break-words", mono && "font-mono")}>
        {value || "—"}
      </p>
    </div>
  );
}

function formatDateTime(iso: string): string {
  const [date, time] = iso.split("T");
  if (!date) return iso;
  const [y, m, d] = date.split("-");
  const t = time?.slice(0, 8).replace(".000Z", "") ?? "";
  return `${d}-${m}-${y}${t ? ` ${t}` : ""}`;
}

interface AuditTrailDetailSheetProps {
  record: AuditTrailRecord | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AuditTrailDetailSheet({ record, open, onOpenChange }: AuditTrailDetailSheetProps) {
  if (!record) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <History className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate font-mono text-brand-700">{record.reference}</SheetTitle>
              <SheetDescription>{record.module} — {record.action}</SheetDescription>
            </div>
            <StatusBadge status={record.status} />
          </div>
        </SheetHeader>

        <SheetBody className="space-y-4">
          <div className="pb-2.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Activity Summary
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3 bg-muted/30 rounded-lg px-3 py-2.5">
            <InfoField label="Date & Time" value={formatDateTime(record.dateTime)} />
            <InfoField label="Category" value={AUDIT_TRAIL_CATEGORY_LABELS[record.category]} />
            <InfoField label="Activity Type" value={record.activityType} />
            <InfoField label="Action Performed" value={record.action} className="col-span-2" />
          </div>

          <div className="pb-2.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
              <User className="w-3 h-3" />
              User Details
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoField label="User Name" value={record.user} />
            <InfoField label="Role" value={record.role} />
            {record.userEmail ? (
              <InfoField label="Email" value={record.userEmail} className="col-span-2" />
            ) : null}
          </div>

          <div className="pb-2.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Module & Reference
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <InfoField label="Module" value={record.module} />
            <InfoField label="Module Code" value={record.moduleCode ?? "—"} mono />
            <InfoField label="Voucher / Reference No." value={record.reference} mono className="col-span-2" />
            {record.voucherAmount ? (
              <InfoField label="Amount" value={record.voucherAmount} />
            ) : null}
            {record.partyName ? (
              <InfoField label="Party" value={record.partyName} className={record.voucherAmount ? "" : "col-span-2"} />
            ) : null}
          </div>

          <div className="pb-2.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Value Changes
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border border-border bg-red-50/40 px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                Old Value
              </p>
              <p className="text-xs font-medium text-foreground break-words">{record.oldValue || "—"}</p>
            </div>
            <div className="rounded-lg border border-border bg-emerald-50/40 px-3 py-2.5">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-1">
                New Value
              </p>
              <p className="text-xs font-medium text-foreground break-words">{record.newValue || "—"}</p>
            </div>
          </div>

          {(record.remarks || record.details) && (
            <>
              <div className="pb-2.5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Remarks
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5">
                <p className="text-xs text-foreground leading-relaxed">
                  {record.remarks || record.details}
                </p>
              </div>
            </>
          )}

          {record.approvalDetails && (
            <>
              <div className="pb-2.5 border-b border-border">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Approval Details
                </p>
              </div>
              <div className="rounded-lg border border-border bg-muted/20 px-3 py-2.5 space-y-2">
                <InfoField label="Approval Level" value={record.approvalDetails.level} />
                {record.approvalDetails.approver && record.approvalDetails.approver !== "—" ? (
                  <InfoField label="Approver" value={record.approvalDetails.approver} />
                ) : null}
                {record.approvalDetails.pendingWith ? (
                  <InfoField label="Pending With" value={record.approvalDetails.pendingWith} />
                ) : null}
                {record.approvalDetails.approvedAt ? (
                  <InfoField
                    label="Approved At"
                    value={formatDateTime(record.approvalDetails.approvedAt)}
                  />
                ) : null}
                {record.approvalDetails.rejectionReason ? (
                  <div>
                    <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-medium mb-0.5">
                      Rejection Reason
                    </p>
                    <p className="text-xs font-medium text-red-700">{record.approvalDetails.rejectionReason}</p>
                  </div>
                ) : null}
                {record.approvalDetails.note ? (
                  <InfoField label="Note" value={record.approvalDetails.note} />
                ) : null}
              </div>
            </>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
