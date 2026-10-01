"use client";

import React, { memo } from "react";
import { CheckSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CountBadge } from "@/components/ui/StatusBadge";
import { useClientMounted } from "@/lib/use-client-mounted";
import { countPendingAccountsApprovals } from "@/lib/accounts/accounts-approvals-queue";
import { countPendingTravelClaimApprovals } from "@/app/(app)/employee/claims/travel-claim-approval";
import { HR_TRAVEL_CLAIMS_EVENT } from "@/app/(app)/employee/claims/travel-claim-data";
import { countPendingTravelRequestApprovals } from "@/app/(app)/employee/travel-requests/travel-request-approval";
import { HR_TRAVEL_REQUESTS_EVENT } from "@/app/(app)/employee/travel-requests/travel-request-data";

const OTHER_PENDING_APPROVALS = [
  { label: "Purchase Orders", count: 4, href: "/procurement/purchase-orders" },
  { label: "TA/DA Claims", count: 5, href: "/dashboard" },
  { label: "Attendance Regularization", count: 3, href: "/dashboard" },
  { label: "Expense Claims", count: 7, href: "/hr/requests" },
  { label: "Leave Requests", count: 2, href: "/hr/requests" },
];

function ApprovalsButtonInner() {
  const mounted = useClientMounted();
  const [accountsPending, setAccountsPending] = React.useState(0);
  const [travelPending, setTravelPending] = React.useState(0);
  const [travelReqPending, setTravelReqPending] = React.useState(0);

  React.useEffect(() => {
    if (!mounted) return;
    let cancelled = false;
    const run = () => {
      if (cancelled) return;
      setAccountsPending(countPendingAccountsApprovals());
      setTravelPending(countPendingTravelClaimApprovals());
      setTravelReqPending(countPendingTravelRequestApprovals());
    };
    run();
    window.addEventListener(HR_TRAVEL_CLAIMS_EVENT, run);
    window.addEventListener(HR_TRAVEL_REQUESTS_EVENT, run);
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(run, { timeout: 3000 });
      return () => {
        cancelled = true;
        window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, run);
        window.removeEventListener(HR_TRAVEL_REQUESTS_EVENT, run);
        window.cancelIdleCallback(id);
      };
    }
    const t = window.setTimeout(run, 500);
    return () => {
      cancelled = true;
      window.removeEventListener(HR_TRAVEL_CLAIMS_EVENT, run);
      window.removeEventListener(HR_TRAVEL_REQUESTS_EVENT, run);
      window.clearTimeout(t);
    };
  }, [mounted]);
  const otherPending = OTHER_PENDING_APPROVALS.reduce((s, a) => s + a.count, 0);
  const totalPending = accountsPending + otherPending + travelPending + travelReqPending;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="relative flex items-center gap-1.5 h-9 px-3 rounded-lg text-[13px] font-medium text-foreground hover:bg-brand-50/40 hover:text-brand-700 transition-colors whitespace-nowrap border-l-2 border-transparent"
        >
          <CheckSquare className="w-4 h-4 text-muted-foreground" />
          <span className="hidden sm:inline">Approvals</span>
          {totalPending > 0 && <CountBadge count={totalPending} variant="amber" />}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-64 p-3 rounded-modal">
        <p className="text-xs font-semibold text-foreground mb-2.5">Pending Approvals</p>
        <div className="space-y-0.5">
          <a
            href="/approvals"
            className="flex items-center justify-between px-2.5 py-2.5 rounded-lg border-l-2 border-transparent hover:bg-muted/50 hover:border-brand-400 transition-all cursor-pointer group"
          >
            <span className="text-xs text-foreground group-hover:font-medium">Accounts Vouchers</span>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-0.5 flex-shrink-0">
              {accountsPending}
            </span>
          </a>
          <a
            href="/hr/travel-requests"
            className="flex items-center justify-between px-2.5 py-2.5 rounded-lg border-l-2 border-transparent hover:bg-muted/50 hover:border-brand-400 transition-all cursor-pointer group"
          >
            <span className="text-xs text-foreground group-hover:font-medium">Travel Requests</span>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-0.5 flex-shrink-0">
              {travelReqPending}
            </span>
          </a>
          <a
            href="/hr/reimbursements"
            className="flex items-center justify-between px-2.5 py-2.5 rounded-lg border-l-2 border-transparent hover:bg-muted/50 hover:border-brand-400 transition-all cursor-pointer group"
          >
            <span className="text-xs text-foreground group-hover:font-medium">Travel / Expense Claims</span>
            <span className="text-xs font-bold text-brand-700 bg-brand-50 border border-brand-200 rounded-md px-2 py-0.5 flex-shrink-0">
              {travelPending}
            </span>
          </a>
          {OTHER_PENDING_APPROVALS.map((a) => (
            <a
              key={a.label}
              href={a.href}
              className="flex items-center justify-between px-2.5 py-2.5 rounded-lg border-l-2 border-transparent hover:bg-muted/50 hover:border-brand-400 transition-all cursor-pointer group"
            >
              <span className="text-xs text-foreground group-hover:font-medium">{a.label}</span>
              <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5 flex-shrink-0">
                {a.count}
              </span>
            </a>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const ApprovalsButton = memo(ApprovalsButtonInner);
