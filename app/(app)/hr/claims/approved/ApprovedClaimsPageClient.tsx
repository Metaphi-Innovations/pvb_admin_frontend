"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { BadgeCheck, ChevronDown, ChevronsUpDown, Eye, MoreVertical, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { PAYMENT_STATUS_OPTIONS } from "@/lib/hr/config";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import {
  getApprovedClaimsForPayment,
  loadTadaClaims,
  saveTadaClaims,
  sendClaimToAccounts,
  type TadaClaim,
} from "../tada/tada-claim-data";

function SortTh({
  label,
  colKey,
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  colKey: string;
  sortKey: string;
  sortDir: string;
  onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground cursor-pointer whitespace-nowrap",
        active && "text-brand-700",
      )}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {active ? (
          <ChevronDown className={cn("w-3 h-3", sortDir === "desc" && "rotate-180")} />
        ) : (
          <ChevronsUpDown className="w-3 h-3 opacity-40" />
        )}
      </span>
    </th>
  );
}

export default function ApprovedClaimsPageClient() {
  const [records, setRecords] = useState<TadaClaim[]>([]);
  const [search, setSearch] = useState("");
  const [paymentFilter, setPaymentFilter] = useState("all");
  const [sortKey, setSortKey] = useState("approvedAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const refresh = useCallback(() => setRecords(getApprovedClaimsForPayment()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (c) =>
          c.claimNumber.toLowerCase().includes(q) ||
          c.employeeName.toLowerCase().includes(q),
      );
    }
    if (paymentFilter !== "all") r = r.filter((c) => c.paymentStatus === paymentFilter);
    r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
    return r;
  }, [records, search, paymentFilter, sortKey, sortDir]);

  const handleSendToAccounts = (id: number) => {
    const claim = loadTadaClaims().find((c) => c.id === id);
    if (!claim || claim.paymentStatus !== "pending_payment") return;
    const updated = sendClaimToAccounts(claim);
    saveTadaClaims(loadTadaClaims().map((c) => (c.id === id ? updated : c)));
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-3">
        <PageHeader
          title="Approved Claims"
          description="Approved TA/DA claims ready for Accounts payment processing. HR does not post payments here."
          icon={BadgeCheck}
          breadcrumbs={[
            { label: "HR", href: "/hr/attendance" },
            { label: "Approved Claims" },
          ]}
        />

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search claim no., employee…"
        >
          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
              <SelectValue placeholder="Payment Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Payment Status
              </SelectItem>
              {PAYMENT_STATUS_OPTIONS.map((s) => (
                <SelectItem key={s.value} value={s.value} className="text-xs">
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-table">
              <thead className="sticky top-0 z-10 bg-white border-b border-border">
                <tr>
                  <SortTh label="Claim No." colKey="claimNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Employee" colKey="employeeName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    Claim Period
                  </th>
                  <SortTh label="Claim Amount" colKey="claimAmount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Approved Amount" colKey="approvedAmount" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Approved By" colKey="approvedBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Approved Date" colKey="approvedAt" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    Payment Status
                  </th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground w-16">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-3 py-12 text-center text-xs text-muted-foreground">
                      No approved claims found.
                    </td>
                  </tr>
                ) : (
                  visible.map((c) => (
                    <tr key={c.id} className="border-b border-border/50 hover:bg-brand-50/30">
                      <td className="px-3 py-2 text-xs font-mono font-medium">{c.claimNumber}</td>
                      <td className="px-3 py-2 text-xs">{c.employeeName}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">
                        {c.periodFrom} — {c.periodTo}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium">
                        ₹{c.claimAmount.toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-emerald-700">
                        ₹{(c.approvedAmount || c.claimAmount).toLocaleString("en-IN")}
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.approvedBy ?? "—"}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.approvedAt ?? "—"}</td>
                      <td className="px-3 py-2">
                        <HrStatusBadge status={c.paymentStatus} />
                      </td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button
                              type="button"
                              className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem asChild>
                              <Link href={`/hr/claims/tada/${c.id}`} className="text-xs gap-2">
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            {c.paymentStatus === "pending_payment" && (
                              <DropdownMenuItem
                                className="text-xs gap-2 text-brand-700"
                                onClick={() => handleSendToAccounts(c.id)}
                              >
                                <Send className="w-3.5 h-3.5" /> Send to Accounts
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
