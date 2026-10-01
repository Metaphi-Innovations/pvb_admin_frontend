"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Scale, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  applicabilityLabel,
  findApplicabilityAmbiguities,
  findEffectivePeriodConflicts,
  findSlabSalaryOverlaps,
  formatPtEffectivePeriod,
  formatPtSalaryRange,
  getProfessionalTaxStateOptions,
  loadProfessionalTaxConfigurations,
  nextProfessionalTaxConfigurationId,
  PT_APPLICABILITY_OPTIONS,
  PT_MONTH_OPTIONS,
  PT_SALARY_BASIS_OPTIONS,
  salaryBasisLabel,
  saveProfessionalTaxConfigurations,
  withPtConfigNewAudit,
  withPtConfigUpdateAudit,
  type ProfessionalTaxConfiguration,
  type ProfessionalTaxSlab,
  type PtApplicability,
  type PtSalaryBasis,
} from "../../professional-tax-data";

type SlabForm = {
  key: string;
  id?: number;
  applicability: PtApplicability;
  salaryFrom: string;
  salaryTo: string;
  unlimitedUpper: boolean;
  amount: string;
  hasSpecialMonth: boolean;
  specialMonth: string;
  specialMonthAmount: string;
};

type FormState = {
  id?: number;
  state: string;
  salaryBasis: PtSalaryBasis;
  effectiveFrom: string;
  effectiveTo: string;
  status: ProfessionalTaxConfiguration["status"];
  slabs: SlabForm[];
};

const EMPTY: FormState = {
  state: "",
  salaryBasis: "monthly_gross",
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
  slabs: [
    {
      key: "new-1",
      applicability: "all",
      salaryFrom: "0",
      salaryTo: "",
      unlimitedUpper: true,
      amount: "0",
      hasSpecialMonth: false,
      specialMonth: "",
      specialMonthAmount: "",
    },
  ],
};

