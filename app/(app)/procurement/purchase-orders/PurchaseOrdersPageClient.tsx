"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { ModuleFiltersBar } from "@/components/module/ModuleFiltersBar";
import { EmptyModuleState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/button";
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
  ShoppingCart,
  MoreVertical,
  Eye,
  Edit2,
  Send,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import { formatCurrency, todayStr } from "@/lib/procurement/utils";
import { StatusPill, Toast } from "../components/ProcurementUI";
import {
  type POStatus,
  type PurchaseOrder,
  loadPurchaseOrders,
  savePurchaseOrders,
  PO_STATUS_CFG,
  submitPO,
  approvePO,
  rejectPO,
} from "./po-data";
import { CURRENT_USER } from "@/lib/procurement/config";

type TabId =
  | "all"
  | "draft"
  | "pending_approval"
  | "approved"
  | "rejected"
  | "sent_to_supplier"
  | "closed"
  | "cancelled";

const TABS: { id: TabId; label: string }[] = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "pending_approval", label: "Pending Approval" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Rejected" },
  { id: "sent_to_supplier", label: "Sent to Supplier" },
  { id: "closed", label: "Closed" },
  { id: "cancelled", label: "Cancelled" },
];

const selectableStatus: POStatus[] = [
  "draft",
  "pending_approval",
  "approved",
  "rejected",
  "sent_to_supplier",
  "closed",
  "cancelled",
];

function SortTh({
  label,
  colKey,
  sortKey,
  onSort,
}: {
  label: string;
  colKey: string;
  sortKey: string;
  onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground cursor-pointer whitespace-nowrap",
        active && "text-brand-700",
      )}
      onClick={() => onSort(colKey)}
    >
      {label}
    </th>
  );
}

