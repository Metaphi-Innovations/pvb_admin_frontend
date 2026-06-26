"use client";

import { AlertTriangle, ChevronDown, ChevronUp, Users } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  getAssignableUsersForRole,
  type SalesRole,
  type SplitMergeResultPreview,
} from "../geography-workflow-data";

export type UserAssignAction = "keep" | "assign" | "unassigned";

export interface RoleUserAssignment {
  action: UserAssignAction;
  userId: string;
}

interface SplitMergeResultCardProps {
  preview: SplitMergeResultPreview;
  userAssignments: Record<string, RoleUserAssignment>;
  onUserAssignmentChange: (role: SalesRole, patch: Partial<RoleUserAssignment>) => void;
  mergeSourceNames?: string[];
}

export function SplitMergeResultCard({
  preview,
  userAssignments,
  onUserAssignmentChange,
  mergeSourceNames,
}: SplitMergeResultCardProps) {
  const [showCustomers, setShowCustomers] = useState(false);

  return (
    <div className="rounded-xl border border-border bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-muted/20">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-semibold">{preview.name}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {preview.isExisting ? "Existing Geography" : "New Geography"} · {preview.level} · Parent: {preview.parentName}
            </p>
          </div>
          {preview.warnings.length > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
              {preview.warnings.length} warning{preview.warnings.length === 1 ? "" : "s"}
            </span>
          )}
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Metric label="Assigned Scope" value={preview.assignedScopeLabels.join(", ") || "—"} />
          <Metric label="Resolved Pincodes" value={String(preview.pincodeCount)} />
          <Metric label="Customers" value={String(preview.customerCount)} />
          <Metric
            label="Users"
            value={
              preview.usersByRole
                .map((u) => `${u.role}: ${u.userName ?? "Not Assigned"}`)
                .join(" · ") || "—"
            }
          />
        </div>

        {mergeSourceNames && mergeSourceNames.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Old geographies will become inactive: {mergeSourceNames.join(", ")}
          </p>
        )}

        <div className="rounded-lg border border-border p-3 space-y-2">
          <p className="text-xs font-semibold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" /> Approval Chain
          </p>
          <ul className="text-xs space-y-1">
            {preview.approvalChain.map((link) => (
              <li key={link.role} className="flex justify-between gap-2">
                <span className="text-muted-foreground">{link.role}</span>
                <span className={cn(!link.userName && "text-amber-700")}>
                  {link.userName ?? "Missing"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border border-border p-3 space-y-3">
          <p className="text-xs font-semibold">Assign / Update Users</p>
          {preview.usersByRole.map(({ role }) => {
            const assignment = userAssignments[role] ?? { action: "unassigned" as const, userId: "" };
            const candidates = getAssignableUsersForRole(role);
            return (
              <div key={role} className="grid grid-cols-1 sm:grid-cols-3 gap-2 items-end">
                <div>
                  <Label className="text-[10px] text-muted-foreground">Required Role: {role}</Label>
                </div>
                <Select
                  value={assignment.userId || "__none__"}
                  disabled={assignment.action !== "assign"}
                  onValueChange={(v) =>
                    onUserAssignmentChange(role, { userId: v === "__none__" ? "" : v })
                  }
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue placeholder={`Select ${role} User`} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" className="text-xs">
                      Select {role} User…
                    </SelectItem>
                    {candidates.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)} className="text-xs">
                        {u.fullName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex flex-wrap gap-1">
                  {(
                    [
                      ["keep", "Keep Existing"],
                      ["assign", "Assign New User"],
                      ["unassigned", "Leave Unassigned"],
                    ] as const
                  ).map(([action, label]) => (
                    <Button
                      key={action}
                      type="button"
                      variant={assignment.action === action ? "default" : "outline"}
                      size="sm"
                      className={cn(
                        "h-7 text-[10px]",
                        assignment.action === action && "bg-brand-600 hover:bg-brand-700 text-white",
                      )}
                      onClick={() => onUserAssignmentChange(role, { action })}
                    >
                      {label}
                    </Button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {preview.warnings.length > 0 && (
          <ul className="text-xs text-amber-800 space-y-1">
            {preview.warnings.map((w) => (
              <li key={w} className="flex items-start gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        )}

        <div className="rounded-lg border border-border">
          <button
            type="button"
            className="w-full flex items-center justify-between px-3 py-2 text-xs font-medium hover:bg-muted/30"
            onClick={() => setShowCustomers((v) => !v)}
          >
            <span>Customer Impact ({preview.customerCount} moving)</span>
            {showCustomers ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showCustomers && (
            <div className="border-t border-border px-3 py-2 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Customer master will not be changed. Visibility will recalculate from pincode mapping.
              </p>
              {preview.customers.length === 0 ? (
                <p className="text-xs text-muted-foreground">No customers in this scope.</p>
              ) : (
                <div className="overflow-x-auto max-h-[180px] overflow-y-auto">
                  <table className="w-full text-[11px] min-w-[640px]">
                    <thead className="sticky top-0 bg-muted/90">
                      <tr className="border-b">
                        {["Customer Code", "Customer Name", "Type", "Pincode", "Current Geography", "New Geography"].map(
                          (h) => (
                            <th key={h} className="text-left px-2 py-1 font-semibold">
                              {h}
                            </th>
                          ),
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {preview.customers.slice(0, 20).map((c) => (
                        <tr key={`${c.customerCode}-${c.pincode}`} className="border-b border-border/60">
                          <td className="px-2 py-1 font-mono">{c.customerCode}</td>
                          <td className="px-2 py-1">{c.customerName}</td>
                          <td className="px-2 py-1">{c.customerType}</td>
                          <td className="px-2 py-1 font-mono">{c.pincode}</td>
                          <td className="px-2 py-1">{c.region}</td>
                          <td className="px-2 py-1 font-medium">{preview.name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {preview.customers.length > 20 && (
                    <p className="text-[10px] text-muted-foreground py-1">
                      +{preview.customers.length - 20} more customers
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 p-2.5">
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold mt-0.5 line-clamp-2">{value}</p>
    </div>
  );
}