const COLUMN_DEFS = [
  { id: "state", label: "State" },
  { id: "basis", label: "Salary Basis" },
  { id: "period", label: "Effective Period" },
  { id: "slabs", label: "Slabs" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: ProfessionalTaxConfiguration };
type DeleteState = { record: ProfessionalTaxConfiguration } & HrSettingsDeleteTarget;

function slabToForm(s: ProfessionalTaxSlab): SlabForm {
  return {
    key: `slab-${s.id}`,
    id: s.id,
    applicability: s.applicability,
    salaryFrom: String(s.salaryFrom),
    salaryTo: s.salaryTo != null ? String(s.salaryTo) : "",
    unlimitedUpper: s.salaryTo == null,
    amount: String(s.amount),
    hasSpecialMonth: s.specialMonth != null && s.specialMonthAmount != null,
    specialMonth: s.specialMonth != null ? String(s.specialMonth) : "",
    specialMonthAmount:
      s.specialMonthAmount != null ? String(s.specialMonthAmount) : "",
  };
}

function recordToForm(r: ProfessionalTaxConfiguration): FormState {
  return {
    id: r.id,
    state: r.state,
    salaryBasis: r.salaryBasis,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo ?? "",
    status: r.status,
    slabs:
      r.slabs.length > 0
        ? r.slabs.map(slabToForm)
        : [EMPTY.slabs[0]!],
  };
}

function parseSlabsFromForm(slabs: SlabForm[]): ProfessionalTaxSlab[] {
  let id = 1;
  return slabs.map((s) => {
    const slabId = s.id ?? id++;
    if (s.id != null) id = Math.max(id, s.id + 1);
    return {
      id: slabId,
      applicability: s.applicability,
      salaryFrom: s.salaryFrom.trim() === "" ? 0 : Number(s.salaryFrom.replace(/,/g, "")),
      salaryTo: s.unlimitedUpper
        ? null
        : Number(s.salaryTo.replace(/,/g, "")),
      amount: Number(s.amount),
      specialMonth: s.hasSpecialMonth ? Number(s.specialMonth) : null,
      specialMonthAmount: s.hasSpecialMonth ? Number(s.specialMonthAmount) : null,
    };
  });
}

export default function ProfessionalTaxClient() {
  const [records, setRecords] = useState<ProfessionalTaxConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [slabWarning, setSlabWarning] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const stateOptions = useMemo(() => getProfessionalTaxStateOptions(), []);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadProfessionalTaxConfigurations());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-professional-tax-configs-updated", onUpd);
    window.addEventListener("hr-professional-tax-rules-updated", onUpd);
    return () => {
      window.removeEventListener("hr-professional-tax-configs-updated", onUpd);
      window.removeEventListener("hr-professional-tax-rules-updated", onUpd);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.state.toLowerCase().includes(q) ||
        salaryBasisLabel(r.salaryBasis).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY);
    setErrors({});
    setSlabWarning(null);
  };

  const openAdd = () => {
    setForm({
      ...EMPTY,
      slabs: [{ ...EMPTY.slabs[0]!, key: `new-${Date.now()}` }],
    });
    setErrors({});
    setSlabWarning(null);
    setSheetOpen(true);
  };

  const openEdit = (record: ProfessionalTaxConfiguration) => {
    setForm(recordToForm(record));
    setErrors({});
    setSlabWarning(null);
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

  const updateSlab = (key: string, patch: Partial<SlabForm>) => {
    setForm((f) => ({
      ...f,
      slabs: f.slabs.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
    setErrors((e) => {
      const n = { ...e };
      delete n.slabs;
      delete n[`slab-${key}`];
      return n;
    });
  };

  const addSlab = () => {
    setForm((f) => ({
      ...f,
      slabs: [
        ...f.slabs,
        {
          key: `new-${Date.now()}`,
          applicability: "all",
          salaryFrom: "0",
          salaryTo: "",
          unlimitedUpper: true,
          amount: "0",
          hasSpecialMonth: false,
          specialMonth: "",
          specialMonthAmount: "",
        },
      ],
    }));
  };

  const removeSlab = (key: string) => {
    setForm((f) => ({
      ...f,
      slabs: f.slabs.length <= 1 ? f.slabs : f.slabs.filter((s) => s.key !== key),
    }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.state.trim()) e.state = "State is required";
    if (!form.salaryBasis) e.salaryBasis = "Salary Basis is required";
    if (!form.effectiveFrom.trim()) e.effectiveFrom = "Effective From is required";
    if (
      form.effectiveTo.trim() &&
      form.effectiveFrom.trim() &&
      form.effectiveTo < form.effectiveFrom
    ) {
      e.effectiveTo = "Effective To must be on or after Effective From";
    }
    if (form.slabs.length === 0) e.slabs = "Add at least one slab";

    for (const s of form.slabs) {
      const amount = Number(s.amount);
      if (s.amount.trim() === "" || Number.isNaN(amount) || amount < 0) {
        e.slabs = "Each slab needs a valid PT amount (≥ 0)";
        break;
      }
      const from =
        s.salaryFrom.trim() === "" ? 0 : Number(s.salaryFrom.replace(/,/g, ""));
      if (Number.isNaN(from) || from < 0) {
        e.slabs = "Invalid Salary From on a slab";
        break;
      }
      if (!s.unlimitedUpper) {
        const to = Number(s.salaryTo.replace(/,/g, ""));
        if (s.salaryTo.trim() === "" || Number.isNaN(to) || to < 0) {
          e.slabs = "Enter Salary To, or mark as and above";
          break;
        }
        if (from > to) {
          e.slabs = "Salary To must be ≥ Salary From";
          break;
        }
      }
      if (s.hasSpecialMonth) {
        if (!s.specialMonth) {
          e.slabs = "Select special month on each special-month slab";
          break;
        }
        const sa = Number(s.specialMonthAmount);
        if (s.specialMonthAmount.trim() === "" || Number.isNaN(sa) || sa < 0) {
          e.slabs = "Enter special month amount";
          break;
        }
      }
    }

    let parsed: ProfessionalTaxSlab[] = [];
    if (!e.slabs) {
      parsed = parseSlabsFromForm(form.slabs);
      const overlaps = findSlabSalaryOverlaps(parsed);
      if (overlaps.length > 0) {
        const o = overlaps[0]!;
        e.slabs = `Overlapping salary ranges for ${applicabilityLabel(o.applicability)} (rows ${o.aIndex + 1} & ${o.bIndex + 1})`;
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
      e.effectiveFrom = `Overlaps active ${form.state} configuration (${periodConflicts[0]!.effectiveFrom}). End the prior version first.`;
    }

    if (!e.slabs && parsed.length > 0) {
      const amb = findApplicabilityAmbiguities(parsed);
      setSlabWarning(
        amb.length > 0
          ? "Some All Employees slabs overlap Male/Female ranges. Specific applicability wins at calculation time."
          : null,
      );
    } else {
      setSlabWarning(null);
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const slabs = parseSlabsFromForm(form.slabs);
    // Reassign sequential ids for new slabs
    let nextId = 1;
    const normalizedSlabs = slabs.map((s) => {
      const id = s.id > 0 ? s.id : nextId;
      nextId = Math.max(nextId, id + 1);
      return { ...s, id };
    });

    const payload = {
      state: form.state.trim(),
      salaryBasis: form.salaryBasis,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
      slabs: normalizedSlabs,
    };

    let next = [...records];
    if (form.id) {
      next = next.map((r) =>
        r.id === form.id ? withPtConfigUpdateAudit({ ...r, ...payload, id: r.id }) : r,
      );
      setToast("Professional Tax configuration updated.");
    } else {
      next = [
        ...next,
        withPtConfigNewAudit({
          ...payload,
          id: nextProfessionalTaxConfigurationId(records),
        }),
      ];
      setToast("Professional Tax configuration created.");
    }
    saveProfessionalTaxConfigurations(next);
    closeSheet();
    refresh();
  };

  const applyStatus = (record: ProfessionalTaxConfiguration, nextActive: boolean) => {
    saveProfessionalTaxConfigurations(
      records.map((r) =>
        r.id === record.id
          ? withPtConfigUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(`${record.state} PT configuration`, nextActive));
    refresh();
  };

  const handleStatusToggle = (
    record: ProfessionalTaxConfiguration,
    nextActive: boolean,
  ) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: ProfessionalTaxConfiguration) => {
    setDeleteTarget({
      record,
      entityLabel: "Professional Tax Configuration",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveProfessionalTaxConfigurations(
      records.filter((r) => r.id !== deleteTarget.record.id),
    );
    setSelectedIds([]);
    refresh();
    setToast("Professional Tax configuration deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<ProfessionalTaxConfiguration>[] = [
    {
      id: "state",
      label: "State",
      sortable: true,
      sortValue: (r) => r.state,
      render: (r) => <span className="font-semibold text-foreground">{r.state}</span>,
    },
    {
      id: "basis",
      label: "Salary Basis",
      sortable: true,
      sortValue: (r) => r.salaryBasis,
      render: (r) => (
        <span className="text-muted-foreground">{salaryBasisLabel(r.salaryBasis)}</span>
      ),
    },
    {
      id: "period",
      label: "Effective Period",
      sortable: true,
      sortValue: (r) => r.effectiveFrom,
      render: (r) => (
        <span className="text-muted-foreground">{formatPtEffectivePeriod(r)}</span>
      ),
    },
    {
      id: "slabs",
      label: "Slabs",
      sortable: true,
      sortValue: (r) => r.slabs.length,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {r.slabs.length} Slab{r.slabs.length === 1 ? "" : "s"}
        </span>
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
      className: "w-[5.5rem]",
      render: (r) => (
        <HrRowActions onEdit={() => openEdit(r)} onDelete={() => requestDelete(r)} />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Professional Tax"
      description="Configure state-wise Professional Tax rules used during payroll."
      icon={Scale}
      sectionLabel="Statutory Compliance"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add PT Configuration
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
              "hr-professional-tax-configs.csv",
              [
                "State",
                "Salary Basis",
                "Effective From",
                "Effective To",
                "Slabs",
                "Status",
              ],
              filtered.map((r) => [
                r.state,
                salaryBasisLabel(r.salaryBasis),
                r.effectiveFrom,
                r.effectiveTo ?? "",
                String(r.slabs.length),
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
          emptyTitle="No Professional Tax configurations yet"
          emptyDescription="Add a state configuration with salary slabs. Until a state is configured, Employee Salary shows Not Configured — not ₹0."
          emptyActionLabel="+ Add PT Configuration"
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
        title={form.id ? "Edit PT Configuration" : "Add PT Configuration"}
        description="State-level Professional Tax rule with configurable salary basis and slabs."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
        contentClassName="!max-w-[760px] sm:!max-w-[760px]"
      >
        <div className="space-y-4 pb-1">
          <div className="pb-2.5 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Rule Details
            </p>
          </div>

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

          <HrOrgField
            label="Salary Basis"
            required
            size="full"
            error={errors.salaryBasis}
            helper={
              PT_SALARY_BASIS_OPTIONS.find((o) => o.value === form.salaryBasis)?.helper
            }
          >
            <Select
              value={form.salaryBasis}
              onValueChange={(v) => set("salaryBasis", v as PtSalaryBasis)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PT_SALARY_BASIS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

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
            helper={
              form.status === "active"
                ? "Used when resolving PT for this state and period"
                : "Inactive configurations are ignored"
            }
          />

          <div className="pb-2.5 border-b border-border pt-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                PT Slabs
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={hrBtn("h-7 text-[11px] gap-1")}
                onClick={addSlab}
              >
                <Plus className="w-3 h-3" /> Add Slab
              </Button>
            </div>
          </div>

          {errors.slabs ? <p className="text-xs text-red-500">{errors.slabs}</p> : null}
          {slabWarning ? (
            <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
              {slabWarning}
            </p>
          ) : null}

          <div className="space-y-3">
            {form.slabs.map((s, idx) => (
              <div
                key={s.key}
                className="rounded-xl border border-border bg-muted/10 p-3 space-y-2.5"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-semibold text-foreground">Slab {idx + 1}</p>
                  <button
                    type="button"
                    className="p-1 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 disabled:opacity-40"
                    disabled={form.slabs.length <= 1}
                    onClick={() => removeSlab(s.key)}
                    aria-label="Delete slab"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <HrOrgField label="Applicability" size="full">
                    <Select
                      value={s.applicability}
                      onValueChange={(v) =>
                        updateSlab(s.key, { applicability: v as PtApplicability })
                      }
                    >
                      <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PT_APPLICABILITY_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </HrOrgField>
                  <HrOrgField label="PT Amount (₹)" size="full">
                    <Input
                      inputMode="numeric"
                      value={s.amount}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          amount: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder="0"
                    />
                  </HrOrgField>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <HrOrgField label="Salary From (₹)" size="full">
                    <Input
                      inputMode="numeric"
                      value={s.salaryFrom}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          salaryFrom: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder="0"
                    />
                  </HrOrgField>
                  <HrOrgField
                    label="Salary To (₹)"
                    size="full"
                    helper={s.unlimitedUpper ? "And above" : undefined}
                  >
                    <Input
                      inputMode="numeric"
                      value={s.unlimitedUpper ? "" : s.salaryTo}
                      disabled={s.unlimitedUpper}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          salaryTo: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder="10000"
                    />
                  </HrOrgField>
                </div>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600"
                    checked={s.unlimitedUpper}
                    onChange={(e) =>
                      updateSlab(s.key, {
                        unlimitedUpper: e.target.checked,
                        salaryTo: e.target.checked ? "" : s.salaryTo,
                      })
                    }
                  />
                  No upper limit (and above)
                </label>

                <label className="flex items-center gap-2 text-xs text-foreground cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600"
                    checked={s.hasSpecialMonth}
                    onChange={(e) =>
                      updateSlab(s.key, { hasSpecialMonth: e.target.checked })
                    }
                  />
                  Special month amount
                </label>

                {s.hasSpecialMonth ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <HrOrgField label="Special Month" size="full">
                      <Select
                        value={s.specialMonth || undefined}
                        onValueChange={(v) => updateSlab(s.key, { specialMonth: v })}
                      >
                        <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                          <SelectValue placeholder="Select month…" />
                        </SelectTrigger>
                        <SelectContent>
                          {PT_MONTH_OPTIONS.map((m) => (
                            <SelectItem
                              key={m.value}
                              value={String(m.value)}
                              className="text-xs"
                            >
                              {m.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </HrOrgField>
                    <HrOrgField label="Special Amount (₹)" size="full">
                      <Input
                        inputMode="numeric"
                        value={s.specialMonthAmount}
                        onChange={(e) =>
                          updateSlab(s.key, {
                            specialMonthAmount: e.target.value.replace(/[^\d]/g, ""),
                          })
                        }
                        className={hrInput()}
                        placeholder="300"
                      />
                    </HrOrgField>
                  </div>
                ) : null}

                <p className="text-[11px] text-muted-foreground">
                  Range preview:{" "}
                  {formatPtSalaryRange({
                    salaryFrom: Number(s.salaryFrom) || 0,
                    salaryTo: s.unlimitedUpper
                      ? null
                      : s.salaryTo
                        ? Number(s.salaryTo)
                        : null,
                  })}
                </p>
              </div>
            ))}
          </div>
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) applyStatus(confirm.record, false);
          setConfirm(null);
        }}
        destructive
        title="Deactivate PT configuration?"
        description={`${confirm?.record.state ?? ""} — ${
          confirm ? formatPtEffectivePeriod(confirm.record) : ""
        }. Employees in this state may show Not Configured if no other active version remains.`}
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
