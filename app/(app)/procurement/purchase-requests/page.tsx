"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import {
  Plus,
  Search,
  MoreVertical,
  Eye,
  Edit2,
  Send,
  CheckCircle2,
  XCircle,
  ShoppingCart,
  ChevronDown,
  ChevronsUpDown,
} from "lucide-react";
import { StatusPill, Toast } from "../components/ProcurementUI";
import { PRApprovalModal, type PRApprovalAction } from "./components/PRApprovalModal";
import {
  type PRListStatus,
  type PurchaseRequest,
  loadPurchaseRequests,
  savePurchaseRequests,
  PR_STATUS_CFG,
  LIST_TAB_STATUSES,
  submitPR,
  approvePR,
  rejectPR,
} from "./pr-data";

type TabId = "all" | PRListStatus;

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All PR" },
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
];

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
        "px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground cursor-pointer select-none whitespace-nowrap",
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

export default function PurchaseRequestsPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseRequest[]>([]);
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("prDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [approvalOpen, setApprovalOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<PRApprovalAction>("approve");
  const [approvalTarget, setApprovalTarget] = useState<PurchaseRequest | null>(null);

  const refresh = useCallback(() => setRecords(loadPurchaseRequests()), []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const openApproval = (pr: PurchaseRequest, action: PRApprovalAction) => {
    setApprovalTarget(pr);
    setApprovalAction(action);
    setApprovalOpen(true);
  };

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const tabCounts = useMemo(() => {
    const c: Partial<Record<TabId, number>> = { all: records.length };
    LIST_TAB_STATUSES.forEach((s) => {
      c[s] = records.filter((r) => r.status === s).length;
    });
    return c;
  }, [records]);

  const visible = useMemo(() => {
    let r = [...records];
    if (tab !== "all") r = r.filter((x) => x.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (p) =>
          p.prNumber.toLowerCase().includes(q) ||
          p.requestedBy.toLowerCase().includes(q) ||
          p.remarks.toLowerCase().includes(q),
      );
    }
    return r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, tab, search, sortKey, sortDir]);

  const handleApprovalConfirm = (remarks: string) => {
    if (!approvalTarget) return;
    const updated =
      approvalAction === "approve"
        ? approvePR(approvalTarget, remarks || undefined)
        : rejectPR(approvalTarget, remarks);
    savePurchaseRequests(loadPurchaseRequests().map((p) => (p.id === updated.id ? updated : p)));
    setToast({
      msg: approvalAction === "approve" ? "PR approved." : "PR rejected.",
      type: "success",
    });
    refresh();
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-semibold text-foreground tracking-tight">Purchase Request</h1>
            <p className="text-xs text-muted-foreground mt-0.5">{records.length} requests</p>
          </div>
          <Link href="/procurement/purchase-requests/new">
            <Button size="sm" className="h-9 text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-1" /> Create PR
            </Button>
          </Link>
        </div>

        <div className="flex items-center gap-1 border-b border-border/60 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors",
                tab === t.id
                  ? "border-brand-600 text-brand-700"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {tabCounts[t.id] != null && (
                <span className={cn("ml-1.5 tabular-nums", tab === t.id ? "text-brand-600" : "opacity-60")}>
                  {tabCounts[t.id]}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search PR no., requester, remarks…"
            className="pl-9 h-9 text-sm bg-white border-border/70"
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[960px] text-sm">
              <thead className="bg-muted/20 border-b border-border/60">
                <tr>
                  <SortTh label="PR No." colKey="prNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Date" colKey="prDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Requested By" colKey="requestedBy" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Required By" colKey="requiredByDate" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Items</th>
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Created By</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Updated By</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-14 text-center text-sm text-muted-foreground">
                      No purchase requests found.
                    </td>
                  </tr>
                ) : (
                  visible.map((rec) => (
                    <tr
                      key={rec.id}
                      className="border-b border-border/40 last:border-0 hover:bg-muted/10 group cursor-pointer"
                      onClick={() => router.push(`/procurement/purchase-requests/${rec.id}`)}
                    >
                      <td className="px-3 py-2.5 font-mono text-[13px] font-semibold text-brand-700">
                        {rec.prNumber}
                      </td>
                      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{rec.prDate}</td>
                      <td className="px-3 py-2.5">{rec.requestedBy}</td>
                      <td className="px-3 py-2.5 text-muted-foreground tabular-nums">{rec.requiredByDate || "—"}</td>
                      <td className="px-3 py-2.5 text-muted-foreground">{rec.lines.length}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <StatusPill status={rec.status} config={PR_STATUS_CFG} />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{rec.createdBy}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{rec.updatedBy}</td>
                      <td className="px-2 py-2 text-right" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px]">Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/procurement/purchase-requests/${rec.id}`}>
                                <Eye className="w-3.5 h-3.5 mr-2" /> View
                              </Link>
                            </DropdownMenuItem>
                            {["draft", "rejected"].includes(rec.status) && (
                              <DropdownMenuItem asChild>
                                <Link href={`/procurement/purchase-requests/${rec.id}/edit`}>
                                  <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                                </Link>
                              </DropdownMenuItem>
                            )}
                            {rec.status === "draft" && (
                              <DropdownMenuItem
                                onClick={() => {
                                  const updated = submitPR(rec);
                                  savePurchaseRequests(
                                    loadPurchaseRequests().map((p) => (p.id === updated.id ? updated : p)),
                                  );
                                  refresh();
                                  setToast({ msg: "PR submitted.", type: "success" });
                                }}
                              >
                                <Send className="w-3.5 h-3.5 mr-2" /> Submit
                              </DropdownMenuItem>
                            )}
                            {rec.status === "pending_approval" && (
                              <>
                                <DropdownMenuItem onClick={() => openApproval(rec, "approve")}>
                                  <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Approve
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => openApproval(rec, "reject")}>
                                  <XCircle className="w-3.5 h-3.5 mr-2" /> Reject
                                </DropdownMenuItem>
                              </>
                            )}
                            {rec.status === "approved" && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem asChild>
                                  <Link href={`/procurement/purchase-orders/new?prId=${rec.id}`}>
                                    <ShoppingCart className="w-3.5 h-3.5 mr-2" /> Create PO
                                  </Link>
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

      <PRApprovalModal
        open={approvalOpen}
        onClose={() => setApprovalOpen(false)}
        pr={approvalTarget}
        action={approvalAction}
        onConfirm={handleApprovalConfirm}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
