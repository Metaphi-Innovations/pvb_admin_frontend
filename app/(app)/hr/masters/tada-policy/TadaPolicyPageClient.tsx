"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
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
  formatEffectiveDate,
  loadTadaPolicies,
  saveTadaPolicies,
  type TadaPolicy,
} from "./tada-policy-data";

export default function TadaPolicyMasterPage() {
  const router = useRouter();
  const [records, setRecords] = useState<TadaPolicy[]>([]);
  const [search, setSearch] = useState("");

  const refresh = useCallback(() => setRecords(loadTadaPolicies()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (p) => p.policyName.toLowerCase().includes(q) || p.policyCode.toLowerCase().includes(q),
    );
  }, [records, search]);

  const handleDelete = (id: number) => {
    if (!confirm("Delete this policy?")) return;
    saveTadaPolicies(records.filter((p) => p.id !== id));
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">TA/DA Policy Master</h1>
            <p className="text-xs text-muted-foreground">Travel and daily allowance policies.</p>
          </div>
          <Button className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={() => router.push("/hr/masters/tada-policy/new")}>
            <Plus className="w-3.5 h-3.5" /> Add Policy
          </Button>
        </div>
        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search policy…" className="h-8 pl-8 text-xs" />
        </div>
        <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Policy Name</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Effective Date</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Created By</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Updated By</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {visible.map((p) => (
                <tr key={p.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2 font-medium">{p.policyName}</td>
                  <td className="px-3 py-2 text-muted-foreground">{formatEffectiveDate(p)}</td>
                  <td className="px-3 py-2"><HrStatusBadge status={p.status} /></td>
                  <td className="px-3 py-2 text-muted-foreground">{p.createdBy}</td>
                  <td className="px-3 py-2 text-muted-foreground">{p.updatedBy}</td>
                  <td className="px-3 py-2">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button type="button" className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"><MoreVertical className="w-3.5 h-3.5" /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild><Link href={`/hr/masters/tada-policy/${p.id}/edit`} className="text-xs gap-2"><Edit2 className="w-3.5 h-3.5" /> Edit</Link></DropdownMenuItem>
                        <DropdownMenuItem className="text-xs text-red-600" onClick={() => handleDelete(p.id)}><Trash2 className="w-3.5 h-3.5" /> Delete</DropdownMenuItem>
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
