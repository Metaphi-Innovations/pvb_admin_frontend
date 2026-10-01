"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  findRegimePeriodConflicts,
  formatTaxEffectivePeriod,
  formatTaxMoney,
  loadTaxRegimeConfigurations,
  nextTaxRegimeConfigurationId,
  regimeTypeLabel,
  saveTaxRegimeConfigurations,
  TAX_REGIME_TYPE_OPTIONS,
  withTaxRegimeNewAudit,
  withTaxRegimeUpdateAudit,
  type TaxRegimeConfiguration,
  type TaxRegimeType,
} from "../../tax-settings-data";

type FormState = {
  id?: number;
  ruleName: string;
  regimeType: TaxRegimeType;
  isCompanyDefault: boolean;
  standardDeduction: string;
  notes: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: TaxRegimeConfiguration["status"];
};

const EMPTY: FormState = {
  ruleName: "",
  regimeType: "new",
  isCompanyDefault: false,
  standardDeduction: "",
  notes: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Rule Name" },
  { id: "type", label: "Regime" },
  { id: "default", label: "Company Default" },
  { id: "std", label: "Standard Deduction" },
  { id: "period", label: "Effective Period" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: TaxRegimeConfiguration };
type DeleteState = { record: TaxRegimeConfiguration } & HrSettingsDeleteTarget;

function recordToForm(r: TaxRegimeConfiguration): FormState {
  return {
    id: r.id,
    ruleName: r.ruleName,
    regimeType: r.regimeType,
    isCompanyDefault: r.isCompanyDefault,
    standardDeduction: r.standardDeduction != null ? String(r.standardDeduction) : "",
    notes: r.notes,
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo ?? "",
    status: r.status,
  };
}

export default function TaxRegimeClient() {
  const [records, setRecords] = useState<TaxRegimeConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadTaxRegimeConfigurations());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-tax-regime-configurations-updated", onUpd);
    return () => window.removeEventListener("hr-tax-regime-configurations-updated", onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.ruleName.toLowerCase().includes(q) ||
        regimeTypeLabel(r.regimeType).toLowerCase().includes(q),
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

  const openEdit = (record: TaxRegimeConfiguration) => {
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
    if (form.standardDeduction.trim()) {
      const n = Number(form.standardDeduction);
      if (Number.isNaN(n) || n < 0) e.standardDeduction = "Enter a valid amount";
    }
    const conflicts = findRegimePeriodConflicts(records, {
      id: form.id ?? -1,
      regimeType: form.regimeType,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    });
    if (conflicts.length > 0) {
      e.effectiveFrom = `Overlaps active ${regimeTypeLabel(form.regimeType)} (${conflicts[0]!.effectiveFrom}). End the prior version first.`;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      ruleName: form.ruleName.trim(),
      regimeType: form.regimeType,
      isCompanyDefault: form.isCompanyDefault,
      standardDeduction: form.standardDeduction.trim()
        ? Number(form.standardDeduction)
        : null,
      notes: form.notes.trim(),
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    };

    let next = [...records];
    if (form.id) {
      next = next.map((r) =>
        r.id === form.id ? withTaxRegimeUpdateAudit({ ...r, ...payload, id: r.id }) : r,
      );
      setToast("Tax Regime updated.");
    } else {
      next = [
        ...next,
        withTaxRegimeNewAudit({
          ...payload,
          id: nextTaxRegimeConfigurationId(records),
        }),
      ];
      setToast("Tax Regime created.");
    }

    // Only one company default among active configs
    if (payload.isCompanyDefault && payload.status === "active") {
      const savedId = form.id ?? next[next.length - 1]!.id;
      next = next.map((r) =>
        r.id === savedId
          ? r
          : withTaxRegimeUpdateAudit({ ...r, isCompanyDefault: false }),
      );
    }

    saveTaxRegimeConfigurations(next);
    closeSheet();
    refresh();
  };

  const applyStatus = (record: TaxRegimeConfiguration, nextActive: boolean) => {
    saveTaxRegimeConfigurations(
      records.map((r) =>
        r.id === record.id
          ? withTaxRegimeUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.ruleName, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: TaxRegimeConfiguration, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: TaxRegimeConfiguration) => {
    setDeleteTarget({
      record,
      entityLabel: "Tax Regime",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveTaxRegimeConfigurations(
      records.filter((r) => r.id !== deleteTarget.record.id),
    );
    setSelectedIds([]);
    refresh();
    setToast("Tax Regime deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<TaxRegimeConfiguration>[] = [
    {
      id: "name",
      label: "Rule Name",
      sortable: true,
      sortValue: (r) => r.ruleName,
      render: (r) => <span className="font-semibold text-foreground">{r.ruleName}</span>,
    },
    {
      id: "type",
      label: "Regime",
      sortable: true,
      sortValue: (r) => r.regimeType,
      render: (r) => (
        <span className="text-muted-foreground">{regimeTypeLabel(r.regimeType)}</span>
      ),
    },
    {
      id: "default",
      label: "Company Default",
      sortable: false,
      render: (r) => (
        <span className="text-muted-foreground">{r.isCompanyDefault ? "Yes" : "—"}</span>
      ),
    },
    {
      id: "std",
      label: "Standard Deduction",
      sortable: false,
      render: (r) => (
        <span className="tabular-nums text-muted-foreground">
          {formatTaxMoney(r.standardDeduction)}
        </span>
      ),
    },
    {
      id: "period",
      label: "Effective Period",
      sortable: true,
      sortValue: (r) => r.effectiveFrom,
      render: (r) => (
        <span className="text-muted-foreground">
          {formatTaxEffectivePeriod(r.effectiveFrom, r.effectiveTo)}
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
      title="Tax Regime"
      description="CLOSED — Old / New regime defaults and standard deduction for TDS projection. Employee selection lives on the employee payroll profile."
      icon={Scale}
      sectionLabel="Tax Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Tax Regime
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search regimes…"
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
              "hr-tax-regimes.csv",
              [
                "Rule Name",
                "Regime",
                "Company Default",
                "Standard Deduction",
                "Effective From",
                "Effective To",
                "Status",
              ],
              filtered.map((r) => [
                r.ruleName,
                regimeTypeLabel(r.regimeType),
                r.isCompanyDefault ? "Yes" : "No",
                r.standardDeduction != null ? String(r.standardDeduction) : "",
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
          emptyTitle="No Tax Regime configurations yet"
          emptyDescription="Add Old/New regime rules and mark one as Company Default. Until configured, employee TDS shows Configuration Required."
          emptyActionLabel="+ Add Tax Regime"
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
        title={form.id ? "Edit Tax Regime" : "Add Tax Regime"}
        description="Regime defaults for TDS projection. Standard deduction is configurable settings data — not hardcoded law."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="space-y-3.5 pb-1">
          <HrOrgField label="Rule Name" required size="full" error={errors.ruleName}>
            <Input
              value={form.ruleName}
              onChange={(e) => set("ruleName", e.target.value)}
              className={hrInput(undefined, errors.ruleName ? "error" : "default")}
              placeholder="FY 2026-27 New Regime"
            />
          </HrOrgField>

          <HrOrgField label="Regime Type" required size="full">
            <Select
              value={form.regimeType}
              onValueChange={(v) => set("regimeType", v as TaxRegimeType)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TAX_REGIME_TYPE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <HrStatusToggle
            checked={form.isCompanyDefault}
            onCheckedChange={(v) => set("isCompanyDefault", v)}
            label="Company Default"
            activeLabel="Yes"
            inactiveLabel="No"
            size="sm"
            helper="Used when employee tax regime is set to Company Default."
          />

          <HrOrgField
            label="Standard Deduction (₹ / year)"
            size="full"
            error={errors.standardDeduction}
            helper="Optional. Applied when projecting taxable income for TDS estimate."
          >
            <Input
              inputMode="numeric"
              value={form.standardDeduction}
              onChange={(e) =>
                set("standardDeduction", e.target.value.replace(/[^\d]/g, ""))
              }
              className={hrInput(
                undefined,
                errors.standardDeduction ? "error" : "default",
              )}
              placeholder="Optional"
            />
          </HrOrgField>

          <HrOrgField label="Notes" size="full">
            <Textarea
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              className="min-h-[72px] text-xs"
              placeholder="Internal notes…"
            />
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
          />
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
        title="Deactivate Tax Regime?"
        description={`${confirm?.record.ruleName ?? ""}. Employees using this regime may show Not Configured.`}
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
