"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Plane, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { SearchSelect } from "@/app/(app)/employee/claims/claim-ui";
import { APPROVER_OPTIONS, type ApproverRole } from "@/app/(app)/hr/settings/reimbursement/travel-policy/travel-policy-data";
import {
  loadReviewerContext,
  setReviewerContext,
  type ReviewerContext,
} from "@/app/(app)/employee/claims/travel-claim-approval";
import {
  countPendingTravelRequestApprovals,
  currentRequestApproverLabel,
} from "@/app/(app)/employee/travel-requests/travel-request-approval";
import {
  HR_TRAVEL_REQUESTS_EVENT,
  formatInr,
  formatRequestDate,
  getTravelRequestById,
  loadTravelRequests,
  travelPeriodLabel,
  type EmployeeTravelRequest,
  type TravelRequestStatus,
} from "@/app/(app)/employee/travel-requests/travel-request-data";
import { TravelRequestReviewSheet } from "@/app/(app)/employee/travel-requests/TravelRequestReviewSheet";
import { TravelRequestStatusPill } from "@/app/(app)/employee/travel-requests/travel-request-ui";

type TabId = "pending" | "approved" | "rejected" | "returned" | "all";

const TABS: { id: TabId; label: string }[] = [
  { id: "pending", label: "Pending Review" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "returned", label: "Returned" },
  { id: "all", label: "All" },
];

function inTab(r: EmployeeTravelRequest, tab: TabId): boolean {
  if (tab === "pending") return r.status === "submitted" || r.status === "under_review";
  if (tab === "approved") return r.status === "approved";
  if (tab === "rejected") return r.status === "rejected" || r.status === "cancelled";
  if (tab === "returned") return r.status === "returned";
  return r.status !== "draft";
}

export default function TravelRequestsClient() {
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<EmployeeTravelRequest[]>([]);
  const [tab, setTab] = useState<TabId>("pending");
  const [q, setQ] = useState("");
  const [reviewer, setReviewer] = useState<ReviewerContext>({ role: "reporting_manager" });
  const [openId, setOpenId] = useState<number | null>(null);

  const refresh = () => setRows(loadTravelRequests());

  useEffect(() => {
    setReviewer(loadReviewerContext());
    refresh();
    const onEvt = () => refresh();
    window.addEventListener(HR_TRAVEL_REQUESTS_EVENT, onEvt);
    return () => window.removeEventListener(HR_TRAVEL_REQUESTS_EVENT, onEvt);
  }, []);

  useEffect(() => {
    const id = Number(searchParams.get("id") || "");
    if (Number.isFinite(id) && id > 0) setOpenId(id);
  }, [searchParams]);

  const openReq = openId ? getTravelRequestById(openId) ?? rows.find((r) => r.id === openId) ?? null : null;
  const pending = countPendingTravelRequestApprovals();

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (!inTab(r, tab)) return false;
      if (n) {
        const blob = `${r.requestNo} ${r.employeeName} ${r.destination} ${r.travelMode}`.toLowerCase();
        if (!blob.includes(n)) return false;
      }
      return true;
    });
  }, [rows, tab, q]);

  return (
    <HrPageShell
      breadcrumbs={hrBreadcrumb({ label: "Travel Requests" })}
      title="Travel Requests"
      description="Review pre-travel / Ex-HQ approval requests."
      icon={Plane}
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
      <div className="grid grid-cols-3 gap-3 mb-3">
        <div className="bg-white rounded-xl border border-border p-3 shadow-sm">
          <p className="text-lg font-bold leading-none">{pending}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Pending</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-3 shadow-sm">
          <p className="text-lg font-bold leading-none">{rows.filter((r) => r.status === "approved").length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Approved</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-3 shadow-sm">
          <p className="text-lg font-bold leading-none">{rows.filter((r) => r.status === "returned").length}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5">Returned</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
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

      <div className="relative mb-3 max-w-sm">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search request, employee, destination…"
          className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg"
        />
      </div>

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Request No.", "Employee", "Destination", "Period", "Mode", "Estimate", "Status", "Approver"].map((h) => (
                  <th key={h} className="px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-xs text-muted-foreground">
                    No travel requests in this view.
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r.id}
                    className="border-b border-border/60 hover:bg-muted/20 cursor-pointer"
                    onClick={() => setOpenId(r.id)}
                  >
                    <td className="px-4 py-2 font-mono text-xs font-semibold text-brand-700">{r.requestNo}</td>
                    <td className="px-4 py-2 text-xs">
                      {r.employeeName}
                      <span className="block text-[11px] text-muted-foreground">{r.employeeCode}</span>
                    </td>
                    <td className="px-4 py-2 text-xs">{r.destination}</td>
                    <td className="px-4 py-2 text-xs">{travelPeriodLabel(r)}</td>
                    <td className="px-4 py-2 text-xs">{r.travelMode || "—"}</td>
                    <td className="px-4 py-2 text-xs">{formatInr(r.snapshot?.estimatedTotal)}</td>
                    <td className="px-4 py-2">
                      <TravelRequestStatusPill status={r.status as TravelRequestStatus} />
                    </td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{currentRequestApproverLabel(r)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-2.5 border-t border-border bg-muted/20 text-[11px] text-muted-foreground">
          Showing {filtered.length} of {rows.filter((r) => r.status !== "draft").length} requests · Submitted on column uses request date {formatRequestDate(new Date().toISOString())}
        </div>
      </div>

      <TravelRequestReviewSheet req={openReq} reviewer={reviewer} onClose={() => setOpenId(null)} />
    </HrPageShell>
  );
}
