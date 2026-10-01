"use client";

/**
 * Canonical Leave Requests panel — promoted from finalized DESKTOP leave approval UI.
 * Available column, entitlement breakup, REQUESTED/APPROVED/AFTER, date portions 0–1.
 * Cross-leave adjust-against removed.
 */


import React, { useEffect, useMemo, useState } from "react";
import { Check, Eye, Search, X } from "lucide-react";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { formatDateDisplay } from "@/app/(app)/hr/employees/employee-display";
import { EmployeeAvatar } from "@/app/(app)/hr/employees/components/EmployeeStatusChips";
import {
  getEmployeeLeaveBalances,
  getLeaveBalanceContext,
  OPTIONAL_LEAVE_TYPE_NAME,
  type EmployeeLeaveBalanceView,
} from "@/app/(app)/hr/leave/leave-balance-data";
import { isLeaveTypePaid } from "@/app/(app)/hr/settings/leave-data";
import {
  clampLeaveDays,
  enumerateLeaveDates,
  formatLeaveDays,
  LEAVE_DAY_PORTION_OPTIONS,
  normalizeLeaveDays,
  sumLeavePortions,
} from "@/lib/hr/leave-day-precision";
import { cn } from "@/lib/utils";
import {
  approveLeaveRequest,
  getEffectiveApprovedDays,
  getLeaveTypeFilterOptions,
  isPartialLeaveApproval,
  rejectLeaveRequest,
  REQUEST_BRANCH_OPTIONS,
  REQUEST_DEPARTMENT_OPTIONS,
  type LeaveApprovedPortion,
  type LeaveRequestRecord,
  type RequestListMode,
} from "../requests-data";
import {
  FilterSelect,
  IconActionBtn,
  RequestModeTabs,
  RequestStatusChip,
} from "./RequestUi";

function matchesSearch(rec: LeaveRequestRecord, q: string): boolean {
  if (!q.trim()) return true;
  const t = q.trim().toLowerCase();
  return (
    rec.employeeName.toLowerCase().includes(t) ||
    rec.employeeCode.toLowerCase().includes(t) ||
    rec.reason.toLowerCase().includes(t)
  );
}

function monthOptions(): { value: string; label: string }[] {
  const opts: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    opts.push({
      value: key,
      label: d.toLocaleString("en-IN", { month: "short", year: "numeric" }),
    });
  }
  return opts;
}

function durationLabel(rec: LeaveRequestRecord): string {
  const one = formatDateWithWeekday(rec.fromDate);
  if (rec.fromDate === rec.toDate) return one;
  return `${one} - ${formatDateWithWeekday(rec.toDate)}`;
}

function formatDateWithWeekday(iso: string): string {
  const key = iso.slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return formatDateDisplay(iso);
  const d = new Date(`${key}T12:00:00`);
  if (Number.isNaN(d.getTime())) return formatDateDisplay(iso);
  const datePart = d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const weekday = d.toLocaleDateString("en-IN", { weekday: "short" });
  return `${datePart} (${weekday})`;
}

function daysValueLabel(days: number): string {
  const n = normalizeLeaveDays(days);
  return `${formatLeaveDays(n)} ${n === 1 ? "Day" : "Days"}`;
}

function paidUnpaidLabel(rec: LeaveRequestRecord): string {
  if (rec.status === "approved" && rec.adjustedAgainst === "Unpaid") return "Unpaid Leave";
  if (!isLeaveTypePaid(rec.leaveType) || rec.leaveType === "Unpaid") return "Unpaid Leave";
  return "Paid Leave";
}

function isBalanceApplicable(rec: LeaveRequestRecord): boolean {
  return isLeaveTypePaid(rec.leaveType) && rec.leaveType !== "Unpaid";
}

function availableBalanceFor(rec: LeaveRequestRecord): number | null {
  if (!isBalanceApplicable(rec)) return null;
  return getLeaveBalanceContext(rec.employeeId, rec.employeeCode, rec.leaveType)?.remaining ?? 0;
}

function statusDisplay(rec: LeaveRequestRecord): React.ReactNode {
  if (isPartialLeaveApproval(rec)) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border bg-amber-50 text-amber-800 border-amber-200">
        Partially Approved
      </span>
    );
  }
  return <RequestStatusChip status={rec.status} />;
}

