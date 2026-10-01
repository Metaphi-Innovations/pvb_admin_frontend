"use client";

import React, { useMemo, useState } from "react";
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
import { Input } from "@/components/ui/input";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { formatDateDisplay } from "@/app/(app)/hr/employees/employee-display";
import { cn } from "@/lib/utils";
import {
  approveReimbursementRequest,
  formatInr,
  REIMBURSEMENT_CATEGORY_OPTIONS,
  rejectReimbursementRequest,
  REQUEST_BRANCH_OPTIONS,
  REQUEST_DEPARTMENT_OPTIONS,
  type ReimbursementRequestRecord,
  type RequestListMode,
} from "../requests-data";
import {
  DetailRow,
  FilterSelect,
  IconActionBtn,
  RequestModeTabs,
  RequestStatusChip,
} from "./RequestUi";

function matchesSearch(rec: ReimbursementRequestRecord, q: string): boolean {
  if (!q.trim()) return true;
  const t = q.trim().toLowerCase();
  return (
    rec.employeeName.toLowerCase().includes(t) ||
    rec.employeeCode.toLowerCase().includes(t) ||
    rec.purpose.toLowerCase().includes(t) ||
    rec.claimCategory.toLowerCase().includes(t)
  );
}

export function ReimbursementRequestsPanel({
  records,
  onChange,
}: {
  records: ReimbursementRequestRecord[];
  onChange: () => void;
}) {
  const [mode, setMode] = useState<RequestListMode>("pending");
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("");
  const [department, setDepartment] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [viewId, setViewId] = useState<string | null>(null);
  const [approveId, setApproveId] = useState<string | null>(null);
  const [approvedAmount, setApprovedAmount] = useState("");
  const [approvalComment, setApprovalComment] = useState("");
  const [approveError, setApproveError] = useState("");
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectError, setRejectError] = useState("");

  const pending = useMemo(() => records.filter((r) => r.status === "pending"), [records]);
  const history = useMemo(
    () => records.filter((r) => r.status !== "pending"),
    [records],
  );

  const filtered = useMemo(() => {
    const base = mode === "pending" ? pending : history;
    return base.filter((r) => {
      if (!matchesSearch(r, search)) return false;
      if (branch && r.branch !== branch) return false;
      if (department && r.department !== department) return false;
      if (category && r.claimCategory !== category) return false;
      if (mode === "history" && status && r.status !== status) return false;
      if (fromDate && r.claimDate < fromDate) return false;
      if (toDate && r.claimDate > toDate) return false;
      return true;
    });
  }, [mode, pending, history, search, branch, department, category, status, fromDate, toDate]);

  const viewRec = records.find((r) => r.id === viewId) ?? null;
  const approveRec = records.find((r) => r.id === approveId) ?? null;
  const rejectRec = records.find((r) => r.id === rejectId) ?? null;

  const resetFilters = () => {
    setSearch("");
    setBranch("");
    setDepartment("");
    setCategory("");
    setStatus("");
    setFromDate("");
    setToDate("");
  };

  const openApprove = (rec: ReimbursementRequestRecord) => {
    setApprovedAmount(String(rec.claimedAmount));
    setApprovalComment("");
    setApproveError("");
    setApproveId(rec.id);
  };

  const handleApprove = () => {
    if (!approveId || !approveRec) return;
    const amt = Number(approvedAmount);
    if (!Number.isFinite(amt) || amt < 0) {
      setApproveError("Enter a valid approved amount.");
      return;
    }
    if (amt > approveRec.claimedAmount) {
      setApproveError("Approved amount cannot exceed claimed amount.");
      return;
    }
    approveReimbursementRequest(approveId, amt, approvalComment);
    setApproveId(null);
    setViewId(null);
    onChange();
  };

  const handleReject = () => {
    if (!rejectId) return;
    if (!rejectReason.trim()) {
      setRejectError("Rejection reason is required.");
      return;
    }
    rejectReimbursementRequest(rejectId, rejectReason);
    setRejectId(null);
    setRejectReason("");
    setRejectError("");
    setViewId(null);
    onChange();
  };

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
            className="h-8 w-48 pl-8 pr-2.5 text-xs rounded-lg border border-border bg-white focus:outline-none focus:ring-2 focus:ring-brand-300/50"
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
          value={category}
          onChange={setCategory}
          placeholder="All Categories"
          options={REIMBURSEMENT_CATEGORY_OPTIONS.map((d) => ({ value: d, label: d }))}
        />
        {mode === "history" && (
          <FilterSelect
            value={status}
            onChange={setStatus}
            placeholder="All Statuses"
            options={[
              { value: "approved", label: "Approved" },
              { value: "rejected", label: "Rejected" },
              { value: "cancelled", label: "Cancelled" },
            ]}
          />
        )}
        <div className="w-[140px]">
          <HrDateInput value={fromDate} onChange={setFromDate} aria-label="Claim from date" placeholder="From" />
        </div>
        <div className="w-[140px]">
          <HrDateInput value={toDate} onChange={setToDate} aria-label="Claim to date" placeholder="To" />
        </div>
      </div>

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b border-border text-left">
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Employee</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Employee ID</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Branch</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Department</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Claim Category</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Claim Date</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Claimed</th>
                {mode === "history" && (
                  <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Approved</th>
                )}
                {mode === "pending" ? (
                  <>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Purpose</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Applied On</th>
                  </>
                ) : (
                  <>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Actioned On</th>
                    <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Actioned By</th>
                  </>
                )}
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap">Status</th>
                <th className="px-3 py-2.5 font-semibold whitespace-nowrap w-28">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-3 py-10 text-center text-muted-foreground">
                    {mode === "pending"
                      ? "No pending reimbursement requests."
                      : "No reimbursement history matches filters."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-3 py-2 font-medium whitespace-nowrap">{r.employeeName}</td>
                    <td className="px-3 py-2 font-mono text-brand-700 whitespace-nowrap">{r.employeeCode}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.branchLabel}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.department}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{r.claimCategory}</td>
                    <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.claimDate)}</td>
                    <td className="px-3 py-2 whitespace-nowrap tabular-nums">{formatInr(r.claimedAmount)}</td>
                    {mode === "history" && (
                      <td className="px-3 py-2 whitespace-nowrap tabular-nums">
                        {formatInr(r.approvedAmount)}
                      </td>
                    )}
                    {mode === "pending" ? (
                      <>
                        <td className="px-3 py-2 max-w-[160px] truncate" title={r.purpose}>
                          {r.purpose}
                        </td>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.appliedOn)}</td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.actionedOn)}</td>
                        <td className="px-3 py-2 whitespace-nowrap">{r.actionedBy || "—"}</td>
                      </>
                    )}
                    <td className="px-3 py-2">
                      <RequestStatusChip status={r.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-0.5">
                        <IconActionBtn label="View Request" onClick={() => setViewId(r.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </IconActionBtn>
                        {mode === "pending" && (
                          <>
                            <IconActionBtn
                              label="Approve Claim"
                              tone="success"
                              onClick={() => openApprove(r)}
                            >
                              <Check className="w-3.5 h-3.5" />
                            </IconActionBtn>
                            <IconActionBtn
                              label="Reject Claim"
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
                ))
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

      <Sheet open={!!viewRec} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Reimbursement Request</SheetTitle>
            <SheetDescription>
              {viewRec ? `${viewRec.employeeName} · ${viewRec.claimCategory}` : ""}
            </SheetDescription>
          </SheetHeader>
          {viewRec && (
            <SheetBody className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <DetailRow label="Employee" value={viewRec.employeeName} />
                <DetailRow label="Employee ID" value={viewRec.employeeCode} />
                <DetailRow label="Department" value={viewRec.department} />
                <DetailRow label="Branch" value={viewRec.branchLabel} />
                <DetailRow label="Claim Category" value={viewRec.claimCategory} />
                <DetailRow label="Claim Date" value={formatDateDisplay(viewRec.claimDate)} />
                <DetailRow label="Claimed Amount" value={formatInr(viewRec.claimedAmount)} />
                <DetailRow label="Approved Amount" value={formatInr(viewRec.approvedAmount)} />
                <DetailRow label="Applied On" value={formatDateDisplay(viewRec.appliedOn)} />
                <DetailRow label="Status" value={<RequestStatusChip status={viewRec.status} />} />
              </div>
              <DetailRow label="Purpose / Description" value={viewRec.purpose} />
              <div className="rounded-lg border border-dashed border-border bg-muted/10 p-3">
                <p className="text-[11px] font-medium text-muted-foreground mb-1">Receipt / Attachment</p>
                <p className="text-xs text-foreground">
                  {viewRec.receiptFileName || "No file attached"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Filename preview only — file storage is not connected.
                </p>
              </div>
              {viewRec.approvalComment && (
                <DetailRow label="Approval Comment" value={viewRec.approvalComment} />
              )}
              {viewRec.rejectionReason && (
                <DetailRow label="Rejection Reason" value={viewRec.rejectionReason} />
              )}
            </SheetBody>
          )}
          {viewRec?.status === "pending" && (
            <SheetFooter>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setViewId(null)}>
                Close
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs text-red-600 border-red-200 hover:bg-red-50"
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
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => openApprove(viewRec)}
              >
                Approve
              </Button>
            </SheetFooter>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={!!approveRec} onOpenChange={(o) => !o && setApproveId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Approve reimbursement</DialogTitle>
            <DialogDescription className="text-xs">
              {approveRec
                ? `${approveRec.employeeName} · Claimed ${formatInr(approveRec.claimedAmount)}`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <div className="space-y-1.5">
              <label className="text-xs font-medium">
                Approved Amount <span className="text-red-500">*</span>
              </label>
              <Input
                value={approvedAmount}
                onChange={(e) => {
                  setApprovedAmount(e.target.value);
                  setApproveError("");
                }}
                inputMode="decimal"
                className="h-9 text-sm"
                placeholder="0"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Approval Comment</label>
              <textarea
                value={approvalComment}
                onChange={(e) => setApprovalComment(e.target.value)}
                rows={2}
                className="w-full text-xs rounded-lg border border-border px-2.5 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-brand-300/50"
                placeholder="Optional comment…"
              />
            </div>
            {approveError && <p className="text-xs text-red-500">{approveError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setApproveId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleApprove}
            >
              Approve
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectRec} onOpenChange={(o) => !o && setRejectId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-base">Reject reimbursement</DialogTitle>
            <DialogDescription className="text-xs">
              {rejectRec
                ? `${rejectRec.employeeName} · ${rejectRec.claimCategory}`
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
                "w-full text-xs rounded-lg border border-border px-2.5 py-2 resize-none",
                "focus:outline-none focus:ring-2 focus:ring-brand-300/50",
                rejectError && "border-red-400",
              )}
              placeholder="Enter reason for rejection…"
            />
            {rejectError && <p className="text-xs text-red-500">{rejectError}</p>}
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRejectId(null)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white"
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
