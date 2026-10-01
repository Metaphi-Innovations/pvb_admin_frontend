"use client";

/**
 * Employee Profile operational / integration sections.
 * Structured employee-specific views + empty states — not full HR module engines.
 * Demo employee may carry optional profileSummaries for UI review only.
 */

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, ExternalLink, Eye, Plus, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildMonthlySummaries,
  currentMonthKey,
  getRecordsForEmployee,
  loadDailyRecords,
  monthLabel,
} from "@/app/(app)/hr/attendance/attendance-data";
import { countOfficeMonth } from "@/app/(app)/hr/attendance/office-attendance-resolve";
import {
  buildMonthlySummaries as buildSfMonthlySummaries,
  getSfEmployees,
  resolveEmployeeMonthDays,
} from "@/app/(app)/hr/sales-force-attendance/sf-attendance-data";
import { ensureAttendanceConfigMigration } from "@/lib/hr/attendance-config-migration";
import {
  getAvailableOptionalHolidaysForEmployee,
  getEmployeeLeaveBalances,
  OPTIONAL_LEAVE_TYPE_NAME,
  resolveEmployeeOptionalHolidays,
  type EmployeeLeaveBalanceView,
  type OptionalHolidayRow,
} from "@/app/(app)/hr/leave/leave-balance-data";
import { getAvailableLeaveTypes } from "@/app/(app)/hr/settings/leave-data";
import {
  getLeaveRequestsForEmployee,
  submitLeaveRequest,
  type LeaveRequestRecord,
} from "@/app/(app)/hr/requests/requests-data";
import { IconActionBtn, RequestStatusChip } from "@/app/(app)/hr/requests/components/RequestUi";
import { formatDateDisplay, getBranchDisplayLabel } from "../employee-display";
import type { HrEmployee } from "../employee-master-data";
import { EmptyProfileState, ProfileSectionHeader } from "./employee-form-ui";
import { getOnboardingDocumentChecklist } from "@/app/(app)/hr/settings/onboarding-data";
import { resolveEmployeeScheduleFromShift, getActiveShifts, loadShifts } from "@/app/(app)/hr/settings/shift-setup-data";
import {
  getActiveAttendancePolicies,
  getDefaultAttendancePolicy,
  loadAttendancePolicies,
  resolveEmployeeAttendancePolicyId,
} from "@/app/(app)/hr/settings/attendance-policy-data";
import { updateHrEmployee } from "../employee-master-data";
import {
  formatWelcomeHistoryStatus,
  getWelcomeHistoryForEmployee,
  getWelcomeSendOnLabel,
  loadWelcomeSetup,
  loadWelcomeTemplates,
} from "@/app/(app)/hr/settings/welcome-workflow-data";
import { SendWelcomeDialog } from "@/app/(app)/hr/settings/onboarding/welcome-workflow/SendWelcomeDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { hrBtn, HrFormDrawer } from "@/app/(app)/hr/settings/organization/_components";
import {
  buildEmployeeJoiningChecklist,
  getEmployeeOnboardingStatusLabel,
  getJoiningChecklistStats,
  isEmployeeOnboardingComplete,
  setEmployeeChecklistItemComplete,
  type EmployeeJoiningChecklistRow,
} from "../joining-checklist";
import { HrIconActionButton } from "@/app/(app)/hr/settings/organization/_components/HrIconActionButton";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export { SalaryPayrollProfileSection } from "./SalaryPayrollProfileSection";
export { HrLettersProfileSection } from "./HrLettersProfileSection";
export { OffboardingProfileSection } from "./OffboardingProfileSection";

