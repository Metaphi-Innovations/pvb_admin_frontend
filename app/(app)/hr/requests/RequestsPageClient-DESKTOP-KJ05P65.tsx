"use client";

import React, { useEffect, useState } from "react";
import { ClipboardList } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HrPageShell } from "@/app/(app)/hr/components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { loadHrRequests, type LeaveRequestRecord } from "./requests-data";
import { LeaveRequestsPanel } from "./components/LeaveRequestsPanel";

/**
 * Admin Leave Requests — Pending Approvals + History only.
 * Reimbursement review lives under Reimbursements (canonical).
 */
export default function RequestsPageClient() {
  const [leave, setLeave] = useState<LeaveRequestRecord[]>([]);

  const reload = () => {
    setLeave(loadHrRequests().leave);
  };

  useEffect(() => {
    reload();
  }, []);

  const pendingCount = leave.filter((r) => r.status === "pending").length;

  return (
    <TooltipProvider delayDuration={200}>
      <HrPageShell
        title="Leave Requests"
        description="HR leave approval inbox for all employees. Apply leave from Employee Profile → Leave & Balance."
        icon={ClipboardList}
        breadcrumbs={hrBreadcrumb({ label: "Requests" }, { label: "Leave Requests" })}
        badge={
          pendingCount > 0 ? (
            <span className="inline-flex items-center h-5 px-1.5 rounded-full text-[10px] font-bold bg-brand-50 text-brand-700 border border-brand-200">
              {pendingCount} pending
            </span>
          ) : null
        }
        maxWidthClass="max-w-[1440px]"
      >
        <LeaveRequestsPanel records={leave} onChange={reload} />
      </HrPageShell>
    </TooltipProvider>
  );
}
