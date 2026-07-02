"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Check, CheckCircle, Loader2, X, AlertTriangle, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type AccountsDocumentWorkflow,
  type AccountsApprovalStep,
  WORKFLOW_STATUS_LABELS,
  resolveWorkflowStatus,
  canEditAccountsDocument,
  canSubmitForApproval,
  canCurrentUserApprove,
} from "@/lib/accounts/accounts-maker-checker";
import { AccountsVoucherStatusBadge } from "./AccountsVoucherStatusBadge";

function StepIcon({ state }: { state: AccountsApprovalStep["state"] }) {
  if (state === "created" || state === "approved") {
    return <Check className="w-3.5 h-3.5" />;
  }
  if (state === "pending") {
    return <Loader2 className="w-3.5 h-3.5 animate-spin" />;
  }
  if (state === "rejected" || state === "sent_back") {
    return <X className="w-3.5 h-3.5" />;
  }
  return <span className="w-2 h-2 rounded-full bg-muted-foreground/30" />;
}

function stepCircleClass(state: AccountsApprovalStep["state"]): string {
  if (state === "created" || state === "approved") return "bg-emerald-500 text-white";
  if (state === "pending") return "bg-brand-600 text-white ring-4 ring-brand-100";
  if (state === "rejected") return "bg-red-500 text-white";
  if (state === "sent_back") return "bg-navy-600 text-white";
  return "bg-white border-2 border-border text-muted-foreground";
}

function stepLabel(state: AccountsApprovalStep["state"]): string {
  if (state === "created") return "Created";
  if (state === "pending") return "Pending";
  if (state === "approved") return "Approved";
  if (state === "rejected") return "Rejected";
  if (state === "sent_back") return "Sent Back";
  return "Waiting";
}

export interface AccountsMakerCheckerPanelProps {
  workflow: AccountsDocumentWorkflow;
  legacyStatus?: string;
  readOnly?: boolean;
  reviewMode?: boolean;
  onSaveDraft?: () => void;
  onSubmitForApproval?: (remarks: string) => void;
  onResubmit?: (remarks: string) => void;
  onApprove?: (remarks: string) => void;
  onReject?: (remarks: string) => void;
  onSendBack?: (remarks: string) => void;
  onDuplicate?: () => void;
  saving?: boolean;
}