function ApprovalModal({
  po,
  action,
  onClose,
  onConfirm,
}: {
  po: PurchaseOrder | null;
  action: "approve" | "reject";
  onClose: () => void;
  onConfirm: (remarks: string) => void;
}) {
  const [remarks, setRemarks] = useState("");
  if (!po) return null;
  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg border border-border w-full max-w-md">
        <div className="px-4 py-3 border-b border-border">
          <h3 className="text-sm font-semibold">{action === "approve" ? "Approve PO" : "Reject PO"}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">PO Number: {po.poNumber}</p>
        </div>
        <div className="p-4 space-y-2">
          <label className="text-xs font-medium">Remarks</label>
          <textarea
            className="w-full min-h-[92px] text-sm border border-border/70 rounded-md p-2"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>
        <div className="px-4 py-3 border-t border-border flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs text-white", action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-red-600 hover:bg-red-700")}
            onClick={() => onConfirm(remarks)}
          >
            {action === "approve" ? "Approve" : "Reject"}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function PurchaseOrdersPage() {
  const router = useRouter();
  const [records, setRecords] = useState<PurchaseOrder[]>(loadPurchaseOrders());
  const [tab, setTab] = useState<TabId>("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("poDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [vendorFilter, setVendorFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [createdByFilter, setCreatedByFilter] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [approvalTarget, setApprovalTarget] = useState<PurchaseOrder | null>(null);
  const [approvalAction, setApprovalAction] = useState<"approve" | "reject">("approve");

  const refresh = () => setRecords(loadPurchaseOrders());
  const vendors = Array.from(new Set(records.map((r) => r.supplierName))).filter(Boolean);
  const creators = Array.from(new Set(records.map((r) => r.createdBy))).filter(Boolean);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  const tabCounts = useMemo(() => {
    const c: Partial<Record<TabId, number>> = { all: records.length };
    records.forEach((r) => {
      if ((TABS as { id: string; label: string }[]).some((x) => x.id === r.status)) {
        c[r.status as TabId] = (c[r.status as TabId] ?? 0) + 1;
      }
    });
    return c;
  }, [records]);

  const visible = useMemo(() => {
    let r = [...records];
    if (tab !== "all") r = r.filter((x) => x.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.poNumber.toLowerCase().includes(q) ||
          x.sourcePrNumber.toLowerCase().includes(q) ||
          x.supplierName.toLowerCase().includes(q),
      );
    }
    if (vendorFilter) r = r.filter((x) => x.supplierName === vendorFilter);
    if (statusFilter) r = r.filter((x) => x.status === statusFilter);
    if (createdByFilter) r = r.filter((x) => x.createdBy === createdByFilter);
    if (fromDate) r = r.filter((x) => x.poDate >= fromDate);
    if (toDate) r = r.filter((x) => x.poDate <= toDate);

    return r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, tab, search, sortKey, sortDir, vendorFilter, statusFilter, createdByFilter, fromDate, toDate]);

  const updateOne = (updated: PurchaseOrder) => {
    savePurchaseOrders(loadPurchaseOrders().map((p) => (p.id === updated.id ? updated : p)));
    refresh();
  };

  const openApproval = (po: PurchaseOrder, action: "approve" | "reject") => {
    setApprovalTarget(po);
    setApprovalAction(action);
  };

  const handleApproval = (remarks: string) => {
    if (!approvalTarget) return;
    const updated =
      approvalAction === "approve"
        ? approvePO(approvalTarget)
        : rejectPO(approvalTarget, remarks || undefined);
    updateOne(updated);
    setApprovalTarget(null);
    setToast({ msg: approvalAction === "approve" ? "PO approved." : "PO rejected.", type: "success" });
  };

  return (
    <AppLayout>
      <div className="w-full max-w-[1400px] mx-auto space-y-4">
        <PageHeader
          title="Purchase Orders"
          description="Manage and track procurement orders."
          icon={ShoppingCart}
          breadcrumbs={[
            { label: "Procurement", href: "/procurement/purchase-orders" },
            { label: "Purchase Orders" },
          ]}
          actions={
            <Link href="/procurement/purchase-orders/new">
              <Button>
                <Plus className="w-3.5 h-3.5" /> Create Purchase Order
              </Button>
            </Link>
          }
        />

        <div className="flex items-center gap-1 border-b border-border/60 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={cn(
                "px-3 py-2 text-xs font-medium whitespace-nowrap border-b-2 -mb-px",
                tab === t.id ? "border-brand-600 text-brand-700" : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              <span className={cn("ml-1.5 tabular-nums", tab === t.id ? "text-brand-600" : "opacity-60")}>
                {tabCounts[t.id] ?? 0}
              </span>
            </button>
          ))}
        </div>

        <ModuleFiltersBar
          searchValue={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search purchase orders…"
        >
          <select className="input-base h-8 w-[140px]" value={vendorFilter} onChange={(e) => setVendorFilter(e.target.value)}>
            <option value="">Vendor</option>
            {vendors.map((v) => <option key={v} value={v}>{v}</option>)}
          </select>
          <select className="input-base h-8 w-[130px]" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">Status</option>
            {selectableStatus.map((s) => <option key={s} value={s}>{PO_STATUS_CFG[s].label}</option>)}
          </select>
          <input className="input-base h-8 w-[130px]" type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          <input className="input-base h-8 w-[130px]" type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          <select className="input-base h-8 min-w-[130px]" value={createdByFilter} onChange={(e) => setCreatedByFilter(e.target.value)}>
            <option value="">Created By</option>
            {creators.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <Button variant="outline" size="sm"><Download className="w-3.5 h-3.5" /> Export</Button>
        </ModuleFiltersBar>

        <div className="page-shell overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1040px] text-sm">
              <thead className="sticky top-0 z-10 bg-white/95 backdrop-blur-sm border-b border-border/60">
                <tr>
                  <SortTh label="PO No." colKey="poNumber" sortKey={sortKey} onSort={handleSort} />
                  <SortTh label="PO Date" colKey="poDate" sortKey={sortKey} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">PR No.</th>
                  <SortTh label="Vendor Name" colKey="supplierName" sortKey={sortKey} onSort={handleSort} />
                  <SortTh label="Total Amount" colKey="summary" sortKey={sortKey} onSort={handleSort} />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Created By</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Updated By</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={9}>
                      <EmptyModuleState
                        module="Purchase Order"
                        onAdd={() => router.push("/procurement/purchase-orders/new")}
                      />
                    </td>
                  </tr>
                ) : (
                  visible.map((rec) => (
                    <tr key={rec.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 group h-11">
                      <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700">{rec.poNumber}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{rec.poDate}</td>
                      <td className="px-3 py-2 text-xs font-mono text-muted-foreground">{rec.sourcePrNumber || "—"}</td>
                      <td className="px-3 py-2 text-xs">{rec.supplierName}</td>
                      <td className="px-3 py-2 text-xs font-semibold">{formatCurrency(rec.summary.grandTotal)}</td>
                      <td className="px-3 py-2"><StatusPill status={rec.status} config={PO_STATUS_CFG} /></td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{rec.createdBy}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{rec.updatedBy}</td>
                      <td className="px-2 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuLabel className="text-[10px]">Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${rec.id}`)}>
                              <Eye className="w-3.5 h-3.5 mr-2" /> View
                            </DropdownMenuItem>
                            {["draft", "rejected"].includes(rec.status) && (
                              <DropdownMenuItem onClick={() => router.push(`/procurement/purchase-orders/${rec.id}/edit`)}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                              </DropdownMenuItem>
                            )}
                            {rec.status === "draft" && (
                              <DropdownMenuItem onClick={() => { updateOne(submitPO(rec)); setToast({ msg: "PO submitted.", type: "success" }); }}>
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
                              <DropdownMenuItem
                                onClick={() =>
                                  updateOne({
                                    ...rec,
                                    status: "sent_to_supplier",
                                    updatedBy: CURRENT_USER,
                                    updatedDate: todayStr(),
                                  })
                                }
                              >
                                <Send className="w-3.5 h-3.5 mr-2" /> Mark Sent
                              </DropdownMenuItem>
                            )}
                            {rec.status === "sent_to_supplier" && (
                              <DropdownMenuItem
                                onClick={() =>
                                  updateOne({
                                    ...rec,
                                    status: "closed",
                                    updatedBy: CURRENT_USER,
                                    updatedDate: todayStr(),
                                  })
                                }
                              >
                                Close PO
                              </DropdownMenuItem>
                            )}
                            {!["closed", "cancelled"].includes(rec.status) && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  className="text-red-600"
                                  onClick={() =>
                                    updateOne({
                                      ...rec,
                                      status: "cancelled",
                                      updatedBy: CURRENT_USER,
                                      updatedDate: todayStr(),
                                    })
                                  }
                                >
                                  Cancel PO
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
      <ApprovalModal
        po={approvalTarget}
        action={approvalAction}
        onClose={() => setApprovalTarget(null)}
        onConfirm={handleApproval}
      />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
