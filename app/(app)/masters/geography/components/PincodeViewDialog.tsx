"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { StatusBadge } from "@/components/record-detail/StatusBadge";
import type { PincodeRecord } from "../pincode-data";

function DetailItem({ label, value }: { label: string; value?: string }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value?.trim() ? value : "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-foreground border-b border-border pb-1.5">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function PincodeViewDialog({
  open,
  onClose,
  record,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  record: PincodeRecord | null;
  onEdit?: () => void;
}) {
  if (!record) return null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <span className="font-mono">{record.pincode}</span>
            <span className="text-sm text-muted-foreground font-normal">
              {record.town}, {record.city}
            </span>
          </DialogTitle>
          <DialogDescription>Pincode record details</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          <Section title="Basic Information">
            <DetailItem label="Pincode" value={record.pincode} />
            <DetailItem label="State" value={record.stateName} />
            <DetailItem label="District" value={record.district} />
            <DetailItem label="City" value={record.city} />
            <DetailItem label="Town" value={record.town} />
            <div>
              <p className="text-[11px] text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={record.status} />
              </div>
            </div>
          </Section>

          <Section title="System Information">
            <DetailItem label="Created By" value={record.createdBy} />
            <DetailItem label="Created Date" value={record.createdDate} />
            <DetailItem label="Updated By" value={record.updatedBy} />
            <DetailItem label="Updated Date" value={record.updatedDate} />
          </Section>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Close
          </Button>
          {onEdit && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onEdit}
            >
              Edit
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
