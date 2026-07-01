"use client";

import React, { memo, useMemo } from "react";
import { CheckSquare } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CountBadge } from "@/components/ui/StatusBadge";
import { useClientMounted } from "@/lib/use-client-mounted";
import { countPendingAccountsApprovals } from "@/lib/accounts/accounts-approvals-queue";

const OTHER_PENDING_APPROVALS = [
  { label: "Purchase Orders", count: 4, href: "/procurement/purchase-orders" },
  { label: "TA/DA Claims", count: 5, href: "/dashboard" },
  { label: "Attendance Regularization", count: 3, href: "/dashboard" },
  { label: "Expense Claims", count: 7, href: "/hr/expenses?status=pending" },
  { label: "Leave Requests", count: 2, href: "/hr/leaves?status=pending" },
];

function ApprovalsButtonInner() {
  const mounted = useClientMounted();
  const accountsPending = useMemo(
    () => (mounted ? countPendingAccountsApprovals() : 0),
    [mounted],
  );
  const otherPending = OTHER_PENDING_APPROVALS.reduce((s, a) => s + a.count, 0);
  const totalPending = accountsPending + otherPending;

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
