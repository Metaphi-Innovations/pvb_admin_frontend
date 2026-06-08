"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
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
import { Input } from "@/components/ui/input";
import { MoreVertical, Eye, CheckCircle, XCircle, RotateCcw, Clock, History, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { TadaClaimReviewDrawer } from "./components/TadaClaimReviewDrawer";
import { getActiveHrEmployees } from "../../employees/employee-master-data";
import {
  getRoleDisplayName,
  getSalesForceRoleIds,
  loadClaimCategories,
} from "../../sales-force-policy/tada-policy-data";
import { getClaimPolicySnapshot, getClaimRoleName, POLICY_STATUS_FILTER_OPTIONS } from "./tada-claim-policy";
import {
  APPROVAL_STATUS_LABEL,
  applyHrClaimFilters,
  filterClaimsByHrTab,
  hrApproveClaim,
  hrHoldClaim,
  hrRejectClaim,
  hrSendBackClaim,
  HR_CLAIM_LIST_TABS,
  HR_STATUS_LABEL,
  loadTadaClaims,
  saveTadaClaims,
  type HrClaimListTab,
  type TadaClaim,
} from "./tada-claim-data";

const TAB_IDS = new Set<string>(HR_CLAIM_LIST_TABS.map((t) => t.id));

function formatDate(iso?: string) {
  if (!iso) return "—";
  return iso.slice(0, 10);
}

export default function TadaClaimsPageClient() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [records, setRecords] = useState<TadaClaim[]>([]);
  const [activeTab, setActiveTab] = useState<HrClaimListTab>("pending_hr");
  const [search, setSearch] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [travelFilter, setTravelFilter] = useState("all");
  const [policyFilter, setPolicyFilter] = useState("all");
  const [approvalFilter, setApprovalFilter] = useState("all");
  const [hrStatusFilter, setHrStatusFilter] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [reviewClaim, setReviewClaim] = useState<TadaClaim | null>(null);
  const [viewOnly, setViewOnly] = useState(false);

  const employees = getActiveHrEmployees();
  const sfRoleIds = getSalesForceRoleIds();
  const categories = loadClaimCategories().filter((c) => c.status === "active");

  const refresh = useCallback(() => setRecords(loadTadaClaims()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const q = searchParams.get("tab");
    if (q && TAB_IDS.has(q)) setActiveTab(q as HrClaimListTab);
  }, [searchParams]);

  const goToTab = (tab: HrClaimListTab) => {
    setActiveTab(tab);
    router.replace(`${pathname}?tab=${tab}`);
  };

  const persist = (updated: TadaClaim) => {
    saveTadaClaims(records.map((c) => (c.id === updated.id ? updated : c)));
    setReviewClaim(null);
    refresh();
  };

  const openReview = (claim: TadaClaim, readOnly = false) => {
    setReviewClaim(claim);
    setViewOnly(readOnly);
  };

  const visible = useMemo(() => {
    let r = filterClaimsByHrTab(records, activeTab);
    r = applyHrClaimFilters(r, {
      search,
      employeeId: employeeFilter === "all" ? "all" : Number(employeeFilter),
      roleId: roleFilter === "all" ? "all" : Number(roleFilter),
      claimCategory: categoryFilter,
      travelType: travelFilter,
      approvalStatus: approvalFilter,
      hrStatus: hrStatusFilter,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
    });
    if (policyFilter !== "all") {
      r = r.filter((c) => getClaimPolicySnapshot(c).policyStatus === policyFilter);
    }
    return r.sort((a, b) => (b.updatedAt ?? "").localeCompare(a.updatedAt ?? ""));
  }, [records, activeTab, search, employeeFilter, roleFilter, categoryFilter, travelFilter, policyFilter, approvalFilter, hrStatusFilter, dateFrom, dateTo]);

  const tabCounts = useMemo(
    () =>
      Object.fromEntries(
        HR_CLAIM_LIST_TABS.map((t) => [t.id, filterClaimsByHrTab(records, t.id).length]),
      ) as Record<HrClaimListTab, number>,
    [records],
  );

  const activeTabMeta = HR_CLAIM_LIST_TABS.find((t) => t.id === activeTab);

  return (
    <AppLayout>
      <div className="max-w-[1600px] mx-auto space-y-3">
        <PageHeader
          title="TA/DA Claims"
          description="HR monitoring and control for Sales Force TA/DA claims submitted via mobile. Review policy validation, approval trail, and forward HR-approved claims to Payments."
          icon={Receipt}
          breadcrumbs={[
            { label: "HR", href: "/hr/sales-force-attendance" },
            { label: "TA/DA Claims", href: "/hr/claims/tada" },
            ...(activeTabMeta ? [{ label: activeTabMeta.label }] : []),
          ]}
        />

        <div className="flex flex-wrap gap-1 border-b pb-1">
          {HR_CLAIM_LIST_TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => goToTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium rounded-t-md border-b-2 -mb-px transition-colors",
                activeTab === t.id
                  ? "border-brand-600 text-brand-700 bg-brand-50/50"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
              )}
            >
              {t.label}
              <span className="ml-1.5 text-[10px] text-muted-foreground">({tabCounts[t.id]})</span>
            </button>
          ))}
        </div>

        <ModuleFiltersBar searchValue={search} onSearchChange={setSearch} searchPlaceholder="Search claim no., employee, code…">
          <Select value={employeeFilter} onValueChange={setEmployeeFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white"><SelectValue placeholder="Employee" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Employees</SelectItem>
              {employees.map((e) => <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.employeeName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="h-8 w-[120px] text-xs bg-white"><SelectValue placeholder="Role" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Roles</SelectItem>
              {sfRoleIds.map((id) => <SelectItem key={id} value={String(id)} className="text-xs">{getRoleDisplayName(id)}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="h-8 w-[140px] text-xs bg-white"><SelectValue placeholder="Category" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Categories</SelectItem>
              {categories.map((c) => <SelectItem key={c.id} value={c.claimCategoryName} className="text-xs">{c.claimCategoryName}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={travelFilter} onValueChange={setTravelFilter}>
            <SelectTrigger className="h-8 w-[110px] text-xs bg-white"><SelectValue placeholder="Travel" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Travel</SelectItem>
              <SelectItem value="Local" className="text-xs">Local</SelectItem>
              <SelectItem value="Outstation" className="text-xs">Outstation</SelectItem>
            </SelectContent>
          </Select>
          <Select value={policyFilter} onValueChange={setPolicyFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white"><SelectValue placeholder="Policy" /></SelectTrigger>
            <SelectContent>
              {POLICY_STATUS_FILTER_OPTIONS.map((p) => <SelectItem key={p} value={p} className="text-xs">{p === "all" ? "All Policy" : p}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={approvalFilter} onValueChange={setApprovalFilter}>
            <SelectTrigger className="h-8 w-[150px] text-xs bg-white"><SelectValue placeholder="Approval" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Approval</SelectItem>
              {Object.entries(APPROVAL_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={hrStatusFilter} onValueChange={setHrStatusFilter}>
            <SelectTrigger className="h-8 w-[130px] text-xs bg-white"><SelectValue placeholder="HR Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All HR Status</SelectItem>
              {Object.entries(HR_STATUS_LABEL).map(([k, v]) => <SelectItem key={k} value={k} className="text-xs">{v}</SelectItem>)}
            </SelectContent>
          </Select>
          <Input type="date" className="h-8 w-[130px] text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} title="From date" />
          <Input type="date" className="h-8 w-[130px] text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} title="To date" />
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-340px)]">
            <table className="w-full text-table min-w-[1400px]">
              <thead className="sticky top-0 z-10 bg-white border-b border-border">
                <tr>
                  {["Claim No", "Employee Name", "Employee Code", "Role", "Reporting Manager", "Travel Type", "Claim Category", "Claim Amount", "Eligible Amount", "Policy Status", "Approval Status", "HR Status", "Submitted Date", "Last Updated", "Actions"].map((h) => (
                    <th key={h} className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={15} className="px-3 py-12 text-center text-xs text-muted-foreground">
                      No claims in {activeTabMeta?.label ?? "this view"}.
                    </td>
                  </tr>
                ) : (
                  visible.map((c) => {
                    const policy = getClaimPolicySnapshot(c);
                    return (
                      <tr key={c.id} className="border-b border-border/50 hover:bg-brand-50/30">
                        <td className="px-2 py-2 text-xs font-mono font-medium whitespace-nowrap">{c.claimNumber}</td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">{c.employeeName}</td>
                        <td className="px-2 py-2 text-xs font-mono text-muted-foreground">{c.employeeCode}</td>
                        <td className="px-2 py-2 text-xs whitespace-nowrap">{getClaimRoleName(c)}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">{c.reportingManager}</td>
                        <td className="px-2 py-2 text-xs">{c.travelTypeLabel ?? "—"}</td>
                        <td className="px-2 py-2 text-xs">{c.claimCategoryName ?? "—"}</td>
                        <td className="px-2 py-2 text-xs font-medium">₹{c.claimAmount.toLocaleString("en-IN")}</td>
                        <td className="px-2 py-2 text-xs text-emerald-700">₹{policy.eligibleAmount.toLocaleString("en-IN")}</td>
                        <td className="px-2 py-2">
                          <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded", policy.policyStatus === "Compliant" ? "bg-emerald-50 text-emerald-700" : policy.policyStatus === "Non-Compliant" ? "bg-red-50 text-red-700" : "bg-amber-50 text-amber-700")}>
                            {policy.policyStatus}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-[10px] text-muted-foreground whitespace-nowrap">{APPROVAL_STATUS_LABEL[c.approvalStatus]}</td>
                        <td className="px-2 py-2"><HrStatusBadge status={c.hrStatus} label={HR_STATUS_LABEL[c.hrStatus]} /></td>
                        <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.submittedAt)}</td>
                        <td className="px-2 py-2 text-xs text-muted-foreground whitespace-nowrap">{formatDate(c.updatedAt)}</td>
                        <td className="px-2 py-2">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                                <MoreVertical className="w-3.5 h-3.5" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem className="text-xs gap-2" onClick={() => openReview(c, true)}>
                                <Eye className="w-3.5 h-3.5" /> View
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs gap-2" onClick={() => openReview(c, true)}>
                                <History className="w-3.5 h-3.5" /> View Approval Trail
                              </DropdownMenuItem>
                              {(c.hrStatus === "pending_hr_review" || c.hrStatus === "on_hold") && (
                                <>
                                  <DropdownMenuItem className="text-xs gap-2 text-emerald-700" onClick={() => openReview(c, false)}>
                                    <CheckCircle className="w-3.5 h-3.5" /> Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs gap-2 text-red-600" onClick={() => openReview(c, false)}>
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs gap-2 text-amber-700" onClick={() => openReview(c, false)}>
                                    <RotateCcw className="w-3.5 h-3.5" /> Send Back
                                  </DropdownMenuItem>
                                  <DropdownMenuItem className="text-xs gap-2 text-blue-700" onClick={() => openReview(c, false)}>
                                    <Clock className="w-3.5 h-3.5" /> Hold
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <TadaClaimReviewDrawer
        open={!!reviewClaim}
        claim={reviewClaim}
        viewOnly={viewOnly}
        onClose={() => setReviewClaim(null)}
        onHrApprove={(remarks) => reviewClaim && persist(hrApproveClaim(reviewClaim, remarks))}
        onHrReject={(remarks) => reviewClaim && persist(hrRejectClaim(reviewClaim, remarks))}
        onHrSendBack={(remarks) => reviewClaim && persist(hrSendBackClaim(reviewClaim, remarks))}
        onHrHold={(remarks) => reviewClaim && persist(hrHoldClaim(reviewClaim, remarks))}
      />
    </AppLayout>
  );
}
