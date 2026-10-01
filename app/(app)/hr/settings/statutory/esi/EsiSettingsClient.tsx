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
  ESI_CONTRIBUTION_BASE_OPTIONS,
  findEffectivePeriodConflicts,
  formatEsiEffectivePeriod,
  formatEsiMoney,
  formatEsiRate,
  loadEsiConfigurations,
  nextEsiConfigurationId,
  saveEsiConfigurations,
  withEsiConfigNewAudit,
  withEsiConfigUpdateAudit,
  type EsiConfiguration,
  type EsiContributionBase,
} from "../../esi-settings-data";

type FormState = {
  id?: number;
  ruleName: string;
  esiEnabled: boolean;
  contributionBase: EsiContributionBase;
  wageEligibilityLimit: string;
  employeeContributionRate: string;
  employerContributionRate: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: EsiConfiguration["status"];
};

const EMPTY: FormState = {
  ruleName: "",
  esiEnabled: true,
  contributionBase: "gross_earnings",
  wageEligibilityLimit: "",
  employeeContributionRate: "",
  employerContributionRate: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Rule Name" },
  { id: "limit", label: "Wage Eligibility Limit" },
  { id: "employee", label: "Employee Rate" },
  { id: "employer", label: "Employer Rate" },
  { id: "base", label: "Contribution Base" },
  { id: "period", label: "Effective Period" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: EsiConfiguration };
type DeleteState = { record: EsiConfiguration } & HrSettingsDeleteTarget;

function recordToForm(r: EsiConfiguration): FormState {
  return {
    id: r.id,
    ruleName: r.ruleName,
    esiEnabled: r.esiEnabled,
    contributionBase: r.contributionBase,
    wageEligibilityLimit: String(r.wageEligibilityLimit),
    employeeContributionRate: String(r.employeeContributionRate),
    employerContributionRate: String(r.employerContributionRate),
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

export default function EsiSettingsClient() {
  const [records, setRecords] = useState<EsiConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<EsiConfiguration | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadEsiConfigurations());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-esi-configurations-updated", onUpd);
    return () => window.removeEventListener("hr-esi-configurations-updated", onUpd);
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

  const openEdit = (record: EsiConfiguration) => {
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

    const limit = Number(form.wageEligibilityLimit);
    if (
      form.wageEligibilityLimit.trim() === "" ||
      Number.isNaN(limit) ||
      limit < 0
    ) {
      e.wageEligibilityLimit = "Enter a valid wage eligibility limit (≥ 0)";
    }

    const empRate = Number(form.employeeContributionRate);
    if (
      form.employeeContributionRate.trim() === "" ||
      Number.isNaN(empRate) ||
      empRate < 0
    ) {
      e.employeeContributionRate = "Enter a valid employee rate (≥ 0)";
    }

    const erRate = Number(form.employerContributionRate);
    if (
      form.employerContributionRate.trim() === "" ||
      Number.isNaN(erRate) ||
      erRate < 0
    ) {
      e.employerContributionRate = "Enter a valid employer rate (≥ 0)";
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
      esiEnabled: form.esiEnabled,
      contributionBase: form.contributionBase,
      wageEligibilityLimit: Number(form.wageEligibilityLimit) || 0,
      employeeContributionRate: Number(form.employeeContributionRate) || 0,
      employerContributionRate: Number(form.employerContributionRate) || 0,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    };

    let next = [...records];
    if (form.id) {
      next = next.map((r) =>
        r.id === form.id ? withEsiConfigUpdateAudit({ ...r, ...payload, id: r.id }) : r,
      );
      setToast("ESI rule updated.");
    } else {
      next = [
        ...next,
        withEsiConfigNewAudit({
          ...payload,
          id: nextEsiConfigurationId(records),
        }),
      ];
      setToast("ESI rule created.");
    }
    saveEsiConfigurations(next);
    closeSheet();
    refresh();
  };

  const applyStatus = (record: EsiConfiguration, nextActive: boolean) => {
    saveEsiConfigurations(
      records.map((r) =>
        r.id === record.id
          ? withEsiConfigUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.ruleName, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: EsiConfiguration, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: EsiConfiguration) => {
    setDeleteTarget({
      record,
      entityLabel: "ESI Rule",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveEsiConfigurations(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast("ESI rule deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<EsiConfiguration>[] = [
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
      id: "limit",
      label: "Wage Eligibility Limit",
      sortable: true,
      sortValue: (r) => r.wageEligibilityLimit,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatEsiMoney(r.wageEligibilityLimit)}
        </span>
      ),
    },
    {
      id: "employee",
      label: "Employee Rate",
      sortable: true,
      sortValue: (r) => r.employeeContributionRate,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatEsiRate(r.employeeContributionRate)}
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
          {formatEsiRate(r.employerContributionRate)}
        </span>
      ),
    },
    {
      id: "base",
      label: "Contribution Base",
      sortable: true,
      sortValue: (r) => r.contributionBase,
      render: (r) => (
        <span className="text-muted-foreground">
          {contributionBaseLabel(r.contributionBase)}
        </span>
      ),
    },
    {
      id: "period",
      label: "Effective Period",
      sortable: true,
      sortValue: (r) => r.effectiveFrom,
      render: (r) => (
        <span className="text-muted-foreground">{formatEsiEffectivePeriod(r)}</span>
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
      title="ESI Settings"
      description="Configure ESI eligibility and employee/employer contribution rules used during payroll."
      icon={Landmark}
      sectionLabel="Statutory Compliance"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add ESI Rule
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
              "hr-esi-configurations.csv",
              [
                "Rule Name",
                "ESI Enabled",
                "Contribution Base",
                "Wage Eligibility Limit",
                "Employee Rate",
                "Employer Rate",
                "Effective From",
                "Effective To",
                "Status",
              ],
              filtered.map((r) => [
                r.ruleName,
                r.esiEnabled ? "ON" : "OFF",
                contributionBaseLabel(r.contributionBase),
                String(r.wageEligibilityLimit),
                formatEsiRate(r.employeeContributionRate),
                formatEsiRate(r.employerContributionRate),
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
          emptyTitle="No ESI rules yet"
          emptyDescription="Add an effective-dated ESI configuration. Until a rule exists, Employee Salary shows Not Configured — not a hardcoded rate."
          emptyActionLabel="+ Add ESI Rule"
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
        title={form.id ? "Edit ESI Rule" : "Add ESI Rule"}
        description="Configurable ESI eligibility and contribution rates. Values are settings data — not hardcoded law."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
        contentClassName="!max-w-[520px] sm:!max-w-[520px]"
      >
        <div className="space-y-3.5 pb-1">
          <HrOrgField label="Rule Name" required size="full" error={errors.ruleName}>
            <Input
              value={form.ruleName}
              onChange={(e) => set("ruleName", e.target.value)}
              className={hrInput(undefined, errors.ruleName ? "error" : "default")}
              placeholder="Standard ESI Rule"
            />
          </HrOrgField>

          <HrStatusToggle
            checked={form.esiEnabled}
            onCheckedChange={(v) => set("esiEnabled", v)}
            label="ESI Enabled"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
            helper="When off, this rule version does not calculate ESI."
          />

          <HrOrgField
            label="Contribution Base"
            required
            size="full"
            helper={
              ESI_CONTRIBUTION_BASE_OPTIONS.find((o) => o.value === form.contributionBase)
                ?.helper
            }
          >
            <Select
              value={form.contributionBase}
              onValueChange={(v) => set("contributionBase", v as EsiContributionBase)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ESI_CONTRIBUTION_BASE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <HrOrgField
            label="Wage Eligibility Limit (₹)"
            required
            size="full"
            error={errors.wageEligibilityLimit}
            helper="Employees with eligible wage above this limit are not covered by this ESI rule."
          >
            <Input
              inputMode="numeric"
              value={form.wageEligibilityLimit}
              onChange={(e) =>
                set("wageEligibilityLimit", e.target.value.replace(/[^\d]/g, ""))
              }
              className={hrInput(
                undefined,
                errors.wageEligibilityLimit ? "error" : "default",
              )}
              placeholder="21000"
            />
          </HrOrgField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                placeholder="0.75"
              />
            </HrOrgField>
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
                placeholder="3.25"
              />
            </HrOrgField>
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
              {viewRecord?.ruleName ?? "ESI Rule"}
            </SheetTitle>
            <SheetDescription className="text-xs mt-0.5">
              Read-only ESI configuration details.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="px-5 py-4 space-y-4">
            {viewRecord ? (
              <div className="grid grid-cols-2 gap-3">
                <ViewRow label="Rule Name" value={viewRecord.ruleName} />
                <ViewRow
                  label="ESI Enabled"
                  value={viewRecord.esiEnabled ? "ON" : "OFF"}
                />
                <ViewRow
                  label="Contribution Base"
                  value={contributionBaseLabel(viewRecord.contributionBase)}
                />
                <ViewRow
                  label="Wage Eligibility Limit"
                  value={formatEsiMoney(viewRecord.wageEligibilityLimit)}
                />
                <ViewRow
                  label="Employee Rate"
                  value={formatEsiRate(viewRecord.employeeContributionRate)}
                />
                <ViewRow
                  label="Employer Rate"
                  value={formatEsiRate(viewRecord.employerContributionRate)}
                />
                <ViewRow
                  label="Effective Period"
                  value={formatEsiEffectivePeriod(viewRecord)}
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
        title="Deactivate ESI rule?"
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
