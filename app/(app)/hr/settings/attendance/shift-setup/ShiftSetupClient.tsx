"use client";

/**
 * Shift Setup listing — single module (no policy/modes tabs).
 * Add/Edit opens full-page form with shift + rules + modes sections.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Plus, Timer } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  deactivateInUseDescription,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrInfoHint } from "../../../components/HrInfoHint";
import { loadHrEmployees, type HrEmployee } from "../../../employees/employee-master-data";
import {
  HrOrgPageHeader,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrListingToolbar,
  HrDataGrid,
  HrIconActionButton,
  exportOrgCsv,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  countEmployeesOnShift,
  formatDayTiming,
  formatGraceSummary,
  formatOffWeeksCompact,
  formatShiftScheduleSummary,
  loadShifts,
  saveShifts,
  SHIFT_DAY_KEYS,
  SHIFT_DAY_LABELS,
  withShiftUpdateAudit,
  type ShiftRecord,
} from "../../shift-setup-data";
import {
  formatAttendanceModesSummary,
  formatShiftAttendanceRulesSummary,
} from "../../shift-attendance-link";
import { getAttendancePolicyById } from "../../attendance-policy-data";
import { loadAttendanceModesSettings } from "../../attendance-modes-data";

const COLUMN_DEFS = [
  { id: "name", label: "Shift Name" },
  { id: "hours", label: "Working Hours" },
  { id: "weeklyOff", label: "Weekly Off" },
  { id: "rules", label: "Attendance Rules" },
  { id: "mode", label: "Attendance Mode" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

function weeklyOffSummary(r: ShiftRecord): string {
  const offs: string[] = [];
  for (const day of SHIFT_DAY_KEYS) {
    const cfg = r.weeklySchedule[day];
    if (cfg.dayType === "off") offs.push(SHIFT_DAY_LABELS[day].slice(0, 3));
    else if (cfg.dayType === "selected_weeks_off") {
      offs.push(`${SHIFT_DAY_LABELS[day].slice(0, 3)} (${formatOffWeeksCompact(cfg.offWeeks)})`);
    }
  }
  return offs.length ? offs.join(", ") : "—";
}

function workingHoursSummary(r: ShiftRecord): string {
  const mon = r.weeklySchedule.monday;
  if (mon.dayType === "working" || mon.dayType === "selected_weeks_off") {
    return formatDayTiming(mon);
  }
  for (const day of SHIFT_DAY_KEYS) {
    const cfg = r.weeklySchedule[day];
    if (cfg.dayType === "working" || cfg.dayType === "selected_weeks_off") {
      return formatDayTiming(cfg);
    }
  }
  return "—";
}

export default function ShiftSetupClient() {
  const router = useRouter();
  const [records, setRecords] = useState<ShiftRecord[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [confirm, setConfirm] = useState<{ record: ShiftRecord; count: number } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<{
    record: ShiftRecord;
    dialog: HrSettingsDeleteTarget;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [viewRecord, setViewRecord] = useState<ShiftRecord | null>(null);
  const modesSummary = useMemo(() => formatAttendanceModesSummary(loadAttendanceModesSettings()), []);

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
    let rows = [...records];
    if (statusFilter !== "all") rows = rows.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((r) => r.name.toLowerCase().includes(q));
    }
    return rows;
  }, [records, search, statusFilter]);

  const applyStatus = (record: ShiftRecord, active: boolean) => {
    saveShifts(
      records.map((r) =>
        r.id === record.id
          ? withShiftUpdateAudit({ ...r, status: active ? "active" : "inactive" })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, active));
    refresh();
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveShifts(records.filter((r) => r.id !== deleteTarget.record.id));
    setToast(`${deleteTarget.record.name} deleted.`);
    setDeleteTarget(null);
    refresh();
  };

  const columns: HrDataGridColumn<ShiftRecord>[] = [
    {
      id: "name",
      label: "Shift Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <button
          type="button"
          className="text-xs font-semibold text-foreground hover:text-brand-700 text-left"
          onClick={() => setViewRecord(r)}
        >
          {r.name}
        </button>
      ),
    },
    {
      id: "hours",
      label: "Working Hours",
      sortable: true,
      sortValue: (r) => workingHoursSummary(r),
      render: (r) => <span className="text-xs tabular-nums">{workingHoursSummary(r)}</span>,
    },
    {
      id: "weeklyOff",
      label: "Weekly Off",
      render: (r) => <span className="text-xs text-muted-foreground">{weeklyOffSummary(r)}</span>,
    },
    {
      id: "rules",
      label: "Attendance Rules",
      render: (r) => (
        <span className="text-xs text-muted-foreground">{formatShiftAttendanceRulesSummary(r)}</span>
      ),
    },
    {
      id: "mode",
      label: "Attendance Mode",
      render: () => <span className="text-xs text-muted-foreground">{modesSummary}</span>,
    },
    {
      id: "employees",
      label: "Employees",
      sortable: true,
      sortValue: (r) => countEmployeesOnShift(r, employees),
      render: (r) => (
        <span className="text-xs tabular-nums">{countEmployeesOnShift(r, employees)}</span>
      ),
    },
    {
      id: "status",
      label: "Active",
      render: (r) => (
        <HrActiveStatusSwitch
          checked={r.status === "active"}
          onCheckedChange={(on) => {
            if (!on) {
              const count = countEmployeesOnShift(r, employees);
              if (count > 0) {
                setConfirm({ record: r, count });
                return;
              }
            }
            applyStatus(r, on);
          }}
        />
      ),
    },
    {
      id: "actions",
      label: "Actions",
      render: (r) => (
        <div className="flex items-center gap-0.5">
          <HrIconActionButton label="View" onClick={() => setViewRecord(r)}>
            <Eye />
          </HrIconActionButton>
          <HrIconActionButton
            label="Edit"
            onClick={() => router.push(`/hr/settings/attendance/shift-setup/${r.id}/edit`)}
          >
            <Pencil />
          </HrIconActionButton>
          <HrIconActionButton
            label="Delete"
            destructive
            onClick={() =>
              setDeleteTarget({
                record: r,
                dialog: {
                  entityLabel: r.name,
                  usageCount: countEmployeesOnShift(r, employees),
                  isActive: r.status === "active",
                },
              })
            }
          >
            <span className="text-[11px]">✕</span>
          </HrIconActionButton>
        </div>
      ),
    },
  ];

  const viewPolicy =
    viewRecord?.attendancePolicyId != null
      ? getAttendancePolicyById(viewRecord.attendancePolicyId)
      : null;

  return (
    <HrOrgPageHeader
      title="Shift Setup"
      description="Work schedules, attendance rules, and mobile punch settings."
      icon={Timer}
      sectionLabel="Attendance Settings"
      sectionHref="/hr/settings"
      titleAside={
        <HrInfoHint
          mode="drawer"
          content={{
            title: "Shift Setup",
            summary:
              "Configure shift timings, weekly offs, attendance interpretation rules, and company mobile punch settings in one module.",
            what: "Each shift has its own schedule. Attendance rules are linked to a policy record. Mobile punch settings are company-wide.",
            when: "Before assigning shifts to employees and evaluating attendance.",
            affects: "Employee Profile shift assignment, attendance resolver, and Employee Mobile punch config.",
            rules: (
              <ul className="list-disc pl-4 space-y-1">
                <li>Holiday Calendar remains a separate Attendance Settings page.</li>
                <li>Mobile punch settings apply to all employees.</li>
                <li>Employees with an explicit attendance policy keep that assignment.</li>
              </ul>
            ),
          }}
        />
      }
      actions={
        <Button
          size="sm"
          className={hrBtn("gap-1.5", true)}
          onClick={() => router.push("/hr/settings/attendance/shift-setup/new")}
        >
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
              [
                "Shift Name",
                "Working Hours",
                "Weekly Off",
                "Attendance Rules",
                "Attendance Mode",
                "Employees",
                "Active",
              ],
              filtered.map((r) => [
                r.name,
                workingHoursSummary(r),
                weeklyOffSummary(r),
                formatShiftAttendanceRulesSummary(r),
                modesSummary,
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
          emptyDescription="Add a work schedule with attendance rules and punch settings."
          emptyActionLabel="+ Add Shift"
          onEmptyAction={() => router.push("/hr/settings/attendance/shift-setup/new")}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <Dialog open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <DialogContent className="max-w-md rounded-[16px] p-4 gap-3 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {viewRecord?.name ?? "Shift"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              Read-only summary — schedule, rules, and punch mode
            </DialogDescription>
          </DialogHeader>
          {viewRecord && (
            <div className="space-y-3 text-xs">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Shift Details
                </p>
                <p>Grace In/Out: {formatGraceSummary(viewRecord)}</p>
                <p>Break: {viewRecord.breakDurationMinutes} min</p>
                <p>Employees: {countEmployeesOnShift(viewRecord, employees)}</p>
                <p>Status: {viewRecord.status === "active" ? "Active" : "Inactive"}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Weekly Schedule
                </p>
                <p className="text-muted-foreground leading-snug">
                  {formatShiftScheduleSummary(viewRecord)}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Attendance Rules
                </p>
                {viewPolicy ? (
                  <ul className="space-y-0.5 text-muted-foreground">
                    <li>Late: {viewPolicy.trackLateComing ? `${viewPolicy.allowedLateEntriesPerMonth}/month` : "Off"}</li>
                    <li>
                      Half-day &lt; {viewPolicy.halfDayHours}h {viewPolicy.halfDayMinutes}m
                    </li>
                    <li>
                      Absent &lt; {viewPolicy.absentHours}h {viewPolicy.absentMinutes}m
                    </li>
                    <li>
                      OT:{" "}
                      {viewPolicy.overtimeEnabled
                        ? `After +${viewPolicy.overtimeAfterMinutes}m`
                        : "Off"}
                    </li>
                  </ul>
                ) : (
                  <p className="text-muted-foreground">Company default</p>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">
                  Attendance Mode
                </p>
                <p className="text-muted-foreground">{modesSummary} (company-wide)</p>
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
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "employees",
                "shift",
              )
            : ""
        }
        confirmLabel="Deactivate"
        destructive
      />

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget?.dialog ?? null}
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
