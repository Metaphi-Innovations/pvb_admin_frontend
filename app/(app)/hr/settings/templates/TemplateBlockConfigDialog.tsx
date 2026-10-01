"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { hrBtn, hrInput, HrOrgField } from "../organization/_components";
import {
  getBlockDefinition,
  normalizeSalaryBreakupSettings,
  normalizeSimpleTableSettings,
  type HrBlockSettings,
  type HrTableBlockStyle,
  type HrTemplateBlockInstance,
  type HrTemplateBlockType,
  type SalaryBreakupTableSettings,
  type SimpleTableBlockSettings,
} from "../hr-template-blocks";

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <span className="text-xs text-foreground">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export function TemplateBlockConfigDialog({
  open,
  block,
  onClose,
  onSave,
  onRemove,
}: {
  open: boolean;
  block: HrTemplateBlockInstance | null;
  onClose: () => void;
  onSave: (settings: HrBlockSettings) => void;
  onRemove?: () => void;
}) {
  const [settings, setSettings] = useState<HrBlockSettings>({});

  useEffect(() => {
    if (!block) return;
    const def = getBlockDefinition(block.blockType);
    setSettings(def ? def.normalizeSettings(block.settings) : block.settings);
  }, [block]);

  if (!block) return null;
  const def = getBlockDefinition(block.blockType);
  const isSalary = block.blockType === "salary_breakup_table";
  const salary = isSalary
    ? (settings as SalaryBreakupTableSettings)
    : null;
  const simple = !isSalary ? (settings as SimpleTableBlockSettings) : null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">{def?.label ?? "Dynamic Block"}</DialogTitle>
          <DialogDescription className="text-xs">
            {def?.description ?? "Configure how this block renders."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
          {isSalary && salary ? (
            <>
              <HrOrgField label="Table Title" size="full">
                <Input
                  value={salary.title}
                  onChange={(e) => setSettings({ ...salary, title: e.target.value })}
                  className={hrInput()}
                />
              </HrOrgField>
              <HrOrgField label="Final Total Label" size="full">
                <Input
                  value={salary.totalLabel}
                  onChange={(e) => setSettings({ ...salary, totalLabel: e.target.value })}
                  className={hrInput()}
                  placeholder="NET CTC"
                />
              </HrOrgField>
              <HrOrgField label="Style" size="full">
                <Select
                  value={salary.style}
                  onValueChange={(v) =>
                    setSettings({ ...salary, style: v as HrTableBlockStyle })
                  }
                >
                  <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple" className="text-xs">
                      Simple
                    </SelectItem>
                    <SelectItem value="bordered" className="text-xs">
                      Bordered
                    </SelectItem>
                    <SelectItem value="compact" className="text-xs">
                      Compact
                    </SelectItem>
                    <SelectItem value="highlight_totals" className="text-xs">
                      Highlight Totals
                    </SelectItem>
                  </SelectContent>
                </Select>
              </HrOrgField>
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2 space-y-0.5">
                <ToggleRow
                  label="Show Break-up / Formula"
                  checked={salary.showBreakup}
                  onChange={(v) => setSettings({ ...salary, showBreakup: v })}
                />
                <ToggleRow
                  label="Show Monthly Amount"
                  checked={salary.showMonthly}
                  onChange={(v) => setSettings({ ...salary, showMonthly: v })}
                />
                <ToggleRow
                  label="Show Annual Amount"
                  checked={salary.showAnnual}
                  onChange={(v) => setSettings({ ...salary, showAnnual: v })}
                />
                <ToggleRow
                  label="Show Gross Total"
                  checked={salary.showGross}
                  onChange={(v) => setSettings({ ...salary, showGross: v })}
                />
                <ToggleRow
                  label="Show Employee Deductions"
                  checked={salary.showDeductions}
                  onChange={(v) => setSettings({ ...salary, showDeductions: v })}
                />
                <ToggleRow
                  label="Show Employer Contributions"
                  checked={salary.showEmployerContributions}
                  onChange={(v) =>
                    setSettings({ ...salary, showEmployerContributions: v })
                  }
                />
                <ToggleRow
                  label="Show Net / Final Total"
                  checked={salary.showNet}
                  onChange={(v) => setSettings({ ...salary, showNet: v })}
                />
                <ToggleRow
                  label="Show CTC Total"
                  checked={salary.showCtcTotal}
                  onChange={(v) => setSettings({ ...salary, showCtcTotal: v })}
                />
                <ToggleRow
                  label="Employee Name in Table Header"
                  checked={salary.showEmployeeNameInHeader}
                  onChange={(v) =>
                    setSettings({ ...salary, showEmployeeNameInHeader: v })
                  }
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Amounts come from employee Salary Assignment / Structure. Statutory
                rows show Not Configured when not resolvable — never invented.
              </p>
            </>
          ) : simple ? (
            <>
              <HrOrgField label="Title" size="full">
                <Input
                  value={simple.title}
                  onChange={(e) => setSettings({ ...simple, title: e.target.value })}
                  className={hrInput()}
                />
              </HrOrgField>
              <HrOrgField label="Style" size="full">
                <Select
                  value={simple.style}
                  onValueChange={(v) =>
                    setSettings({ ...simple, style: v as HrTableBlockStyle })
                  }
                >
                  <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple" className="text-xs">
                      Simple
                    </SelectItem>
                    <SelectItem value="bordered" className="text-xs">
                      Bordered
                    </SelectItem>
                    <SelectItem value="compact" className="text-xs">
                      Compact
                    </SelectItem>
                    <SelectItem value="highlight_totals" className="text-xs">
                      Highlight Totals
                    </SelectItem>
                  </SelectContent>
                </Select>
              </HrOrgField>
              <div className="rounded-xl border border-border bg-muted/20 px-3 py-2">
                <ToggleRow
                  label="Show Totals"
                  checked={simple.showTotals}
                  onChange={(v) => setSettings({ ...simple, showTotals: v })}
                />
              </div>
              <p className="text-[10px] text-muted-foreground">
                Payslip blocks use finalized payroll result rows — not salary
                assignment estimates.
              </p>
            </>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          {onRemove ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={hrBtn("text-red-600 mr-auto")}
              onClick={onRemove}
            >
              Remove Block
            </Button>
          ) : null}
          <Button type="button" variant="outline" size="sm" className={hrBtn()} onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={hrBtn("", true)}
            onClick={() => {
              const cleaned = isSalary
                ? normalizeSalaryBreakupSettings(settings)
                : normalizeSimpleTableSettings(
                    settings,
                    getBlockDefinition(block.blockType as HrTemplateBlockType)?.label ??
                      "Table",
                  );
              onSave(cleaned);
            }}
          >
            Apply
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