function useLeaveBalanceForRequest(rec: LeaveRequestRecord | null): EmployeeLeaveBalanceView | null {
  return useMemo(() => {
    if (!rec) return null;
    return getLeaveBalanceContext(rec.employeeId, rec.employeeCode, rec.leaveType);
  }, [rec]);
}

/** Entitlement balances for approval context — excludes Unpaid / non-paid types. */
function useEntitlementBalancesForEmployee(
  rec: LeaveRequestRecord | null,
): EmployeeLeaveBalanceView[] {
  return useMemo(() => {
    if (!rec) return [];
    return getEmployeeLeaveBalances(rec.employeeId, rec.employeeCode).filter(
      (b) => b.leaveType !== "Unpaid" && isLeaveTypePaid(b.leaveType),
    );
  }, [rec]);
}

/** Date-only appliedOn → date label; full ISO with time → include time. Never invent a time. */
function formatRequestedOn(raw: string): string {
  if (!raw) return "—";
  const trimmed = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return formatDateDisplay(trimmed);
  const d = new Date(trimmed);
  if (Number.isNaN(d.getTime())) return formatDateDisplay(trimmed);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

function DrawerSection({
  label,
  children,
  valueMuted,
}: {
  label: string;
  children: React.ReactNode;
  valueMuted?: boolean;
}) {
  return (
    <div>
      <p className="text-[12px] font-medium text-muted-foreground">{label}</p>
      <div
        className={cn(
          "mt-1.5 text-[13px] leading-snug text-foreground",
          valueMuted ? "text-muted-foreground font-normal" : "font-normal",
        )}
      >
        {children}
      </div>
    </div>
  );
}

function DrawerSummaryCol({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] text-muted-foreground leading-tight">{label}</p>
      <p className="mt-1.5 text-[13px] font-medium text-foreground leading-snug tabular-nums">
        {children}
      </p>
    </div>
  );
}

