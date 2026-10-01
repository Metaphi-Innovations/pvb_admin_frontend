"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrRowActions,
  HrStatusToggle,
  HrListingToolbar,
  HrDataGrid,
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  CALCULATION_TYPE_OPTIONS,
  COMPONENT_TYPE_OPTIONS,
  calculationTypeHasDefaultField,
  calculationTypeLabel,
  calculationTypeUsesDefaultRate,
  calculationTypeUsesDefaultValue,
  componentTypeLabel,
  formatDefaultDisplay,
  loadSalaryComponents,
  nextSalaryComponentId,
  saveSalaryComponents,
  statutoryRuleSourceLabel,
  withSalaryComponentNewAudit,
  withSalaryComponentUpdateAudit,
  type SalaryCalculationType,
  type SalaryComponentRecord,
  type SalaryComponentType,
} from "../../salary-components-data";
import { countSalaryStructuresUsingComponent } from "../../salary-structures-data";

type FormState = {
  id?: number;
  name: string;
  componentType: SalaryComponentType;
  calculationType: SalaryCalculationType;
  defaultValue: string;
  defaultRate: string;
  lopApplicable: boolean;
  status: SalaryComponentRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  componentType: "earning",
  calculationType: "fixed",
  defaultValue: "",
  defaultRate: "",
  lopApplicable: true,
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Component Name" },
  { id: "componentType", label: "Component Type" },
  { id: "calculationType", label: "Calculation Type" },
  { id: "default", label: "Default Value / Rate" },
  { id: "lop", label: "LOP Applicable" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

type DeleteState = { record: SalaryComponentRecord } & HrSettingsDeleteTarget;

function OptionSelect<T extends string>({
  value,
  options,
  onChange,
  widthClass = "w-full",
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput(undefined, "default"),
            "h-9 w-full px-3 text-xs text-left flex items-center justify-between gap-2",
            widthClass,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("p-1 rounded-[12px] min-w-[12rem]", widthClass)}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg transition-colors",
              value === opt.value
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            <span className="flex-1">{opt.label}</span>
            {value === opt.value ? (
              <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function ComponentTypePill({ type }: { type: SalaryComponentType }) {
  const cfg =
    type === "earning"
      ? { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" }
      : type === "deduction"
        ? { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" }
        : { bg: "bg-navy-50", text: "text-navy-700", dot: "bg-navy-500" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {componentTypeLabel(type)}
    </span>
  );
}

function recordToForm(r: SalaryComponentRecord): FormState {
  return {
    id: r.id,
    name: r.name,
    componentType: r.componentType,
    calculationType: r.calculationType,
    defaultValue: r.defaultValue != null ? String(r.defaultValue) : "",
    defaultRate: r.defaultRate != null ? String(r.defaultRate) : "",
    lopApplicable:
      r.componentType === "earning" && r.calculationType !== "statutory"
        ? r.lopApplicable !== false
        : false,
    status: r.status,
  };
}

function parseNonNegNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

export default function SalaryComponentsClient() {
  const [records, setRecords] = useState<SalaryComponentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<SalaryComponentType | "all">("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadSalaryComponents());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (typeFilter !== "all") list = list.filter((r) => r.componentType === typeFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        componentTypeLabel(r.componentType).toLowerCase().includes(q) ||
        calculationTypeLabel(r.calculationType).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter, typeFilter]);

  const calcHelper =
    CALCULATION_TYPE_OPTIONS.find((o) => o.value === form.calculationType)?.helper ?? "";

  const openAdd = () => {
    setForm(EMPTY);
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: SalaryComponentRecord) => {
    setForm(recordToForm(record));
    setErrors({});
    setSheetOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      delete n.default;
      return n;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Component name is required";
    else if (
      records.some(
        (r) =>
          r.name.trim().toLowerCase() === form.name.trim().toLowerCase() && r.id !== form.id,
      )
    ) {
      e.name = "Component name must be unique";
    }
    if (calculationTypeUsesDefaultValue(form.calculationType)) {
      const v = parseNonNegNumber(form.defaultValue);
      if (v == null) e.default = "Enter a valid default amount";
    }
    if (calculationTypeUsesDefaultRate(form.calculationType)) {
      const r = parseNonNegNumber(form.defaultRate);
      if (r == null) e.default = "Enter a valid default rate (%)";
      else if (r > 100) e.default = "Rate cannot exceed 100%";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildRecord = (): Omit<
    SalaryComponentRecord,
    "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  > => ({
    id: form.id ?? nextSalaryComponentId(records),
    name: form.name.trim(),
    componentType: form.componentType,
    calculationType: form.calculationType,
    defaultValue: calculationTypeUsesDefaultValue(form.calculationType)
      ? parseNonNegNumber(form.defaultValue)
      : null,
    defaultRate: calculationTypeUsesDefaultRate(form.calculationType)
      ? parseNonNegNumber(form.defaultRate)
      : null,
    lopApplicable:
      form.componentType === "earning" && form.calculationType !== "statutory"
        ? form.lopApplicable
        : false,
    status: form.status,
  });

  const handleSave = () => {
    if (!validate()) return;
    const payload = buildRecord();
    if (form.id) {
      saveSalaryComponents(
        records.map((r) =>
          r.id === form.id ? withSalaryComponentUpdateAudit({ ...r, ...payload, id: r.id }) : r,
        ),
      );
      setToast("Salary component updated successfully.");
    } else {
      saveSalaryComponents([...records, withSalaryComponentNewAudit(payload)]);
      setToast("Salary component created successfully.");
    }
    setSheetOpen(false);
    refresh();
  };

  const handleStatusToggle = (record: SalaryComponentRecord, nextActive: boolean) => {
    saveSalaryComponents(
      records.map((r) =>
        r.id === record.id
          ? withSalaryComponentUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const requestDelete = (record: SalaryComponentRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Salary Component",
      usageCount: countSalaryStructuresUsingComponent(record.id),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveSalaryComponents(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<SalaryComponentRecord>[] = [
    {
      id: "name",
      label: "Component Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "componentType",
      label: "Component Type",
      sortable: true,
      sortValue: (r) => r.componentType,
      render: (r) => <ComponentTypePill type={r.componentType} />,
    },
    {
      id: "calculationType",
      label: "Calculation Type",
      sortable: true,
      sortValue: (r) => r.calculationType,
      render: (r) => (
        <span className="text-muted-foreground">{calculationTypeLabel(r.calculationType)}</span>
      ),
    },
    {
      id: "default",
      label: "Default Value / Rate",
      sortable: true,
      sortValue: (r) => r.defaultValue ?? r.defaultRate ?? -1,
      render: (r) => (
        <span className="tabular-nums text-foreground">{formatDefaultDisplay(r)}</span>
      ),
    },
    {
      id: "lop",
      label: "LOP Applicable",
      sortable: true,
      sortValue: (r) =>
        r.componentType === "earning" && r.calculationType !== "statutory"
          ? r.lopApplicable !== false
            ? 1
            : 0
          : -1,
      render: (r) =>
        r.componentType === "earning" && r.calculationType !== "statutory" ? (
          <span className="text-muted-foreground">
            {r.lopApplicable !== false ? "Yes" : "No"}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "status",
      label: "Status",
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
      className: "w-[4.75rem]",
      render: (r) => (
        <HrRowActions onEdit={() => openEdit(r)} onDelete={() => requestDelete(r)} />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Salary Components"
      description="Manage earning, deduction and contribution components used in salary structures."
      icon={Wallet}
      sectionLabel="Payroll Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Component
        </Button>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {(["all", ...COMPONENT_TYPE_OPTIONS.map((o) => o.value)] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTypeFilter(v)}
              className={cn(
                "h-7 px-3 text-xs rounded-lg border font-medium transition-colors",
                typeFilter === v
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {v === "all" ? "All Types" : componentTypeLabel(v)}
            </button>
          ))}
        </div>

        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search salary components…"
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
              "hr-salary-components.csv",
              [
                "Component Name",
                "Component Type",
                "Calculation Type",
                "Default",
                "LOP Applicable",
                "Status",
              ],
              filtered.map((r) => [
                r.name,
                componentTypeLabel(r.componentType),
                calculationTypeLabel(r.calculationType),
                formatDefaultDisplay(r),
                r.componentType === "earning" && r.calculationType !== "statutory"
                  ? r.lopApplicable !== false
                    ? "Yes"
                    : "No"
                  : "—",
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
          emptyTitle="No salary components yet"
          emptyDescription="Add earning, deduction, and contribution heads for salary structures."
          emptyActionLabel="+ Add Component"
          onEmptyAction={openAdd}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
            setTypeFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <HrFormDrawer
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        title={form.id ? "Edit Salary Component" : "Add Salary Component"}
        description="Defines what the component is — not employee-specific salary amounts."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="grid grid-cols-1 gap-y-3.5">
          <HrOrgField label="Component Name" required size="full" error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput()}
              placeholder="Basic"
            />
          </HrOrgField>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
            <HrOrgField label="Component Type" required size="full">
              <OptionSelect
                value={form.componentType}
                options={COMPONENT_TYPE_OPTIONS}
                onChange={(v) => {
                  set("componentType", v);
                  if (v !== "earning") set("lopApplicable", false);
                  else if (form.calculationType !== "statutory") set("lopApplicable", true);
                }}
              />
            </HrOrgField>

            <HrOrgField label="Calculation Type" required size="full">
              <OptionSelect
                value={form.calculationType}
                options={CALCULATION_TYPE_OPTIONS.map((o) => ({
                  value: o.value,
                  label: o.label,
                }))}
                onChange={(v) => {
                  set("calculationType", v);
                  set("defaultValue", "");
                  set("defaultRate", "");
                  if (v === "statutory") set("lopApplicable", false);
                }}
              />
            </HrOrgField>
          </div>

          {calcHelper ? (
            <p className="text-[11px] text-muted-foreground leading-snug -mt-1">{calcHelper}</p>
          ) : null}

          {form.calculationType === "statutory" &&
          statutoryRuleSourceLabel(form.name) ? (
            <p className="text-[11px] text-muted-foreground leading-snug -mt-1">
              Calculation ownership: System Calculated · Rule source:{" "}
              <span className="font-medium text-foreground">
                {statutoryRuleSourceLabel(form.name)}
              </span>
              . Amounts are not stored on this component.
            </p>
          ) : null}

          {calculationTypeHasDefaultField(form.calculationType) ? (
            <HrOrgField
              label={
                calculationTypeUsesDefaultValue(form.calculationType)
                  ? "Default Value"
                  : "Default Rate"
              }
              size="full"
              error={errors.default}
            >
              <div className="flex items-center gap-1.5">
                {calculationTypeUsesDefaultValue(form.calculationType) ? (
                  <>
                    <span className="text-xs text-muted-foreground">₹</span>
                    <Input
                      inputMode="decimal"
                      value={form.defaultValue}
                      onChange={(e) => set("defaultValue", e.target.value)}
                      className={cn(hrInput(undefined, errors.default ? "error" : "default"), "h-9")}
                      placeholder="15000"
                    />
                  </>
                ) : (
                  <>
                    <Input
                      inputMode="decimal"
                      value={form.defaultRate}
                      onChange={(e) => set("defaultRate", e.target.value)}
                      className={cn(hrInput(undefined, errors.default ? "error" : "default"), "h-9 w-24")}
                      placeholder="40"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground mt-1">
                {calculationTypeUsesDefaultValue(form.calculationType)
                  ? "Default monthly amount for structure templates"
                  : "Default percentage for structure templates"}
              </p>
            </HrOrgField>
          ) : null}

          {form.componentType === "earning" && form.calculationType !== "statutory" ? (
            <HrStatusToggle
              checked={form.lopApplicable}
              onCheckedChange={(v) => set("lopApplicable", v)}
              label="LOP Applicable"
              activeLabel="Yes"
              inactiveLabel="No"
              size="sm"
              helper="When Yes, Payroll LOP Rules may prorate this earning. Statutory components are never LOP-deducted here."
            />
          ) : null}

          <HrStatusToggle
            checked={form.status === "active"}
            onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
            size="sm"
            helper={
              form.status === "active"
                ? "Available for salary structure configuration"
                : "Hidden from new structure configuration"
            }
          />
        </div>
      </HrFormDrawer>

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onDelete={handleDelete}
        onMakeInactive={() => {
          if (!deleteTarget) return;
          handleStatusToggle(deleteTarget.record, false);
          setDeleteTarget(null);
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
