"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Calculator, Plus, Trash2 } from "lucide-react";
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
  createEmptyTdsSlab,
  findSlabIncomeOverlaps,
  findSlabPeriodConflicts,
  formatIncomeRange,
  formatTaxEffectivePeriod,
  formatTaxRate,
  loadTdsSlabConfigurations,
  nextTdsSlabConfigurationId,
  regimeTypeLabel,
  saveTdsSlabConfigurations,
  TAX_REGIME_TYPE_OPTIONS,
  withTdsSlabNewAudit,
  withTdsSlabUpdateAudit,
  type TaxRegimeType,
  type TdsIncomeSlab,
  type TdsSlabConfiguration,
} from "../../tax-settings-data";

type SlabForm = {
  key: string;
  incomeFrom: string;
  incomeTo: string;
  andAbove: boolean;
  ratePercent: string;
  cessPercent: string;
};

type FormState = {
  id?: number;
  ruleName: string;
  regimeType: TaxRegimeType;
  slabs: SlabForm[];
  effectiveFrom: string;
  effectiveTo: string;
  status: TdsSlabConfiguration["status"];
};

const EMPTY_SLAB: SlabForm = {
  key: "seed",
  incomeFrom: "0",
  incomeTo: "",
  andAbove: true,
  ratePercent: "0",
  cessPercent: "0",
};

