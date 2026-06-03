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
  Trash2,
  ChevronDown,
  ChevronsUpDown,
  Building2,
} from "lucide-react";
import { ActiveInactiveToggle } from "./components/CompactToggle";
import {
  type Vendor,
  loadVendors,
  saveVendors,
  formatCreditPeriod,
  todayStr,
} from "./vendor-data";

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

function Toast({ msg, type, onDismiss }: { msg: string; type: "success" | "error"; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed bottom-6 right-6 z-50 px-4 py-2.5 rounded-lg shadow-lg text-sm text-white",
        type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {msg}
      <button type="button" className="ml-3 opacity-80 hover:opacity-100" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

export default function VendorMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<Vendor[]>([]);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("vendorName");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const refresh = useCallback(() => setRecords(loadVendors()), []);

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
        (v) =>
          v.vendorName.toLowerCase().includes(q) ||
          v.companyName.toLowerCase().includes(q) ||
          v.vendorCode.toLowerCase().includes(q) ||
          v.mobile.includes(q) ||
          v.email.toLowerCase().includes(q) ||
          v.gstNumber.toLowerCase().includes(q),
      );
    }
    return r.sort((a, b) => {
      let av: string;
      let bv: string;
      if (sortKey === "creditPeriod") {
        av = formatCreditPeriod(a);
        bv = formatCreditPeriod(b);
      } else {
        av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
        bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      }
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, search, sortKey, sortDir]);

  const toggleStatus = (v: Vendor, active: boolean) => {
    const updated: Vendor = {
      ...v,
      status: active ? "active" : "inactive",
      updatedBy: "Admin",
      updatedDate: todayStr(),
    };
    saveVendors(records.map((x) => (x.id === v.id ? updated : x)));
    refresh();
    setToast({ msg: active ? "Vendor activated." : "Vendor deactivated.", type: "success" });
  };

  const confirmDelete = () => {
    if (deleteId == null) return;
    saveVendors(records.filter((v) => v.id !== deleteId));
    setDeleteId(null);
    refresh();
    setToast({ msg: "Vendor deleted.", type: "success" });
  };

  const activeCount = records.filter((v) => v.status === "active").length;

  return (
    <AppLayout>
      <div className="w-full max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center">
              <Building2 className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground tracking-tight">Vendor Master</h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                {records.length} vendors · {activeCount} active
              </p>
            </div>
          </div>
          <Link href="/masters/vendors/new">
            <Button size="sm" className="h-9 text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-sm">
              <Plus className="w-4 h-4 mr-1" /> Create Vendor
            </Button>
          </Link>
        </div>

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, company, mobile, GSTIN…"
            className="pl-9 h-9 text-sm bg-white border-border/70 rounded-lg"
          />
        </div>

        <div className="rounded-lg border border-border/60 bg-white overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[1100px] text-sm">
              <thead className="bg-muted/20 border-b border-border/60">
                <tr>
                  <SortTh label="Vendor Name" colKey="vendorName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Company Name" colKey="companyName" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Mobile Number" colKey="mobile" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Email ID" colKey="email" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="GSTIN" colKey="gstNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Credit Period" colKey="creditPeriod" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Created By</th>
                  <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Updated By</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="py-14 text-center text-sm text-muted-foreground">
                      No vendors found.
                    </td>
                  </tr>
                ) : (
                  visible.map((v) => (
                    <tr key={v.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10 group">
                      <td className="px-3 py-2.5">
                        <button
                          type="button"
                          className="font-medium text-[13px] text-brand-700 hover:underline text-left"
                          onClick={() => router.push(`/masters/vendors/${v.id}`)}
                        >
                          {v.vendorName}
                        </button>
                        <p className="text-[10px] text-muted-foreground font-mono mt-0.5">{v.vendorCode}</p>
                      </td>
                      <td className="px-3 py-2.5 text-xs">{v.companyName || "—"}</td>
                      <td className="px-3 py-2.5 tabular-nums text-xs text-muted-foreground">
                        {v.mobileCountryCode} {v.mobile || "—"}
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground truncate max-w-[140px]">{v.email || "—"}</td>
                      <td className="px-3 py-2.5 font-mono text-[11px]">{v.gstApplicable ? v.gstNumber || "—" : "—"}</td>
                      <td className="px-3 py-2.5 text-xs">{formatCreditPeriod(v)}</td>
                      <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                        <ActiveInactiveToggle
                          active={v.status === "active"}
                          onChange={(active) => toggleStatus(v, active)}
                        />
                      </td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{v.createdBy}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">{v.updatedBy}</td>
                      <td className="px-2 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-1.5 rounded-md opacity-60 group-hover:opacity-100 hover:bg-muted">
                              <MoreVertical className="w-4 h-4 text-muted-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-40">
                            <DropdownMenuLabel className="text-[10px]">Actions</DropdownMenuLabel>
                            <DropdownMenuItem asChild>
                              <Link href={`/masters/vendors/${v.id}`}>
                                <Eye className="w-3.5 h-3.5 mr-2" /> View
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/masters/vendors/${v.id}/edit`}>
                                <Edit2 className="w-3.5 h-3.5 mr-2" /> Edit
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onClick={() => setDeleteId(v.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
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

      {deleteId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-sm w-full p-5">
            <h3 className="text-sm font-semibold">Delete vendor?</h3>
            <p className="text-xs text-muted-foreground mt-1">This cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-4">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setDeleteId(null)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
