"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Landmark, Plus } from "lucide-react";
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
  contributionBaseLabel,
  findEffectivePeriodConflicts,
  formatPfCeilingDisplay,
  formatPfEffectivePeriod,
  formatPfMoney,
  formatPfRate,
  loadPfConfigurations,
  nextPfConfigurationId,
  PF_CONTRIBUTION_BASE_OPTIONS,
  savePfConfigurations,
  withPfConfigNewAudit,
  withPfConfigUpdateAudit,
  type PfConfiguration,
  type PfContributionBase,
} from "../../pf-settings-data";

type FormState = {
  id?: number;
  ruleName: string;
  contributionBase: PfContributionBase;
  employeePfEnabled: boolean;
  employerPfEnabled: boolean;
  employeeContributionRate: string;
  employerContributionRate: string;
  applyWageCeiling: boolean;
  wageCeiling: string;
  epsEnabled: boolean;
  epsRate: string;
  epsWageCeiling: string;
  edliEnabled: boolean;
  edliRate: string;
  edliWageCeiling: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: PfConfiguration["status"];
};

const EMPTY: FormState = {
  ruleName: "",
  contributionBase: "basic",
  employeePfEnabled: true,
  employerPfEnabled: true,
  employeeContributionRate: "",
  employerContributionRate: "",
  applyWageCeiling: false,
  wageCeiling: "",
  epsEnabled: false,
  epsRate: "",
  epsWageCeiling: "",
  edliEnabled: false,
  edliRate: "",
  edliWageCeiling: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Rule Name" },
  { id: "employee", label: "Employee Rate" },
  { id: "employer", label: "Employer Rate" },
  { id: "ceiling", label: "PF Ceiling" },
  { id: "eps", label: "EPS" },
  { id: "period", label: "Effective Period" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: PfConfiguration };
type DeleteState = { record: PfConfiguration } & HrSettingsDeleteTarget;

function recordToForm(r: PfConfiguration): FormState {
  return {
    id: r.id,
    ruleName: r.ruleName,
    contributionBase: r.contributionBase,
    employeePfEnabled: r.employeePfEnabled,
    employerPfEnabled: r.employerPfEnabled,
    employeeContributionRate: String(r.employeeContributionRate),
    employerContributionRate: String(r.employerContributionRate),
    applyWageCeiling: r.applyWageCeiling,
    wageCeiling: r.wageCeiling != null ? String(r.wageCeiling) : "",
    epsEnabled: r.epsEnabled,
    epsRate: r.epsRate != null ? String(r.epsRate) : "",
    epsWageCeiling: r.epsWageCeiling != null ? String(r.epsWageCeiling) : "",
    edliEnabled: r.edliEnabled,
    edliRate: r.edliRate != null ? String(r.edliRate) : "",
    edliWageCeiling: r.edliWageCeiling != null ? String(r.edliWageCeiling) : "",
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

export default function PfSettingsClient() {
  const [records, setRecords] = useState<PfConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<PfConfiguration | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadPfConfigurations());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-pf-configurations-updated", onUpd);
    return () => window.removeEventListener("hr-pf-configurations-updated", onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.ruleName.toLowerCase().includes(q) ||
        contributionBaseLabel(r.contributionBase).toLowerCase().includes(q),
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

  const openEdit = (record: PfConfiguration) => {
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
    if (!form.ruleName.trim()) e.ruleName = "Rule Name is required";
    if (!form.effectiveFrom.trim()) e.effectiveFrom = "Effective From is required";
    if (
      form.effectiveTo.trim() &&
      form.effectiveFrom.trim() &&
      form.effectiveTo < form.effectiveFrom
    ) {
      e.effectiveTo = "Effective To must be on or after Effective From";
    }

    const empRate = Number(form.employeeContributionRate);
    if (
      form.employeePfEnabled &&
      (form.employeeContributionRate.trim() === "" || Number.isNaN(empRate) || empRate < 0)
    ) {
      e.employeeContributionRate = "Enter a valid employee rate (≥ 0)";
    }

    const erRate = Number(form.employerContributionRate);
    if (
      form.employerPfEnabled &&
      (form.employerContributionRate.trim() === "" || Number.isNaN(erRate) || erRate < 0)
    ) {
      e.employerContributionRate = "Enter a valid employer rate (≥ 0)";
    }

    if (form.applyWageCeiling) {
      const ceil = Number(form.wageCeiling);
      if (form.wageCeiling.trim() === "" || Number.isNaN(ceil) || ceil < 0) {
        e.wageCeiling = "Enter a valid wage ceiling";
      }
    }

    if (form.epsEnabled) {
      const eps = Number(form.epsRate);
      if (form.epsRate.trim() === "" || Number.isNaN(eps) || eps < 0) {
        e.epsRate = "Enter a valid EPS rate";
      }
    }

    if (form.edliEnabled) {
      const edli = Number(form.edliRate);
      if (form.edliRate.trim() === "" || Number.isNaN(edli) || edli < 0) {
        e.edliRate = "Enter a valid EDLI rate";
      }
    }

    const periodConflicts = findEffectivePeriodConflicts(records, {
      id: form.id ?? -1,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    });
    if (periodConflicts.length > 0) {
      e.effectiveFrom = `Overlaps active rule "${periodConflicts[0]!.ruleName}" (${periodConflicts[0]!.effectiveFrom}). End the prior version first.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      ruleName: form.ruleName.trim(),
      contributionBase: form.contributionBase,
      employeePfEnabled: form.employeePfEnabled,
      employerPfEnabled: form.employerPfEnabled,
      employeeContributionRate: Number(form.employeeContributionRate) || 0,
      employerContributionRate: Number(form.employerContributionRate) || 0,
      applyWageCeiling: form.applyWageCeiling,
      wageCeiling: form.applyWageCeiling ? Number(form.wageCeiling) : null,
      epsEnabled: form.epsEnabled,
      epsRate: form.epsEnabled ? Number(form.epsRate) : null,
      epsWageCeiling:
        form.epsEnabled && form.epsWageCeiling.trim()
          ? Number(form.epsWageCeiling)
          : null,
      edliEnabled: form.edliEnabled,
      edliRate: form.edliEnabled ? Number(form.edliRate) : null,
      edliWageCeiling:
        form.edliEnabled && form.edliWageCeiling.trim()
          ? Number(form.edliWageCeiling)
          : null,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    };

    let next = [...records];
    if (form.id) {
      next = next.map((r) =>
        r.id === form.id ? withPfConfigUpdateAudit({ ...r, ...payload, id: r.id }) : r,
      );
      setToast("PF rule updated.");
    } else {
      next = [
        ...next,
        withPfConfigNewAudit({
          ...payload,
          id: nextPfConfigurationId(records),
        }),
      ];
      setToast("PF rule created.");
    }
    savePfConfigurations(next);
    closeSheet();
    refresh();
  };

  const applyStatus = (record: PfConfiguration, nextActive: boolean) => {
    savePfConfigurations(
      records.map((r) =>
        r.id === record.id
          ? withPfConfigUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.ruleName, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: PfConfiguration, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: PfConfiguration) => {
    setDeleteTarget({
      record,
      entityLabel: "PF Rule",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    savePfConfigurations(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast("PF rule deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<PfConfiguration>[] = [
    {
      id: "name",
      label: "Rule Name",
      sortable: true,
      sortValue: (r) => r.ruleName,
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-foreground hover:text-brand-700 text-left"
          onClick={() => setViewRecord(r)}
        >
          {r.ruleName}
        </button>
      ),
    },
    {
      id: "employee",
      label: "Employee Rate",
      sortable: true,
      sortValue: (r) => r.employeeContributionRate,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {r.employeePfEnabled ? formatPfRate(r.employeeContributionRate) : "Off"}
        </span>
      ),
    },
    {
      id: "employer",
      label: "Employer Rate",
      sortable: true,
      sortValue: (r) => r.employerContributionRate,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {r.employerPfEnabled ? formatPfRate(r.employerContributionRate) : "Off"}
        </span>
      ),
    },
    {
      id: "ceiling",
      label: "PF Ceiling",
      sortable: false,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">{formatPfCeilingDisplay(r)}</span>
      ),
    },
    {
      id: "eps",
      label: "EPS",
      sortable: false,
      render: (r) => (
        <span className="text-muted-foreground">
          {r.epsEnabled ? `Enabled · ${formatPfRate(r.epsRate)}` : "Off"}
        </span>
      ),
    },
    {
      id: "period",
      label: "Effective Period",
      sortable: true,
      sortValue: (r) => r.effectiveFrom,
      render: (r) => (
        <span className="text-muted-foreground">{formatPfEffectivePeriod(r)}</span>
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
      title="PF / EPF Settings"
      description="Configure provident fund contribution rules used during payroll."
      icon={Landmark}
      sectionLabel="Statutory Compliance"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add PF Rule
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search by rule name…"
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
              "hr-pf-configurations.csv",
              [
                "Rule Name",
                "Contribution Base",
                "Employee Rate",
                "Employer Rate",
                "PF Ceiling",
                "EPS",
                "Effective From",
                "Effective To",
                "Status",
              ],
              filtered.map((r) => [
                r.ruleName,
                contributionBaseLabel(r.contributionBase),
                r.employeePfEnabled ? formatPfRate(r.employeeContributionRate) : "Off",
                r.employerPfEnabled ? formatPfRate(r.employerContributionRate) : "Off",
                formatPfCeilingDisplay(r),
                r.epsEnabled ? formatPfRate(r.epsRate) : "Off",
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
          emptyTitle="No PF rules yet"
          emptyDescription="Add an effective-dated PF configuration. Until a rule exists, Employee Salary shows Not Configured — not a hardcoded rate."
          emptyActionLabel="+ Add PF Rule"
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
        title={form.id ? "Edit PF Rule" : "Add PF Rule"}
        description="Configurable PF / EPF / EPS contribution rules. Rates and ceilings are settings data — not hardcoded law."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
        contentClassName="!max-w-[560px] sm:!max-w-[560px]"
      >
        <div className="space-y-3.5 pb-1">
          <HrOrgField label="Rule Name" required size="full" error={errors.ruleName}>
            <Input
              value={form.ruleName}
              onChange={(e) => set("ruleName", e.target.value)}
              className={hrInput(undefined, errors.ruleName ? "error" : "default")}
              placeholder="Standard PF Rule"
            />
          </HrOrgField>

          <HrOrgField
            label="PF Contribution Base"
            required
            size="full"
            helper={
              PF_CONTRIBUTION_BASE_OPTIONS.find((o) => o.value === form.contributionBase)
                ?.helper
            }
          >
            <Select
              value={form.contributionBase}
              onValueChange={(v) => set("contributionBase", v as PfContributionBase)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PF_CONTRIBUTION_BASE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <div className="pb-2 border-b border-border">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Employee Contribution
            </p>
          </div>

          <HrStatusToggle
            checked={form.employeePfEnabled}
            onCheckedChange={(v) => set("employeePfEnabled", v)}
            label="Employee PF Enabled"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
          />
          {form.employeePfEnabled ? (
            <HrOrgField
              label="Employee Contribution Rate (%)"
              required
              size="full"
              error={errors.employeeContributionRate}
            >
              <Input
                inputMode="decimal"
                value={form.employeeContributionRate}
                onChange={(e) =>
                  set(
                    "employeeContributionRate",
                    e.target.value.replace(/[^\d.]/g, ""),
                  )
                }
                className={hrInput(
                  undefined,
                  errors.employeeContributionRate ? "error" : "default",
                )}
                placeholder="12"
              />
            </HrOrgField>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Employer Contribution
            </p>
          </div>

          <HrStatusToggle
            checked={form.employerPfEnabled}
            onCheckedChange={(v) => set("employerPfEnabled", v)}
            label="Employer PF Enabled"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
          />
          {form.employerPfEnabled ? (
            <HrOrgField
              label="Employer Contribution Rate (%)"
              required
              size="full"
              error={errors.employerContributionRate}
            >
              <Input
                inputMode="decimal"
                value={form.employerContributionRate}
                onChange={(e) =>
                  set(
                    "employerContributionRate",
                    e.target.value.replace(/[^\d.]/g, ""),
                  )
                }
                className={hrInput(
                  undefined,
                  errors.employerContributionRate ? "error" : "default",
                )}
                placeholder="12"
              />
            </HrOrgField>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Wage Ceiling
            </p>
          </div>

          <HrStatusToggle
            checked={form.applyWageCeiling}
            onCheckedChange={(v) => set("applyWageCeiling", v)}
            label="Apply Wage Ceiling"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
            helper="Limits PF contribution base to the configured wage ceiling."
          />
          {form.applyWageCeiling ? (
            <HrOrgField
              label="PF Wage Ceiling (₹)"
              required
              size="full"
              error={errors.wageCeiling}
            >
              <Input
                inputMode="numeric"
                value={form.wageCeiling}
                onChange={(e) =>
                  set("wageCeiling", e.target.value.replace(/[^\d]/g, ""))
                }
                className={hrInput(undefined, errors.wageCeiling ? "error" : "default")}
                placeholder="15000"
              />
            </HrOrgField>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              EPS
            </p>
          </div>

          <HrStatusToggle
            checked={form.epsEnabled}
            onCheckedChange={(v) => set("epsEnabled", v)}
            label="EPS Enabled"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
            helper="When enabled, employer contribution splits into EPS and remaining EPF."
          />
          {form.epsEnabled ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HrOrgField label="EPS Rate (%)" required size="full" error={errors.epsRate}>
                <Input
                  inputMode="decimal"
                  value={form.epsRate}
                  onChange={(e) =>
                    set("epsRate", e.target.value.replace(/[^\d.]/g, ""))
                  }
                  className={hrInput(undefined, errors.epsRate ? "error" : "default")}
                  placeholder="8.33"
                />
              </HrOrgField>
              <HrOrgField label="EPS Wage Ceiling (₹)" size="full">
                <Input
                  inputMode="numeric"
                  value={form.epsWageCeiling}
                  onChange={(e) =>
                    set("epsWageCeiling", e.target.value.replace(/[^\d]/g, ""))
                  }
                  className={hrInput()}
                  placeholder="Optional"
                />
              </HrOrgField>
            </div>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              EDLI
            </p>
          </div>

          <HrStatusToggle
            checked={form.edliEnabled}
            onCheckedChange={(v) => set("edliEnabled", v)}
            label="EDLI Enabled"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
            helper="Stored for payroll; exact amount calculation may be deferred until payroll basis is finalized."
          />
          {form.edliEnabled ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <HrOrgField label="EDLI Rate (%)" required size="full" error={errors.edliRate}>
                <Input
                  inputMode="decimal"
                  value={form.edliRate}
                  onChange={(e) =>
                    set("edliRate", e.target.value.replace(/[^\d.]/g, ""))
                  }
                  className={hrInput(undefined, errors.edliRate ? "error" : "default")}
                  placeholder="0.5"
                />
              </HrOrgField>
              <HrOrgField label="EDLI Wage Ceiling (₹)" size="full">
                <Input
                  inputMode="numeric"
                  value={form.edliWageCeiling}
                  onChange={(e) =>
                    set("edliWageCeiling", e.target.value.replace(/[^\d]/g, ""))
                  }
                  className={hrInput()}
                  placeholder="Optional"
                />
              </HrOrgField>
            </div>
          ) : null}

          <div className="pb-2 border-b border-border pt-1">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              Effective Period
            </p>
          </div>

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
              {viewRecord?.ruleName ?? "PF Rule"}
            </SheetTitle>
            <SheetDescription className="text-xs mt-0.5">
              Read-only PF / EPF configuration details.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-5 py-4 space-y-4">
            {viewRecord ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <ViewRow label="Rule Name" value={viewRecord.ruleName} />
                  <ViewRow
                    label="Contribution Base"
                    value={contributionBaseLabel(viewRecord.contributionBase)}
                  />
                  <ViewRow
                    label="Employee PF"
                    value={
                      viewRecord.employeePfEnabled
                        ? formatPfRate(viewRecord.employeeContributionRate)
                        : "Off"
                    }
                  />
                  <ViewRow
                    label="Employer PF"
                    value={
                      viewRecord.employerPfEnabled
                        ? formatPfRate(viewRecord.employerContributionRate)
                        : "Off"
                    }
                  />
                  <ViewRow
                    label="Apply Wage Ceiling"
                    value={viewRecord.applyWageCeiling ? "ON" : "OFF"}
                  />
                  <ViewRow
                    label="PF Wage Ceiling"
                    value={formatPfCeilingDisplay(viewRecord)}
                  />
                  <ViewRow
                    label="EPS"
                    value={
                      viewRecord.epsEnabled
                        ? `${formatPfRate(viewRecord.epsRate)}${
                            viewRecord.epsWageCeiling != null
                              ? ` · ceiling ${formatPfMoney(viewRecord.epsWageCeiling)}`
                              : ""
                          }`
                        : "Off"
                    }
                  />
                  <ViewRow
                    label="EDLI"
                    value={
                      viewRecord.edliEnabled
                        ? `${formatPfRate(viewRecord.edliRate)}${
                            viewRecord.edliWageCeiling != null
                              ? ` · ceiling ${formatPfMoney(viewRecord.edliWageCeiling)}`
                              : ""
                          }`
                        : "Off"
                    }
                  />
                  <ViewRow
                    label="Effective Period"
                    value={formatPfEffectivePeriod(viewRecord)}
                  />
                  <ViewRow
                    label="Status"
                    value={viewRecord.status === "active" ? "Active" : "Inactive"}
                  />
                </div>
              </>
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
        title="Deactivate PF rule?"
        description={`${confirm?.record.ruleName ?? ""}. Employees may show Not Configured if no other active version remains.`}
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
