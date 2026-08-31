"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { INVOICE_DETAIL_SELECT_CLASS, INVOICE_DETAIL_INPUT_CLASS } from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function ContraReasonDialog({
  open,
  onOpenChange,
  title,
  description,
  reason,
  onReasonChange,
  confirmLabel,
  destructive,
  busy,
  onConfirm,
  showApprover,
  approvers,
  approverId,
  onApproverChange,
  showDate,
  dateValue,
  onDateChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  reason?: string;
  onReasonChange?: (value: string) => void;
  confirmLabel: string;
  destructive?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  showApprover?: boolean;
  approvers?: { value: string; label: string }[];
  approverId?: string;
  onApproverChange?: (value: string) => void;
  showDate?: boolean;
  dateValue?: string;
  onDateChange?: (value: string) => void;
}) {
  const needsReason = typeof onReasonChange === "function";
  const canConfirm =
    (!needsReason || (reason ?? "").trim().length > 0) &&
    (!showApprover || !!approverId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-base">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="pt-1">{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <div className="space-y-3 py-1">
          {showApprover ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Approver <span className="text-red-500">*</span>
              </Label>
              <Select value={approverId} onValueChange={onApproverChange}>
                <SelectTrigger className={INVOICE_DETAIL_SELECT_CLASS}>
                  <SelectValue placeholder="Select approver…" />
                </SelectTrigger>
                <SelectContent>
                  {(approvers ?? []).map((a) => (
                    <SelectItem key={a.value} value={a.value}>
                      {a.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}

          {showDate ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Reversal Date</Label>
              <Input
                type="date"
                className={INVOICE_DETAIL_INPUT_CLASS}
                value={dateValue || ""}
                onChange={(e) => onDateChange?.(e.target.value)}
              />
            </div>
          ) : null}

          {needsReason ? (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                className="text-xs min-h-[72px]"
                value={reason}
                onChange={(e) => onReasonChange?.(e.target.value)}
                placeholder="Enter reason…"
              />
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={
              destructive
                ? "h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
                : "h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            }
            disabled={busy || !canConfirm}
            onClick={onConfirm}
          >
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
