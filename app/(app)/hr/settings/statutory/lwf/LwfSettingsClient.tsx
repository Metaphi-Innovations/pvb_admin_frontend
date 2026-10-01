"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrRowActions,
  HrListingToolbar,
  HrDataGrid,
  exportOrgCsv,
  hrInput,
  hrBtn,
  HrStatusToggle,
  HR_DRAWER_WIDTH_CLASS,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  findEffectivePeriodConflicts,
  formatLwfContributionSummary,
  formatLwfEffectivePeriod,
  formatLwfMonths,
  frequencyLabel,
  frequencyRequiresMonths,
  getLwfStateOptions,
  loadLwfConfigurations,
  LWF_CONTRIBUTION_TYPE_OPTIONS,
  LWF_FREQUENCY_OPTIONS,
  LWF_MONTH_OPTIONS,
  LWF_SALARY_BASIS_OPTIONS,
  nextLwfConfigurationId,
  salaryBasisLabel,
  saveLwfConfigurations,
  withLwfConfigNewAudit,
  withLwfConfigUpdateAudit,
  type LwfConfiguration,
  type LwfContributionType,
  type LwfFrequency,
  type LwfSalaryBasis,
} from "../../lwf-settings-data";

type FormState = {
  id?: number;
  state: string;
  employeeContributionType: LwfContributionType;
  employeeContributionValue: string;
  employeeCalculateOn: LwfSalaryBasis;
  employerContributionType: LwfContributionType;
  employerContributionValue: string;
  employerCalculateOn: LwfSalaryBasis;
  frequency: LwfFrequency;
  contributionMonths: number[];
  salaryEligibilityEnabled: boolean;
  eligibilitySalaryBasis: LwfSalaryBasis;
  minSalary: string;
  maxSalary: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: LwfConfiguration["status"];
};

const EMPTY: FormState = {
  state: "",
  employeeContributionType: "fixed",
  employeeContributionValue: "",
  employeeCalculateOn: "gross_earnings",
  employerContributionType: "fixed",
  employerContributionValue: "",
  employerCalculateOn: "gross_earnings",
  frequency: "monthly",
  contributionMonths: [],
  salaryEligibilityEnabled: false,
  eligibilitySalaryBasis: "gross_earnings",
  minSalary: "",
  maxSalary: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "state", label: "State" },
  { id: "employee", label: "Employee Contribution" },
  { id: "employer", label: "Employer Contribution" },
  { id: "frequency", label: "Frequency" },
  { id: "months", label: "Contribution Months" },
  { id: "period", label: "Effective Period" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: LwfConfiguration };
type DeleteState = { record: LwfConfiguration } & HrSettingsDeleteTarget;

