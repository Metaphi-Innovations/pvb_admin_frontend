"use client";

import React, { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { getVouchersByType, type VoucherTypeCode } from "../voucher-data";

interface VoucherListClientProps {
  voucherType: VoucherTypeCode;
  embedded?: boolean;
}

export function VoucherListClient({ voucherType, embedded }: VoucherListClientProps) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const records = useMemo(() => getVouchersByType(voucherType), [voucherType]);

  const visible = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (v) =>
          v.voucherNumber.toLowerCase().includes(q) ||
          v.narration.toLowerCase().includes(q) ||
          v.referenceNo.toLowerCase().includes(q),
      );
    }
    r.sort((a, b) => {
      const av = (a as unknown as Record<string, unknown>)[sortKey];
      const bv = (b as unknown as Record<string, unknown>)[sortKey];
      const cmp = String(av ?? "").localeCompare(String(bv ?? ""));
      return sortDir === "asc" ? cmp : -cmp;
    });
    return r;
  }, [records, search, sortKey, sortDir]);

  const handleSort = (k: string) => {
    if (sortKey === k) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(k);
      setSortDir("asc");
    }
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-shrink-0 px-4 py-3 border-b border-border/60 bg-muted/5">
        <div className="relative max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="h-8 pl-8 text-xs"
            placeholder="Search voucher no., narration…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
          <table className="w-full text-table min-w-[800px]">
            <thead className="bg-muted/20 border-b border-border/60">
              <tr>
                <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Voucher No." colKey="voucherNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Reference</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Narration</th>
                <SortTh label="Amount" colKey="totalDebit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-3 py-12 text-center text-xs text-muted-foreground">
                    No vouchers yet. Create your first entry.
                  </td>
                </tr>
              ) : (
                visible.map((v) => (
                  <tr key={v.id} className="border-b border-border/40 hover:bg-brand-50/30">
                    <td className="px-3 py-2 text-xs">{v.date}</td>
                    <td className="px-3 py-2 text-xs font-medium">{v.voucherNumber}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{v.referenceNo || "—"}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{v.narration || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <MoneyAmount amount={v.totalDebit} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={v.status} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
