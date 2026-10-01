"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarOff, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { loadHrEmployees, type HrEmployee } from "../../../employees/employee-master-data";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrListingToolbar,
  HrDataGrid,
  HrRowActions,
  exportOrgCsv,
  hrInput,
  hrSelect,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  countEmployeesOnWeeklyOff,
  defaultCustomConfig,
  formatWeeklyOffPatternLabel,
  loadWeeklyOffs,
  nextWeeklyOffId,
  normalizeWeeklyOffName,
  saveWeeklyOffs,
  SATURDAY_OFF_OPTIONS,
  WEEKDAY_KEYS,
  WEEKDAY_LABELS,
  WEEKLY_OFF_PATTERN_OPTIONS,
  withWeeklyOffNewAudit,
  withWeeklyOffUpdateAudit,
  type CustomWeeklyOffConfig,
  type SaturdayOffMode,
  type WeekdayKey,
  type WeekdayOffMode,
  type WeeklyOffPatternId,
  type WeeklyOffRecord,
} from "../../weekly-off-data";

type FormState = {
  id?: number;
  name: string;
  patternId: WeeklyOffPatternId;
  customConfig: CustomWeeklyOffConfig;
  status: WeeklyOffRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  patternId: "sunday",
  customConfig: defaultCustomConfig(),
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Weekly Off Name" },
  { id: "pattern", label: "Pattern" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

const FORM_CLASS = cn(
  "grid grid-cols-1 gap-y-3",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: WeeklyOffRecord; count: number };

type DeleteState = { record: WeeklyOffRecord } & HrSettingsDeleteTarget;

export default function WeeklyOffClient() {
  const [records, setRecords] = useState<WeeklyOffRecord[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
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
    setRecords(loadWeeklyOffs());
    try {
      setEmployees(loadHrEmployees());
    } catch {
      setEmployees([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        formatWeeklyOffPatternLabel(r).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY);
    setErrors({});
  };

  const openAdd = () => {
    setForm({ ...EMPTY, customConfig: defaultCustomConfig() });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: WeeklyOffRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      patternId: record.patternId,
      customConfig: record.customConfig
        ? { ...defaultCustomConfig(), ...record.customConfig }
        : defaultCustomConfig(),
      status: record.status,
    });
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

  const setCustomDay = (day: WeekdayKey, value: WeekdayOffMode | SaturdayOffMode) => {
    setForm((f) => ({
      ...f,
      customConfig: { ...f.customConfig, [day]: value },
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Weekly Off Name is required";
    else if (
      records.some(
        (r) =>
          r.id !== form.id &&
          normalizeWeeklyOffName(r.name) === normalizeWeeklyOffName(form.name),
      )
    ) {
      e.name = "Weekly Off Name already exists.";
    }
    if (!form.patternId) e.patternId = "Weekly Off Pattern is required";
    if (form.patternId === "custom") {
      const c = form.customConfig;
      const hasOff =
        c.monday === "off" ||
        c.tuesday === "off" ||
        c.wednesday === "off" ||
        c.thursday === "off" ||
        c.friday === "off" ||
        c.saturday !== "working" ||
        c.sunday === "off";
      if (!hasOff) e.customConfig = "Select at least one weekly off day.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = {
      name: form.name.trim(),
      patternId: form.patternId,
      customConfig: form.patternId === "custom" ? { ...form.customConfig } : null,
      status: form.status,
    };
    if (form.id) {
      saveWeeklyOffs(
        records.map((r) =>
          r.id === form.id ? withWeeklyOffUpdateAudit({ ...r, ...payload }) : r,
        ),
      );
    } else {
      saveWeeklyOffs([
        ...records,
        withWeeklyOffNewAudit({
          id: nextWeeklyOffId(records),
          ...payload,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: WeeklyOffRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveWeeklyOffs(
      records.map((r) =>
        r.id === record.id ? withWeeklyOffUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: WeeklyOffRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    const count = countEmployeesOnWeeklyOff(record, employees);
    if (!nextActive && count > 0) {
      setConfirm({ type: "deactivate", record, count });
      return;
    }
    applyStatus(record, nextActive);
  };

  const requestDelete = (record: WeeklyOffRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Weekly Off",
      usageCount: countEmployeesOnWeeklyOff(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveWeeklyOffs(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<WeeklyOffRecord>[] = [
    {
      id: "name",
      label: "Weekly Off Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "pattern",
      label: "Pattern",
      sortable: true,
      sortValue: (r) => formatWeeklyOffPatternLabel(r),
      render: (r) => (
        <span className="text-xs text-foreground">{formatWeeklyOffPatternLabel(r)}</span>
      ),
    },
    {
      id: "employees",
      label: "Employees",
      sortable: true,
      sortValue: (r) => countEmployeesOnWeeklyOff(r, employees),
      render: (r) => (
        <span className="tabular-nums">{countEmployeesOnWeeklyOff(r, employees)}</span>
      ),
    },
    {
      id: "status",
      label: "Active",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <HrActiveStatusSwitch
          size="sm"
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
        <HrRowActions
          onEdit={() => openEdit(r)}
          editLabel="Edit Weekly Off"
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Weekly Off"
      description="Configure standard weekly off patterns for employee attendance."
      icon={CalendarOff}
      sectionLabel="Attendance Settings"
      sectionHref="/hr/settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Weekly Off
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search weekly off…"
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
              "hr-weekly-off.csv",
              ["Weekly Off Name", "Pattern", "Employees", "Active"],
              filtered.map((r) => [
                r.name,
                formatWeeklyOffPatternLabel(r),
                String(countEmployeesOnWeeklyOff(r, employees)),
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
          emptyTitle="No weekly off patterns yet"
          emptyDescription="Add reusable weekly off patterns for employee attendance."
          emptyActionLabel="+ Add Weekly Off"
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
        onOpenChange={(o) => {
          if (!o) closeSheet();
          else setSheetOpen(true);
        }}
        title={form.id ? "Edit Weekly Off" : "Add Weekly Off"}
        description="Recurring weekly off pattern for employee assignment."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={FORM_CLASS}>
          <HrOrgField label="Weekly Off Name" required size="md" error={errors.name} id="wo-name">
            <Input
              id="wo-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput(undefined, errors.name ? "error" : "default")}
              placeholder="e.g. Standard Office Week Off"
            />
          </HrOrgField>

          <HrOrgField
            label="Weekly Off Pattern"
            required
            size="md"
            error={errors.patternId}
            id="wo-pattern"
          >
            <Select
              value={form.patternId}
              onValueChange={(v) => set("patternId", v as WeeklyOffPatternId)}
            >
              <SelectTrigger id="wo-pattern" className={hrSelect()}>
                <SelectValue placeholder="Select pattern…" />
              </SelectTrigger>
              <SelectContent>
                {WEEKLY_OFF_PATTERN_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          {form.patternId === "custom" && (
            <div className="rounded-[10px] border border-border bg-muted/15 p-2.5 space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Custom days
              </p>
              <div className="space-y-1.5">
                {WEEKDAY_KEYS.map((day) => (
                  <div
                    key={day}
                    className="flex items-center justify-between gap-2 min-h-8"
                  >
                    <span className="text-xs font-medium text-foreground w-24 shrink-0">
                      {WEEKDAY_LABELS[day]}
                    </span>
                    {day === "saturday" ? (
                      <Select
                        value={form.customConfig.saturday}
                        onValueChange={(v) => setCustomDay("saturday", v as SaturdayOffMode)}
                      >
                        <SelectTrigger className={cn(hrSelect(), "h-8 text-xs flex-1 max-w-[180px]")}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SATURDAY_OFF_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value} className="text-xs">
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="inline-flex rounded-[10px] border border-border overflow-hidden">
                        {(["working", "off"] as WeekdayOffMode[]).map((mode) => {
                          const active = form.customConfig[day] === mode;
                          return (
                            <button
                              key={mode}
                              type="button"
                              className={cn(
                                "h-8 px-2.5 text-[11px] font-medium transition-colors",
                                active
                                  ? mode === "off"
                                    ? "bg-brand-50 text-brand-700"
                                    : "bg-muted text-foreground"
                                  : "bg-white text-muted-foreground hover:bg-muted/40",
                              )}
                              onClick={() => setCustomDay(day, mode)}
                            >
                              {mode === "working" ? "Working Day" : "Weekly Off"}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
              {errors.customConfig && (
                <p className="text-xs text-red-600">{errors.customConfig}</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <p className="text-xs font-medium leading-none">Active / Inactive</p>
            <div className="h-9 flex items-center">
              <HrActiveStatusSwitch
                size="sm"
                showLabel
                checked={form.status === "active"}
                onCheckedChange={(active) => set("status", active ? "active" : "inactive")}
              />
            </div>
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
        title="Deactivate weekly off?"
        description={
          confirm
            ? `${confirm.record.name} is currently assigned to ${confirm.count} employee${
                confirm.count === 1 ? "" : "s"
              }. Existing assignments will remain unchanged, but this pattern will not be available for new assignments.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
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
