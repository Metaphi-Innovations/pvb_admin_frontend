"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { addCostCenter, loadCostCenters } from "@/lib/accounts/cost-centers-data";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";

export default function CostCentersPageClient() {
  const [records, setRecords] = useState(loadCostCenters());
  const [code, setCode] = useState("");
  const [name, setName] = useState("");

  const save = () => {
    if (!code.trim() || !name.trim()) return;
    addCostCenter({ code, name });
    setRecords(loadCostCenters());
    setCode("");
    setName("");
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Cost Centers")}
      title="Cost Centers"
      description="Cost centers for departmental expense and revenue allocation on voucher lines."
      layout="split"
    >
      <div className="flex-1 overflow-auto min-h-0">
        <div className="border-b border-border/60 bg-muted/10 p-4">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Code</Label>
              <Input className="h-9 text-[13px] font-medium w-32 font-mono" value={code} onChange={(e) => setCode(e.target.value)} />
            </div>
            <div className="space-y-1 flex-1 min-w-[200px]">
              <Label className="text-[11px]">Name</Label>
              <Input className="h-9 text-[13px] font-medium" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <Button size="sm" className="h-9 text-[13px] font-medium bg-brand-600 text-white gap-1" onClick={save}>
              <Plus className="w-4 h-4" /> Add
            </Button>
          </div>
        </div>
        <table className="accounts-table w-full">
          <thead className="border-b border-border/60">
            <tr>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Code</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Name</th>
              <th className="px-4 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Status</th>
            </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="accounts-table-row group">
                <td className="px-4 py-2.5 text-xs font-mono font-semibold">{r.code}</td>
                <td className="px-4 py-2.5 text-xs">{r.name}</td>
                <td className="px-4 py-2.5"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AccountsPageShell>
  );
}
