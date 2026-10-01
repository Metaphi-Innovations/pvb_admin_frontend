"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Receipt, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { policyToday } from "@/lib/hr/policy-common";
import { ClaimReviewSheet } from "./ClaimReviewSheet";
import { ClaimProcessingSheet } from "./ClaimProcessingSheet";
import { SearchSelect } from "@/app/(app)/employee/claims/claim-ui";
import {
  CLAIM_TYPE_OPTIONS,
  HR_TRAVEL_CLAIMS_EVENT,
  PROCESSING_METHOD_LABEL,
  claimTypeLabel,
  formatClaimDate,
  formatInr,
  getTravelClaimById,
  loadTravelClaims,
  reimbursementStatusLabel,
  type EmployeeClaimType,
  type EmployeeTravelClaim,
  type ReimbursementProcessStatus,
  type ReimbursementProcessingMethod,
} from "@/app/(app)/employee/claims/travel-claim-data";
import {
  APPROVER_OPTIONS,
} from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import type { ApproverRole } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import {
  countApprovedThisMonth,
  countExceptionPending,
  countPendingTravelClaimApprovals,
  currentApproverLabel,
  loadReviewerContext,
  setReviewerContext,
  type ReviewerContext,
} from "@/app/(app)/employee/claims/travel-claim-approval";
import {
  bulkQueueForPayroll,
  countProcessingSummary,
  isInProcessingQueue,
  isProcessedTabClaim,
  processingAmount,
} from "@/app/(app)/employee/claims/travel-claim-processing";
import {
  listFinalizedPayrollRuns,
  listOpenPayrollRuns,
} from "@/app/(app)/hr/payroll/payroll-run-data";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type TabId = "pending" | "approved" | "processing" | "processed" | "rejected" | "returned" | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending Review" },
  { id: "approved", label: "Approved" },
  { id: "processing", label: "Processing" },
  { id: "processed", label: "Processed" },
  { id: "rejected", label: "Rejected" },
  { id: "returned", label: "Returned" },
  { id: "all", label: "All Claims" },
];

function inTab(c: EmployeeTravelClaim, tab: TabId): boolean {
  if (tab === "pending") return c.status === "submitted" || c.status === "under_review";
  if (tab === "approved") return c.status === "approved" || c.status === "partially_approved";
  if (tab === "processing") return isInProcessingQueue(c);
  if (tab === "processed") return isProcessedTabClaim(c);
  if (tab === "rejected") return c.status === "rejected";
  if (tab === "returned") return c.status === "returned";
  return c.status !== "draft";
}

