"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  loadApprovalHierarchy,
  saveApprovalHierarchy,
  nextPolicyId,
  type AmountApprovalRule,
  type ApprovalHierarchyLevel,
  type ClaimApprovalHierarchyConfig,
} from "../claims/tada/approval-hierarchy-data";
import { loadHrEmployees } from "../employees/employee-master-data";

export function ApprovalHierarchySection() {
  const [config, setConfig] = useState<ClaimApprovalHierarchyConfig>(loadApprovalHierarchy);
  const employees = loadHrEmployees().filter((e) => e.status === "active");

  const persist = (next: ClaimApprovalHierarchyConfig) => {
    setConfig(next);
    saveApprovalHierarchy(next);
  };

  const updateLevel = (id: number, patch: Partial<ApprovalHierarchyLevel>) => {
    persist({
      ...config,
      levels: config.levels.map((l) => (l.id === id ? { ...l, ...patch } : l)),
    });
  };

  const addLevel = () => {
    persist({
      ...config,
      levels: [
        ...config.levels,
        {
          id: nextPolicyId(config.levels),
          code: `L${config.levels.length + 1}`,
          label: "New Level",
          sortOrder: config.levels.length + 1,
          approverDesignations: [],
          approverEmployeeIds: [],
          active: true,
        },
      ],
    });
  };

  const addRule = () => {
    persist({
      ...config,
      amountRules: [
        ...config.amountRules,
        {
          id: nextPolicyId(config.amountRules),
          minAmount: 0,
          maxAmount: null,
          requiredLevelCodes: config.levels.filter((l) => l.active).map((l) => l.code),
          active: true,
        },
      ],
    });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white border border-border/60 rounded-lg p-4 flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-2">
          <Switch
            checked={config.useReportingManagerFirst}
            onCheckedChange={(v) => persist({ ...config, useReportingManagerFirst: v })}
          />
          <Label className="text-xs">Use reporting manager in chain</Label>
        </div>
        <div className="flex items-center gap-2">
          <Switch
            checked={config.allowPartialApproval}
            onCheckedChange={(v) => persist({ ...config, allowPartialApproval: v })}
          />
          <Label className="text-xs">Allow partial approval</Label>
        </div>
      </div>

      <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Approval Hierarchy Levels</h3>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addLevel}>
            Add Level
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-3 py-2 text-left">Order</th>
                <th className="px-3 py-2 text-left">Code</th>
                <th className="px-3 py-2 text-left">Label</th>
                <th className="px-3 py-2 text-left">Approver Designations</th>
                <th className="px-3 py-2 text-left">User Approvers</th>
                <th className="px-3 py-2 text-left">Active</th>
              </tr>
            </thead>
            <tbody>
              {[...config.levels].sort((a, b) => a.sortOrder - b.sortOrder).map((l) => (
                <tr key={l.id} className="border-b border-border/40">
                  <td className="px-3 py-2">
                    <Input
                      type="number"
                      className="h-7 w-14 text-xs"
                      value={l.sortOrder}
                      onChange={(e) => updateLevel(l.id, { sortOrder: Number(e.target.value) })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-7 w-16 text-xs font-mono"
                      value={l.code}
                      onChange={(e) => updateLevel(l.id, { code: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-7 w-36 text-xs"
                      value={l.label}
                      onChange={(e) => updateLevel(l.id, { label: e.target.value })}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <Input
                      className="h-7 min-w-[200px] text-xs"
                      value={l.approverDesignations.join(", ")}
                      onChange={(e) =>
                        updateLevel(l.id, {
                          approverDesignations: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
                        })
                      }
                      placeholder="Territory Manager, ASM…"
                    />
                  </td>
                  <td className="px-3 py-2">
                    <select
                      className="h-7 text-xs border rounded-md px-2 max-w-[180px]"
                      value={l.approverEmployeeIds[0] ?? ""}
                      onChange={(e) =>
                        updateLevel(l.id, {
                          approverEmployeeIds: e.target.value ? [Number(e.target.value)] : [],
                        })
                      }
                    >
                      <option value="">— Role-based —</option>
                      {employees.map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.employeeName}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <Switch checked={l.active} onCheckedChange={(v) => updateLevel(l.id, { active: v })} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h3 className="text-sm font-semibold">Amount-based approval rules</h3>
          <Button size="sm" variant="outline" className="h-8 text-xs" onClick={addRule}>
            Add Rule
          </Button>
        </div>
        <div className="p-4 space-y-3">
          {config.amountRules.map((r) => (
            <AmountRuleRow
              key={r.id}
              rule={r}
              levels={config.levels}
              onChange={(patch) =>
                persist({
                  ...config,
                  amountRules: config.amountRules.map((x) => (x.id === r.id ? { ...x, ...patch } : x)),
                })
              }
            />
          ))}
        </div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Hierarchy is configurable (TM → ASM → RSM → …). Claims advance level-by-level on web or mobile; only
        final-approved claims sync to Accounts → Expenses for payment.
      </p>
    </div>
  );
}

function AmountRuleRow({
  rule,
  levels,
  onChange,
}: {
  rule: AmountApprovalRule;
  levels: ApprovalHierarchyLevel[];
  onChange: (patch: Partial<AmountApprovalRule>) => void;
}) {
  const activeCodes = levels.filter((l) => l.active).map((l) => l.code);
  return (
    <div className="flex flex-wrap items-end gap-2 p-3 rounded-lg bg-muted/15 border border-border/50">
      <div>
        <Label className="text-[10px]">Min ₹</Label>
        <Input
          type="number"
          className="h-7 w-24 text-xs mt-0.5"
          value={rule.minAmount}
          onChange={(e) => onChange({ minAmount: Number(e.target.value) })}
        />
      </div>
      <div>
        <Label className="text-[10px]">Max ₹</Label>
        <Input
          type="number"
          className="h-7 w-24 text-xs mt-0.5"
          value={rule.maxAmount ?? ""}
          placeholder="∞"
          onChange={(e) => onChange({ maxAmount: e.target.value ? Number(e.target.value) : null })}
        />
      </div>
      <div className="flex-1 min-w-[200px]">
        <Label className="text-[10px]">Required levels (comma codes)</Label>
        <Input
          className="h-7 text-xs mt-0.5"
          value={rule.requiredLevelCodes.join(", ")}
          onChange={(e) =>
            onChange({
              requiredLevelCodes: e.target.value.split(",").map((s) => s.trim()).filter(Boolean),
            })
          }
          placeholder={activeCodes.join(", ")}
        />
      </div>
      <Switch checked={rule.active} onCheckedChange={(v) => onChange({ active: v })} />
    </div>
  );
}