function SectionBlock({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white overflow-hidden mb-3 last:mb-0">
      <div className="px-3 py-2.5 border-b border-border bg-muted/20">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
        {description && <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}

function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-5 gap-y-3">{children}</div>;
}

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const display =
    value === null || value === undefined || value === ""
      ? "—"
      : String(value);
  return (
    <div className="min-w-0">
      <p className="text-[12px] font-medium leading-4 text-muted-foreground">{label}</p>
      <p className="text-[12px] font-normal leading-4 text-foreground mt-0.5 truncate">{display}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/10 px-3 py-2.5">
      <p className="text-lg font-bold text-foreground leading-none tabular-nums">{value}</p>
      <p className="text-[11px] text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

function EmptyTable({
  columns,
  message,
}: {
  columns: string[];
  message: string;
}) {
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b border-border text-left">
            {columns.map((c) => (
              <th key={c} className="px-3 py-2 font-semibold whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr>
            <td colSpan={columns.length} className="px-3 py-8 text-center text-muted-foreground">
              {message}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/* ─── Onboarding ─── */

export function OnboardingProfileSection({ employee }: { employee: HrEmployee }) {
  const ob = employee.profileSummaries?.onboarding;
  const [checklistVersion, setChecklistVersion] = useState(0);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [welcomeTick, setWelcomeTick] = useState(0);

  const docChecklist = useMemo(
    () => getOnboardingDocumentChecklist(employee.documents),
    [employee.documents],
  );

  const liveRows = useMemo(
    () => buildEmployeeJoiningChecklist(employee),
    [employee, checklistVersion],
  );

  const stats = useMemo(() => getJoiningChecklistStats(liveRows), [liveRows]);
  const statusLabel = useMemo(
    () => getEmployeeOnboardingStatusLabel(employee),
    [employee, checklistVersion],
  );
  const onboardingDone = useMemo(
    () => isEmployeeOnboardingComplete(employee),
    [employee, checklistVersion],
  );
  const welcomeSummary = useMemo(() => {
    try {
      const w = loadWelcomeSetup();
      const parts: string[] = [];
      if (w.welcomeEmail) parts.push("Email");
      if (w.welcomeNotification) parts.push("Notification");
      if (parts.length === 0) return "Not configured";
      const templates = loadWelcomeTemplates();
      const def = templates.find((t) => t.id === w.defaultTemplateId);
      const tpl = def ? ` Â· ${def.name}` : "";
      return `${parts.join(" Â· ")} Â· ${getWelcomeSendOnLabel(w.sendOn)}${tpl}`;
    } catch {
      return "—";
    }
  }, [welcomeTick]);
  const welcomeHistory = useMemo(
    () => getWelcomeHistoryForEmployee(employee.id),
    [employee.id, welcomeTick],
  );
  const hasWelcomeHistory = welcomeHistory.length > 0;
  const lastWelcome = welcomeHistory[0];
  const welcomeStatus = lastWelcome
    ? formatWelcomeHistoryStatus(lastWelcome.status)
    : "Not sent";
  const welcomeTemplateLabel = lastWelcome?.templateName
    ?? (() => {
      try {
        const w = loadWelcomeSetup();
        const tpl = loadWelcomeTemplates().find((t) => t.id === w.defaultTemplateId);
        return tpl?.name ?? "—";
      } catch {
        return "—";
      }
    })();
  const welcomeLastSentLabel = lastWelcome
    ? (() => {
        const d = new Date(lastWelcome.sentOn);
        if (Number.isNaN(d.getTime())) return lastWelcome.sentOn;
        const date = d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
        const time = d.toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: true,
        });
        return `${date}, ${time}`;
      })()
    : "—";
  const started =
    !!ob || liveRows.some((r) => r.completed) || docChecklist.some((d) => d.received);

  const toggleItem = (row: EmployeeJoiningChecklistRow) => {
    if (!row.canToggle) return;
    setEmployeeChecklistItemComplete(employee, row.checklistItemId, row.name, !row.completed);
    setChecklistVersion((v) => v + 1);
  };

  return (
    <div>
      <ProfileSectionHeader
        title="Onboarding"
        description="Employee-specific joining status. Checklist and documents come from HR Settings."
      />
      {!started ? (
        <EmptyProfileState message="Onboarding has not been started for this employee." />
      ) : null}

      <div className={cn("mt-3 space-y-0", !started && "opacity-90")}>
        <SectionBlock title="Onboarding Summary">
          <FieldGrid>
            <Field label="Overall Onboarding Status" value={statusLabel} />
            <Field
              label="Start Date"
              value={ob?.startDate ? formatDateDisplay(ob.startDate) : "—"}
            />
            <Field
              label="Completion Date"
              value={
                onboardingDone
                  ? formatDateDisplay(ob?.completionDate || new Date().toISOString().slice(0, 10))
                  : "—"
              }
            />
            <Field label="Assigned HR" value={ob?.assignedHr ?? "—"} />
            <Field label="Configured Channels" value={welcomeSummary} />
          </FieldGrid>
        </SectionBlock>

        <SectionBlock
          title="Welcome Communication"
          description="Send or resend the welcome communication for this employee."
        >
          <FieldGrid>
            <Field label="Status" value={welcomeStatus} />
            <Field label="Template" value={welcomeTemplateLabel} />
            <Field
              label={hasWelcomeHistory ? "Last Sent On" : "Scheduled On"}
              value={hasWelcomeHistory ? welcomeLastSentLabel : "—"}
            />
          </FieldGrid>
          <div className="mt-3">
            <Button
              type="button"
              size="sm"
              className={hrBtn("gap-1.5", true)}
              onClick={() => setWelcomeOpen(true)}
            >
              {hasWelcomeHistory ? "Resend Welcome" : "Send Welcome"}
            </Button>
          </div>
        </SectionBlock>

        <SectionBlock
          title="Documents"
          description="Document requirements from HR Settings. Status reflects the same employee document records."
        >
          {docChecklist.length === 0 ? (
            <EmptyProfileState message="No active document requirements configured." />
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold">Document Type</th>
                    <th className="px-3 py-2 font-semibold w-28">Requirement</th>
                    <th className="px-3 py-2 font-semibold w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {docChecklist.map((row) => (
                    <tr key={row.id} className="border-b border-border/60 last:border-b-0">
                      <td className="px-3 py-2 font-medium text-foreground">{row.name}</td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            row.mandatory
                              ? "bg-brand-50 text-brand-700 border border-brand-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200",
                          )}
                        >
                          {row.requirementLabel}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            row.received ? "text-emerald-700" : "text-amber-700",
                          )}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionBlock>

        <SectionBlock
          title="Joining Checklist"
          description="Tasks from Joining Checklist settings. Mark complete when done; some items auto-complete from employee data."
        >
          <div className="grid grid-cols-3 gap-2 mb-3">
            <MiniStat label="Assigned Items" value={stats.assigned} />
            <MiniStat label="Completed Items" value={stats.completed} />
            <MiniStat label="Pending Items" value={stats.pending} />
          </div>
          {liveRows.length === 0 ? (
            <EmptyTable
              columns={["Checklist Item", "Status", "Completed On", "Actions"]}
              message="No checklist items configured. Add items under HR Settings → Joining Checklist."
            />
          ) : (
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold w-10">#</th>
                    <th className="px-3 py-2 font-semibold">Checklist Item</th>
                    <th className="px-3 py-2 font-semibold w-24">Type</th>
                    <th className="px-3 py-2 font-semibold w-24">Status</th>
                    <th className="px-3 py-2 font-semibold w-28">Completed On</th>
                    <th className="px-3 py-2 font-semibold w-12">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {liveRows.map((row) => (
                    <tr
                      key={row.checklistItemId}
                      className={cn(
                        "border-b border-border/60 last:border-b-0",
                        !row.masterActive && "opacity-70",
                      )}
                    >
                      <td className="px-3 py-2 font-mono text-brand-700 tabular-nums">
                        {row.sequence < 9999 ? row.sequence : "—"}
                      </td>
                      <td className="px-3 py-2 font-medium text-foreground">
                        {row.name}
                        {!row.masterActive && (
                          <span className="ml-1.5 text-[10px] text-muted-foreground">(inactive)</span>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold",
                            row.mandatory
                              ? "bg-brand-50 text-brand-700 border border-brand-200"
                              : "bg-slate-100 text-slate-600 border border-slate-200",
                          )}
                        >
                          {row.mandatory ? "Mandatory" : "Optional"}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "text-[11px] font-medium",
                            row.completed ? "text-emerald-700" : "text-amber-700",
                          )}
                        >
                          {row.status}
                          {row.autoComplete ? (
                            <span className="text-muted-foreground font-normal"> Â· Auto</span>
                          ) : null}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {row.completedOn ? formatDateDisplay(row.completedOn) : "—"}
                      </td>
                      <td className="px-3 py-2">
                        {row.canToggle ? (
                          <HrIconActionButton
                            label={row.completed ? "Mark Pending" : "Mark Complete"}
                            onClick={() => toggleItem(row)}
                          >
                            {row.completed ? <RotateCcw /> : <Check />}
                          </HrIconActionButton>
                        ) : (
                          <span className="text-[10px] text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionBlock>
      </div>

      <SendWelcomeDialog
        open={welcomeOpen}
        onOpenChange={setWelcomeOpen}
        employee={employee}
        onSent={() => setWelcomeTick((t) => t + 1)}
      />
    </div>
  );
}

/* ─── Attendance ─── */

function AssignmentPicker({
  label,
  value,
  options,
  onChange,
  placeholder,
}: {
  label: string;
  value: number | null;
  options: { id: number; label: string }[];
  onChange: (id: number) => void;
  placeholder: string;
}) {
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.id === value);
  return (
    <div className="space-y-1">
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="h-9 w-full max-w-[280px] px-3 text-xs text-left border border-border rounded-lg bg-white flex items-center justify-between gap-2 hover:bg-muted/30"
          >
            <span className={cn("truncate", !selected && "text-muted-foreground")}>
              {selected?.label ?? placeholder}
            </span>
            <ChevronsUpDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-[280px] p-1 rounded-[12px]">
          {options.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => {
                onChange(opt.id);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg transition-colors",
                value === opt.id
                  ? "bg-brand-50 text-brand-700 font-medium"
                  : "text-foreground hover:bg-muted/60",
              )}
            >
              <span className="flex-1 truncate">{opt.label}</span>
              {value === opt.id ? (
                <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
              ) : null}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function AttendanceProfileSection({
  employee,
  onEmployeeUpdated,
}: {
  employee: HrEmployee;
  onEmployeeUpdated?: () => void;
}) {
  const demoAtt = employee.profileSummaries?.attendance;
  const [policyTick, setPolicyTick] = useState(0);

  useEffect(() => {
    const refresh = () => setPolicyTick((t) => t + 1);
    window.addEventListener("hr-attendance-policy-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hr-attendance-policy-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const shifts = useMemo(() => getActiveShifts(loadShifts()), []);
  const policies = useMemo(
    () => getActiveAttendancePolicies(loadAttendancePolicies()),
    [policyTick],
  );
  const defaultPolicy = useMemo(
    () => getDefaultAttendancePolicy(loadAttendancePolicies()),
    [policyTick],
  );

  const initialShiftId =
    demoAtt?.shiftId ??
    shifts.find((s) => s.name === demoAtt?.shift)?.id ??
    shifts[0]?.id ??
    null;
  const initialPolicyId = resolveEmployeeAttendancePolicyId(employee) ?? defaultPolicy?.id ?? null;

  const [shiftId, setShiftId] = useState<number | null>(initialShiftId);
  const [policyId, setPolicyId] = useState<number | null>(initialPolicyId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setShiftId(initialShiftId);
    setPolicyId(initialPolicyId);
  }, [employee.id, initialShiftId, initialPolicyId]);

  const assignedScheduleLabel = useMemo(() => {
    const att = shiftId ? { shiftId, shift: shifts.find((s) => s.id === shiftId)?.name } : demoAtt;
    return resolveEmployeeScheduleFromShift(att, shifts);
  }, [shiftId, shifts, demoAtt]);

  const assignmentDirty =
    shiftId !== initialShiftId || policyId !== initialPolicyId;

  const handleSaveAssignment = () => {
    if (!shiftId || !policyId) return;
    setSaving(true);
    const shift = shifts.find((s) => s.id === shiftId);
    const defaultId = defaultPolicy?.id;
    const explicitPolicyId = policyId === defaultId ? undefined : policyId;
    updateHrEmployee(employee.id, {
      profileSummaries: {
        ...employee.profileSummaries,
        attendance: {
          present: demoAtt?.present ?? 0,
          absent: demoAtt?.absent ?? 0,
          leave: demoAtt?.leave ?? 0,
          weeklyOff: demoAtt?.weeklyOff,
          shiftId,
          shift: shift?.name ?? demoAtt?.shift ?? "",
          attendancePolicyId: explicitPolicyId,
        },
      },
    });
    setSaving(false);
    onEmployeeUpdated?.();
  };

  const isSfEmployee = useMemo(
    () => getSfEmployees().some((e) => e.employeeId === employee.id),
    [employee.id],
  );

  const months = useMemo(() => {
    try {
      if (isSfEmployee) {
        ensureAttendanceConfigMigration();
        const month = currentMonthKey();
        const sf = buildSfMonthlySummaries(month).find((s) => s.employeeId === employee.id);
        return [
          {
            month,
            label: monthLabel(month),
            present: sf?.presentDays ?? 0,
            absent: sf?.absentDays ?? 0,
            halfDay: 0,
            leave: 0,
            holiday: sf?.holidayDays ?? 0,
            weekOff: sf?.weekOffDays ?? 0,
            lateComing: 0,
            earlyLeaving: 0,
          },
        ];
      }
      const records = loadDailyRecords();
      const summaries = buildMonthlySummaries(employee.id, records);
      return summaries.length
        ? summaries
        : [
            {
              month: currentMonthKey(),
              label: monthLabel(currentMonthKey()),
              present: 0,
              absent: 0,
              halfDay: 0,
              leave: 0,
              holiday: 0,
              weekOff: 0,
              lateComing: 0,
              earlyLeaving: 0,
            },
          ];
    } catch {
      return [
        {
          month: currentMonthKey(),
          label: monthLabel(currentMonthKey()),
          present: 0,
          absent: 0,
          halfDay: 0,
          leave: 0,
          holiday: 0,
          weekOff: 0,
          lateComing: 0,
          earlyLeaving: 0,
        },
      ];
    }
  }, [employee.id, isSfEmployee]);

  const [month, setMonth] = useState(months[0]?.month ?? currentMonthKey());

  const summary = useMemo(() => {
    try {
      if (isSfEmployee) {
        ensureAttendanceConfigMigration();
        const days = resolveEmployeeMonthDays(employee.id, month);
        return {
          present: days.filter((r) => r.status === "present").length,
          absent: days.filter((r) => r.status === "absent").length,
          leave: 0,
          halfDay: 0,
          late: 0,
          weekOff: days.filter((r) => r.status === "week_off").length,
          holiday: days.filter((r) => r.status === "holiday").length,
          count: days.filter((r) => r.status !== null).length,
        };
      }
      const records = getRecordsForEmployee(employee.id, {
        dateFrom: `${month}-01`,
        dateTo: `${month}-31`,
      });
      const c = countOfficeMonth(employee, month, records);
      return {
        present: c.present,
        absent: c.absent,
        leave: c.leave,
        halfDay: c.halfDay,
        late: c.lateComing,
        weekOff: c.weekOff,
        holiday: c.holiday,
        count: c.present + c.absent + c.leave + c.halfDay + c.holiday + c.weekOff,
      };
    } catch {
      return null;
    }
  }, [employee, month, isSfEmployee]);

  const hasAssignment = shifts.length > 0 && policies.length > 0;

  return (
    <div>
      <ProfileSectionHeader
        title="Attendance"
        description="Employee-specific assignment and summary. Holidays and weekly offs resolve from Attendance Settings (Holiday Calendar + Shift Setup)."
      />

      <SectionBlock title="Attendance Assignment">
        {!hasAssignment ? (
          <p className="text-xs text-muted-foreground mb-3">
            Add an active Shift and Attendance Policy in HR Settings before assigning.
          </p>
        ) : (
          <div className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-[640px]">
              <AssignmentPicker
                label="Assigned Shift"
                value={shiftId}
                options={shifts.map((s) => ({ id: s.id, label: s.name }))}
                onChange={setShiftId}
                placeholder="Select shift…"
              />
              <AssignmentPicker
                label="Attendance Policy"
                value={policyId}
                options={policies.map((p) => ({
                  id: p.id,
                  label: p.isDefault ? `${p.name} (Default)` : p.name,
                }))}
                onChange={setPolicyId}
                placeholder="Select policy…"
              />
            </div>
            <FieldGrid>
              <Field label="Work Schedule" value={assignedScheduleLabel} />
            </FieldGrid>
            {assignmentDirty ? (
              <Button
                size="sm"
                className={hrBtn("gap-1.5", true)}
                onClick={handleSaveAssignment}
                disabled={saving || !shiftId || !policyId}
              >
                Update Assignment
              </Button>
            ) : null}
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Attendance Summary">
        {demoAtt ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-3">
            <MiniStat label="Present" value={demoAtt.present} />
            <MiniStat label="Absent" value={demoAtt.absent} />
            <MiniStat label="Leave" value={demoAtt.leave} />
          </div>
        ) : null}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-8 w-[160px] text-xs">
              <SelectValue placeholder="Period" />
            </SelectTrigger>
            <SelectContent>
              {months.map((m) => (
                <SelectItem key={m.month} value={m.month} className="text-xs">
                  {m.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Link
            href={`/hr/attendance/${employee.id}?month=${month}&tab=calendar`}
            className="h-8 px-2.5 text-xs font-medium rounded-lg border border-border inline-flex items-center gap-1.5 hover:bg-muted/50 text-foreground"
          >
            Open attendance <ExternalLink className="w-3 h-3" />
          </Link>
        </div>
        {!demoAtt && (!summary || summary.count === 0) ? (
          <EmptyProfileState message="No attendance information available yet." />
        ) : !demoAtt && summary ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
            <MiniStat label="Present" value={summary.present} />
            <MiniStat label="Absent" value={summary.absent} />
            <MiniStat label="Leave" value={summary.leave} />
            <MiniStat label="Half Day" value={summary.halfDay} />
            <MiniStat label="Late" value={summary.late} />
            <MiniStat label="Weekly Off" value={summary.weekOff} />
            <MiniStat label="Holiday" value={summary.holiday} />
          </div>
        ) : null}
      </SectionBlock>
    </div>
  );
}

/* ─── Leave & Balance ─── */

function OptionalHolidayStatusChip({ status }: { status: OptionalHolidayRow["status"] }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border",
        status === "availed"
          ? "bg-slate-100 text-slate-600 border-slate-200"
          : "bg-emerald-50 text-emerald-700 border-emerald-200",
      )}
    >
      {status === "availed" ? "Availed" : "Available"}
    </span>
  );
}

export function LeaveBalanceProfileSection({ employee }: { employee: HrEmployee }) {
  const [balances, setBalances] = useState<EmployeeLeaveBalanceView[]>([]);
  const [optionalRows, setOptionalRows] = useState<OptionalHolidayRow[]>([]);
  const [applications, setApplications] = useState<LeaveRequestRecord[]>([]);
  const [viewId, setViewId] = useState<string | null>(null);
  const [applyOpen, setApplyOpen] = useState(false);
  const [applyLeaveType, setApplyLeaveType] = useState("");
  const [applyFrom, setApplyFrom] = useState("");
  const [applyTo, setApplyTo] = useState("");
  const [applyDays, setApplyDays] = useState("1");
  const [applyReason, setApplyReason] = useState("");
  const [applyOptionalKey, setApplyOptionalKey] = useState("");
  const [applyError, setApplyError] = useState("");
  const [tick, setTick] = useState(0);

  const leaveTypeOptions = useMemo(
    () => getAvailableLeaveTypes(employee.employeeCode).map((t) => t.name),
    [employee.employeeCode, tick],
  );
  const availableOptional = useMemo(
    () => getAvailableOptionalHolidaysForEmployee(employee.id, employee.employeeCode, undefined, employee.branch),
    [employee.id, employee.employeeCode, employee.branch, tick],
  );

  useEffect(() => {
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("hr-leave-balance-updated", refresh);
    window.addEventListener("hr-leave-types-updated", refresh);
    window.addEventListener("hr-leave-policies-updated", refresh);
    window.addEventListener("hr-employee-leave-policy-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("hr-leave-balance-updated", refresh);
      window.removeEventListener("hr-leave-types-updated", refresh);
      window.removeEventListener("hr-leave-policies-updated", refresh);
      window.removeEventListener("hr-employee-leave-policy-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  useEffect(() => {
    setBalances(getEmployeeLeaveBalances(employee.id, employee.employeeCode));
    setOptionalRows(
      resolveEmployeeOptionalHolidays(
        employee.id,
        employee.employeeCode,
        undefined,
        employee.branch,
      ),
    );
    setApplications(getLeaveRequestsForEmployee(employee.id, employee.employeeCode));
  }, [employee.id, employee.employeeCode, employee.branch, tick]);

  const viewRec = applications.find((r) => r.id === viewId) ?? null;

  const resetApplyForm = () => {
    setApplyLeaveType("");
    setApplyFrom("");
    setApplyTo("");
    setApplyDays("1");
    setApplyReason("");
    setApplyOptionalKey("");
    setApplyError("");
  };

  const openApply = () => {
    resetApplyForm();
    setApplyOpen(true);
  };

  const handleApplyLeave = () => {
    setApplyError("");
    const days = Number(applyDays) || 0;
    if (!applyLeaveType) {
      setApplyError("Select a leave type.");
      return;
    }
    if (applyLeaveType === OPTIONAL_LEAVE_TYPE_NAME) {
      if (!applyOptionalKey) {
        setApplyError("Select an Optional Holiday from the eligible list.");
        return;
      }
    } else if (!applyFrom || !applyTo) {
      setApplyError("From and To dates are required.");
      return;
    }
    const selectedOptional = availableOptional.find((h) => h.key === applyOptionalKey);
    const fromDate =
      applyLeaveType === OPTIONAL_LEAVE_TYPE_NAME ? selectedOptional?.date ?? "" : applyFrom;
    const toDate =
      applyLeaveType === OPTIONAL_LEAVE_TYPE_NAME ? selectedOptional?.date ?? "" : applyTo;

    const result = submitLeaveRequest({
      employeeId: employee.id,
      employeeName: employee.employeeName,
      employeeCode: employee.employeeCode,
      branch: employee.branch,
      branchLabel: getBranchDisplayLabel(employee.branch),
      department: employee.department,
      leaveType: applyLeaveType,
      fromDate,
      toDate,
      days: applyLeaveType === OPTIONAL_LEAVE_TYPE_NAME ? 1 : days,
      reason: applyReason,
      optionalHolidayKey:
        applyLeaveType === OPTIONAL_LEAVE_TYPE_NAME ? applyOptionalKey : undefined,
    });
    if (!result.ok) {
      setApplyError(result.error);
      return;
    }
    setApplyOpen(false);
    setTick((t) => t + 1);
  };

  return (
    <div>
      <ProfileSectionHeader
        title="Leave & Balance"
        description="Current balances, optional holidays, and leave applications for this employee."
      />

      <SectionBlock title="Leave Balances">
        {balances.length === 0 ? (
          <EmptyTable
            columns={["Leave Type", "Credited", "Used", "Pending", "Remaining"]}
            message="No leave balances assigned for this employee."
          />
        ) : (
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden -mx-0">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Leave Type</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap text-right">Credited</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap text-right">Used</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap text-right">Pending</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap text-right">Remaining</th>
                  </tr>
                </thead>
                <tbody>
                  {balances.map((b) => (
                    <tr
                      key={b.leaveType}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{b.leaveType}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.credited}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{b.used}</td>
                      <td className="px-3 py-2 text-right tabular-nums">
                        {b.pending > 0 ? (
                          <span className="inline-flex items-center gap-1.5 justify-end text-amber-700">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0" />
                            {b.pending}
                          </span>
                        ) : (
                          b.pending
                        )}
                      </td>
                      <td className="px-3 py-2 text-right tabular-nums font-bold text-foreground">
                        {b.remaining}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Optional Leave Details">
        {optionalRows.length === 0 ? (
          <p className="text-xs text-muted-foreground">No optional holidays listed for this employee.</p>
        ) : (
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Optional Holiday</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Date</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {optionalRows.map((h) => (
                    <tr
                      key={h.key}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{h.name}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(h.date)}</td>
                      <td className="px-3 py-2">
                        <OptionalHolidayStatusChip status={h.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionBlock>

      <SectionBlock title="Leave Applications">
        <div className="flex justify-end mb-2.5">
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openApply}>
            <Plus className="w-3.5 h-3.5" /> Apply Leave
          </Button>
        </div>
        {applications.length === 0 ? (
          <EmptyTable
            columns={[
              "Leave Type",
              "From",
              "To",
              "Days",
              "Status",
              "Adjusted Against",
              "Applied On",
              "Actions",
            ]}
            message="No leave applications for this employee."
          />
        ) : (
          <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b border-border text-left">
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Leave Type</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">From</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">To</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap text-right">Days</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Status</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Adjusted Against</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap">Applied On</th>
                    <th className="px-3 py-2 font-semibold whitespace-nowrap w-12">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {applications.map((r) => (
                    <tr
                      key={r.id}
                      className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                    >
                      <td className="px-3 py-2 font-medium whitespace-nowrap">{r.leaveType}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.fromDate)}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{formatDateDisplay(r.toDate)}</td>
                      <td className="px-3 py-2 text-right tabular-nums">{r.days}</td>
                      <td className="px-3 py-2">
                        <RequestStatusChip status={r.status} />
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {r.status === "approved" && r.adjustedAgainst
                          ? r.adjustedAgainst
                          : "—"}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatDateDisplay(r.appliedOn)}
                      </td>
                      <td className="px-3 py-2">
                        <IconActionBtn label="View Request" onClick={() => setViewId(r.id)}>
                          <Eye className="w-3.5 h-3.5" />
                        </IconActionBtn>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionBlock>

      <Sheet open={!!viewRec} onOpenChange={(o) => !o && setViewId(null)}>
        <SheetContent className="max-w-[440px]">
          <SheetHeader>
            <SheetTitle>Leave Application</SheetTitle>
            <SheetDescription>
              {viewRec ? `${viewRec.leaveType} Â· read-only` : ""}
            </SheetDescription>
          </SheetHeader>
          {viewRec && (
            <SheetBody className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-muted-foreground">Leave Type</p>
                  <p className="font-medium">{viewRec.leaveType}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Status</p>
                  <RequestStatusChip status={viewRec.status} />
                </div>
                <div>
                  <p className="text-muted-foreground">From</p>
                  <p className="font-medium">{formatDateDisplay(viewRec.fromDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">To</p>
                  <p className="font-medium">{formatDateDisplay(viewRec.toDate)}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Days</p>
                  <p className="font-medium tabular-nums">{viewRec.days}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Applied On</p>
                  <p className="font-medium">{formatDateDisplay(viewRec.appliedOn)}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-muted-foreground">Adjusted Against</p>
                  <p className="font-medium">
                    {viewRec.status === "approved" && viewRec.adjustedAgainst
                      ? viewRec.adjustedAgainst
                      : "—"}
                  </p>
                </div>
                {viewRec.optionalHolidayName ? (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Optional Holiday</p>
                    <p className="font-medium">
                      {viewRec.optionalHolidayName} Â· {formatDateDisplay(viewRec.fromDate)}
                    </p>
                  </div>
                ) : null}
                <div className="col-span-2">
                  <p className="text-muted-foreground">Reason</p>
                  <p className="font-medium">{viewRec.reason || "—"}</p>
                </div>
                {viewRec.rejectionReason ? (
                  <div className="col-span-2">
                    <p className="text-muted-foreground">Rejection Reason</p>
                    <p className="font-medium">{viewRec.rejectionReason}</p>
                  </div>
                ) : null}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Approvals are managed under HR → Requests.
              </p>
            </SheetBody>
          )}
        </SheetContent>
      </Sheet>

      <HrFormDrawer
        open={applyOpen}
        onOpenChange={(o) => {
          setApplyOpen(o);
          if (!o) resetApplyForm();
        }}
        title="Apply Leave"
        description="Optional Leave must match an eligible Optional Holiday from the employee's calendar."
        onSave={handleApplyLeave}
        saveLabel="Submit"
      >
        <div className="space-y-3.5">
          <div className="space-y-1.5">
            <p className="text-xs font-medium">Leave Type</p>
            <Select
              value={applyLeaveType || undefined}
              onValueChange={(v) => {
                setApplyLeaveType(v);
                setApplyOptionalKey("");
                setApplyError("");
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select leave type…" />
              </SelectTrigger>
              <SelectContent>
                {leaveTypeOptions.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {applyLeaveType === OPTIONAL_LEAVE_TYPE_NAME ? (
            <div className="space-y-1.5">
              <p className="text-xs font-medium">Optional Holiday</p>
              <Select
                value={applyOptionalKey || undefined}
                onValueChange={(key) => {
                  setApplyOptionalKey(key);
                  const h = availableOptional.find((x) => x.key === key);
                  if (h) {
                    setApplyFrom(h.date);
                    setApplyTo(h.date);
                    setApplyDays("1");
                  }
                  setApplyError("");
                }}
              >
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue placeholder="Select optional holiday…" />
                </SelectTrigger>
                <SelectContent>
                  {availableOptional.length === 0 ? (
                    <SelectItem value="__none" disabled className="text-xs">
                      No available optional holidays
                    </SelectItem>
                  ) : (
                    availableOptional.map((h) => (
                      <SelectItem key={h.key} value={h.key} className="text-xs">
                        {h.name} — {formatDateDisplay(h.date)}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <p className="text-[11px] text-muted-foreground">
                Only eligible Optional Holidays from the applicable Holiday Calendar are listed.
              </p>
            </div>
          ) : applyLeaveType ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">From</p>
                  <HrDateInput value={applyFrom} onChange={setApplyFrom} aria-label="From date" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium">To</p>
                  <HrDateInput value={applyTo} onChange={setApplyTo} aria-label="To date" />
                </div>
              </div>
              <div className="space-y-1.5">
                <p className="text-xs font-medium">Days</p>
                <Input
                  type="number"
                  min="0.25"
                  step="0.25"
                  value={applyDays}
                  onChange={(e) => setApplyDays(e.target.value)}
                  className="h-9 text-xs"
                />
              </div>
            </>
          ) : null}

          <div className="space-y-1.5">
            <p className="text-xs font-medium">Reason</p>
            <Textarea
              value={applyReason}
              onChange={(e) => setApplyReason(e.target.value)}
              rows={2}
              className="text-xs"
              placeholder="Reason for leave"
            />
          </div>

          {applyError ? <p className="text-xs text-red-500">{applyError}</p> : null}
        </div>
      </HrFormDrawer>
    </div>
  );
}


/* ─── Timeline ─── */

type TimelineItem = { id: string; at: string; label: string; detail: string };

export function TimelineProfileSection({ employee }: { employee: HrEmployee }) {
  const items = useMemo((): TimelineItem[] => {
    const out: TimelineItem[] = [];
    const extras = employee.profileSummaries?.timelineExtras;
    if (extras?.length) {
      out.push(...extras);
    } else {
      if (employee.createdAt) {
        out.push({
          id: "created",
          at: employee.createdAt,
          label: "Employee Created",
          detail: `By ${employee.createdBy || "System"}`,
        });
      }
      if (employee.updatedAt && employee.updatedAt !== employee.createdAt) {
        out.push({
          id: "updated",
          at: employee.updatedAt,
          label: "Employee Details Updated",
          detail: `By ${employee.updatedBy || "System"}`,
        });
      }
      if (employee.dateOfJoining) {
        out.push({
          id: "doj",
          at: employee.dateOfJoining,
          label: "Date of Joining",
          detail: formatDateDisplay(employee.dateOfJoining),
        });
      }
    }
    return out.sort((a, b) => b.at.localeCompare(a.at));
  }, [employee]);

  return (
    <div>
      <ProfileSectionHeader
        title="Timeline"
        description="Employee lifecycle events for this profile."
      />
      {items.length === 0 ? (
        <EmptyProfileState message="No employee activity recorded yet." />
      ) : (
        <ul className="space-y-0 border border-border rounded-lg overflow-hidden divide-y divide-border">
          {items.map((ev) => (
            <li key={ev.id} className="flex gap-3 px-3 py-2.5 bg-white">
              <div className="w-1.5 h-1.5 rounded-full bg-brand-600 mt-1.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-foreground">{ev.label}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{ev.detail}</p>
              </div>
              <p className="text-[11px] text-muted-foreground whitespace-nowrap shrink-0">
                {formatDateDisplay(ev.at)}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