/** Compact entitlement remaining balances — display only, no cross-adjustment. */
function EntitlementBalanceBreakup({
  balances,
  requestedLeaveType,
  title = "Leave Balance",
}: {
  balances: EmployeeLeaveBalanceView[];
  requestedLeaveType: string;
  title?: string;
}) {
  if (balances.length === 0) return null;
  return (
    <div className="space-y-2">
      <p className="text-[12px] font-medium text-muted-foreground">{title}</p>
      <div className="flex flex-wrap gap-2">
        {balances.map((b) => {
          const isRequested = b.leaveType === requestedLeaveType;
          return (
            <div
              key={b.leaveType}
              className={cn(
                "min-w-[96px] flex-1 basis-[30%] rounded-[10px] px-2.5 py-2 border",
                isRequested
                  ? "border-brand-300 bg-brand-50/70"
                  : "border-border/70 bg-muted/15",
              )}
            >
              <p
                className={cn(
                  "text-[11px] font-medium truncate",
                  isRequested ? "text-brand-800" : "text-muted-foreground",
                )}
              >
                {b.leaveType}
              </p>
              <p className="text-[13px] font-semibold tabular-nums text-foreground mt-0.5">
                {daysValueLabel(b.remaining)}
              </p>
              {isRequested ? (
                <p className="text-[10px] font-semibold text-brand-700 mt-0.5">Requested</p>
              ) : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function buildDefaultPortions(
  rec: LeaveRequestRecord,
  maxDays: number,
): Record<string, number> {
  const dates = enumerateLeaveDates(rec.fromDate, rec.toDate);
  const map: Record<string, number> = {};
  dates.forEach((d) => {
    map[d] = 0;
  });
  let remaining = normalizeLeaveDays(maxDays);
  for (const d of dates) {
    if (remaining <= 0) break;
    const take = remaining >= 1 ? 1 : remaining;
    map[d] = take;
    remaining = normalizeLeaveDays(remaining - take);
  }
  return map;
}

export function LeaveRequestsPanel({
  records,
  onChange,
}: {
  records: LeaveRequestRecord[];
  onChange: () => void;
}) {
  const [mode, setMode] = useState<RequestListMode>("pending");
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [leaveType, setLeaveType] = useState("");
  const [status, setStatus] = useState("");
  const [month, setMonth] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [portionMap, setPortionMap] = useState<Record<string, number>>({});
  const [partialRemark, setPartialRemark] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");
  const [approveError, setApproveError] = useState("");
  const [approveAvailable, setApproveAvailable] = useState<number | null>(null);
  const [approveRequested, setApproveRequested] = useState<number | null>(null);

  const pending = useMemo(() => records.filter((r) => r.status === "pending"), [records]);
  const history = useMemo(
    () =>
      records.filter(
        (r) => r.status === "approved" || r.status === "rejected" || r.status === "cancelled",
      ),
    [records],
  );

  const filtered = useMemo(() => {
    const base = mode === "pending" ? pending : history;
    return base.filter((r) => {
      if (!matchesSearch(r, search)) return false;
      if (branch && r.branch !== branch) return false;
      if (department && r.department !== department) return false;
      if (leaveType && r.leaveType !== leaveType) return false;
      if (mode === "history" && status && r.status !== status) return false;
      if (month) {
        const inMonth =
          r.fromDate.startsWith(month) ||
          r.toDate.startsWith(month) ||
          r.appliedOn.startsWith(month) ||
          (r.actionedOn && r.actionedOn.startsWith(month));
        if (!inMonth) return false;
      }
      return true;
    });
  }, [mode, pending, history, search, branch, department, leaveType, status, month]);

  const viewRec = records.find((r) => r.id === viewId) ?? null;
  const approveRec = records.find((r) => r.id === approveId) ?? null;
  const rejectRec = records.find((r) => r.id === rejectId) ?? null;
  const viewBalance = useLeaveBalanceForRequest(viewRec);
  const viewEntitlementBalances = useEntitlementBalancesForEmployee(viewRec);
  const approveBalance = useLeaveBalanceForRequest(approveRec);
  const approveEntitlementBalances = useEntitlementBalancesForEmployee(approveRec);

  const approvedDaysLive = useMemo(
    () =>
      sumLeavePortions(
        Object.entries(portionMap).map(([date, quantity]) => ({ date, quantity })),
      ),
    [portionMap],
  );

  const maxApprovable = useMemo(() => {
    if (!approveRec) return 0;
    const requested = normalizeLeaveDays(approveRec.days);
    if (!isBalanceApplicable(approveRec)) return requested;
    const avail = approveBalance?.remaining ?? 0;
    return clampLeaveDays(Math.min(requested, avail), 0, requested);
  }, [approveRec, approveBalance]);

  const isPartialLive =
    !!approveRec && approvedDaysLive < normalizeLeaveDays(approveRec.days) - 1e-9;

  const balanceAfter =
    approveRec && isBalanceApplicable(approveRec) && approveBalance
      ? normalizeLeaveDays(Math.max(0, approveBalance.remaining - approvedDaysLive))
      : null;

  useEffect(() => {
    if (!approveRec) return;
    const requested = normalizeLeaveDays(approveRec.days);
    let max = requested;
    if (isBalanceApplicable(approveRec)) {
      const avail = getLeaveBalanceContext(
        approveRec.employeeId,
        approveRec.employeeCode,
        approveRec.leaveType,
      )?.remaining ?? 0;
      max = clampLeaveDays(Math.min(requested, avail), 0, requested);
    }
    // Optional Leave: single day only
    if (approveRec.leaveType === OPTIONAL_LEAVE_TYPE_NAME) {
      const d = approveRec.fromDate.slice(0, 10);
      setPortionMap({ [d]: max >= 1 ? 1 : max > 0 ? max : 1 });
    } else {
      setPortionMap(buildDefaultPortions(approveRec, max > 0 ? max : requested));
    }
    setPartialRemark("");
    setApproveError("");
  }, [approveRec?.id]);

  const resetFilters = () => {
    setSearch("");
    setBranch("");
    setDepartment("");
    setLeaveType("");
    setStatus("");
    setMonth("");
  };

  const setDatePortion = (date: string, quantity: number) => {
    setPortionMap((prev) => {
      const next = { ...prev, [date]: quantity };
      // Cap total to maxApprovable for paid leave
      const total = sumLeavePortions(
        Object.entries(next).map(([d, q]) => ({ date: d, quantity: q })),
      );
      if (approveRec && isBalanceApplicable(approveRec) && total > maxApprovable + 1e-9) {
        setApproveError(
          `Cannot approve more than available balance (${formatLeaveDays(maxApprovable)} days).`,
        );
        return prev;
      }
      if (approveRec && total > normalizeLeaveDays(approveRec.days) + 1e-9) {
        setApproveError("Cannot approve more than requested days.");
        return prev;
      }
      setApproveError("");
      return next;
    });
  };

  const handleApprove = () => {
    if (!approveId || !approveRec) return;
    const portions: LeaveApprovedPortion[] = Object.entries(portionMap)
      .filter(([, q]) => q > 0)
      .map(([date, quantity]) => ({ date, quantity }));

    const result = approveLeaveRequest(approveId, {
      portions,
      remark: isPartialLive ? partialRemark : undefined,
    });
    if (!result.ok) {
      setApproveError(result.error);
      if (!result.check.ok) {
        setApproveAvailable(result.check.available);
        setApproveRequested(result.check.requested);
      }
      return;
    }
    setApproveId(null);
    setViewId(null);
    setApproveError("");
    setApproveAvailable(null);
    setApproveRequested(null);
    onChange();
  };

  const handleReject = () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      setRejectError("Rejection reason is required.");
      return;
    }
    const result = rejectLeaveRequest(rejectId, rejectReason);
    if (!result) {
      setRejectError("Only pending requests can be rejected.");
      return;
    }
    setRejectId(null);
    setRejectReason("");
    setRejectError("");
    setViewId(null);
    onChange();
  };

  const approveDates = approveRec
    ? enumerateLeaveDates(approveRec.fromDate, approveRec.toDate)
    : [];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <RequestModeTabs
          mode={mode}
          onChange={setMode}
          pendingCount={pending.length}
          historyCount={history.length}
        />
        <button
          type="button"
          onClick={resetFilters}
          className="h-8 px-2.5 text-xs text-brand-700 hover:underline"
        >
          Reset Filters
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search employee…"
            className="h-8 w-48 pl-8 pr-2.5 text-xs rounded-[10px] border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-300/50"
          />
        </div>
        <FilterSelect
          value={branch}
          onChange={setBranch}
          placeholder="All Branches"
          options={REQUEST_BRANCH_OPTIONS.map((b) => ({ value: b.value, label: b.label }))}
        />
        <FilterSelect
          value={department}
          onChange={setDepartment}
          placeholder="All Departments"
          options={REQUEST_DEPARTMENT_OPTIONS.map((d) => ({ value: d, label: d }))}
        />
        <FilterSelect
          value={leaveType}
          onChange={setLeaveType}
          placeholder="All Leave Types"
          options={getLeaveTypeFilterOptions().map((d) => ({ value: d, label: d }))}
        />
        <FilterSelect value={month} onChange={setMonth} placeholder="Month" options={monthOptions()} />
        {mode === "history" && (
          <FilterSelect
            value={status}
            onChange={setStatus}
            placeholder="All Statuses"
            options={[
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
            ]}
          />
        )}
      </div>

      <div className="border border-border rounded-[12px] bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-left">
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Employee</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Leave Type</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Duration</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Days</th>
                {mode === "pending" && (
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Available</th>
                )}
                {mode === "history" && (
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Approved</th>
                )}
                <th className="px-3 py-2 font-semibold whitespace-nowrap">Status</th>
                {mode === "pending" ? (
                  <th className="px-3 py-2 font-semibold whitespace-nowrap">Applied On</th>
                ) : (
                  <>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Processed On</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Approved by</th>
                  </>
                )}
                <th className="px-3 py-2 font-semibold whitespace-nowrap w-24">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-10 text-center text-muted-foreground">
                    {mode === "pending"
                      ? "No pending leave requests."
                      : "No leave request history matches filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((r, i) => {
                  const avail = availableBalanceFor(r);
                  return (
                    <tr
                      key={r.id}
                      className={cn(
                        "border-b border-border/60 hover:bg-muted/20 group",
                        i % 2 === 1 && "bg-muted/20",
                      )}
                    >
                      <td className="px-3 py-2">
                        <p className="font-medium whitespace-nowrap">{r.employeeName}</p>
                        <p className="font-mono text-[10px] text-brand-700">{r.employeeCode}</p>
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{r.leaveType}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{durationLabel(r)}</td>
                      <td className="px-3 py-2 tabular-nums">{formatLeaveDays(r.days)}</td>
                      {mode === "pending" && (
                        <td className="px-3 py-2 tabular-nums font-medium">
                          {avail == null ? "—" : formatLeaveDays(avail)}
                        </td>
                      )}
                      {mode === "history" && (
                        <td className="px-3 py-2 tabular-nums">
                          {r.status === "approved"
                            ? formatLeaveDays(getEffectiveApprovedDays(r))
                            : "—"}
                        </td>
                      )}
                      <td className="px-3 py-2">{statusDisplay(r)}</td>
                      {mode === "pending" ? (
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.appliedOn)}</td>
                      ) : (
                        <>
                          <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.actionedOn)}</td>
                          <td className="px-3 py-2 whitespace-nowrap">{r.actionedBy || "—"}</td>
                        </>
                      )}
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-0.5">
                          <IconActionBtn label="View Request" onClick={() => setViewId(r.id)}>
                            <Eye className="w-3.5 h-3.5" />
                          </IconActionBtn>
                          {mode === "pending" && (
                            <>
                              <IconActionBtn
                                label="Approve Leave"
                                tone="success"
                                onClick={() => setApproveId(r.id)}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </IconActionBtn>
                              <IconActionBtn
                                label="Reject Leave"
                                tone="danger"
                                onClick={() => {
                                  setRejectReason("");
                                  setRejectError("");
                                  setRejectId(r.id);
                                }}
                              >
                                <X className="w-3.5 h-3.5" />
                              </IconActionBtn>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
          <span className="font-medium text-foreground">
            {mode === "pending" ? pending.length : history.length}
          </span>{" "}
          records
        </div>
      </div>

      {/* View Leave Request drawer — reference layout */}
      <Sheet open={!!viewRec} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="max-w-[440px] w-full p-0 flex flex-col [&>button]:hidden">
          <SheetHeader className="px-5 pt-4 pb-3.5 border-b flex-shrink-0 space-y-0">
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => setViewId(null)}
                className="h-8 w-8 shrink-0 rounded-[10px] inline-flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="w-4 h-4" />
              </button>
              {viewRec ? (
                <EmployeeAvatar name={viewRec.employeeName} size="sm" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <SheetTitle className="text-[14px] font-semibold text-foreground leading-tight truncate">
                    {viewRec?.employeeName ?? "Leave Request"}
                  </SheetTitle>
                  {viewRec ? statusDisplay(viewRec) : null}
                </div>
                {viewRec?.employeeCode ? (
                  <SheetDescription className="text-[11px] text-muted-foreground mt-0.5 truncate">
                    {viewRec.employeeCode}
                  </SheetDescription>
                ) : (
                  <SheetDescription className="sr-only">Leave request details</SheetDescription>
                )}
              </div>
            </div>
          </SheetHeader>

          {viewRec && (
            <SheetBody className="flex-1 overflow-y-auto px-5 py-5 space-y-5">
              <DrawerSection label="Leave Duration">
                <span className="text-[13px] font-medium text-foreground">
                  {durationLabel(viewRec)}
                </span>
              </DrawerSection>

              <div className="border-t border-border/70" />

              {isPartialLeaveApproval(viewRec) ? (
                <div className="grid grid-cols-3 gap-3">
                  <DrawerSummaryCol label="Requested for">
                    {daysValueLabel(viewRec.days)}
                  </DrawerSummaryCol>
                  <DrawerSummaryCol label="Approved">
                    {daysValueLabel(getEffectiveApprovedDays(viewRec))}
                  </DrawerSummaryCol>
                  <DrawerSummaryCol label="Leave type">{viewRec.leaveType}</DrawerSummaryCol>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-3">
                  <DrawerSummaryCol label="Requested for">
                    {daysValueLabel(viewRec.days)}
                  </DrawerSummaryCol>
                  <DrawerSummaryCol label="Current leave balance">
                    {isBalanceApplicable(viewRec)
                      ? daysValueLabel(viewBalance?.remaining ?? 0)
                      : "—"}
                  </DrawerSummaryCol>
                  <DrawerSummaryCol label="Leave type">{viewRec.leaveType}</DrawerSummaryCol>
                </div>
              )}

              {viewEntitlementBalances.length > 0 ? (
                <>
                  <div className="border-t border-border/70" />
                  <EntitlementBalanceBreakup
                    balances={viewEntitlementBalances}
                    requestedLeaveType={viewRec.leaveType}
                    title="Leave Balance"
                  />
                </>
              ) : null}

              <div className="border-t border-border/70" />

              <DrawerSection label="Notes" valueMuted={!viewRec.reason.trim()}>
                {viewRec.reason.trim() || "No Notes"}
              </DrawerSection>

              <div className="border-t border-border/70" />

              <DrawerSection label="Attachments" valueMuted>
                No Attachments
              </DrawerSection>

              <div className="border-t border-border/70" />

              <DrawerSection label="Requested on">
                {formatRequestedOn(viewRec.appliedOn)}
              </DrawerSection>

              {viewRec.status !== "pending" &&
              (viewRec.actionedOn ||
                viewRec.actionedBy ||
                viewRec.rejectionReason ||
                viewRec.approvalRemark) ? (
                <>
                  <div className="border-t border-border/70" />
                  <div className="space-y-3">
                    {viewRec.actionedOn ? (
                      <DrawerSection label="Processed on">
                        {formatRequestedOn(viewRec.actionedOn)}
                      </DrawerSection>
                    ) : null}
                    {viewRec.actionedBy ? (
                      <DrawerSection label="Approved by">{viewRec.actionedBy}</DrawerSection>
                    ) : null}
                    {viewRec.rejectionReason ? (
                      <DrawerSection label="Remark">{viewRec.rejectionReason}</DrawerSection>
                    ) : null}
                    {!viewRec.rejectionReason && viewRec.approvalRemark ? (
                      <DrawerSection label="Remark">{viewRec.approvalRemark}</DrawerSection>
                    ) : null}
                  </div>
                </>
              ) : null}
            </SheetBody>
          )}

          {viewRec?.status === "pending" ? (
            <SheetFooter className="flex-shrink-0 px-5 py-3.5 border-t bg-background gap-3 justify-stretch">
              <Button
                variant="outline"
                size="sm"
                className="h-10 flex-1 text-xs font-medium rounded-[10px] text-red-600 border-red-200 hover:bg-red-50"
                onClick={() => {
                  setRejectReason("");
                  setRejectError("");
                  setRejectId(viewRec.id);
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                className="h-10 flex-1 text-xs font-medium rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => setApproveId(viewRec.id)}
              >
                Approve
              </Button>
            </SheetFooter>
          ) : null}
        </SheetContent>
      </Sheet>

      {/* Approve dialog — simplified, no Adjust Against */}
      <Dialog
        open={!!approveRec}
        onOpenChange={(o) => {
          if (!o) {
            setApproveId(null);
            setApproveError("");
            setApproveAvailable(null);
            setApproveRequested(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-[18px] p-0 gap-0 overflow-hidden">
          <DialogHeader className="px-5 pt-5 pb-3 border-b">
            <DialogTitle className="text-base font-semibold">Approve Leave</DialogTitle>
            <DialogDescription className="sr-only">Review balance and approve leave days</DialogDescription>
          </DialogHeader>

          {approveRec && (
            <div className="px-5 py-4 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <p className="text-sm font-semibold text-foreground">{approveRec.employeeName}</p>
                <p className="font-mono text-[11px] text-brand-700">{approveRec.employeeCode}</p>
              </div>

              <div className="text-xs space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {approveRec.leaveType} · {paidUnpaidLabel(approveRec)}
                </p>
                <p className="text-foreground font-medium">{durationLabel(approveRec)}</p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center border border-border rounded-[12px] divide-x divide-border overflow-hidden">
                <div className="py-2.5 px-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Requested</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">
                    {formatLeaveDays(approveRec.days)}
                  </p>
                </div>
                <div className="py-2.5 px-1">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Approved</p>
                  <p className="text-base font-bold tabular-nums mt-0.5">
                    {formatLeaveDays(approvedDaysLive)}
                  </p>
                </div>
                <div className="py-2.5 px-1 bg-brand-50/50">
                  <p className="text-[10px] uppercase tracking-wide text-muted-foreground">After</p>
                  <p className="text-base font-bold tabular-nums mt-0.5 text-brand-800">
                    {isBalanceApplicable(approveRec) ? formatLeaveDays(balanceAfter) : "—"}
                  </p>
                </div>
              </div>

              {approveEntitlementBalances.length > 0 ? (
                <EntitlementBalanceBreakup
                  balances={approveEntitlementBalances}
                  requestedLeaveType={approveRec.leaveType}
                  title="Available Leave Balance"
                />
              ) : null}

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    Approval · Dates
                  </p>
                  <p className="text-xs font-semibold tabular-nums">
                    Approve {formatLeaveDays(approvedDaysLive)} day
                    {approvedDaysLive === 1 ? "" : "s"}
                  </p>
                </div>

                {approveRec.leaveType === OPTIONAL_LEAVE_TYPE_NAME ? (
                  <p className="text-[11px] text-muted-foreground">
                    Optional Leave is a single holiday entitlement — approve the full day or reject.
                  </p>
                ) : (
                  <ul className="border border-border rounded-[12px] divide-y divide-border/60 overflow-hidden">
                    {approveDates.map((d) => (
                      <li key={d} className="flex items-center justify-between gap-2 px-3 py-2 text-xs bg-white">
                        <span className="font-medium">{formatDateDisplay(d)}</span>
                        <select
                          value={String(portionMap[d] ?? 0)}
                          onChange={(e) => setDatePortion(d, Number(e.target.value))}
                          className="h-8 px-2 text-xs rounded-[10px] border border-border bg-white min-w-[120px]"
                        >
                          {LEAVE_DAY_PORTION_OPTIONS.map((o) => (
                            <option key={o.value} value={o.value}>
                              {o.label}
                            </option>
                          ))}
                        </select>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {isPartialLive && (
                <div className="space-y-1.5">
                  <label className="text-xs font-medium">
                    Partial Approval Reason <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={partialRemark}
                    onChange={(e) => setPartialRemark(e.target.value)}
                    rows={2}
                    placeholder="e.g. Only 2 days balance available."
                    className="w-full text-xs rounded-[10px] border border-border px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300/50"
                  />
                </div>
              )}

              {approveError && (
                <div className="rounded-[12px] border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 space-y-1">
                  <p className="font-semibold">{approveError}</p>
                  {approveAvailable !== null && approveRequested !== null && (
                    <p>
                      Available: {formatLeaveDays(approveAvailable)} · Needed:{" "}
                      {formatLeaveDays(approveRequested)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="px-5 py-3 border-t bg-muted/30 flex justify-end gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-[10px]"
              onClick={() => setApproveId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleApprove}
            >
              Approve Leave
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectRec} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="max-w-sm rounded-[18px]">
          <DialogHeader>
            <DialogTitle className="text-base">Reject leave request</DialogTitle>
            <DialogDescription className="text-xs">
              {rejectRec
                ? `${rejectRec.employeeName} · ${rejectRec.leaveType}`
                : "Provide a rejection reason."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5 pt-1">
            <label className="text-xs font-medium">
              Rejection Reason <span className="text-red-500">*</span>
            </label>
            <textarea
              value={rejectReason}
              onChange={(e) => {
                setRejectReason(e.target.value);
                setRejectError("");
              }}
              rows={3}
              className={cn(
                "w-full text-xs rounded-[10px] border border-border px-2.5 py-2 resize-none",
                "focus:outline-none focus:ring-2 focus:ring-brand-300/50",
                rejectError && "border-red-400",
              )}
              placeholder="Enter reason for rejection…"
            />
            {rejectError && <p className="text-xs text-red-500">{rejectError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs rounded-[10px]"
              onClick={() => setRejectId(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs rounded-[10px] bg-red-600 hover:bg-red-700 text-white"
              onClick={handleReject}
            >
              Reject
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
