"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  Check,
  ChevronsUpDown,
  Eye,
  FileCheck,
  FileText,
  Plus,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { HrSuccessToast } from "@/app/(app)/hr/components/HrSuccessToast";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import {
  HrConfirmDialog,
  HrOrgField,
  hrBtn,
} from "@/app/(app)/hr/settings/organization/_components";
import { HrIconActionButton } from "@/app/(app)/hr/settings/organization/_components/HrIconActionButton";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { formatDateDisplay, getBranchDisplayLabel } from "@/app/(app)/hr/employees/employee-display";
import { getHrEmployeeById } from "@/app/(app)/hr/employees/employee-master-data";
import { HrLetterCombobox } from "@/app/(app)/hr/hr-letters/components/HrLetterCombobox";
import { HrLetterCreateDrawer } from "@/app/(app)/hr/hr-letters/components/HrLetterCreateDrawer";
import { HrLetterViewDrawer } from "@/app/(app)/hr/hr-letters/components/HrLetterViewDrawer";
import {
  hrLetterTypeLabel,
  issueHrLetter,
  letterStatusLabel,
} from "@/app/(app)/hr/hr-letters/hr-letters-data";
import type { GeneratedHrDocument, HrTemplateTypeKey } from "@/app/(app)/hr/settings/hr-template-data";
import {
  addChecklistItem,
  cancelOffboarding,
  completeOffboarding,
  EXIT_TYPE_OPTIONS,
  exitTypeLabel,
  FNF_STATUS_OPTIONS,
  getCompletionBlockers,
  getExitLetters,
  getOffboardingById,
  HR_OFFBOARDING_EVENT,
  LEAVING_REASON_OPTIONS,
  leavingReasonLabel,
  lettersForExitType,
  makeActivity,
  offboardingLetterContext,
  optionalPendingSummary,
  recordLetterGenerated,
  saveOffboarding,
  shortfallDays,
  updateChecklistItem,
  type ClearanceStatus,
  type FnFStatus,
  type HandoverStatus,
  type LeavingReasonKey,
  type OffboardingChecklistItem,
  type OffboardingExitType,
  type OffboardingRecord,
  type RehireFlag,
} from "../offboarding-data";
import { OffboardingStatusPill } from "../components/OffboardingStatusPill";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

function Section({
  n,
  title,
  children,
}: {
  n: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border">
        {n}. {title}
      </p>
      {children}
    </section>
  );
}

function MiniSelect({
  value,
  onChange,
  options,
  disabled,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <Popover open={disabled ? false : open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className="h-8 min-w-[7.5rem] px-2 text-xs border border-border rounded-lg bg-white inline-flex items-center justify-between gap-1 disabled:bg-muted/40"
        >
          <span className="truncate">{selected?.label ?? "Select…"}</span>
          <ChevronsUpDown className="w-3 h-3 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-44 p-1">
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2 py-1.5 text-xs rounded-md text-left hover:bg-muted/60",
              value === o.value && "bg-brand-50",
            )}
          >
            <span className="flex-1">{o.label}</span>
            {value === o.value ? <Check className="w-3.5 h-3.5 text-brand-600" /> : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

const HANDOVER_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "not_applicable", label: "Not Applicable" },
];
const ASSET_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "returned", label: "Returned" },
  { value: "not_applicable", label: "Not Applicable" },
];
const CLEAR_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "cleared", label: "Cleared" },
  { value: "not_applicable", label: "Not Applicable" },
];