export function AccountsMakerCheckerPanel({
  workflow,
  legacyStatus,
  readOnly = false,
  reviewMode = false,
  onSaveDraft,
  onSubmitForApproval,
  onResubmit,
  onApprove,
  onReject,
  onSendBack,
  onDuplicate,
  saving = false,
}: AccountsMakerCheckerPanelProps) {
  const [remarks, setRemarks] = useState(workflow.remarks ?? "");
  const [confirm, setConfirm] = useState<"reject" | "send_back" | null>(null);
  const [confirmRemarks, setConfirmRemarks] = useState("");

  const status = resolveWorkflowStatus(workflow, legacyStatus);
  const editable = !readOnly && !reviewMode && canEditAccountsDocument(workflow, legacyStatus);
  const canSubmit = !readOnly && !reviewMode && canSubmitForApproval(workflow, legacyStatus);
  const checkerCanAct = reviewMode && canCurrentUserApprove(workflow);
  const isViewOnly =
    status === "pending_approval" && !reviewMode && !checkerCanAct;

  return (
    <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold text-foreground">Approval Workflow</p>
          <AccountsVoucherStatusBadge workflow={workflow} legacyStatus={legacyStatus} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Maker: {workflow.makerName} — {workflow.makerRole}
        </p>
      </div>

      <div className="px-4 py-4 space-y-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
          Approval Chain
        </p>
        {workflow.steps.map((step, i) => {
          const isLast = i === workflow.steps.length - 1;
          return (
            <div key={`${step.level}-${step.approverId ?? i}`} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 z-10",
                    stepCircleClass(step.state),
                  )}
                >
                  <StepIcon state={step.state} />
                </div>
                {!isLast && (
                  <div
                    className={cn(
                      "w-0.5 flex-1 min-h-[20px]",
                      step.state === "approved" || step.state === "created"
                        ? "bg-emerald-300"
                        : "bg-border",
                    )}
                  />
                )}
              </div>
              <div className={cn("pb-4 flex-1 min-w-0", isLast && "pb-0")}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold text-foreground truncate">
                    {step.approverName}
                    {step.level === 0 ? "" : ` — ${step.approverRole}`}
                  </p>
                  <span
                    className={cn(
                      "text-[10px] font-semibold flex-shrink-0",
                      step.state === "pending" ? "text-brand-700" : "text-muted-foreground",
                    )}
                  >
                    {stepLabel(step.state)}
                  </span>
                </div>
                {step.level > 0 && (
                  <p className="text-[11px] text-muted-foreground">{step.label}</p>
                )}
                {step.remarks && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 italic">{step.remarks}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-border space-y-3 bg-muted/10">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-medium text-foreground">Current Status</p>
          <span className="text-xs font-semibold text-foreground">
            {WORKFLOW_STATUS_LABELS[status]}
          </span>
        </div>

        {(editable || canSubmit || checkerCanAct) && (
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground">Remarks</label>
            <Textarea
              className="text-sm min-h-[60px] resize-y bg-white rounded-lg"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Add remarks for submission or approval…"
              disabled={isViewOnly || saving}
            />
          </div>
        )}

        <div className="flex flex-wrap gap-2 pt-1">
          {editable && onSaveDraft && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              disabled={saving}
              onClick={onSaveDraft}
            >
              Save Draft
            </Button>
          )}
          {canSubmit && status === "draft" && onSubmitForApproval && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              disabled={saving}
              onClick={() => onSubmitForApproval(remarks)}
            >
              <CheckCircle className="w-3.5 h-3.5" /> Submit for Approval
            </Button>
          )}
          {canSubmit && status === "sent_back" && onResubmit && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              disabled={saving}
              onClick={() => onResubmit(remarks)}
            >
              <RotateCcw className="w-3.5 h-3.5" /> Resubmit for Approval
            </Button>
          )}
          {isViewOnly && (
            <p className="text-[11px] text-amber-700 font-medium w-full">
              Pending approval — editing is disabled until the checker acts.
            </p>
          )}
          {checkerCanAct && (
            <>
              <Button
                size="sm"
                className="h-8 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
                disabled={saving}
                onClick={() => onApprove?.(remarks)}
              >
                <CheckCircle className="w-3.5 h-3.5" /> Approve
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-600 gap-1.5"
                disabled={saving}
                onClick={() => {
                  setConfirmRemarks(remarks);
                  setConfirm("reject");
                }}
              >
                <X className="w-3.5 h-3.5" /> Reject
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-navy-700 gap-1.5"
                disabled={saving}
                onClick={() => {
                  setConfirmRemarks(remarks);
                  setConfirm("send_back");
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" /> Send Back
              </Button>
            </>
          )}
          {status === "rejected" && onDuplicate && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onDuplicate}
            >
              Duplicate &amp; Create New
            </Button>
          )}
        </div>
      </div>

      {workflow.history.length > 0 && (
        <div className="px-4 py-3 border-t border-border">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
            Approval History
          </p>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {[...workflow.history].reverse().map((h, i) => (
              <div key={`${h.at}-${i}`} className="text-[11px]">
                <p className="font-medium text-foreground capitalize">
                  {h.action.replaceAll("_", " ")} — {h.by}
                </p>
                <p className="text-muted-foreground">
                  {new Date(h.at).toLocaleString()}
                  {h.remarks ? ` · ${h.remarks}` : ""}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div
                className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border",
                  confirm === "reject"
                    ? "bg-red-50 border-red-200"
                    : "bg-navy-50 border-navy-200",
                )}
              >
                <AlertTriangle
                  className={cn(
                    "w-4 h-4",
                    confirm === "reject" ? "text-red-500" : "text-navy-600",
                  )}
                />
              </div>
              {confirm === "reject" ? "Reject Voucher" : "Send Back to Maker"}
            </DialogTitle>
            <DialogDescription className="pt-1">
              Remarks are mandatory. The maker will be notified.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            className="text-sm min-h-[72px]"
            value={confirmRemarks}
            onChange={(e) => setConfirmRemarks(e.target.value)}
            placeholder="Enter remarks…"
          />
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={cn(
                "h-8 text-xs text-white",
                confirm === "reject" ? "bg-red-600 hover:bg-red-700" : "bg-navy-600 hover:bg-navy-700",
              )}
              disabled={!confirmRemarks.trim()}
              onClick={() => {
                if (confirm === "reject") onReject?.(confirmRemarks);
                else onSendBack?.(confirmRemarks);
                setConfirm(null);
              }}
            >
              Confirm
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
