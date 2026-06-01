"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Wallet, Download, Search, ChevronDown, ChevronsUpDown, CheckCircle2, Clock, Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface PayrollRecord {
  id: number;
  empCode: string;
  name: string;
  department: string;
  month: string;
  basicSalary: number;
  hra: number;
  allowances: number;
  deductions: number;
  netSalary: number;
  status: "pending" | "processed" | "paid";
  paidDate: string;
}

const SEED: PayrollRecord[] = [
  { id: 1, empCode: "EMP-001", name: "Rajesh Kumar", department: "Sales", month: "Jan 2024", basicSalary: 45000, hra: 18000, allowances: 8000, deductions: 6500, netSalary: 64500, status: "paid", paidDate: "2024-02-01" },
  { id: 2, empCode: "EMP-002", name: "Priya Singh", department: "Sales", month: "Jan 2024", basicSalary: 35000, hra: 14000, allowances: 6000, deductions: 5200, netSalary: 49800, status: "paid", paidDate: "2024-02-01" },
  { id: 3, empCode: "EMP-003", name: "Amit Sharma", department: "Sales", month: "Jan 2024", basicSalary: 32000, hra: 12800, allowances: 5500, deductions: 4800, netSalary: 45500, status: "paid", paidDate: "2024-02-01" },
  { id: 4, empCode: "EMP-004", name: "Neha Patel", department: "Sales", month: "Jan 2024", basicSalary: 40000, hra: 16000, allowances: 7000, deductions: 6000, netSalary: 57000, status: "processed", paidDate: "-" },
  { id: 5, empCode: "EMP-005", name: "Vikram Das", department: "Sales", month: "Jan 2024", basicSalary: 28000, hra: 11200, allowances: 5000, deductions: 4200, netSalary: 40000, status: "pending", paidDate: "-" },
  { id: 6, empCode: "EMP-006", name: "Sunita Rao", department: "HR", month: "Jan 2024", basicSalary: 50000, hra: 20000, allowances: 10000, deductions: 8000, netSalary: 72000, status: "paid", paidDate: "2024-02-01" },
  { id: 7, empCode: "EMP-007", name: "Mohan Verma", department: "Accounts", month: "Jan 2024", basicSalary: 30000, hra: 12000, allowances: 5000, deductions: 4500, netSalary: 42500, status: "processed", paidDate: "-" },
  { id: 8, empCode: "EMP-008", name: "Kavita Nair", department: "Operations", month: "Jan 2024", basicSalary: 38000, hra: 15200, allowances: 6500, deductions: 5800, netSalary: 53900, status: "paid", paidDate: "2024-02-01" },
];

const STATUS_CFG = {
  pending:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  processed: { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  paid:      { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
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

function SortTh({ label, colKey, sortKey, sortDir, onSort }: {
  label: string; colKey: string; sortKey: string; sortDir: "asc" | "desc"; onSort: (k: string) => void;
}) {
  const active = sortKey === colKey;
  return (
    <th onClick={() => onSort(colKey)} className={cn("px-4 py-3 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap", active && "bg-brand-50/60")}>
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active ? <ChevronDown className={cn("w-3 h-3 text-brand-600", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground" />}
      </div>
    </th>
  );
}

export default function PayrollPage() {
  const [records] = useState<PayrollRecord[]>(SEED);
  const [search, setSearch] = useState("");
  const [selectedMonth, setSelectedMonth] = useState("Jan 2024");
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let d = records.filter(r => {
      const q = search.toLowerCase();
      return !q || r.name.toLowerCase().includes(q) || r.empCode.toLowerCase().includes(q);
    });
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [records, search, sortKey, sortDir]);

  const totalNet = records.reduce((s, r) => s + r.netSalary, 0);
  const totalPaid = records.filter(r => r.status === "paid").reduce((s, r) => s + r.netSalary, 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Payroll</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage employee salaries and payroll processing</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)}
              className="h-8 px-2.5 text-xs border border-border rounded-lg bg-white focus:outline-none">
              <option>Jan 2024</option>
              <option>Feb 2024</option>
              <option>Mar 2024</option>
            </select>
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              Run Payroll
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Employees", value: records.length, icon: Users, accent: true },
            { label: "Total Payroll", value: `₹${(totalNet / 100000).toFixed(1)}L`, icon: Wallet },
            { label: "Paid Out", value: `₹${(totalPaid / 100000).toFixed(1)}L`, icon: CheckCircle2 },
            { label: "Pending", value: records.filter(r => r.status !== "paid").length, icon: Clock },
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

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Emp Code" colKey="empCode" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Name" colKey="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Department" colKey="department" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Basic" colKey="basicSalary" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="HRA" colKey="hra" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Allowances" colKey="allowances" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Deductions" colKey="deductions" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Net Salary" colKey="netSalary" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Status" colKey="status" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{r.empCode}</span></td>
                    <td className="px-4 py-2"><p className="text-xs font-semibold text-foreground">{r.name}</p></td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-2 text-xs text-foreground">₹{r.basicSalary.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-foreground">₹{r.hra.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-foreground">₹{r.allowances.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs text-red-600">-₹{r.deductions.toLocaleString()}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">₹{r.netSalary.toLocaleString()}</td>
                    <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{records.length}</span> records</p>
            <p className="text-[11px] font-semibold text-foreground">Total Net: ₹{totalNet.toLocaleString()}</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