function recordToForm(r: LwfConfiguration): FormState {
  return {
    id: r.id,
    state: r.state,
    employeeContributionType: r.employeeContributionType,
    employeeContributionValue: String(r.employeeContributionValue),
    employeeCalculateOn: r.employeeCalculateOn ?? "gross_earnings",
    employerContributionType: r.employerContributionType,
    employerContributionValue: String(r.employerContributionValue),
    employerCalculateOn: r.employerCalculateOn ?? "gross_earnings",
    frequency: r.frequency,
    contributionMonths: [...r.contributionMonths],
    salaryEligibilityEnabled: r.salaryEligibilityEnabled,
    eligibilitySalaryBasis: r.eligibilitySalaryBasis ?? "gross_earnings",
    minSalary: r.minSalary != null ? String(r.minSalary) : "",
    maxSalary: r.maxSalary != null ? String(r.maxSalary) : "",
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo ?? "",
    status: r.status,
  };
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <p className="text-xs text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

function toggleMonth(months: number[], month: number): number[] {
  if (months.includes(month)) return months.filter((m) => m !== month);
  return [...months, month].sort((a, b) => a - b);
}

export default function LwfSettingsClient() {
  const [records, setRecords] = useState<LwfConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<LwfConfiguration | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const stateOptions = useMemo(() => getLwfStateOptions(), []);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadLwfConfigurations());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-lwf-configurations-updated", onUpd);
    return () => window.removeEventListener("hr-lwf-configurations-updated", onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.state.toLowerCase().includes(q) ||
        frequencyLabel(r.frequency).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY);
    setErrors({});
  };

  const openAdd = () => {
    setForm({ ...EMPTY });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: LwfConfiguration) => {
    setForm(recordToForm(record));
    setErrors({});
    setSheetOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key as string];
      return n;
    });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.state.trim()) e.state = "State is required";
    if (!form.effectiveFrom.trim()) e.effectiveFrom = "Effective From is required";
    if (
      form.effectiveTo.trim() &&
      form.effectiveFrom.trim() &&
      form.effectiveTo < form.effectiveFrom
    ) {
      e.effectiveTo = "Effective To must be on or after Effective From";
    }

    const empVal = Number(form.employeeContributionValue);
    if (
      form.employeeContributionValue.trim() === "" ||
      Number.isNaN(empVal) ||
      empVal < 0
    ) {
      e.employeeContributionValue = "Enter a valid employee contribution";
    }

    const erVal = Number(form.employerContributionValue);
    if (
      form.employerContributionValue.trim() === "" ||
      Number.isNaN(erVal) ||
      erVal < 0
    ) {
      e.employerContributionValue = "Enter a valid employer contribution";
    }

    if (frequencyRequiresMonths(form.frequency) && form.contributionMonths.length === 0) {
      e.contributionMonths = "Select at least one contribution month";
    }

    if (form.salaryEligibilityEnabled) {
      const min =
        form.minSalary.trim() === "" ? null : Number(form.minSalary.replace(/,/g, ""));
      const max =
        form.maxSalary.trim() === "" ? null : Number(form.maxSalary.replace(/,/g, ""));
      if (min != null && (Number.isNaN(min) || min < 0)) {
        e.minSalary = "Enter a valid minimum salary";
      }
      if (max != null && (Number.isNaN(max) || max < 0)) {
        e.maxSalary = "Enter a valid maximum salary";
      }
      if (min != null && max != null && min > max) {
        e.maxSalary = "Maximum must be ≥ minimum";
      }
    }

    const periodConflicts = findEffectivePeriodConflicts(records, {
      id: form.id ?? -1,
      state: form.state.trim(),
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    });
    if (periodConflicts.length > 0) {
      e.effectiveFrom = `Overlaps active ${form.state} rule (${periodConflicts[0]!.effectiveFrom}). End the prior version first.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      state: form.state.trim(),
      applicability: "all" as const,
      employeeContributionType: form.employeeContributionType,
      employeeContributionValue: Number(form.employeeContributionValue) || 0,
      employeeCalculateOn:
        form.employeeContributionType === "percentage"
          ? form.employeeCalculateOn
          : null,
      employerContributionType: form.employerContributionType,
      employerContributionValue: Number(form.employerContributionValue) || 0,
      employerCalculateOn:
        form.employerContributionType === "percentage"
          ? form.employerCalculateOn
          : null,
      frequency: form.frequency,
      contributionMonths: frequencyRequiresMonths(form.frequency)
        ? form.contributionMonths
        : [],
      salaryEligibilityEnabled: form.salaryEligibilityEnabled,
      eligibilitySalaryBasis: form.salaryEligibilityEnabled
        ? form.eligibilitySalaryBasis
        : null,
      minSalary:
        form.salaryEligibilityEnabled && form.minSalary.trim()
          ? Number(form.minSalary.replace(/,/g, ""))
          : null,
      maxSalary:
        form.salaryEligibilityEnabled && form.maxSalary.trim()
          ? Number(form.maxSalary.replace(/,/g, ""))
          : null,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    };

    let next = [...records];
    if (form.id) {
      next = next.map((r) =>
        r.id === form.id ? withLwfConfigUpdateAudit({ ...r, ...payload, id: r.id }) : r,
      );
      setToast("LWF rule updated.");
    } else {
      next = [
        ...next,
        withLwfConfigNewAudit({
          ...payload,
          id: nextLwfConfigurationId(records),
        }),
      ];
      setToast("LWF rule created.");
    }
    saveLwfConfigurations(next);
    closeSheet();
    refresh();
  };

  const applyStatus = (record: LwfConfiguration, nextActive: boolean) => {
    saveLwfConfigurations(
      records.map((r) =>
        r.id === record.id
          ? withLwfConfigUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(`${record.state} LWF rule`, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: LwfConfiguration, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: LwfConfiguration) => {
    setDeleteTarget({
      record,
      entityLabel: "LWF Rule",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveLwfConfigurations(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast("LWF rule deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<LwfConfiguration>[] = [
    {
      id: "state",
      label: "State",
      sortable: true,
      sortValue: (r) => r.state,
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-foreground hover:text-brand-700 text-left"
          onClick={() => setViewRecord(r)}
        >
          {r.state}
        </button>
      ),
    },
    {
      id: "employee",
      label: "Employee Contribution",
      sortable: false,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatLwfContributionSummary(
            r.employeeContributionType,
            r.employeeContributionValue,
            r.employeeCalculateOn,
          )}
        </span>
      ),
    },
    {
      id: "employer",
      label: "Employer Contribution",
      sortable: false,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatLwfContributionSummary(
            r.employerContributionType,
            r.employerContributionValue,
            r.employerCalculateOn,
          )}
        </span>
      ),
    },
    {
      id: "frequency",
      label: "Frequency",
      sortable: true,
      sortValue: (r) => r.frequency,
      render: (r) => (
        <span className="text-muted-foreground">{frequencyLabel(r.frequency)}</span>
      ),
    },
    {
      id: "months",
      label: "Contribution Months",
      sortable: false,
      render: (r) => (
        <span className="text-muted-foreground">
          {r.frequency === "monthly" ? "Every month" : formatLwfMonths(r.contributionMonths)}
        </span>
      ),
    },
    {
      id: "period",
      label: "Effective Period",
      sortable: true,
      sortValue: (r) => r.effectiveFrom,
      render: (r) => (
        <span className="text-muted-foreground">{formatLwfEffectivePeriod(r)}</span>
      ),
    },
    {
      id: "status",
      label: "Active",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <HrActiveStatusSwitch
          checked={r.status === "active"}
          onCheckedChange={(active) => handleStatusToggle(r, active)}
        />
      ),
    },
    {
      id: "actions",
      label: "",
      className: "w-[7rem]",
      render: (r) => (
        <HrRowActions
          onView={() => setViewRecord(r)}
          onEdit={() => openEdit(r)}
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Labour Welfare Fund"
      description="Configure state-wise employee and employer LWF contribution rules."
      icon={Scale}
      sectionLabel="Statutory Compliance"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add LWF Rule
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by state…"
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          density={density}
          onDensityChange={setDensity}
          columns={COLUMN_DEFS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          selectedCount={selectedIds.length}
          onRefresh={refresh}
          onExport={() =>
            exportOrgCsv(
              "hr-lwf-configurations.csv",
              [
                "State",
                "Employee Contribution",
                "Employer Contribution",
                "Frequency",
                "Contribution Months",
                "Effective From",
                "Effective To",
                "Status",
              ],
              filtered.map((r) => [
                r.state,
                formatLwfContributionSummary(
                  r.employeeContributionType,
                  r.employeeContributionValue,
                  r.employeeCalculateOn,
                ),
                formatLwfContributionSummary(
                  r.employerContributionType,
                  r.employerContributionValue,
                  r.employerCalculateOn,
                ),
                frequencyLabel(r.frequency),
                r.frequency === "monthly"
                  ? "Every month"
                  : formatLwfMonths(r.contributionMonths),
                r.effectiveFrom,
                r.effectiveTo ?? "",
                r.status,
              ]),
            )
          }
        />

        <HrDataGrid
          rows={filtered}
          columns={columns}
          visibleColumnIds={visibleColumns}
          density={density}
          loading={loading}
          isEmptyStore={records.length === 0}
          emptyTitle="No LWF rules yet"
          emptyDescription="Add a state-wise LWF configuration. Until a rule exists for a state, Employee Salary shows Not Configured."
          emptyActionLabel="+ Add LWF Rule"
          onEmptyAction={openAdd}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <HrFormDrawer
        open={sheetOpen}
        onOpenChange={(o) => !o && closeSheet()}
        title={form.id ? "Edit LWF Rule" : "Add LWF Rule"}
        description="State-wise LWF contribution rules. Amounts, rates, and months are settings data — not hardcoded law."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
        contentClassName="!max-w-[560px] sm:!max-w-[560px]"
      >
        <div className="space-y-3.5 pb-1">
          <HrOrgField label="State" required size="full" error={errors.state}>
            <Select value={form.state || undefined} onValueChange={(v) => set("state", v)}>
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue placeholder="Select state…" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <HrOrgField label="Applicability" size="full" helper="All Employees for this state rule.">
            <Input value="All Employees" disabled className={hrInput()} />
          </HrOrgField>

          <div className="pb-2 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Employee Contribution
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HrOrgField label="Contribution Type" required size="full">
              <Select
                value={form.employeeContributionType}
                onValueChange={(v) =>
                  set("employeeContributionType", v as LwfContributionType)
                }
              >
                <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LWF_CONTRIBUTION_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
            <HrOrgField
              label={
                form.employeeContributionType === "fixed"
                  ? "Amount (₹)"
                  : "Rate (%)"
              }
              required
              size="full"
              error={errors.employeeContributionValue}
            >
              <Input
                inputMode="decimal"
                value={form.employeeContributionValue}
                onChange={(e) =>
                  set(
                    "employeeContributionValue",
                    e.target.value.replace(/[^\d.]/g, ""),
                  )
                }
                className={hrInput(
                  undefined,
                  errors.employeeContributionValue ? "error" : "default",
                )}
                placeholder={form.employeeContributionType === "fixed" ? "20" : "0.5"}
              />
            </HrOrgField>
          </div>
          {form.employeeContributionType === "percentage" ? (
            <HrOrgField label="Calculate On" required size="full">
              <Select
                value={form.employeeCalculateOn}
                onValueChange={(v) => set("employeeCalculateOn", v as LwfSalaryBasis)}
              >
                <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LWF_SALARY_BASIS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Employer Contribution
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HrOrgField label="Contribution Type" required size="full">
              <Select
                value={form.employerContributionType}
                onValueChange={(v) =>
                  set("employerContributionType", v as LwfContributionType)
                }
              >
                <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LWF_CONTRIBUTION_TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
            <HrOrgField
              label={
                form.employerContributionType === "fixed"
                  ? "Amount (₹)"
                  : "Rate (%)"
              }
              required
              size="full"
              error={errors.employerContributionValue}
            >
              <Input
                inputMode="decimal"
                value={form.employerContributionValue}
                onChange={(e) =>
                  set(
                    "employerContributionValue",
                    e.target.value.replace(/[^\d.]/g, ""),
                  )
                }
                className={hrInput(
                  undefined,
                  errors.employerContributionValue ? "error" : "default",
                )}
                placeholder={form.employerContributionType === "fixed" ? "60" : "1"}
              />
            </HrOrgField>
          </div>
          {form.employerContributionType === "percentage" ? (
            <HrOrgField label="Calculate On" required size="full">
              <Select
                value={form.employerCalculateOn}
                onValueChange={(v) => set("employerCalculateOn", v as LwfSalaryBasis)}
              >
                <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LWF_SALARY_BASIS_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Frequency
            </p>
          </div>

          <HrOrgField label="Contribution Frequency" required size="full">
            <Select
              value={form.frequency}
              onValueChange={(v) => set("frequency", v as LwfFrequency)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LWF_FREQUENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          {frequencyRequiresMonths(form.frequency) ? (
            <HrOrgField
              label="Contribution Month(s)"
              required
              size="full"
              error={errors.contributionMonths}
            >
              <div className="flex flex-wrap gap-1.5">
                {LWF_MONTH_OPTIONS.map((m) => {
                  const on = form.contributionMonths.includes(m.value);
                  return (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() =>
                        set("contributionMonths", toggleMonth(form.contributionMonths, m.value))
                      }
                      className={cn(
                        "h-7 px-2 text-[11px] rounded-lg border font-medium transition-colors",
                        on
                          ? "bg-brand-50 border-brand-400 text-brand-700"
                          : "border-border text-muted-foreground hover:bg-muted",
                      )}
                    >
                      {m.label.slice(0, 3)}
                    </button>
                  );
                })}
              </div>
            </HrOrgField>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Salary Eligibility (optional)
            </p>
          </div>

          <HrStatusToggle
            checked={form.salaryEligibilityEnabled}
            onCheckedChange={(v) => set("salaryEligibilityEnabled", v)}
            label="Salary Eligibility"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
            helper="Limit LWF to employees within a configured salary range."
          />
          {form.salaryEligibilityEnabled ? (
            <>
              <HrOrgField label="Salary Basis" size="full">
                <Select
                  value={form.eligibilitySalaryBasis}
                  onValueChange={(v) =>
                    set("eligibilitySalaryBasis", v as LwfSalaryBasis)
                  }
                >
                  <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LWF_SALARY_BASIS_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value} className="text-xs">
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </HrOrgField>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <HrOrgField label="Minimum Salary (₹)" size="full" error={errors.minSalary}>
                  <Input
                    inputMode="numeric"
                    value={form.minSalary}
                    onChange={(e) =>
                      set("minSalary", e.target.value.replace(/[^\d]/g, ""))
                    }
                    className={hrInput(undefined, errors.minSalary ? "error" : "default")}
                    placeholder="Optional"
                  />
                </HrOrgField>
                <HrOrgField label="Maximum Salary (₹)" size="full" error={errors.maxSalary}>
                  <Input
                    inputMode="numeric"
                    value={form.maxSalary}
                    onChange={(e) =>
                      set("maxSalary", e.target.value.replace(/[^\d]/g, ""))
                    }
                    className={hrInput(undefined, errors.maxSalary ? "error" : "default")}
                    placeholder="Optional"
                  />
                </HrOrgField>
              </div>
            </>
          ) : null}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <HrOrgField
              label="Effective From"
              required
              size="full"
              error={errors.effectiveFrom}
            >
              <HrDateInput
                value={form.effectiveFrom}
                onChange={(v) => set("effectiveFrom", v)}
                className={hrInput(undefined, errors.effectiveFrom ? "error" : "default")}
              />
            </HrOrgField>
            <HrOrgField label="Effective To" size="full" error={errors.effectiveTo}>
              <HrDateInput
                value={form.effectiveTo}
                onChange={(v) => set("effectiveTo", v)}
                className={hrInput(undefined, errors.effectiveTo ? "error" : "default")}
              />
            </HrOrgField>
          </div>

          <HrStatusToggle
            checked={form.status === "active"}
            onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
            label="Active"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
          />
        </div>
      </HrFormDrawer>

      <Sheet open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <SheetContent className={HR_DRAWER_WIDTH_CLASS}>
          <SheetHeader className="px-5 pt-4 pb-3 pr-12">
            <SheetTitle className="text-[15px] font-semibold">
              {viewRecord ? `${viewRecord.state} LWF` : "LWF Rule"}
            </SheetTitle>
            <SheetDescription className="text-xs mt-0.5">
              Read-only Labour Welfare Fund configuration.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-5 py-4 space-y-4">
            {viewRecord ? (
              <div className="grid grid-cols-2 gap-3">
                <ViewRow label="State" value={viewRecord.state} />
                <ViewRow label="Applicability" value="All Employees" />
                <ViewRow
                  label="Employee Contribution"
                  value={formatLwfContributionSummary(
                    viewRecord.employeeContributionType,
                    viewRecord.employeeContributionValue,
                    viewRecord.employeeCalculateOn,
                  )}
                />
                <ViewRow
                  label="Employer Contribution"
                  value={formatLwfContributionSummary(
                    viewRecord.employerContributionType,
                    viewRecord.employerContributionValue,
                    viewRecord.employerCalculateOn,
                  )}
                />
                <ViewRow
                  label="Frequency"
                  value={frequencyLabel(viewRecord.frequency)}
                />
                <ViewRow
                  label="Contribution Months"
                  value={
                    viewRecord.frequency === "monthly"
                      ? "Every month"
                      : formatLwfMonths(viewRecord.contributionMonths)
                  }
                />
                <ViewRow
                  label="Salary Eligibility"
                  value={
                    viewRecord.salaryEligibilityEnabled
                      ? `${salaryBasisLabel(viewRecord.eligibilitySalaryBasis ?? "gross_earnings")}${
                          viewRecord.minSalary != null
                            ? ` · min ₹${viewRecord.minSalary.toLocaleString("en-IN")}`
                            : ""
                        }${
                          viewRecord.maxSalary != null
                            ? ` · max ₹${viewRecord.maxSalary.toLocaleString("en-IN")}`
                            : ""
                        }`
                      : "Off"
                  }
                />
                <ViewRow
                  label="Effective Period"
                  value={formatLwfEffectivePeriod(viewRecord)}
                />
                <ViewRow
                  label="Status"
                  value={viewRecord.status === "active" ? "Active" : "Inactive"}
                />
              </div>
            ) : null}
          </SheetBody>
          <SheetFooter className="px-5 py-3 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={hrBtn()}
              onClick={() => setViewRecord(null)}
            >
              Close
            </Button>
            <Button
              type="button"
              size="sm"
              className={hrBtn("", true)}
              onClick={() => {
                if (!viewRecord) return;
                openEdit(viewRecord);
                setViewRecord(null);
              }}
            >
              Edit
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) applyStatus(confirm.record, false);
          setConfirm(null);
        }}
        destructive
        title="Deactivate LWF rule?"
        description={`${confirm?.record.state ?? ""}. Employees in this state may show Not Configured if no other active version remains.`}
        confirmLabel="Deactivate"
      />

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onDelete={handleDelete}
        onMakeInactive={() => {
          if (!deleteTarget) return;
          applyStatus(deleteTarget.record, false);
          setDeleteTarget(null);
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
