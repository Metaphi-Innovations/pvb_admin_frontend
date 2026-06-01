"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Plus, Download, Search, MoreVertical, Eye, Check, X, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface LeaveRequest {
  id: number;
  empCode: string;
  name: string;
  department: string;
  leaveType: "sick" | "casual" | "earned" | "maternity" | "paternity";
  fromDate: string;
  toDate: string;
  days: number;
  reason: string;
  status: "pending" | "approved" | "rejected";
  appliedOn: string;
  approvedBy: string;
}

const SEED: LeaveRequest[] = [
  { id: 1, empCode: "EMP-003", name: "Amit Sharma", department: "Sales", leaveType: "sick", fromDate: "2024-01-22", toDate: "2024-01-23", days: 2, reason: "Fever and flu", status: "approved", appliedOn: "2024-01-21", approvedBy: "Sunita Rao" },
  { id: 2, empCode: "EMP-005", name: "Vikram Das", department: "Sales", leaveType: "casual", fromDate: "2024-01-24", toDate: "2024-01-26", days: 3, reason: "Personal work", status: "pending", appliedOn: "2024-01-20", approvedBy: "-" },
  { id: 3, empCode: "EMP-004", name: "Neha Patel", department: "Sales", leaveType: "earned", fromDate: "2024-01-29", toDate: "2024-02-02", days: 5, reason: "Annual vacation", status: "approved", appliedOn: "2024-01-10", approvedBy: "Sunita Rao" },
  { id: 4, empCode: "EMP-010", name: "Pooja Gupta", department: "Finance", leaveType: "sick", fromDate: "2024-01-23", toDate: "2024-01-25", days: 3, reason: "Medical treatment", status: "rejected", appliedOn: "2024-01-22", approvedBy: "Sunita Rao" },
  { id: 5, empCode: "EMP-007", name: "Mohan Verma", department: "Accounts", leaveType: "casual", fromDate: "2024-01-30", toDate: "2024-01-30", days: 1, reason: "Family function", status: "pending", appliedOn: "2024-01-24", approvedBy: "-" },
  { id: 6, empCode: "EMP-002", name: "Priya Singh", department: "Sales", leaveType: "earned", fromDate: "2024-02-05", toDate: "2024-02-09", days: 5, reason: "Vacation", status: "approved", appliedOn: "2024-01-15", approvedBy: "Sunita Rao" },
];

const STATUS_CFG = {
  pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

const LEAVE_TYPE_COLORS: Record<string, string> = {
  sick:      "bg-red-100 text-red-700",
  casual:    "bg-blue-100 text-blue-700",
  earned:    "bg-emerald-100 text-emerald-700",
  maternity: "bg-pink-100 text-pink-700",
  paternity: "bg-purple-100 text-purple-700",
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

export default function LeavesPage() {
  const [leaves] = useState<LeaveRequest[]>(SEED);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<string[]>([]);
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = useMemo(() => {
    let d = leaves.filter(l => {
      const q = search.toLowerCase();
      return !q || l.name.toLowerCase().includes(q) || l.empCode.toLowerCase().includes(q);
    });
    if (filterStatus.length) d = d.filter(l => filterStatus.includes(l.status));
    return d;
  }, [leaves, search, filterStatus]);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Leave Management</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage employee leave requests and approvals</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Apply Leave
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Requests", value: leaves.length, icon: CalendarDays, accent: true },
            { label: "Pending", value: leaves.filter(l => l.status === "pending").length, icon: Clock },
            { label: "Approved", value: leaves.filter(l => l.status === "approved").length, icon: Check },
            { label: "Rejected", value: leaves.filter(l => l.status === "rejected").length, icon: X },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Status filter pills */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name or code…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <div className="flex items-center gap-1.5">
            {["", "pending", "approved", "rejected"].map(s => (
              <button key={s} onClick={() => setFilterStatus(s ? [s] : [])}
                className={cn("h-7 px-3 text-xs rounded-lg border transition-colors font-medium",
                  (s === "" ? filterStatus.length === 0 : filterStatus.includes(s))
                    ? "bg-brand-600 text-white border-brand-600"
                    : "border-border text-muted-foreground hover:bg-muted")}>
                {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Employee", "Leave Type", "From", "To", "Days", "Reason", "Status", "Applied On", ""].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(l => (
                  <tr key={l.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
                    <td className="px-4 py-2">
                      <p className="text-xs font-semibold text-foreground">{l.name}</p>
                      <p className="text-[11px] text-muted-foreground">{l.empCode} · {l.department}</p>
                    </td>
                    <td className="px-4 py-2">
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", LEAVE_TYPE_COLORS[l.leaveType])}>
                        {l.leaveType}
                      </span>
                    </td>
                    <td className="px-4 py-2 text-xs text-foreground">{l.fromDate}</td>
                    <td className="px-4 py-2 text-xs text-foreground">{l.toDate}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-center text-foreground">{l.days}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[160px] truncate">{l.reason}</td>
                    <td className="px-4 py-2"><StatusPill status={l.status} /></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{l.appliedOn}</td>
                    <td className="px-4 py-2">
                      <div className="relative flex items-center gap-1 justify-end">
                        {l.status === "pending" && (
                          <>
                            <button className="p-1 hover:bg-emerald-50 rounded text-emerald-600 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all" title="Approve">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button className="p-1 hover:bg-red-50 rounded text-red-500 opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all" title="Reject">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                        <button onClick={() => setOpenMenu(openMenu === l.id ? null : l.id)}
                          className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all">
                          <MoreVertical className="w-4 h-4 text-muted-foreground" />
                        </button>
                        {openMenu === l.id && (
                          <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-36 py-1">
                            <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{leaves.length}</span> requests</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
