"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { AlertTriangle, CheckCircle2, Clock, Upload, XCircle } from "lucide-react";
import { HrStatusBadge } from "../../../components/HrStatusBadge";
import {
  APPROVAL_STATUS_LABEL,
  canHrActOnClaim,
  getClaimedAmount,
  HR_STATUS_LABEL,
  type TadaClaim,
} from "../tada-claim-data";
import { getClaimPolicySnapshot, getClaimRoleName } from "../tada-claim-policy";

type HrAction = "approve" | "reject" | "send_back" | "hold";

function formatDt(iso?: string) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
  } catch {
    return iso;
  }
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{title}</p>
      <div className="rounded-lg border bg-muted/10 p-3">{children}</div>
    </div>
  );
}

export function TadaClaimReviewDrawer({
  open,
  claim,
  onClose,
  onHrApprove,
  onHrReject,
  onHrSendBack,
  onHrHold,
  viewOnly,
}: {
  open: boolean;
  claim: TadaClaim | null;
  onClose: () => void;
  onHrApprove: (remarks: string) => void;
  onHrReject: (remarks: string) => void;
  onHrSendBack: (remarks: string) => void;
  onHrHold: (remarks: string) => void;
  viewOnly?: boolean;
}) {
  const [action, setAction] = useState<HrAction | null>(null);
  const [remarks, setRemarks] = useState("");
  const [attachmentName, setAttachmentName] = useState("");

  const policy = useMemo(() => (claim ? getClaimPolicySnapshot(claim) : null), [claim]);
  const canAct = claim ? canHrActOnClaim(claim) : false;

  useEffect(() => {
    if (open) {
      setAction(null);
      setRemarks("");
      setAttachmentName("");
    }
  }, [open, claim?.id]);

  const submit = () => {
    if (!action) return;
    if ((action === "reject" || action === "send_back") && !remarks.trim()) return;
    const note = attachmentName ? `${remarks.trim()} [Attachment: ${attachmentName}]`.trim() : remarks.trim();
    if (action === "approve") onHrApprove(note);
    if (action === "reject") onHrReject(note);
    if (action === "send_back") onHrSendBack(note);
    if (action === "hold") onHrHold(note);
    onClose();
  };

  if (!claim) return null;

  const tr = claim.travelDetails[0];
  const ex = claim.expenseDetails[0];

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-2xl w-full flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-sm font-semibold flex items-center gap-2">
            {claim.claimNumber}
            <HrStatusBadge status={claim.hrStatus} label={HR_STATUS_LABEL[claim.hrStatus]} />
          </SheetTitle>
          <p className="text-xs text-muted-foreground">
            HR review & validation — policy driven from Sales Force TA/DA Policy Master
          </p>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-4 text-xs">
          <Section title="Employee Details">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-[10px]">Employee Name</p><p className="font-medium">{claim.employeeName}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Employee Code</p><p className="font-mono">{claim.employeeCode}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Role</p><p className="font-medium">{getClaimRoleName(claim)}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Reporting Manager</p><p>{claim.reportingManager}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Territory</p><p>{claim.territory ?? "—"}</p></div>
            </div>
          </Section>

          <Section title="Travel Details">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-[10px]">Travel Type</p><p>{policy?.travelTypeLabel ?? "—"}</p></div>
              <div><p className="text-muted-foreground text-[10px]">From City</p><p>{tr?.fromLocation || "—"}</p></div>
              <div><p className="text-muted-foreground text-[10px]">To City</p><p>{tr?.toLocation || "—"}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Start Date</p><p>{claim.periodFrom}</p></div>
              <div><p className="text-muted-foreground text-[10px]">End Date</p><p>{claim.periodTo}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground text-[10px]">Purpose</p><p>{claim.remarks}</p></div>
            </div>
          </Section>

          <Section title="Claim Details">
            <div className="grid grid-cols-2 gap-3">
              <div><p className="text-muted-foreground text-[10px]">Claim Category</p><p className="font-medium">{policy?.claimCategoryName}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Claim Amount</p><p className="font-semibold">₹{getClaimedAmount(claim).toLocaleString("en-IN")}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Eligible Amount</p><p className="font-semibold text-emerald-700">₹{(policy?.eligibleAmount ?? 0).toLocaleString("en-IN")}</p></div>
              <div><p className="text-muted-foreground text-[10px]">Excess Amount</p><p className={cn("font-semibold", (policy?.excessAmount ?? 0) > 0 && "text-red-600")}>₹{(policy?.excessAmount ?? 0).toLocaleString("en-IN")}</p></div>
              <div className="col-span-2"><p className="text-muted-foreground text-[10px]">Expense Details</p><p>{ex?.expenseType} — Bill {ex?.billNo || "—"} ({ex?.billDate})</p></div>
            </div>
            {claim.attachments.length > 0 && (
              <div className="mt-2 pt-2 border-t">
                <p className="text-[10px] text-muted-foreground mb-1">Attachments</p>
                {claim.attachments.map((a) => (
                  <p key={a.id} className="font-mono text-[11px]">{a.documentName}: {a.fileName}</p>
                ))}
              </div>
            )}
          </Section>

          {policy && (
            <Section title="Policy Validation">
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-muted-foreground text-[10px]">Eligible Amount</p><p>₹{policy.eligibleAmount.toLocaleString("en-IN")}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Claimed Amount</p><p>₹{policy.claimedAmount.toLocaleString("en-IN")}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Difference</p><p className={cn(policy.difference > 0 && "text-red-600")}>₹{policy.difference.toLocaleString("en-IN")}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Policy Status</p><p className={cn("font-semibold", policy.policyStatus === "Compliant" ? "text-emerald-700" : policy.policyStatus === "Non-Compliant" ? "text-red-600" : "text-amber-700")}>{policy.policyStatus}</p></div>
                <div><p className="text-muted-foreground text-[10px]">Auto Approval Status</p><p>{policy.autoApprovalEligible ? "Eligible" : "Not Eligible"}</p></div>
                <div className="col-span-2"><p className="text-muted-foreground text-[10px]">Approval Route</p><p>{policy.approvalRoute.join(" → ")}</p></div>
              </div>
              {policy.failedRules.length > 0 && (
                <div className="mt-2 rounded border border-amber-200 bg-amber-50/50 p-2">
                  <p className="text-[10px] font-semibold text-amber-800 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> Failed Rules</p>
                  {policy.failedRules.map((r) => <p key={r} className="text-[10px] text-amber-800">• {r}</p>)}
                </div>
              )}
            </Section>
          )}

          <Section title="Approval Trail">
            <div className="overflow-x-auto">
              <table className="w-full text-[11px]">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="text-left py-1 pr-2">Level</th>
                    <th className="text-left py-1 pr-2">Approver</th>
                    <th className="text-left py-1 pr-2">Role</th>
                    <th className="text-left py-1 pr-2">Action</th>
                    <th className="text-left py-1 pr-2">Date & Time</th>
                    <th className="text-left py-1">Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  {claim.approvalTrail.map((e, i) => (
                    <tr key={`${e.at}-${i}`} className="border-b border-border/40">
                      <td className="py-1.5 pr-2">{e.levelLabel}</td>
                      <td className="py-1.5 pr-2">{e.actorName}</td>
                      <td className="py-1.5 pr-2">{e.actorRole}</td>
                      <td className="py-1.5 pr-2 capitalize">{e.action.replaceAll("_", " ")}</td>
                      <td className="py-1.5 pr-2 whitespace-nowrap">{formatDt(e.at)}</td>
                      <td className="py-1.5">{e.remarks || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[10px] text-muted-foreground mt-2">
              Approval: {APPROVAL_STATUS_LABEL[claim.approvalStatus]} · Submitted {formatDt(claim.submittedAt)}
            </p>
          </Section>

          {!viewOnly && canAct && (
            <Section title="HR Decision">
              <div className="flex flex-wrap gap-2 mb-3">
                {([
                  ["approve", "Approve", CheckCircle2, "text-emerald-700 border-emerald-200"],
                  ["reject", "Reject", XCircle, "text-red-600 border-red-200"],
                  ["send_back", "Send Back", AlertTriangle, "text-amber-700 border-amber-200"],
                  ["hold", "Hold", Clock, "text-blue-700 border-blue-200"],
                ] as const).map(([id, label, Icon, cls]) => (
                  <Button
                    key={id}
                    type="button"
                    size="sm"
                    variant="outline"
                    className={cn("h-7 text-[11px] gap-1", action === id && "ring-2 ring-brand-500", cls)}
                    onClick={() => setAction(id)}
                  >
                    <Icon className="w-3.5 h-3.5" /> {label}
                  </Button>
                ))}
              </div>
              {action && (
                <div className="space-y-2">
                  <div className="space-y-1">
                    <Label className="text-[11px]">
                      Remarks {(action === "reject" || action === "send_back") && <span className="text-red-500">*</span>}
                    </Label>
                    <Textarea className="min-h-[72px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder={action === "approve" ? "Optional HR notes…" : "Required for reject / send back…"} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[11px]">Attachment (optional)</Label>
                    <div className="flex gap-2">
                      <Input className="h-8 text-xs flex-1" value={attachmentName} onChange={(e) => setAttachmentName(e.target.value)} placeholder="Reference document name" />
                      <Button type="button" variant="outline" size="sm" className="h-8 text-[11px]" onClick={() => setAttachmentName(`hr_note_${Date.now()}.pdf`)}>
                        <Upload className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Section>
          )}
        </SheetBody>

        <SheetFooter className="px-5 py-3 border-t bg-muted/20 flex-row gap-2 justify-end">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Close</Button>
          {!viewOnly && canAct && action && (
            <Button type="button" size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={submit}>
              Confirm {action === "approve" ? "HR Approval" : action === "reject" ? "Rejection" : action === "send_back" ? "Send Back" : "Hold"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
