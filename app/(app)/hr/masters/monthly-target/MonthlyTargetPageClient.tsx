"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, MoreVertical, Edit2, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import {
  loadMonthlyTargets,
  monthLabel,
  saveMonthlyTargets,
  type MonthlyTarget,
} from "./monthly-target-data";

export default function MonthlyTargetPage() {
  const router = useRouter();
  const [records, setRecords] = useState<MonthlyTarget[]>([]);
  const [search, setSearch] = useState("");

  const refresh = useCallback(() => setRecords(loadMonthlyTargets()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((t) => t.employeeName.toLowerCase().includes(q) || t.employeeCode.toLowerCase().includes(q));
  }, [records, search]);

  const fmtValue = (t: MonthlyTarget) =>
    t.targetType === "amount" ? `₹${t.targetValue.toLocaleString("en-IN")}` : t.targetValue.toLocaleString("en-IN");

  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Monthly Target Master</h1>
            <p className="text-xs text-muted-foreground">Assign monthly targets to employees.</p>
          </div>
          <Button className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={() => router.push("/hr/masters/monthly-target/new")}>
            <Plus className="w-3.5 h-3.5" /> Add Target
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="h-8 pl-8 text-xs" />
        </div>
        <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Month</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Year</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Target Type</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Target Value</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2">
                    <span className="font-medium">{t.employeeName}</span>
                    <span className="text-muted-foreground ml-1 font-mono text-[10px]">{t.employeeCode}</span>
                  </td>
                  <td className="px-3 py-2">{monthLabel(t.month)}</td>
                  <td className="px-3 py-2">{t.year}</td>
                  <td className="px-3 py-2 capitalize">{t.targetType}</td>
                  <td className="px-3 py-2 font-medium">{fmtValue(t)}</td>
                  <td className="px-3 py-2"><HrStatusBadge status={t.status} /></td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><MoreVertical className="w-3.5 h-3.5" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => router.push(`/hr/masters/monthly-target/${t.id}/edit`)} className="text-xs gap-2"><Edit2 className="w-3.5 h-3.5" /> Edit</DropdownMenuItem>
                        <DropdownMenuItem className="text-xs text-red-600" onClick={() => { if (confirm("Delete?")) { saveMonthlyTargets(records.filter((r) => r.id !== t.id)); refresh(); } }}><Trash2 className="w-3.5 h-3.5" /> Delete</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
}