export default function ReimbursementsClient() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<EmployeeTravelClaim[]>([]);
  const [tab, setTab] = useState<TabId>("pending");
  const [q, setQ] = useState("");
  const [typeFilter, setTypeFilter] = useState<EmployeeClaimType | "">("");
  const [exceptionOnly, setExceptionOnly] = useState(false);
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [procMethod, setProcMethod] = useState<ReimbursementProcessingMethod | "">("");
  const [procStatus, setProcStatus] = useState<ReimbursementProcessStatus | "">("");
  const [approvalFrom, setApprovalFrom] = useState("");
  const [approvalTo, setApprovalTo] = useState("");
  const [reviewer, setReviewer] = useState<ReviewerContext>({ role: "reporting_manager" });
  const [openId, setOpenId] = useState<number | null>(null);
  const [processId, setProcessId] = useState<number | null>(null);
  const [selected, setSelected] = useState<number[]>([]);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkPayrollId, setBulkPayrollId] = useState("");
  const [bulkError, setBulkError] = useState("");

  const refresh = () => setRows(loadTravelClaims());

  useEffect(() => {
    setReviewer(loadReviewerContext());
    refresh();
    const onEvt = () => refresh();
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, onEvt);
    return () => window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, onEvt);
  }, []);

  useEffect(() => {
    const id = Number(searchParams.get("claim") || "");
    if (Number.isFinite(id) && id > 0) {
      const c = getTravelClaimById(id);
      if (c && isInProcessingQueue(c)) setProcessId(id);
      else setOpenId(id);
    }
    const t = searchParams.get("tab");
    if (t && TABS.some((x) => x.id === t)) setTab(t as TabId);
  }, [searchParams]);

  const openClaim = openId ? getTravelClaimById(openId) ?? rows.find((r) => r.id === openId) ?? null : null;
  const processClaim = processId ? getTravelClaimById(processId) ?? rows.find((r) => r.id === processId) ?? null : null;

  const counts = {
    pending: countPendingTravelClaimApprovals(),
    exceptions: countExceptionPending(),
    approvedMonth: countApprovedThisMonth(),
  };
  const procSummary = useMemo(() => countProcessingSummary(rows), [rows]);

  const payrollOptions = useMemo(() => {
    const open = listOpenPayrollRuns();
    const finalized = listFinalizedPayrollRuns().slice(0, 12);
    return [...open, ...finalized].map((r) => ({
      id: r.id,
      label: r.periodLabel,
      cycleName: r.cycleName,
    }));
  }, [bulkOpen]);

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((c) => {
      if (!inTab(c, tab)) return false;
      if (typeFilter && c.claimType !== typeFilter) return false;
      if (tab === "processing" || tab === "processed") {
        if (procMethod && c.processingMethod !== procMethod) return false;
        if (procStatus && c.reimbursementStatus !== procStatus) return false;
        if (approvalFrom && (c.finalApprovedAt || "").slice(0, 10) < approvalFrom) return false;
        if (approvalTo && (c.finalApprovedAt || "").slice(0, 10) > approvalTo) return false;
      } else {
        if (exceptionOnly && !((c.exceptionAmount ?? 0) > 0.009 || c.exceptionApprovalStatus === "required" || c.exceptionApprovalStatus === "pending")) {
          return false;
        }
        if (fromDate && c.expenseDate < fromDate) return false;
        if (toDate && c.expenseDate > toDate) return false;
      }
      if (n) {
        const blob = `${c.claimNo} ${c.employeeName} ${c.employeeCode} ${claimTypeLabel(c.claimType)}`.toLowerCase();
        if (!blob.includes(n)) return false;
      }
      return true;
    });
  }, [rows, tab, q, typeFilter, exceptionOnly, fromDate, toDate, procMethod, procStatus, approvalFrom, approvalTo]);

  const toggleSelect = (id: number) => {
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const selectableAwaiting = filtered.filter((c) => c.reimbursementStatus === "awaiting_processing");

  const doBulkPayroll = () => {
    const period = payrollOptions.find((p) => p.id === bulkPayrollId);
    if (!period) {
      setBulkError("Select a payroll period.");
      return;
    }
    const targets = rows.filter((c) => selected.includes(c.id) && c.reimbursementStatus === "awaiting_processing");
    if (targets.length === 0) {
      setBulkError("Select claims that are awaiting processing.");
      return;
    }
    const res = bulkQueueForPayroll(targets, period, policyToday());
    if (!res.ok) {
      setBulkError(res.error || "Bulk queue failed.");
      return;
    }
    setBulkOpen(false);
    setSelected([]);
    setBulkError("");
    refresh();
  };

  const isProcessingView = tab === "processing" || tab === "processed";

  return (
    <HrPageShell
      breadcrumbs={hrBreadcrumb({ label: "Reimbursements" })}
      title="Reimbursements"
      description="Review claims and process approved reimbursements for payroll or Accounts handoff."
      icon={Receipt}
      maxWidthClass="max-w-[1440px]"
      actions={
        <div className="flex items-center gap-2 min-w-[200px]">
          <span className="text-[11px] text-muted-foreground hidden sm:inline shrink-0">Review as</span>
          <div className="w-[180px]">
            <SearchSelect
              value={reviewer.role}
              placeholder="Reviewer role…"
              options={APPROVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={(v) => {
                const role = v as ApproverRole;
                setReviewerContext(role);
                setReviewer({ role });
              }}
            />
          </div>
        </div>
      }
    >
      <div className="grid grid-cols-3 lg:grid-cols-6 gap-3 mb-3">
        <Mini count={counts.pending} label="Pending" />
        <Mini count={counts.exceptions} label="Exceptions" />
        <Mini count={counts.approvedMonth} label="Approved this month" />
        <Mini count={procSummary.awaiting} label="Awaiting Processing" />
        <Mini count={procSummary.queuedPayroll} label="Queued for Payroll" />
        <Mini count={procSummary.readyAccounts + procSummary.onHold} label="Ready / On Hold" />
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => {
              setTab(t.id);
              setSelected([]);
            }}
            className={cn(
              "h-8 px-3 text-xs rounded-lg border font-medium",
              tab === t.id
                ? "bg-brand-600 text-white border-brand-600"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search employee / claim no."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-lg border border-border"
          />
        </div>
        <div className="w-48">
          <SearchSelect
            value={typeFilter}
            placeholder="All types"
            options={[{ value: "", label: "All types" }, ...CLAIM_TYPE_OPTIONS.map((o) => ({ value: o.key, label: o.label }))]}
            onChange={(v) => setTypeFilter(v as EmployeeClaimType | "")}
          />
        </div>
        {isProcessingView ? (
          <>
            <div className="w-44">
              <SearchSelect
                value={procMethod}
                placeholder="All methods"
                options={[
                  { value: "", label: "All methods" },
                  ...Object.entries(PROCESSING_METHOD_LABEL).map(([value, label]) => ({ value, label })),
                ]}
                onChange={(v) => setProcMethod(v as ReimbursementProcessingMethod | "")}
              />
            </div>
            <div className="w-48">
              <SearchSelect
                value={procStatus}
                placeholder="All reimb. statuses"
                options={[
                  { value: "", label: "All reimb. statuses" },
                  { value: "awaiting_processing", label: "Awaiting Processing" },
                  { value: "queued_for_payroll", label: "Queued for Payroll" },
                  { value: "ready_for_accounts", label: "Ready for Accounts" },
                  { value: "sent_to_accounts", label: "Sent to Accounts" },
                  { value: "on_hold", label: "On Hold" },
                  { value: "processed", label: "Processing Completed" },
                  { value: "paid", label: "Paid" },
                ]}
                onChange={(v) => setProcStatus(v as ReimbursementProcessStatus | "")}
              />
            </div>
            <input type="date" title="Approval from" className="h-8 text-xs rounded-lg border border-border px-2" value={approvalFrom} onChange={(e) => setApprovalFrom(e.target.value)} />
            <input type="date" title="Approval to" className="h-8 text-xs rounded-lg border border-border px-2" value={approvalTo} onChange={(e) => setApprovalTo(e.target.value)} />
          </>
        ) : (
          <>
            <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <input
                type="checkbox"
                className="accent-brand-600"
                checked={exceptionOnly}
                onChange={(e) => setExceptionOnly(e.target.checked)}
              />
              Exception
            </label>
            <input type="date" className="h-8 text-xs rounded-lg border border-border px-2" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
            <input type="date" className="h-8 text-xs rounded-lg border border-border px-2" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </>
        )}
      </div>

      {tab === "processing" && selectableAwaiting.length > 0 ? (
        <div className="flex items-center gap-2 mb-3">
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            disabled={selected.length === 0}
            onClick={() => {
              setBulkError("");
              setBulkOpen(true);
            }}
          >
            Queue Selected for Payroll ({selected.length})
          </Button>
          <button
            type="button"
            className="text-[11px] text-brand-600 hover:underline"
            onClick={() => setSelected(selectableAwaiting.map((c) => c.id))}
          >
            Select all awaiting
          </button>
          {selected.length > 0 ? (
            <button type="button" className="text-[11px] text-muted-foreground hover:underline" onClick={() => setSelected([])}>
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {isProcessingView ? (
                  <>
                    {tab === "processing" ? <th className="px-3 py-2.5 w-8" /> : null}
                    {["Claim No.", "Employee", "Claim Type", "Approved Amount", "Final Approved On", "Processing Method", "Reimbursement Status", "Queued / Processed On", ""].map((h) => (
                      <th key={h || "act"} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </>
                ) : (
                  ["Claim No.", "Employee", "Claim Type", "Travel / Expense Date", "Claimed", "Eligible", "Exception", "Current Approver", "Submitted On", ""].map((h) => (
                    <th key={h || "act"} className="px-3 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                      {h}
                    </th>
                  ))
                )}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    {tab === "pending"
                      ? "No claims pending review."
                      : tab === "approved"
                        ? "No approved claims yet."
                        : tab === "processing"
                          ? "No claims awaiting processing."
                          : tab === "processed"
                            ? "No processed claims yet."
                            : tab === "rejected"
                              ? "No rejected claims."
                              : tab === "returned"
                                ? "No returned claims."
                                : "No claims in this view."}
                  </td>
                </tr>
              ) : isProcessingView ? (
                filtered.map((c) => {
                  const queuedOn =
                    c.processedOn ||
                    c.accountsSentAt ||
                    c.accountsReadyAt ||
                    (c.processingHistory?.length ? c.processingHistory[c.processingHistory.length - 1]?.at : "") ||
                    "";
                  return (
                    <tr key={c.id} className="border-b border-border/60 hover:bg-muted/20">
                      {tab === "processing" ? (
                        <td className="px-3 py-2">
                          {c.reimbursementStatus === "awaiting_processing" ? (
                            <input
                              type="checkbox"
                              className="accent-brand-600"
                              checked={selected.includes(c.id)}
                              onChange={() => toggleSelect(c.id)}
                            />
                          ) : null}
                        </td>
                      ) : null}
                      <td className="px-3 py-2 font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">{c.claimNo}</td>
                      <td className="px-3 py-2 text-xs">
                        <p className="font-medium">{c.employeeName}</p>
                        <p className="text-[10px] text-muted-foreground">{c.employeeCode}</p>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">{claimTypeLabel(c.claimType)}</td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap text-right tabular-nums font-semibold">
                        {formatInr(processingAmount(c))}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {c.finalApprovedAt ? formatClaimDate(c.finalApprovedAt.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {c.processingMethod ? PROCESSING_METHOD_LABEL[c.processingMethod] : "—"}
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        <span className="inline-flex text-[11px] px-2 py-0.5 rounded-full font-semibold bg-muted text-foreground">
                          {reimbursementStatusLabel(c.reimbursementStatus)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-xs whitespace-nowrap">
                        {queuedOn ? formatClaimDate(queuedOn.slice(0, 10)) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setProcessId(c.id)}>
                          Process
                        </Button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                filtered.map((c) => (
                  <tr key={c.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2 font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">{c.claimNo}</td>
                    <td className="px-3 py-2 text-xs">
                      <p className="font-medium">{c.employeeName}</p>
                      <p className="text-[10px] text-muted-foreground">{c.employeeCode}</p>
                    </td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{claimTypeLabel(c.claimType)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{formatClaimDate(c.expenseDate)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-right tabular-nums">{formatInr(c.claimedAmount)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap text-right tabular-nums">{formatInr(c.eligibleAmount)}</td>
                    <td className="px-3 py-2 text-xs">
                      {(c.exceptionAmount ?? 0) > 0.009 ? (
                        <span className="text-orange-700 font-medium">{formatInr(c.exceptionAmount)}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-xs">{currentApproverLabel(c)}</td>
                    <td className="px-3 py-2 text-xs whitespace-nowrap">{formatClaimDate(c.submittedOn)}</td>
                    <td className="px-3 py-2">
                      {c.status === "approved" || c.status === "partially_approved" ? (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setProcessId(c.id)}>
                          Process
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" className="h-7 text-[11px]" onClick={() => setOpenId(c.id)}>
                          Review
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-muted/20">
          <p className="text-[11px] text-muted-foreground">
            Showing <span className="font-medium text-foreground">{filtered.length}</span> records
          </p>
        </div>
      </div>

      <ClaimReviewSheet
        claim={openClaim}
        reviewer={reviewer}
        onClose={() => setOpenId(null)}
        onChanged={() => {
          refresh();
        }}
      />
      <ClaimProcessingSheet
        claim={processClaim}
        onClose={() => setProcessId(null)}
        onChanged={() => {
          refresh();
        }}
      />

      <Dialog open={bulkOpen} onOpenChange={setBulkOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Queue Selected for Payroll</DialogTitle>
            <DialogDescription>
              {selected.length} claim(s) will be set to Queued for Payroll. Salary calculation is not modified.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <SearchSelect
              value={bulkPayrollId}
              placeholder="Select payroll period…"
              options={payrollOptions.map((p) => ({ value: p.id, label: `${p.label} · ${p.cycleName}` }))}
              onChange={setBulkPayrollId}
            />
            {bulkError ? <p className="text-xs text-red-600">{bulkError}</p> : null}
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setBulkOpen(false)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={doBulkPayroll}>
                Queue
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </HrPageShell>
  );
}

function Mini({ count, label }: { count: number; label: string }) {
  return (
    <div className="rounded-xl border border-border bg-white px-3 py-2.5 shadow-sm">
      <p className="text-lg font-bold leading-none">{count}</p>
      <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
    </div>
  );
}
