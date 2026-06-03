"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { Button } from "@/components/ui/button";
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
import { Plus, MoreVertical, Eye, Edit2, CheckCircle, XCircle, Receipt } from "lucide-react";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { HrApprovalModal, type HrApprovalAction } from "../../components/HrApprovalModal";
import {
  approveClaim,
  getTadaClaimById,
  loadTadaClaims,
  rejectClaim,
  saveTadaClaims,
  submitClaim,
  type TadaClaim,
} from "./tada-claim-data";

export default function TadaClaimsPageClient() {
  const router = useRouter();
  const [records, setRecords] = useState<TadaClaim[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [approvalTarget, setApprovalTarget] = useState<TadaClaim | null>(null);
  const [approvalAction, setApprovalAction] = useState<HrApprovalAction>("approve");

  const refresh = useCallback(() => setRecords(loadTadaClaims()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

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
    if (statusFilter !== "all") r = r.filter((c) => c.status === statusFilter);
    return r.sort((a, b) => b.claimDate.localeCompare(a.claimDate));
  }, [records, search, statusFilter]);

  const openApproval = (claim: TadaClaim, action: HrApprovalAction) => {
    setApprovalTarget(claim);
    setApprovalAction(action);
  };

  const handleApproval = (remarks: string) => {
    if (!approvalTarget) return;
    const updated =
      approvalAction === "approve"
        ? approveClaim(approvalTarget, remarks)
        : rejectClaim(approvalTarget, remarks);
    saveTadaClaims(records.map((c) => (c.id === updated.id ? updated : c)));
    setApprovalTarget(null);
    refresh();
  };

  const handleSubmit = (id: number) => {
    const claim = getTadaClaimById(id);
    if (!claim || claim.status !== "draft") return;
    const submitted = submitClaim(claim);
    saveTadaClaims(records.map((c) => (c.id === id ? submitted : c)));
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-3">
        <PageHeader
          title="TA/DA Claims"
          description="Create and submit travel claims based on Sales Force policy configuration."
          icon={Receipt}
          breadcrumbs={[
            { label: "HR", href: "/hr/attendance" },
            { label: "TA/DA Claims" },
          ]}
          actions={
            <Button
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              onClick={() => router.push("/hr/claims/tada/new")}
            >
              <Plus className="w-3.5 h-3.5" /> New Claim
            </Button>
          }
        />

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search claim no., employee…"
        >
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 w-[160px] text-xs bg-white">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All Status</SelectItem>
              <SelectItem value="draft" className="text-xs">Draft</SelectItem>
              <SelectItem value="submitted" className="text-xs">Submitted</SelectItem>
              <SelectItem value="pending_approval" className="text-xs">Pending Approval</SelectItem>
              <SelectItem value="approved" className="text-xs">Approved</SelectItem>
              <SelectItem value="rejected" className="text-xs">Rejected</SelectItem>
              <SelectItem value="paid" className="text-xs">Paid</SelectItem>
            </SelectContent>
          </Select>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto max-h-[calc(100vh-280px)]">
            <table className="w-full text-table">
              <thead className="sticky top-0 z-10 bg-white border-b border-border">
                <tr>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Claim No.</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Employee</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Period</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Claim Date</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Amount</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground w-16">Actions</th>
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-3 py-12 text-center text-xs text-muted-foreground">
                      No claims found.
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
                      <td className="px-3 py-2 text-xs text-muted-foreground">{c.claimDate}</td>
                      <td className="px-3 py-2 text-xs font-medium">₹{c.claimAmount.toLocaleString("en-IN")}</td>
                      <td className="px-3 py-2">
                        <HrStatusBadge status={c.status} />
                      </td>
                      <td className="px-3 py-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted">
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem asChild>
                              <Link href={`/hr/claims/tada/${c.id}`} className="text-xs gap-2">
                                <Eye className="w-3.5 h-3.5" /> View
                              </Link>
                            </DropdownMenuItem>
                            {(c.status === "draft" || c.status === "rejected") && (
                              <DropdownMenuItem asChild>
                                <Link href={`/hr/claims/tada/${c.id}/edit`} className="text-xs gap-2">
                                  <Edit2 className="w-3.5 h-3.5" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {c.status === "draft" && (
                              <DropdownMenuItem className="text-xs" onClick={() => handleSubmit(c.id)}>
                                Submit for Approval
                              </DropdownMenuItem>
                            )}
                            {c.status === "pending_approval" && (
                              <>
                                <DropdownMenuItem
                                  className="text-xs gap-2 text-emerald-700"
                                  onClick={() => openApproval(c, "approve")}
                                >
                                  <CheckCircle className="w-3.5 h-3.5" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  className="text-xs gap-2 text-red-600"
                                  onClick={() => openApproval(c, "reject")}
                                >
                                  <XCircle className="w-3.5 h-3.5" /> Reject
                                </DropdownMenuItem>
                              </>
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

      <HrApprovalModal
        open={!!approvalTarget}
        onClose={() => setApprovalTarget(null)}
        title={approvalAction === "approve" ? "Approve TA/DA Claim" : "Reject TA/DA Claim"}
        referenceLabel="Claim No."
        referenceValue={approvalTarget?.claimNumber ?? ""}
        employeeValue={approvalTarget?.employeeName}
        action={approvalAction}
        onConfirm={handleApproval}
      />
    </AppLayout>
  );
}
