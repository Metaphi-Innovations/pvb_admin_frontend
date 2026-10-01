"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Calculator, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  hrInput,
  hrBtn,
  HrStatusToggle,
} from "../../organization/_components";
import {
  LOP_PER_DAY_BASIS_OPTIONS,
  LOP_ROUND_OFF_OPTIONS,
  loadLopSettings,
  perDayBasisLabel,
  roundOffRuleLabel,
  saveLopSettings,
  type LopPerDayBasis,
  type LopRoundOffRule,
  type LopSettings,
} from "../../lop-settings-data";

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2.5 border-b border-border/60 last:border-0">
      <p className="text-xs text-muted-foreground shrink-0">{label}</p>
      <p className="text-xs font-medium text-foreground text-right">{value}</p>
    </div>
  );
}

export default function LopRulesClient() {
  const [settings, setSettings] = useState<LopSettings>(() => loadLopSettings());
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<LopSettings>(() => loadLopSettings());
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    const next = loadLopSettings();
    setSettings(next);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-lop-settings-updated", onUpd);
    return () => window.removeEventListener("hr-lop-settings-updated", onUpd);
  }, [refresh]);

  const openEdit = () => {
    setForm({ ...loadLopSettings() });
    setSheetOpen(true);
  };

  const closeSheet = () => setSheetOpen(false);

  const set = <K extends keyof LopSettings>(key: K, value: LopSettings[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
  };

  const handleUpdate = () => {
    const payload: LopSettings = {
      ...form,
      halfDayFraction: 0.5,
      // When LOP off, keep other fields but they are inactive in UI
      lopEnabled: form.lopEnabled,
    };
    saveLopSettings(payload);
    refresh();
    closeSheet();
    setToast("LOP Rules updated.");
  };

  const dependentsDisabled = !form.lopEnabled;
  const basisHelper =
    LOP_PER_DAY_BASIS_OPTIONS.find((o) => o.value === form.perDayBasis)?.helper ?? "";

  return (
    <HrOrgPageHeader
      title="LOP Rules"
      description="Configure how unpaid days and absences reduce payable salary."
      icon={Calculator}
      sectionLabel="Payroll Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5")} variant="outline" onClick={openEdit}>
          <Pencil className="w-3.5 h-3.5" /> Edit
        </Button>
      }
    >
      <div className="max-w-xl">
        <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="px-4 py-2.5 border-b border-border bg-muted/20">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Current Configuration
            </p>
          </div>
          <div className="px-4 py-1">
            <SummaryRow
              label="LOP"
              value={settings.lopEnabled ? "Enabled" : "Disabled"}
            />
            <SummaryRow
              label="Per-Day Salary Basis"
              value={perDayBasisLabel(settings.perDayBasis)}
            />
            <SummaryRow
              label="Prorate Earnings"
              value={settings.prorateEarnings ? "Yes" : "No"}
            />
            <SummaryRow
              label="Half Day LOP"
              value={
                settings.halfDayLopEnabled
                  ? `${settings.halfDayFraction} Day`
                  : "Off"
              }
            />
            <SummaryRow
              label="Employer Contributions"
              value={
                settings.prorateEmployerContributions
                  ? "Use prorated salary basis"
                  : "Do not prorate via LOP"
              }
            />
            <SummaryRow
              label="Round-off"
              value={roundOffRuleLabel(settings.roundOffRule)}
            />
          </div>
          <div className="px-4 py-2.5 border-t border-border bg-muted/10">
            <p className="text-[11px] text-muted-foreground leading-snug">
              Employee Salary continues to show monthly eligible amounts. Payable salary after
              LOP is calculated during Payroll Run. Statutory PF/ESI/PT/LWF/TDS are not deducted
              here — they recalculate from payable bases later.
            </p>
          </div>
        </div>
      </div>

      <HrFormDrawer
        open={sheetOpen}
        onOpenChange={(o) => !o && closeSheet()}
        title="Edit LOP Rules"
        description="Company-wide Loss of Pay deduction and proration settings."
        onSave={handleUpdate}
        saveLabel="Update"
      >
        <div className="space-y-5 pb-1">
          <div>
            <div className="pb-2.5 border-b border-border mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                LOP Calculation
              </p>
            </div>
            <div className="space-y-3.5">
              <HrStatusToggle
                checked={form.lopEnabled}
                onCheckedChange={(v) => set("lopEnabled", v)}
                label="LOP Enabled"
                activeLabel="ON"
                inactiveLabel="OFF"
                size="sm"
                helper={
                  form.lopEnabled
                    ? "Unpaid days reduce payable earnings using the rules below."
                    : "No LOP salary deduction will be applied."
                }
              />

              <HrOrgField
                label="Per-Day Salary Basis"
                required
                size="full"
                helper={
                  dependentsDisabled
                    ? "Enable LOP to configure per-day basis."
                    : basisHelper
                }
              >
                <Select
                  value={form.perDayBasis}
                  disabled={dependentsDisabled}
                  onValueChange={(v) => set("perDayBasis", v as LopPerDayBasis)}
                >
                  <SelectTrigger
                    className={cn(
                      hrInput(),
                      "h-9 text-xs",
                      dependentsDisabled && "opacity-60",
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LOP_PER_DAY_BASIS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrOrgField>
            </div>
          </div>

          <div>
            <div className="pb-2.5 border-b border-border mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Salary Proration
              </p>
            </div>
            <div className="space-y-3.5">
              <HrStatusToggle
                checked={form.prorateEarnings}
                onCheckedChange={(v) => set("prorateEarnings", v)}
                label="Prorate Earnings"
                activeLabel="ON"
                inactiveLabel="OFF"
                size="sm"
                className={dependentsDisabled ? "opacity-60 pointer-events-none" : undefined}
                helper="When ON, LOP-applicable earning components are reduced. Component flag: Salary Components → LOP Applicable."
              />
              <HrStatusToggle
                checked={form.prorateEmployerContributions}
                onCheckedChange={(v) => set("prorateEmployerContributions", v)}
                label="Prorate Employer Contributions"
                activeLabel="ON"
                inactiveLabel="OFF"
                size="sm"
                className={dependentsDisabled ? "opacity-60 pointer-events-none" : undefined}
                helper="When ON, statutory engines should use prorated/payable salary bases later. LOP does not manually deduct employer PF/ESI."
              />
            </div>
          </div>

          <div>
            <div className="pb-2.5 border-b border-border mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Half Day
              </p>
            </div>
            <HrStatusToggle
              checked={form.halfDayLopEnabled}
              onCheckedChange={(v) => set("halfDayLopEnabled", v)}
              label="Half Day LOP"
              activeLabel="ON"
              inactiveLabel="OFF"
              size="sm"
              className={dependentsDisabled ? "opacity-60 pointer-events-none" : undefined}
              helper={
                form.halfDayLopEnabled
                  ? "One unpaid Half Day counts as 0.5 LOP day."
                  : "Half Day attendance does not add LOP days."
              }
            />
          </div>

          <div>
            <div className="pb-2.5 border-b border-border mb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Rounding
              </p>
            </div>
            <HrOrgField
              label="Round-off Rule"
              size="full"
              helper="Applied to monetary LOP deduction and payable amounts."
            >
              <Select
                value={form.roundOffRule}
                disabled={dependentsDisabled}
                onValueChange={(v) => set("roundOffRule", v as LopRoundOffRule)}
              >
                <SelectTrigger
                  className={cn(
                    hrInput(),
                    "h-9 text-xs",
                    dependentsDisabled && "opacity-60",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOP_ROUND_OFF_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
          </div>
        </div>
      </HrFormDrawer>

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
