"use client";

import React, { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Input } from "@/components/ui/input";
import { Eye, Pencil, Search } from "lucide-react";
import { useClientMounted } from "@/lib/use-client-mounted";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { SortTh, StatusBadge } from "../../components/AccountsUI";
import { canEditVoucher, getVouchersByType, type VoucherTypeCode } from "../voucher-data";

interface VoucherListClientProps {
  voucherType: VoucherTypeCode;
  embedded?: boolean;
}

export function VoucherListClient({ voucherType, embedded }: VoucherListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const listRefreshKey = searchParams.get("t");
  const mounted = useClientMounted();
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const records = useMemo(
    () => (mounted ? getVouchersByType(voucherType) : []),
    [voucherType, mounted, listRefreshKey],
  );

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
          <table className="accounts-table w-full text-table min-w-[900px]">
            <thead className="border-b border-border/60">
              <tr>
                <SortTh label="Date" colKey="date" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <SortTh label="Voucher No." colKey="voucherNumber" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} />
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Reference</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Narration</th>
                <SortTh label="Amount" colKey="totalDebit" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" />
                <th className="px-3 py-2 text-center text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
                <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase text-muted-foreground min-w-[120px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {!mounted ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-xs text-muted-foreground">
                    Loading vouchers…
                  </td>
                </tr>
              ) : visible.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-12 text-center text-xs text-muted-foreground">
                    No vouchers yet. Create your first entry.
                  </td>
                </tr>
              ) : (
                visible.map((v) => (
                  <tr key={v.id} className="border-b border-border/40 hover:bg-brand-50/30">
                    <td className="px-3 py-2 text-xs">{v.date}</td>
                    <td className="px-3 py-2 text-xs font-medium">
                      <Link
                        href={`/accounts/vouchers/view/${v.id}`}
                        className="text-brand-700 hover:underline font-mono"
                      >
                        {v.voucherNumber}
                      </Link>
                    </td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{v.referenceNo || "—"}</td>
                    <td className="px-3 py-2 text-xs max-w-[200px] truncate">{v.narration || "—"}</td>
                    <td className="px-3 py-2.5 text-right">
                      <MoneyAmount amount={v.totalDebit} />
                    </td>
                    <td className="px-3 py-2 text-center">
                      <StatusBadge status={v.status} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          title="View"
                          className="p-1.5 hover:bg-muted rounded-md transition-colors"
                          onClick={() => router.push(`/accounts/vouchers/view/${v.id}`)}
                        >
                          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
                        </button>
                        {canEditVoucher(v) && (
                          <button
                            type="button"
                            title="Edit"
                            className="p-1.5 hover:bg-muted rounded-md transition-colors"
                            onClick={() => router.push(`/accounts/vouchers/edit/${v.id}`)}
                          >
                            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                          </button>
                        )}
                      </div>
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
