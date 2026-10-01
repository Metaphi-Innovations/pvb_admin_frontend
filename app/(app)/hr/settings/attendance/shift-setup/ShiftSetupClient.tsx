"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrTimeInput } from "../../../components/HrTimeInput";
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
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  applyTimingToWorkingDays,
  countEmployeesOnShift,
  dayTypeNeedsTiming,
  defaultWeeklySchedule,
  formatDayTiming,
  formatGraceSummary,
  formatMinutesLabel,
  formatOffWeeksCompact,
  formatShiftScheduleSummary,
  loadShifts,
  nextShiftId,
  normalizeOffWeeks,
  normalizeShiftName,
  normalizeTime24,
  offDayConfig,
  saveShifts,
  selectedWeeksOffConfig,
  SHIFT_DAY_KEYS,
  SHIFT_DAY_LABELS,
  SHIFT_WEEK_OPTIONS,
  withShiftNewAudit,
  withShiftUpdateAudit,
  type ShiftDayConfig,
  type ShiftDayKey,
  type ShiftRecord,
  type ShiftWeekOccurrence,
  type ShiftWeeklySchedule,
} from "../../shift-setup-data";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";

type FormState = {
  id?: number;
  name: string;
  graceInMinutes: string;
  graceOutMinutes: string;
  breakDurationMinutes: string;
  weeklySchedule: ShiftWeeklySchedule;
  status: ShiftRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  graceInMinutes: "15",
  graceOutMinutes: "10",
  breakDurationMinutes: "60",
  weeklySchedule: defaultWeeklySchedule("09:30", "18:30"),
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Shift Name" },
  { id: "schedule", label: "Schedule" },
  { id: "grace", label: "Grace" },
  { id: "break", label: "Break" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: ShiftRecord; count: number };

type DeleteState = { record: ShiftRecord } & HrSettingsDeleteTarget;

function parseNonNegInt(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  if (!/^\d+$/.test(t)) return null;
  return Number(t);
}

function MinutesInput({
  id,
  value,
  onChange,
  error,
  placeholder,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  error?: boolean;
  placeholder?: string;
}) {
  return (
    <div className="flex items-center gap-1.5 max-w-[7.5rem]">
      <Input
        id={id}
        inputMode="numeric"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          hrInput(undefined, error ? "error" : "default"),
          "h-9 w-[4.25rem] text-xs tabular-nums px-2",
        )}
        placeholder={placeholder}
      />
      <span className="text-[11px] text-muted-foreground shrink-0 leading-none">min</span>
    </div>
  );
}

