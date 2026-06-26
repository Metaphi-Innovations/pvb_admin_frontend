"use client";

import { useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { loadAuditEntries, type AuditActionType } from "../geography-audit-data";

export function AuditHistoryTab() {
  const [actionFilter, setActionFilter] = useState("__all__");
  const [search, setSearch] = useState("");

  const entries = useMemo(() => {
    let list = loadAuditEntries();
    if (actionFilter !== "__all__") list = list.filter((e) => e.actionType === actionFilter);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (e) =>
          e.remarks.toLowerCase().includes(q) ||
          e.pincode?.toLowerCase().includes(q) ||
          e.user?.toLowerCase().includes(q) ||
          e.oldGeography?.toLowerCase().includes(q) ||
          e.newGeography?.toLowerCase().includes(q),
      );
    }
    return list;
  }, [actionFilter, search]);

  const actionTypes: AuditActionType[] = [
    "Postal Master Uploaded", "Geography Created", "Geography Edited", "Coverage Added",
    "Pincode Reassigned", "User Assigned", "User Reassigned", "Assignment Ended",
    "Geography Split", "Geography Merged", "Geography Deactivated",
  ];

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Audit History</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Complete trail of geography, coverage, and user assignment changes. History cannot be deleted.</p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 flex flex-wrap gap-3">
        <div className="space-y-1 min-w-[200px]">
          <Label className="text-xs">Action Type</Label>
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__" className="text-xs">All Actions</SelectItem>
              {actionTypes.map((a) => <SelectItem key={a} value={a} className="text-xs">{a}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <Input className="h-9 text-sm" placeholder="Search pincode, user, geography, remarks…" value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        <table className="w-full text-xs min-w-[1000px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {["Date & Time", "Action Type", "Old Geography", "New Geography", "Pincode", "User", "Changed By", "Effective From", "Effective To", "Remarks"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {entries.length === 0 ? (
              <tr><td colSpan={10} className="px-4 py-8 text-center text-muted-foreground">No audit entries found.</td></tr>
            ) : (
              entries.map((e) => (
                <tr key={e.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-3 py-2.5 font-mono whitespace-nowrap">{e.dateTime.slice(0, 16).replace("T", " ")}</td>
                  <td className="px-3 py-2.5 font-medium">{e.actionType}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{e.oldGeography ?? "—"}</td>
                  <td className="px-3 py-2.5">{e.newGeography ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono">{e.pincode ?? "—"}</td>
                  <td className="px-3 py-2.5">{e.user ?? "—"}</td>
                  <td className="px-3 py-2.5">{e.changedBy}</td>
                  <td className="px-3 py-2.5 font-mono">{e.effectiveFrom ?? "—"}</td>
                  <td className="px-3 py-2.5 font-mono">{e.effectiveTo ?? "—"}</td>
                  <td className="px-3 py-2.5 text-muted-foreground max-w-[220px]">{e.remarks}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