export default function OffboardingDetailClient() {
  const router = useRouter();
  const params = useParams();
  const recordId = String(params.id ?? "");
  const [record, setRecord] = useState<OffboardingRecord | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [addKind, setAddKind] = useState<"handover" | "assets" | "clearance" | null>(null);
  const [addLabel, setAddLabel] = useState("");
  const [addOwner, setAddOwner] = useState("");
  const [letterOpen, setLetterOpen] = useState(false);
  const [letterType, setLetterType] = useState<HrTemplateTypeKey>("experience_letter");
  const [viewLetter, setViewLetter] = useState<GeneratedHrDocument | null>(null);
  const [completeOpen, setCompleteOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [issueTarget, setIssueTarget] = useState<GeneratedHrDocument | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    setRecord(getOffboardingById(recordId) ?? null);
  }, [recordId]);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener(HR_OFFBOARDING_EVENT, onUpd);
    window.addEventListener("hr-generated-documents-updated", onUpd);
    return () => {
      window.removeEventListener(HR_OFFBOARDING_EVENT, onUpd);
      window.removeEventListener("hr-generated-documents-updated", onUpd);
    };
  }, [refresh]);

  const readOnly =
    record?.status === "completed" ||
    record?.status === "cancelled" ||
    record?.status === "rejected" ||
    record?.status === "pending_review";
  const isPendingReview = record?.status === "pending_review";
  const letters = record ? getExitLetters(record) : [];
  const extraCtx = record ? offboardingLetterContext(record) : {};
  const blockers = record && !readOnly ? getCompletionBlockers(record) : [];
  const optionalPending = record ? optionalPendingSummary(record) : [];
  const shortfall = record
    ? shortfallDays(record.requiredNoticeDays, record.servedNoticeDays)
    : null;
  const employee = record ? getHrEmployeeById(record.employeeId) : undefined;

  const patch = (partial: Partial<OffboardingRecord>, act?: { label: string; detail: string }) => {
    if (!record || readOnly) return;
    const next = { ...record, ...partial };
    const saved = saveOffboarding(
      next,
      act ? makeActivity(act.label, act.detail) : undefined,
    );
    setRecord(saved);
  };

  const onItem = (
    kind: "handover" | "assets" | "clearance",
    id: string,
    next: Partial<OffboardingChecklistItem>,
  ) => {
    if (!record || readOnly) return;
    const saved = updateChecklistItem(record, kind, id, next);
    setRecord(saved);
  };

  const handleAdd = () => {
    if (!record || !addKind || !addLabel.trim()) return;
    const saved = addChecklistItem(record, addKind, addLabel, addOwner, "");
    setRecord(saved);
    setAddKind(null);
    setAddLabel("");
    setAddOwner("");
  };

  const handleComplete = () => {
    if (!record) return;
    const result = completeOffboarding(record.id);
    if (!result.ok) {
      setToast(result.error);
      setCompleteOpen(false);
      return;
    }
    setCompleteOpen(false);
    try {
      sessionStorage.setItem("ds_hr_offboarding_flash", "Offboarding completed successfully.");
    } catch {
      /* ignore */
    }
    // Persist already done inside completeOffboarding; leave editable detail via replace.
    router.replace("/hr/offboarding?tab=completed");
  };

  const handleCancel = () => {
    if (!record) return;
    const result = cancelOffboarding(record.id, cancelReason);
    setCancelOpen(false);
    setCancelReason("");
    setToast(result.ok ? "Offboarding cancelled. Employee remains Active." : result.error);
    refresh();
  };

  if (!record) {
    return (
      <HrPageShell title="Offboarding" breadcrumbs={hrBreadcrumb({ label: "Offboarding", href: "/hr/offboarding" }, { label: "Not found" })}>
        <p className="text-sm text-muted-foreground">Record not found.</p>
        <Button variant="outline" size="sm" className={cn(hrBtn(), "mt-3")} onClick={() => router.push("/hr/offboarding")}>
          Back
        </Button>
      </HrPageShell>
    );
  }

  const availableTypes = lettersForExitType(record.exitType);

  return (
    <HrPageShell
      title={record.employeeName}
      description={`${record.employeeCode} · ${exitTypeLabel(record.exitType)}`}
      icon={FileText}
      breadcrumbs={hrBreadcrumb(
        { label: "Offboarding", href: "/hr/offboarding" },
        { label: record.employeeName },
      )}
      maxWidthClass="max-w-[1100px]"
      actions={
        <div className="flex items-center gap-2">
          <OffboardingStatusPill status={record.status} />
          <Button variant="outline" size="sm" className={hrBtn("gap-1.5")} onClick={() => router.push("/hr/offboarding")}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        {isPendingReview ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-semibold text-amber-800">Pending resignation review</p>
                <p className="text-[11px] text-amber-700 mt-0.5">
                  Accept or reject this employee-submitted request from Pending Requests. Clearance and
                  completion unlock after acceptance.
                </p>
              </div>
            </div>
            <Button
              size="sm"
              className={hrBtn("gap-1.5 shrink-0", true)}
              onClick={() => router.push("/hr/offboarding")}
            >
              Open Pending Requests
            </Button>
          </div>
        ) : null}
        {record.status === "rejected" ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <p className="text-xs font-semibold text-red-800">Resignation rejected</p>
            <p className="text-[11px] text-red-700 mt-0.5">
              {record.rejectionReason || "No reason recorded."}
              {record.rejectedAt
                ? ` · ${formatDateDisplay(record.rejectedAt.slice(0, 10))}`
                : ""}
            </p>
          </div>
        ) : null}
        {/* 1. Exit Details */}
        <Section n={1} title="Exit Details">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <HrOrgField label="Exit Type">
              <HrLetterCombobox
                value={record.exitType}
                disabled={readOnly}
                onChange={(v) => patch({ exitType: v as OffboardingExitType })}
                placeholder="Exit type"
                options={EXIT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </HrOrgField>
            <HrOrgField label="Source">
              <Input
                value={record.source === "employee" ? "Employee" : "HR"}
                disabled
                className="h-8 text-xs bg-muted/40"
              />
            </HrOrgField>
            {record.acceptedAt ? (
              <HrOrgField label="Accepted On / By">
                <Input
                  value={`${formatDateDisplay(record.acceptedAt.slice(0, 10))}${record.acceptedBy ? ` · ${record.acceptedBy}` : ""}`}
                  disabled
                  className="h-8 text-xs bg-muted/40"
                />
              </HrOrgField>
            ) : null}
            <HrOrgField label="Initiated Date">
              <HrDateInput
                value={record.initiatedDate}
                disabled={readOnly}
                onChange={(v) => patch({ initiatedDate: v })}
              />
            </HrOrgField>
            {record.proposedLastWorkingDate ? (
              <HrOrgField label="Proposed Last Working Date">
                <HrDateInput value={record.proposedLastWorkingDate} disabled onChange={() => {}} />
              </HrOrgField>
            ) : null}
            <HrOrgField label="Final Last Working Date" required={!isPendingReview}>
              <HrDateInput
                value={record.lastWorkingDate}
                disabled={readOnly}
                onChange={(v) => patch({ lastWorkingDate: v }, { label: "LWD Updated", detail: v })}
              />
            </HrOrgField>
            {record.exitType === "resignation" ? (
              <HrOrgField label="Resignation Date">
                <HrDateInput
                  value={record.resignationDate}
                  disabled={readOnly}
                  onChange={(v) => patch({ resignationDate: v })}
                />
              </HrOrgField>
            ) : null}
            {record.exitType === "termination" ? (
              <HrOrgField label="Termination Date">
                <HrDateInput
                  value={record.terminationDate}
                  disabled={readOnly}
                  onChange={(v) => patch({ terminationDate: v })}
                />
              </HrOrgField>
            ) : null}
            {record.exitType === "absconding" ? (
              <>
                <HrOrgField label="Last Attended Date">
                  <HrDateInput
                    value={record.lastAttendedDate}
                    disabled={readOnly}
                    onChange={(v) => patch({ lastAttendedDate: v })}
                  />
                </HrOrgField>
                <HrOrgField label="Reported / Identified Date">
                  <HrDateInput
                    value={record.reportedDate}
                    disabled={readOnly}
                    onChange={(v) => patch({ reportedDate: v })}
                  />
                </HrOrgField>
              </>
            ) : null}
            <HrOrgField label="Reason">
              <HrLetterCombobox
                value={record.reasonKey || ""}
                disabled={readOnly}
                onChange={(v) =>
                  patch({
                    reasonKey: v as LeavingReasonKey,
                    reason:
                      v === "other" ? record.reason : leavingReasonLabel(v as LeavingReasonKey),
                  })
                }
                placeholder="Reason"
                options={LEAVING_REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </HrOrgField>
            {record.reasonKey === "other" ? (
              <HrOrgField label="Reason details">
                <Input
                  value={record.reason}
                  disabled={readOnly}
                  onChange={(e) => patch({ reason: e.target.value })}
                  className="h-9 text-sm rounded-lg"
                />
              </HrOrgField>
            ) : null}
            <div className="md:col-span-3 text-[11px] text-muted-foreground">
              {record.designation} · {record.department} · {getBranchDisplayLabel(record.branch)}
              {employee ? (
                <>
                  {" · "}
                  <Link href={`/hr/employees/${record.employeeId}`} className="text-brand-700 hover:underline">
                    Open profile
                  </Link>
                </>
              ) : null}
            </div>
            {record.employeeRemarks ? (
              <HrOrgField label="Employee Remarks" size="full">
                <Textarea
                  value={record.employeeRemarks}
                  disabled
                  rows={2}
                  className="text-sm rounded-lg bg-muted/30"
                />
              </HrOrgField>
            ) : null}
            {record.hrRemarks || !isPendingReview ? (
              <HrOrgField label="HR Remarks" size="full">
                <Textarea
                  value={record.hrRemarks}
                  disabled={readOnly}
                  onChange={(e) =>
                    patch({ hrRemarks: e.target.value, internalNotes: e.target.value || record.internalNotes })
                  }
                  rows={2}
                  className="text-sm rounded-lg"
                />
              </HrOrgField>
            ) : null}
            <HrOrgField label="Internal notes" size="full">
              <Textarea
                value={record.internalNotes}
                disabled={readOnly}
                onChange={(e) => patch({ internalNotes: e.target.value })}
                rows={2}
                className="text-sm rounded-lg"
              />
            </HrOrgField>
          </div>
        </Section>

        {/* 2. Notice */}
        <Section n={2} title="Notice Period">
          <p className="text-[11px] text-muted-foreground">
            Employee notice policy is not stored on the employee master yet. Enter days manually.
            Financial impact will be handled during Full & Final processing.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <HrOrgField label="Required Notice Days">
              <Input
                value={record.requiredNoticeDays}
                disabled={readOnly}
                onChange={(e) => patch({ requiredNoticeDays: e.target.value.replace(/[^\d]/g, "") })}
                className="h-9 text-sm rounded-lg"
              />
            </HrOrgField>
            <HrOrgField label="Served Notice Days">
              <Input
                value={record.servedNoticeDays}
                disabled={readOnly}
                onChange={(e) => patch({ servedNoticeDays: e.target.value.replace(/[^\d]/g, "") })}
                className="h-9 text-sm rounded-lg"
              />
            </HrOrgField>
            <HrOrgField label="Shortfall Days">
              <Input
                value={shortfall == null ? "—" : String(shortfall)}
                readOnly
                className="h-9 text-sm rounded-lg bg-muted/40"
              />
            </HrOrgField>
            {record.exitType === "resignation" ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <p className="text-xs font-medium">Notice Waiver</p>
                <Switch
                  checked={record.noticeWaiver}
                  disabled={readOnly}
                  onCheckedChange={(v) => patch({ noticeWaiver: v })}
                />
              </div>
            ) : null}
            {record.exitType === "termination" ? (
              <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                <p className="text-xs font-medium">Immediate exit</p>
                <Switch
                  checked={record.immediateExit}
                  disabled={readOnly}
                  onCheckedChange={(v) => patch({ immediateExit: v })}
                />
              </div>
            ) : null}
          </div>
        </Section>

        {/* 3. Handover */}
        <Section n={3} title="Handover">
          <ChecklistTable
            rows={record.handover}
            readOnly={readOnly}
            statusOptions={HANDOVER_STATUSES}
            onChange={(id, patchItem) => onItem("handover", id, patchItem)}
          />
          {!readOnly ? (
            <AddRow
              open={addKind === "handover"}
              onToggle={() => setAddKind(addKind === "handover" ? null : "handover")}
              label={addLabel}
              owner={addOwner}
              onLabel={setAddLabel}
              onOwner={setAddOwner}
              onAdd={handleAdd}
              addLabel="+ Add Handover Item"
            />
          ) : null}
        </Section>

        {/* 4. Assets */}
        <Section n={4} title="Asset Return">
          <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Asset assignment module is not implemented. These are manual offboarding checklist
            items.
          </p>
          <ChecklistTable
            rows={record.assets}
            readOnly={readOnly}
            statusOptions={ASSET_STATUSES}
            showAsset
            onChange={(id, patchItem) => onItem("assets", id, patchItem)}
          />
          {!readOnly ? (
            <AddRow
              open={addKind === "assets"}
              onToggle={() => setAddKind(addKind === "assets" ? null : "assets")}
              label={addLabel}
              owner={addOwner}
              onLabel={setAddLabel}
              onOwner={setAddOwner}
              onAdd={handleAdd}
              addLabel="+ Add Asset Item"
            />
          ) : null}
        </Section>

        {/* 5. Clearance */}
        <Section n={5} title="Clearance">
          <ChecklistTable
            rows={record.clearance}
            readOnly={readOnly}
            statusOptions={CLEAR_STATUSES}
            onChange={(id, patchItem) => onItem("clearance", id, patchItem)}
          />
          {!readOnly ? (
            <AddRow
              open={addKind === "clearance"}
              onToggle={() => setAddKind(addKind === "clearance" ? null : "clearance")}
              label={addLabel}
              owner={addOwner}
              onLabel={setAddLabel}
              onOwner={setAddOwner}
              onAdd={handleAdd}
              addLabel="+ Add Clearance Item"
            />
          ) : null}
        </Section>

        {/* 6. Exit Interview */}
        <Section n={6} title="Exit Interview">
          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 mb-3">
            <div>
              <p className="text-xs font-medium">Conducted</p>
              <p className="text-[11px] text-muted-foreground">Optional — does not block completion</p>
            </div>
            <Switch
              checked={record.interviewConducted}
              disabled={readOnly}
              onCheckedChange={(v) => patch({ interviewConducted: v })}
            />
          </div>
          {record.interviewConducted ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <HrOrgField label="Interview Date">
                <HrDateInput
                  value={record.interviewDate}
                  disabled={readOnly}
                  onChange={(v) => patch({ interviewDate: v })}
                />
              </HrOrgField>
              <HrOrgField label="Conducted By">
                <Input
                  value={record.interviewBy}
                  disabled={readOnly}
                  onChange={(e) => patch({ interviewBy: e.target.value })}
                  className="h-9 text-sm rounded-lg"
                />
              </HrOrgField>
              <HrOrgField label="Would Rehire">
                <HrLetterCombobox
                  value={record.wouldRehire}
                  disabled={readOnly}
                  onChange={(v) => patch({ wouldRehire: v as RehireFlag })}
                  placeholder="Select…"
                  options={[
                    { value: "", label: "—" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                    { value: "maybe", label: "Maybe" },
                  ]}
                />
              </HrOrgField>
              <HrOrgField label="Overall Experience (1–5)">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      disabled={readOnly}
                      onClick={() => patch({ experienceRating: n })}
                      className={cn(
                        "h-8 w-8 text-xs rounded-lg border",
                        record.experienceRating === n
                          ? "bg-brand-600 text-white border-brand-600"
                          : "border-border hover:bg-muted",
                      )}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </HrOrgField>
              <HrOrgField label="Feedback" size="lg">
                <Textarea
                  value={record.leavingFeedback}
                  disabled={readOnly}
                  onChange={(e) => patch({ leavingFeedback: e.target.value })}
                  rows={2}
                  className="text-sm rounded-lg"
                />
              </HrOrgField>
            </div>
          ) : null}
        </Section>

        {/* 7. Documents */}
        <Section n={7} title="Documents">
          <div className="mb-3">
            <p className="text-[11px] text-muted-foreground mb-2">
              Resignation letter / supporting file — stored in this browser only. No upload backend.
            </p>
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (!file || readOnly) return;
                const reader = new FileReader();
                reader.onload = () => {
                  patch(
                    {
                      attachment: {
                        fileName: file.name,
                        sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                        dataUrl: String(reader.result || ""),
                      },
                    },
                    { label: "Supporting document attached", detail: file.name },
                  );
                };
                reader.readAsDataURL(file);
              }}
            />
            {record.attachment ? (
              <p className="text-xs">
                {record.attachment.fileName}{" "}
                <span className="text-muted-foreground">({record.attachment.sizeLabel})</span>
              </p>
            ) : !readOnly ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={hrBtn("gap-1.5")}
                onClick={() => fileRef.current?.click()}
              >
                <Upload className="w-3.5 h-3.5" /> Attach file
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">No file attached.</p>
            )}
          </div>

          <p className="text-[11px] font-medium mb-2">Exit letters (Template Management via HR Letters)</p>
          {!record.lastWorkingDate ? (
            <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-2">
              Last Working Date is required before generating Experience / Relieving / Termination
              letters.
            </p>
          ) : null}
          {!readOnly ? (
            <div className="flex flex-wrap gap-2 mb-3">
              {availableTypes.map((t) => (
                <Button
                  key={t}
                  type="button"
                  size="sm"
                  className={hrBtn("gap-1.5", t === "termination_letter")}
                  variant={t === "termination_letter" ? undefined : "outline"}
                  disabled={!record.lastWorkingDate}
                  onClick={() => {
                    if (!record.lastWorkingDate) {
                      setToast("Last Working Date is required before generating this letter.");
                      return;
                    }
                    setLetterType(t);
                    setLetterOpen(true);
                  }}
                >
                  <FileText className="w-3.5 h-3.5" /> Generate {hrLetterTypeLabel(t)}
                </Button>
              ))}
            </div>
          ) : null}

          {letters.length === 0 ? (
            <p className="text-xs text-muted-foreground">No exit letters generated yet.</p>
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <th className="px-3 py-2 text-left font-semibold">Letter Type</th>
                    <th className="px-3 py-2 text-left font-semibold">Generated On</th>
                    <th className="px-3 py-2 text-left font-semibold">Issued On</th>
                    <th className="px-3 py-2 text-left font-semibold">Status</th>
                    <th className="px-3 py-2 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {letters.map((d) => (
                    <tr key={d.id} className="border-b border-border/60">
                      <td className="px-3 py-2">{hrLetterTypeLabel(d.templateType)}</td>
                      <td className="px-3 py-2">
                        {d.generatedOn ? formatDateDisplay(d.generatedOn.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {d.issuedOn ? formatDateDisplay(d.issuedOn.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-3 py-2">{letterStatusLabel(d.status)}</td>
                      <td className="px-3 py-2">
                        <div className="flex justify-end gap-0.5">
                          <HrIconActionButton label="View" onClick={() => setViewLetter(d)}>
                            <Eye />
                          </HrIconActionButton>
                          {d.status === "generated" ? (
                            <HrIconActionButton label="Issue" onClick={() => setIssueTarget(d)}>
                              <FileCheck />
                            </HrIconActionButton>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* 8. Completion */}
        <Section n={8} title="Completion">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
            <HrOrgField
              label="Full & Final"
              helper="Tracking only. Payroll F&F calculation is not implemented in this task."
            >
              <HrLetterCombobox
                value={record.fnfStatus}
                disabled={readOnly}
                onChange={(v) => patch({ fnfStatus: v as FnFStatus })}
                placeholder="F&F status"
                options={FNF_STATUS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </HrOrgField>
            <HrOrgField label="Access Revocation" helper="Recorded under IT clearance. Login is not disabled in this prototype.">
              <p className="text-xs font-medium h-9 flex items-center">
                {record.accessRevocation === "completed" ? "Completed" : "Pending"}
              </p>
            </HrOrgField>
          </div>

          {blockers.length > 0 && !readOnly ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 space-y-1 mb-3">
              <p className="font-medium">Cannot complete yet</p>
              {blockers.map((b) => (
                <p key={b} className="flex gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  {b}
                </p>
              ))}
            </div>
          ) : null}

          {record.status === "cancelled" ? (
            <p className="text-xs text-red-700">
              Cancelled {record.cancelledOn ? formatDateDisplay(record.cancelledOn.slice(0, 10)) : ""}{" "}
              · {record.cancelReason}
            </p>
          ) : null}
          {record.status === "completed" ? (
            <p className="text-xs text-emerald-700">
              Completed {formatDateDisplay(record.completedOn.slice(0, 10))} by {record.completedBy}
            </p>
          ) : null}

          {!readOnly ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                className={hrBtn("", true)}
                onClick={() => {
                  if (blockers.length) {
                    setToast(blockers[0] ?? "Required items are incomplete.");
                    return;
                  }
                  setCompleteOpen(true);
                }}
              >
                Complete Offboarding
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={hrBtn()}
                onClick={() => setCancelOpen(true)}
              >
                Cancel Offboarding
              </Button>
            </div>
          ) : null}
        </Section>

        {record.activity.length > 0 ? (
          <section className="rounded-xl border border-border bg-white shadow-sm p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border mb-2">
              Activity
            </p>
            <ul className="space-y-2">
              {record.activity.slice(0, 12).map((a) => (
                <li key={a.id} className="flex gap-2 text-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{a.label}</p>
                    <p className="text-[11px] text-muted-foreground">{a.detail}</p>
                  </div>
                  <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                    {formatDateDisplay(a.at.slice(0, 10))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ) : null}
      </div>

      <HrLetterCreateDrawer
        open={letterOpen}
        onOpenChange={setLetterOpen}
        lockedEmployeeId={record.employeeId}
        initialLetterType={letterType}
        lockLetterType
        issueDatePreset={record.lastWorkingDate || undefined}
        extraContext={extraCtx}
        onSaved={(msg) => {
          setToast(msg);
          if (msg.toLowerCase().includes("generated")) {
            recordLetterGenerated(record, hrLetterTypeLabel(letterType));
          }
          refresh();
        }}
      />
      <HrLetterViewDrawer open={!!viewLetter} letter={viewLetter} onClose={() => setViewLetter(null)} />

      <HrConfirmDialog
        open={completeOpen}
        onClose={() => setCompleteOpen(false)}
        onConfirm={handleComplete}
        title={`Complete offboarding for ${record.employeeName}?`}
        description={`Last Working Date: ${record.lastWorkingDate ? formatDateDisplay(record.lastWorkingDate) : "—"}. Exit Type: ${exitTypeLabel(record.exitType)}.${optionalPending.length ? ` Optional pending: ${optionalPending.join("; ")}.` : ""}${
          record.exitType === "termination"
            ? " Employee employment status will become Terminated."
            : " Employee employment status will become Resigned."
        }`}
        confirmLabel="Complete Offboarding"
      />
      <HrConfirmDialog
        open={!!issueTarget}
        onClose={() => setIssueTarget(null)}
        onConfirm={() => {
          if (!issueTarget) return;
          const result = issueHrLetter(issueTarget.id);
          setToast(result.ok ? "Letter issued." : result.error);
          setIssueTarget(null);
          refresh();
        }}
        title="Issue letter?"
        description={`Issue this ${issueTarget ? hrLetterTypeLabel(issueTarget.templateType) : ""} to ${record.employeeName}?`}
        confirmLabel="Issue"
      />

      {cancelOpen ? (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-border shadow-xl max-w-sm w-full p-4 space-y-3">
            <p className="text-sm font-semibold">Cancel offboarding?</p>
            <p className="text-xs text-muted-foreground">
              {record.employeeName} stays Active. Reason is required.
            </p>
            <Textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={2}
              placeholder="Reason…"
              className="text-sm"
            />
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className={hrBtn()} onClick={() => setCancelOpen(false)}>
                Back
              </Button>
              <Button
                size="sm"
                className="h-9 px-4 text-sm rounded-lg bg-red-600 hover:bg-red-700 text-white"
                onClick={handleCancel}
                disabled={!cancelReason.trim()}
              >
                Cancel Offboarding
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrPageShell>
  );
}

function ChecklistTable({
  rows,
  readOnly,
  statusOptions,
  showAsset,
  onChange,
}: {
  rows: OffboardingChecklistItem[];
  readOnly: boolean;
  statusOptions: { value: string; label: string }[];
  showAsset?: boolean;
  onChange: (id: string, patch: Partial<OffboardingChecklistItem>) => void;
}) {
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-3 py-2 text-left font-semibold">Task</th>
            {showAsset ? <th className="px-3 py-2 text-left font-semibold">Asset ID</th> : null}
            <th className="px-3 py-2 text-left font-semibold">Owner</th>
            <th className="px-3 py-2 text-left font-semibold">Required</th>
            <th className="px-3 py-2 text-left font-semibold">Status</th>
            <th className="px-3 py-2 text-left font-semibold">Completed On</th>
            {showAsset ? <th className="px-3 py-2 text-left font-semibold">Condition</th> : null}
            <th className="px-3 py-2 text-left font-semibold">Remark</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-border/60">
              <td className="px-3 py-1.5 font-medium">{row.label}</td>
              {showAsset ? (
                <td className="px-3 py-1.5">
                  <input
                    value={row.assetId || ""}
                    disabled={readOnly}
                    onChange={(e) => onChange(row.id, { assetId: e.target.value })}
                    className="h-7 w-24 text-xs border border-border rounded px-1.5"
                  />
                </td>
              ) : null}
              <td className="px-3 py-1.5">
                <input
                  value={row.owner}
                  disabled={readOnly}
                  onChange={(e) => onChange(row.id, { owner: e.target.value })}
                  className="h-7 w-28 text-xs border border-border rounded px-1.5"
                />
              </td>
              <td className="px-3 py-1.5">
                <MiniSelect
                  value={row.required ? "yes" : "no"}
                  disabled={readOnly}
                  options={[
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" },
                  ]}
                  onChange={(v) => onChange(row.id, { required: v === "yes" })}
                />
              </td>
              <td className="px-3 py-1.5">
                <MiniSelect
                  value={row.status}
                  disabled={readOnly}
                  options={statusOptions}
                  onChange={(v) =>
                    onChange(row.id, {
                      status: v as HandoverStatus | ClearanceStatus,
                      completedOn:
                        v !== "pending" && !row.completedOn
                          ? new Date().toISOString().slice(0, 10)
                          : row.completedOn,
                    })
                  }
                />
              </td>
              <td className="px-3 py-1.5 whitespace-nowrap">
                {row.completedOn ? formatDateDisplay(row.completedOn) : "—"}
              </td>
              {showAsset ? (
                <td className="px-3 py-1.5">
                  <input
                    value={row.condition || ""}
                    disabled={readOnly}
                    onChange={(e) => onChange(row.id, { condition: e.target.value })}
                    className="h-7 w-24 text-xs border border-border rounded px-1.5"
                  />
                </td>
              ) : null}
              <td className="px-3 py-1.5">
                <input
                  value={row.remark}
                  disabled={readOnly}
                  onChange={(e) => onChange(row.id, { remark: e.target.value })}
                  className="h-7 w-32 text-xs border border-border rounded px-1.5"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function AddRow({
  open,
  onToggle,
  label,
  owner,
  onLabel,
  onOwner,
  onAdd,
  addLabel,
}: {
  open: boolean;
  onToggle: () => void;
  label: string;
  owner: string;
  onLabel: (v: string) => void;
  onOwner: (v: string) => void;
  onAdd: () => void;
  addLabel: string;
}) {
  if (!open) {
    return (
      <button type="button" className="text-xs font-medium text-brand-600 hover:underline mt-2" onClick={onToggle}>
        {addLabel}
      </button>
    );
  }
  return (
    <div className="flex flex-wrap items-end gap-2 mt-2">
      <div className="space-y-1">
        <p className="text-[11px]">Task</p>
        <Input value={label} onChange={(e) => onLabel(e.target.value)} className="h-8 text-xs w-48" />
      </div>
      <div className="space-y-1">
        <p className="text-[11px]">Owner / Team</p>
        <Input value={owner} onChange={(e) => onOwner(e.target.value)} className="h-8 text-xs w-40" />
      </div>
      <Button type="button" size="sm" className={hrBtn("gap-1.5", true)} onClick={onAdd}>
        <Plus className="w-3.5 h-3.5" /> Add
      </Button>
      <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={onToggle}>
        Cancel
      </button>
    </div>
  );
}