function WeekOffSelector({
  day,
  weeks,
  onConfirm,
  error,
}: {
  day: ShiftDayKey;
  weeks: ShiftWeekOccurrence[];
  onConfirm: (weeks: ShiftWeekOccurrence[] | "all") => void;
  error?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<ShiftWeekOccurrence[]>(weeks);
  const [allWeeks, setAllWeeks] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    const normalized = normalizeOffWeeks(weeks);
    setDraft(normalized);
    setAllWeeks(normalized.length === 5);
  }, [open, weeks]);

  const summary =
    weeks.length === 0
      ? "Select Week Offs"
      : weeks.length === 5
        ? "All Weeks"
        : formatOffWeeksCompact(weeks);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "h-8 w-full min-w-[132px] px-2.5 text-left text-[11px] rounded-lg border bg-white truncate",
            error ? "border-red-400 text-red-700" : "border-border text-foreground",
            weeks.length === 0 && "text-muted-foreground",
          )}
        >
          {summary}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[240px] p-0 rounded-[12px]">
        <div className="px-3 py-2 border-b border-border">
          <p className="text-xs font-semibold text-foreground">
            {SHIFT_DAY_LABELS[day]} — Week Offs
          </p>
        </div>
        <div className="px-3 py-2 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <Checkbox
              checked={allWeeks}
              onCheckedChange={(v) => {
                const on = v === true;
                setAllWeeks(on);
                setDraft(on ? [1, 2, 3, 4, 5] : []);
              }}
            />
            <span className="text-xs text-foreground">All Weeks</span>
          </label>
          <div className="border-t border-border pt-2 space-y-1.5">
            {SHIFT_WEEK_OPTIONS.map((o) => {
              const checked = draft.includes(o.value);
              return (
                <label
                  key={o.value}
                  className={cn(
                    "flex items-center gap-2 cursor-pointer",
                    allWeeks && "opacity-50 pointer-events-none",
                  )}
                >
                  <Checkbox
                    checked={allWeeks || checked}
                    disabled={allWeeks}
                    onCheckedChange={(v) => {
                      setDraft((prev) => {
                        if (v === true) return normalizeOffWeeks([...prev, o.value]);
                        return prev.filter((w) => w !== o.value);
                      });
                    }}
                  />
                  <span className="text-xs text-foreground">{o.label}</span>
                </label>
              );
            })}
          </div>
        </div>
        <div className="flex justify-end gap-2 px-3 py-2 border-t border-border">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-[11px]"
            onClick={() => setOpen(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-7 text-[11px] bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => {
              if (allWeeks || draft.length === 5) {
                onConfirm("all");
              } else {
                onConfirm(normalizeOffWeeks(draft));
              }
              setOpen(false);
            }}
          >
            Confirm
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function ShiftSetupClient() {
  const [records, setRecords] = useState<ShiftRecord[]>([]);
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
  const [viewRecord, setViewRecord] = useState<ShiftRecord | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadShifts());
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
        formatShiftScheduleSummary(r).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm({ ...EMPTY, weeklySchedule: defaultWeeklySchedule("09:30", "18:30") });
    setErrors({});
  };

  const openAdd = () => {
    setForm({ ...EMPTY, weeklySchedule: defaultWeeklySchedule("09:30", "18:30") });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: ShiftRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      graceInMinutes: String(record.graceInMinutes),
      graceOutMinutes: String(record.graceOutMinutes),
      breakDurationMinutes: String(record.breakDurationMinutes),
      weeklySchedule: Object.fromEntries(
        SHIFT_DAY_KEYS.map((k) => {
          const d = record.weeklySchedule[k];
          return [
            k,
            {
              ...d,
              offWeeks: normalizeOffWeeks(d.offWeeks),
            },
          ];
        }),
      ) as ShiftWeeklySchedule,
      status: record.status,
    });
    setErrors({});
    setSheetOpen(true);
  };

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key as string];
      return n;
    });
  };

  const setDay = (day: ShiftDayKey, patch: Partial<ShiftDayConfig>) => {
    setForm((f) => {
      const prev = f.weeklySchedule[day];
      let next: ShiftDayConfig = { ...prev, ...patch };
      if (patch.dayType !== undefined) {
        if (patch.dayType === "off") {
          next = offDayConfig();
        } else if (patch.dayType === "working") {
          const mon = f.weeklySchedule.monday;
          next = {
            dayType: "working",
            startTime:
              dayTypeNeedsTiming(prev.dayType) && prev.startTime
                ? prev.startTime
                : mon.startTime || "09:30",
            endTime:
              dayTypeNeedsTiming(prev.dayType) && prev.endTime
                ? prev.endTime
                : mon.endTime || "18:30",
            offWeeks: [],
          };
        } else if (patch.dayType === "selected_weeks_off") {
          const mon = f.weeklySchedule.monday;
          const weeks =
            patch.offWeeks !== undefined
              ? normalizeOffWeeks(patch.offWeeks)
              : prev.dayType === "selected_weeks_off" && prev.offWeeks?.length
                ? normalizeOffWeeks(prev.offWeeks)
                : [];
          next = {
            dayType: "selected_weeks_off",
            startTime:
              dayTypeNeedsTiming(prev.dayType) && prev.startTime
                ? prev.startTime
                : mon.startTime || "09:30",
            endTime:
              dayTypeNeedsTiming(prev.dayType) && prev.endTime
                ? prev.endTime
                : mon.endTime || "18:30",
            offWeeks: weeks,
          };
        }
      } else if (patch.offWeeks !== undefined) {
        next = { ...next, offWeeks: normalizeOffWeeks(patch.offWeeks) };
      }
      return {
        ...f,
        weeklySchedule: { ...f.weeklySchedule, [day]: next },
      };
    });
    setErrors((e) => {
      const n = { ...e };
      delete n[`day_${day}`];
      delete n[`weeks_${day}`];
      return n;
    });
  };

  /** Week Off checkbox: OFF = working · ON = All Weeks (full off) by default */
  const setWeekOffChecked = (day: ShiftDayKey, checked: boolean) => {
    if (!checked) {
      setDay(day, { dayType: "working" });
      return;
    }
    setDay(day, { dayType: "off" });
  };

  /** Week Pattern confirm — All Weeks → full off; else selected weeks with timing */
  const applyWeekPattern = (day: ShiftDayKey, result: ShiftWeekOccurrence[] | "all") => {
    if (result === "all" || (Array.isArray(result) && result.length === 5)) {
      setDay(day, { dayType: "off" });
      return;
    }
    const weeks = normalizeOffWeeks(result);
    if (weeks.length === 0) {
      setErrors((e) => ({ ...e, [`weeks_${day}`]: "Select at least one week off." }));
      return;
    }
    setDay(day, { dayType: "selected_weeks_off", offWeeks: weeks });
  };

  const applyMondayToWorkingDays = () => {
    const mon = form.weeklySchedule.monday;
    if (!dayTypeNeedsTiming(mon.dayType) || !mon.startTime || !mon.endTime) {
      setToast("Set Monday as a Working Day with Start and End time first.");
      return;
    }
    setForm((f) => ({
      ...f,
      weeklySchedule: applyTimingToWorkingDays(f.weeklySchedule, mon.startTime, mon.endTime),
    }));
    setToast("Monday timing applied to all working days.");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Shift Name is required";
    else if (
      records.some(
        (r) =>
          r.id !== form.id &&
          normalizeShiftName(r.name) === normalizeShiftName(form.name),
      )
    ) {
      e.name = "Shift Name already exists.";
    }

    const graceIn = parseNonNegInt(form.graceInMinutes);
    if (graceIn === null) e.graceInMinutes = "Grace In must be 0 or greater";
    const graceOut = parseNonNegInt(form.graceOutMinutes);
    if (graceOut === null) e.graceOutMinutes = "Grace Out must be 0 or greater";
    const brk = parseNonNegInt(form.breakDurationMinutes);
    if (brk === null) e.breakDurationMinutes = "Break Duration must be 0 or greater";

    for (const day of SHIFT_DAY_KEYS) {
      const cfg = form.weeklySchedule[day];
      if (cfg.dayType === "selected_weeks_off") {
        if (normalizeOffWeeks(cfg.offWeeks).length === 0) {
          e[`weeks_${day}`] = "Select at least one week off.";
          break;
        }
      }
      if (dayTypeNeedsTiming(cfg.dayType)) {
        if (!normalizeTime24(cfg.startTime)) {
          e[`day_${day}`] = `${SHIFT_DAY_LABELS[day]}: Start Time is required`;
          break;
        }
        if (!normalizeTime24(cfg.endTime)) {
          e[`day_${day}`] = `${SHIFT_DAY_LABELS[day]}: End Time is required`;
          break;
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const weeklySchedule: ShiftWeeklySchedule = { ...form.weeklySchedule };
    for (const day of SHIFT_DAY_KEYS) {
      const cfg = weeklySchedule[day];
      if (cfg.dayType === "off") {
        weeklySchedule[day] = offDayConfig();
      } else if (cfg.dayType === "selected_weeks_off") {
        const weeks = normalizeOffWeeks(cfg.offWeeks);
        if (weeks.length === 5) {
          // All weeks off → treat as Weekly Off
          weeklySchedule[day] = offDayConfig();
        } else {
          weeklySchedule[day] = selectedWeeksOffConfig(
            normalizeTime24(cfg.startTime),
            normalizeTime24(cfg.endTime),
            weeks,
          );
        }
      } else {
        weeklySchedule[day] = {
          dayType: "working",
          startTime: normalizeTime24(cfg.startTime),
          endTime: normalizeTime24(cfg.endTime),
          offWeeks: [],
        };
      }
    }
    const payload = {
      name: form.name.trim(),
      graceInMinutes: parseNonNegInt(form.graceInMinutes) ?? 0,
      graceOutMinutes: parseNonNegInt(form.graceOutMinutes) ?? 0,
      breakDurationMinutes: parseNonNegInt(form.breakDurationMinutes) ?? 0,
      weeklySchedule,
      status: form.status,
    };
    if (form.id) {
      saveShifts(
        records.map((r) =>
          r.id === form.id ? withShiftUpdateAudit({ ...r, ...payload }) : r,
        ),
      );
    } else {
      saveShifts([
        ...records,
        withShiftNewAudit({
          id: nextShiftId(records),
          ...payload,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: ShiftRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveShifts(
      records.map((r) =>
        r.id === record.id ? withShiftUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: ShiftRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    const count = countEmployeesOnShift(record, employees);
    if (!nextActive && count > 0) {
      setConfirm({ type: "deactivate", record, count });
      return;
    }
    applyStatus(record, nextActive);
  };

  const requestDelete = (record: ShiftRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Shift",
      usageCount: countEmployeesOnShift(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveShifts(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<ShiftRecord>[] = [
    {
      id: "name",
      label: "Shift Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "schedule",
      label: "Schedule",
      sortable: true,
      sortValue: (r) => formatShiftScheduleSummary(r),
      render: (r) => (
        <span className="text-[11px] text-foreground leading-snug max-w-[320px] block">
          {formatShiftScheduleSummary(r)}
        </span>
      ),
    },
    {
      id: "grace",
      label: "Grace",
      sortable: true,
      sortValue: (r) => r.graceInMinutes,
      render: (r) => (
        <span className="text-xs tabular-nums whitespace-nowrap">{formatGraceSummary(r)}</span>
      ),
    },
    {
      id: "break",
      label: "Break",
      sortable: true,
      sortValue: (r) => r.breakDurationMinutes,
      render: (r) => formatMinutesLabel(r.breakDurationMinutes),
    },
    {
      id: "employees",
      label: "Employees",
      sortable: true,
      sortValue: (r) => countEmployeesOnShift(r, employees),
      render: (r) => (
        <span className="tabular-nums">{countEmployeesOnShift(r, employees)}</span>
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
      className: "w-[5.5rem]",
      render: (r) => (
        <HrRowActions
          onView={() => setViewRecord(r)}
          viewLabel="View Shift"
          onEdit={() => openEdit(r)}
          editLabel="Edit Shift"
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  const scheduleError = Object.keys(errors).find(
    (k) => k.startsWith("day_") || k.startsWith("weeks_"),
  );

  return (
    <HrOrgPageHeader
      title="Shift Setup"
      description="Configure employee work schedules, timings and weekly offs."
      icon={Timer}
      sectionLabel="Attendance Settings"
      sectionHref="/hr/settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Shift
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search shifts…"
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
              "hr-shift-setup.csv",
              ["Shift Name", "Schedule", "Grace", "Break", "Employees", "Active"],
              filtered.map((r) => [
                r.name,
                formatShiftScheduleSummary(r),
                formatGraceSummary(r),
                String(r.breakDurationMinutes),
                String(countEmployeesOnShift(r, employees)),
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
          emptyTitle="No shifts yet"
          emptyDescription="Add a work schedule with timings and weekly offs."
          emptyActionLabel="+ Add Shift"
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
        title={form.id ? "Edit Shift" : "Add Shift"}
        description="Complete work schedule — timings and weekly offs in one shift."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
        contentClassName="max-w-full sm:max-w-[720px]"
      >
        <div className="space-y-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2 border-b border-border mb-3">
              Shift Details
            </p>
            <div className="space-y-3">
              <HrOrgField label="Shift Name" required size="md" error={errors.name} id="sh-name">
                <Input
                  id="sh-name"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  className={hrInput(undefined, errors.name ? "error" : "default")}
                  placeholder="e.g. General Shift"
                />
              </HrOrgField>

              <div className="grid grid-cols-2 gap-3">
                <HrOrgField
                  label="Grace In"
                  size="sm"
                  error={errors.graceInMinutes}
                  id="sh-grace-in"
                >
                  <MinutesInput
                    id="sh-grace-in"
                    value={form.graceInMinutes}
                    onChange={(v) => setField("graceInMinutes", v)}
                    error={!!errors.graceInMinutes}
                    placeholder="15"
                  />
                </HrOrgField>
                <HrOrgField
                  label="Grace Out"
                  size="sm"
                  error={errors.graceOutMinutes}
                  id="sh-grace-out"
                >
                  <MinutesInput
                    id="sh-grace-out"
                    value={form.graceOutMinutes}
                    onChange={(v) => setField("graceOutMinutes", v)}
                    error={!!errors.graceOutMinutes}
                    placeholder="10"
                  />
                </HrOrgField>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <HrOrgField
                  label="Break Duration"
                  size="sm"
                  error={errors.breakDurationMinutes}
                  id="sh-break"
                >
                  <MinutesInput
                    id="sh-break"
                    value={form.breakDurationMinutes}
                    onChange={(v) => setField("breakDurationMinutes", v)}
                    error={!!errors.breakDurationMinutes}
                    placeholder="60"
                  />
                </HrOrgField>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium leading-none">Active / Inactive</p>
                  <div className="h-9 flex items-center">
                    <HrActiveStatusSwitch
                      size="sm"
                      showLabel
                      checked={form.status === "active"}
                      onCheckedChange={(active) =>
                        setField("status", active ? "active" : "inactive")
                      }
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-border mb-2.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Weekly Schedule
              </p>
              <button
                type="button"
                className="text-[11px] font-medium text-brand-700 hover:underline shrink-0"
                onClick={applyMondayToWorkingDays}
              >
                Apply Monday Timing to Working Days
              </button>
            </div>

            <div className="border border-border rounded-[12px] overflow-hidden">
              <table className="w-full table-fixed text-xs">
                <colgroup>
                  <col className="w-[88px]" />
                  <col className="w-[88px]" />
                  <col className="w-[148px]" />
                  <col className="w-[128px]" />
                  <col className="w-[128px]" />
                </colgroup>
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-2.5 py-2.5 font-semibold">Day</th>
                    <th className="px-2.5 py-2.5 font-semibold">Week Off</th>
                    <th className="px-2.5 py-2.5 font-semibold">Week Pattern</th>
                    <th className="px-2.5 py-2.5 font-semibold">Start</th>
                    <th className="px-2.5 py-2.5 font-semibold">End</th>
                  </tr>
                </thead>
                <tbody>
                  {SHIFT_DAY_KEYS.map((day) => {
                    const cfg = form.weeklySchedule[day];
                    const isWeekOff = cfg.dayType !== "working";
                    const needsTime = dayTypeNeedsTiming(cfg.dayType);
                    const weeksForSelector =
                      cfg.dayType === "off"
                        ? ([1, 2, 3, 4, 5] as ShiftWeekOccurrence[])
                        : normalizeOffWeeks(cfg.offWeeks);
                    return (
                      <tr key={day} className="border-b border-border/60 last:border-0 align-middle">
                        <td className="px-2.5 py-2 font-medium text-foreground whitespace-nowrap">
                          {SHIFT_DAY_LABELS[day]}
                        </td>
                        <td className="px-2.5 py-2">
                          <Checkbox
                            checked={isWeekOff}
                            onCheckedChange={(v) => setWeekOffChecked(day, v === true)}
                            aria-label={`${SHIFT_DAY_LABELS[day]} Week Off`}
                          />
                        </td>
                        <td className="px-2.5 py-2">
                          {isWeekOff ? (
                            <WeekOffSelector
                              day={day}
                              weeks={weeksForSelector}
                              error={!!errors[`weeks_${day}`]}
                              onConfirm={(result) => applyWeekPattern(day, result)}
                            />
                          ) : (
                            <span className="text-muted-foreground px-1">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          {needsTime ? (
                            <HrTimeInput
                              value={cfg.startTime}
                              onChange={(v) => setDay(day, { startTime: v })}
                              aria-label={`${SHIFT_DAY_LABELS[day]} start`}
                              className="h-9 min-w-[118px] text-xs"
                            />
                          ) : (
                            <span className="text-muted-foreground px-1">—</span>
                          )}
                        </td>
                        <td className="px-2.5 py-2">
                          {needsTime ? (
                            <HrTimeInput
                              value={cfg.endTime}
                              onChange={(v) => setDay(day, { endTime: v })}
                              aria-label={`${SHIFT_DAY_LABELS[day]} end`}
                              className="h-9 min-w-[118px] text-xs"
                            />
                          ) : (
                            <span className="text-muted-foreground px-1">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {scheduleError && (
              <p className="text-xs text-red-600 mt-1.5">{errors[scheduleError]}</p>
            )}
          </div>
        </div>
      </HrFormDrawer>

      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-md rounded-[16px] p-4 gap-3">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {viewRecord?.name ?? "Shift"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Work schedule, grace and weekly offs
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <p className="text-[11px] text-muted-foreground">Grace In</p>
                  <p className="font-medium">{formatMinutesLabel(viewRecord.graceInMinutes)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Grace Out</p>
                  <p className="font-medium">{formatMinutesLabel(viewRecord.graceOutMinutes)}</p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Break</p>
                  <p className="font-medium">
                    {formatMinutesLabel(viewRecord.breakDurationMinutes)}
                  </p>
                </div>
              </div>
              <div className="border border-border rounded-[12px] overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border text-left">
                      <th className="px-2.5 py-2 font-semibold">Day</th>
                      <th className="px-2.5 py-2 font-semibold">Week Off</th>
                      <th className="px-2.5 py-2 font-semibold">Pattern</th>
                      <th className="px-2.5 py-2 font-semibold">Timing</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SHIFT_DAY_KEYS.map((day) => {
                      const cfg = viewRecord.weeklySchedule[day];
                      const isWeekOff = cfg.dayType !== "working";
                      const pattern =
                        cfg.dayType === "off"
                          ? "All Weeks"
                          : cfg.dayType === "selected_weeks_off"
                            ? formatOffWeeksCompact(cfg.offWeeks)
                            : "—";
                      return (
                        <tr key={day} className="border-b border-border/60 last:border-0">
                          <td className="px-2.5 py-1.5 font-medium">{SHIFT_DAY_LABELS[day]}</td>
                          <td className="px-2.5 py-1.5">{isWeekOff ? "Yes" : "No"}</td>
                          <td className="px-2.5 py-1.5">{pattern}</td>
                          <td className="px-2.5 py-1.5 whitespace-nowrap">
                            {formatDayTiming(cfg)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) applyStatus(confirm.record, false);
          setConfirm(null);
        }}
        title="Deactivate shift?"
        description={
          confirm
            ? `${confirm.record.name} is currently assigned to ${confirm.count} employee${
                confirm.count === 1 ? "" : "s"
              }. Existing assignments will remain unchanged, but this shift will not be available for new assignments.`
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
