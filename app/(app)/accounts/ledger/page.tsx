"use client";

import React, { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { BookOpen, Download, Search, ChevronDown, ChevronsUpDown, TrendingUp, TrendingDown, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";

interface LedgerEntry {
  id: number;
  date: string;
  voucherNo: string;
  type: "debit" | "credit";
  account: string;
  particulars: string;
  debit: number;
  credit: number;
  balance: number;
  reference: string;
}

const SEED: LedgerEntry[] = [
  { id: 1, date: "2024-01-02", voucherNo: "JV-001", type: "credit", account: "Sales Revenue", particulars: "Sales to Green Valley Agro - INV-001", debit: 0, credit: 125000, balance: 125000, reference: "INV-2024-001" },
  { id: 2, date: "2024-01-05", voucherNo: "PV-001", type: "debit", account: "Purchase", particulars: "Purchase from AgriSupplies Ltd - PO-001", debit: 85000, credit: 0, balance: 40000, reference: "PO-2024-001" },
  { id: 3, date: "2024-01-08", voucherNo: "RV-001", type: "credit", account: "Cash & Bank", particulars: "Receipt from Farmtech Solutions", debit: 0, credit: 100000, balance: 140000, reference: "COL-2024-001" },
  { id: 4, date: "2024-01-10", voucherNo: "PV-002", type: "debit", account: "Salaries", particulars: "January 2024 salary disbursement", debit: 250000, credit: 0, balance: -110000, reference: "PAY-2024-01" },
  { id: 5, date: "2024-01-12", voucherNo: "JV-002", type: "credit", account: "Sales Revenue", particulars: "Sales to BioGrow Agro - INV-004", debit: 0, credit: 310000, balance: 200000, reference: "INV-2024-004" },
  { id: 6, date: "2024-01-15", voucherNo: "PV-003", type: "debit", account: "Rent & Utilities", particulars: "Office rent - Jan 2024", debit: 45000, credit: 0, balance: 155000, reference: "EXP-JAN-01" },
  { id: 7, date: "2024-01-18", voucherNo: "RV-002", type: "credit", account: "Cash & Bank", particulars: "Receipt from CropCare India", debit: 0, credit: 200000, balance: 355000, reference: "COL-2024-004" },
  { id: 8, date: "2024-01-20", voucherNo: "PV-004", type: "debit", account: "Purchase", particulars: "Purchase from SeedsTech - PO-003", debit: 124000, credit: 0, balance: 231000, reference: "PO-2024-003" },
  { id: 9, date: "2024-01-22", voucherNo: "JV-003", type: "credit", account: "GST Payable", particulars: "GST on sales - Q3", debit: 0, credit: 38000, balance: 193000, reference: "GST-Q3-2024" },
  { id: 10, date: "2024-01-24", voucherNo: "RV-003", type: "credit", account: "Cash & Bank", particulars: "Receipt from Sunrise Crops", debit: 0, credit: 189000, balance: 382000, reference: "COL-2024-002" },
];

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

export default function LedgerPage() {
  const [entries] = useState<LedgerEntry[]>(SEED);
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = useMemo(() => {
    let d = entries.filter(e => {
      const q = search.toLowerCase();
      return !q || e.particulars.toLowerCase().includes(q) || e.voucherNo.toLowerCase().includes(q) || e.account.toLowerCase().includes(q);
    });
    return [...d].sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [entries, search, sortKey, sortDir]);

  const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
  const totalCredit = entries.reduce((s, e) => s + e.credit, 0);

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">General Ledger</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Complete transaction journal and account ledger</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Entries", value: entries.length, icon: BookOpen, accent: true },
            { label: "Total Debit", value: `₹${(totalDebit / 100000).toFixed(1)}L`, icon: TrendingDown },
            { label: "Total Credit", value: `₹${(totalCredit / 100000).toFixed(1)}L`, icon: TrendingUp },
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
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by particulars, voucher, account…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Voucher No" colKey="voucherNo" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Account" colKey="account" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Particulars" colKey="particulars" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Debit (₹)" colKey="debit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Credit (₹)" colKey="credit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <SortTh label="Balance (₹)" colKey="balance" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-foreground whitespace-nowrap">Reference</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(e => (
                  <tr key={e.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2 text-xs text-muted-foreground whitespace-nowrap">{e.date}</td>
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{e.voucherNo}</span></td>
                    <td className="px-4 py-2 text-xs font-medium text-foreground whitespace-nowrap">{e.account}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground max-w-[200px] truncate">{e.particulars}</td>
                    <td className="px-4 py-2 text-xs text-right font-mono text-red-600">
                      {e.debit > 0 ? e.debit.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2 text-xs text-right font-mono text-emerald-700">
                      {e.credit > 0 ? e.credit.toLocaleString() : "-"}
                    </td>
                    <td className="px-4 py-2 text-xs text-right font-mono font-semibold">
                      <span className={e.balance >= 0 ? "text-emerald-700" : "text-red-600"}>
                        {e.balance >= 0 ? "" : "-"}{Math.abs(e.balance).toLocaleString()}
                      </span>
                    </td>
                    <td className="px-4 py-2"><span className="font-mono text-[11px] text-muted-foreground">{e.reference}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center justify-between px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Showing <span className="font-medium text-foreground">{filtered.length}</span> of <span className="font-medium text-foreground">{entries.length}</span> entries</p>
            <div className="flex items-center gap-4 text-[11px]">
              <span>Total Debit: <span className="font-semibold text-red-600">₹{totalDebit.toLocaleString()}</span></span>
              <span>Total Credit: <span className="font-semibold text-emerald-700">₹{totalCredit.toLocaleString()}</span></span>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