const EMPTY: FormState = {
  ruleName: "",
  regimeType: "new",
  slabs: [{ ...EMPTY_SLAB, key: "new-0" }],
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Rule Name" },
  { id: "type", label: "Regime" },
  { id: "slabs", label: "Slabs" },
  { id: "period", label: "Effective Period" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: TdsSlabConfiguration };
type DeleteState = { record: TdsSlabConfiguration } & HrSettingsDeleteTarget;

function slabToForm(s: TdsIncomeSlab, index: number): SlabForm {
  return {
    key: `s-${s.id}-${index}`,
    incomeFrom: String(s.incomeFrom),
    incomeTo: s.incomeTo != null ? String(s.incomeTo) : "",
    andAbove: s.incomeTo == null,
    ratePercent: String(s.ratePercent),
    cessPercent: String(s.cessPercent ?? 0),
  };
}

function recordToForm(r: TdsSlabConfiguration): FormState {
  return {
    id: r.id,
    ruleName: r.ruleName,
    regimeType: r.regimeType,
    slabs:
      r.slabs.length > 0
        ? r.slabs.map((s, i) => slabToForm(s, i))
        : [{ ...EMPTY_SLAB, key: `new-${Date.now()}` }],
    effectiveFrom: r.effectiveFrom,
    effectiveTo: r.effectiveTo ?? "",
    status: r.status,
  };
}

function parseSlabsFromForm(slabs: SlabForm[]): TdsIncomeSlab[] {
  return slabs.map((s, i) => {
    const base = createEmptyTdsSlab(i + 1);
    return {
      ...base,
      incomeFrom: Math.max(0, Number(s.incomeFrom) || 0),
      incomeTo: s.andAbove ? null : Math.max(0, Number(s.incomeTo) || 0),
      ratePercent: Math.max(0, Number(s.ratePercent) || 0),
      cessPercent: Math.max(0, Number(s.cessPercent) || 0),
    };
  });
}

export default function TdsSettingsClient() {
  const [records, setRecords] = useState<TdsSlabConfiguration[]>([]);
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
    setRecords(loadTdsSlabConfigurations());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-tds-slab-configurations-updated", onUpd);
    return () => window.removeEventListener("hr-tds-slab-configurations-updated", onUpd);
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
    setForm({
      ...EMPTY,
      slabs: [{ ...EMPTY_SLAB, key: `new-${Date.now()}` }],
    });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: TdsSlabConfiguration) => {
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

  const updateSlab = (key: string, patch: Partial<SlabForm>) => {
    setForm((f) => ({
      ...f,
      slabs: f.slabs.map((s) => (s.key === key ? { ...s, ...patch } : s)),
    }));
    setErrors((e) => {
      const n = { ...e };
      delete n.slabs;
      return n;
    });
  };

  const addSlab = () => {
    setForm((f) => ({
      ...f,
      slabs: [
        ...f.slabs,
        {
          ...EMPTY_SLAB,
          key: `new-${Date.now()}-${f.slabs.length}`,
          andAbove: false,
          incomeFrom: "",
          incomeTo: "",
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
    if (!form.ruleName.trim()) e.ruleName = "Rule Name is required";
    if (!form.effectiveFrom.trim()) e.effectiveFrom = "Effective From is required";
    if (
      form.effectiveTo.trim() &&
      form.effectiveFrom.trim() &&
      form.effectiveTo < form.effectiveFrom
    ) {
      e.effectiveTo = "Effective To must be on or after Effective From";
    }
    if (form.slabs.length === 0) e.slabs = "Add at least one income slab";

    for (const s of form.slabs) {
      const from = Number(s.incomeFrom);
      if (!Number.isFinite(from) || from < 0) {
        e.slabs = "Each slab needs a valid Income From (≥ 0)";
        break;
      }
      if (!s.andAbove) {
        if (!s.incomeTo.trim()) {
          e.slabs = "Enter Income To, or mark as and above";
          break;
        }
        const to = Number(s.incomeTo);
        if (!Number.isFinite(to) || to < from) {
          e.slabs = "Income To must be ≥ Income From";
          break;
        }
      }
      const rate = Number(s.ratePercent);
      if (!Number.isFinite(rate) || rate < 0) {
        e.slabs = "Each slab needs a valid tax rate % (≥ 0)";
        break;
      }
      const cess = Number(s.cessPercent);
      if (!Number.isFinite(cess) || cess < 0) {
        e.slabs = "Cess % must be ≥ 0";
        break;
      }
    }

    let parsed: TdsIncomeSlab[] = [];
    if (!e.slabs) {
      parsed = parseSlabsFromForm(form.slabs);
      const overlaps = findSlabIncomeOverlaps(parsed);
      if (overlaps.length > 0) {
        const o = overlaps[0]!;
        e.slabs = `Overlapping income ranges (rows ${o.aIndex + 1} & ${o.bIndex + 1})`;
      }
    }

    const conflicts = findSlabPeriodConflicts(records, {
      id: form.id ?? -1,
      regimeType: form.regimeType,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    });
    if (conflicts.length > 0) {
      e.effectiveFrom = `Overlaps active ${regimeTypeLabel(form.regimeType)} slabs (${conflicts[0]!.effectiveFrom}). End the prior version first.`;
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const slabs = parseSlabsFromForm(form.slabs).map((s, i) => ({ ...s, id: i + 1 }));
    const payload = {
      ruleName: form.ruleName.trim(),
      regimeType: form.regimeType,
      slabs,
      effectiveFrom: form.effectiveFrom.slice(0, 10),
      effectiveTo: form.effectiveTo.trim() ? form.effectiveTo.slice(0, 10) : null,
      status: form.status,
    };

    if (form.id) {
      saveTdsSlabConfigurations(
        records.map((r) =>
          r.id === form.id ? withTdsSlabUpdateAudit({ ...r, ...payload, id: r.id }) : r,
        ),
      );
      setToast("TDS Settings updated.");
    } else {
      saveTdsSlabConfigurations([
        ...records,
        withTdsSlabNewAudit({
          ...payload,
          id: nextTdsSlabConfigurationId(records),
        }),
      ]);
      setToast("TDS Settings created.");
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: TdsSlabConfiguration, nextActive: boolean) => {
    saveTdsSlabConfigurations(
      records.map((r) =>
        r.id === record.id
          ? withTdsSlabUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.ruleName, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: TdsSlabConfiguration, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: TdsSlabConfiguration) => {
    setDeleteTarget({
      record,
      entityLabel: "TDS Settings",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveTdsSlabConfigurations(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast("TDS Settings deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<TdsSlabConfiguration>[] = [
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
      id: "slabs",
      label: "Slabs",
      sortable: true,
      sortValue: (r) => r.slabs.length,
      render: (r) => (
        <span className="text-muted-foreground">
          {r.slabs.length} Slab{r.slabs.length === 1 ? "" : "s"}
          {r.slabs[0] ? (
            <span className="block text-[11px] text-muted-foreground/80 truncate max-w-[180px]">
              {formatIncomeRange(r.slabs[0]!)} · {formatTaxRate(r.slabs[0]!.ratePercent)}
            </span>
          ) : null}
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
      title="TDS Settings"
      description="CLOSED — Income-tax slabs and per-band cess for TDS projection. Rates are settings data — not Income Tax Act hardcoding."
      icon={Calculator}
      sectionLabel="Tax Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add TDS Slabs
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search TDS rules…"
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
              "hr-tds-settings.csv",
              [
                "Rule Name",
                "Regime",
                "Slab Count",
                "Effective From",
                "Effective To",
                "Status",
              ],
              filtered.map((r) => [
                r.ruleName,
                regimeTypeLabel(r.regimeType),
                String(r.slabs.length),
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
          emptyTitle="No TDS slab configurations yet"
          emptyDescription="Add income slabs for Old and New regime. Until configured, employee TDS shows Configuration Required — not a fabricated ₹0 tax."
          emptyActionLabel="+ Add TDS Slabs"
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
        title={form.id ? "Edit TDS Settings" : "Add TDS Settings"}
        description="Progressive income slabs for TDS projection. Rates are settings data — not Income Tax Act hardcoding."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="space-y-3.5 pb-1">
          <HrOrgField label="Rule Name" required size="full" error={errors.ruleName}>
            <Input
              value={form.ruleName}
              onChange={(e) => set("ruleName", e.target.value)}
              className={hrInput(undefined, errors.ruleName ? "error" : "default")}
              placeholder="FY 2026-27 New Regime Slabs"
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

          <div className="pb-2.5 border-b border-border pt-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Income Slabs
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
                  <HrOrgField label="Income From (₹ / year)" size="full">
                    <Input
                      inputMode="numeric"
                      value={s.incomeFrom}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          incomeFrom: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder="0"
                    />
                  </HrOrgField>
                  <HrOrgField label="Income To (₹ / year)" size="full">
                    <Input
                      inputMode="numeric"
                      value={s.andAbove ? "" : s.incomeTo}
                      disabled={s.andAbove}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          incomeTo: e.target.value.replace(/[^\d]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder={s.andAbove ? "And above" : "Upper bound"}
                    />
                  </HrOrgField>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded accent-brand-600"
                    checked={s.andAbove}
                    onChange={(e) =>
                      updateSlab(s.key, {
                        andAbove: e.target.checked,
                        incomeTo: e.target.checked ? "" : s.incomeTo,
                      })
                    }
                  />
                  <span className="text-xs text-foreground">And above (no upper limit)</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <HrOrgField label="Tax Rate %" size="full">
                    <Input
                      inputMode="decimal"
                      value={s.ratePercent}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          ratePercent: e.target.value.replace(/[^\d.]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder="0"
                    />
                  </HrOrgField>
                  <HrOrgField label="Cess % (optional)" size="full">
                    <Input
                      inputMode="decimal"
                      value={s.cessPercent}
                      onChange={(e) =>
                        updateSlab(s.key, {
                          cessPercent: e.target.value.replace(/[^\d.]/g, ""),
                        })
                      }
                      className={hrInput()}
                      placeholder="0"
                    />
                  </HrOrgField>
                </div>
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
        title="Deactivate TDS Settings?"
        description={`${confirm?.record.ruleName ?? ""}. Employees may show Not Configured for TDS.`}
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
