"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Plus } from "lucide-react";
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
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
  ATTENDANCE_PERIOD_OPTIONS,
  CYCLE_DAY_OPTIONS,
  PAYROLL_FREQUENCY_OPTIONS,
  PROCESSING_DAY_OPTIONS,
  SALARY_PAYMENT_RULE_OPTIONS,
  attendancePeriodLabel,
  countPayrollCycleUsage,
  formatAttendancePeriodSummary,
  formatCycleDay,
  formatSalaryPaymentSummary,
  frequencyLabel,
  isPayrollCycleNameTaken,
  loadPayrollCycles,
  nextPayrollCycleId,
  salaryPaymentRuleLabel,
  savePayrollCycles,
  withPayrollCycleNewAudit,
  withPayrollCycleUpdateAudit,
  type AttendancePeriodType,
  type CycleDayOfMonth,
  type PayrollCycleRecord,
  type PayrollFrequency,
  type SalaryPaymentRule,
} from "../../payroll-cycle-data";

type FormState = {
  id?: number;
  cycleName: string;
  frequency: PayrollFrequency;
  attendancePeriod: AttendancePeriodType;
  cutoffDay: string;
  processingDay: string;
  salaryPaymentRule: SalaryPaymentRule;
  salaryPaymentDay: string;
  isDefault: boolean;
  status: PayrollCycleRecord["status"];
};

const EMPTY: FormState = {
  cycleName: "",
  frequency: "monthly",
  attendancePeriod: "calendar_month",
  cutoffDay: "25",
  processingDay: "25",
  salaryPaymentRule: "last_day",
  salaryPaymentDay: "1",
  isDefault: false,
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Cycle Name" },
  { id: "frequency", label: "Frequency" },
  { id: "attendance", label: "Attendance Period" },
  { id: "processing", label: "Processing Day" },
  { id: "payment", label: "Salary Payment" },
  { id: "default", label: "Default" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget =
  | { type: "deactivate"; record: PayrollCycleRecord }
  | {
      type: "make_default";
      record: PayrollCycleRecord;
      currentDefaultName: string | null;
    };

type DeleteState = { record: PayrollCycleRecord } & HrSettingsDeleteTarget;

function recordToForm(r: PayrollCycleRecord): FormState {
  return {
    id: r.id,
    cycleName: r.cycleName,
    frequency: r.frequency,
    attendancePeriod: r.attendancePeriod,
    cutoffDay: r.cutoffDay != null ? String(r.cutoffDay) : "25",
    processingDay:
      r.processingDay === "last_day" ? "last_day" : String(r.processingDay),
    salaryPaymentRule: r.salaryPaymentRule,
    salaryPaymentDay:
      r.salaryPaymentDay != null ? String(r.salaryPaymentDay) : "1",
    isDefault: r.isDefault,
    status: r.status,
  };
}

function parseProcessingDay(raw: string): CycleDayOfMonth {
  if (raw === "last_day") return "last_day";
  const n = Number(raw);
  return Number.isFinite(n) && n >= 1 ? Math.min(28, Math.round(n)) : 25;
}

function ViewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
      <p className="text-xs font-medium text-foreground mt-0.5 break-words">
        {value || "—"}
      </p>
    </div>
  );
}

export default function PayrollCycleClient() {
  const [records, setRecords] = useState<PayrollCycleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<PayrollCycleRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadPayrollCycles());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener("hr-payroll-cycles-updated", onUpd);
    return () => window.removeEventListener("hr-payroll-cycles-updated", onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.cycleName.toLowerCase().includes(q) ||
        frequencyLabel(r.frequency).toLowerCase().includes(q) ||
        attendancePeriodLabel(r.attendancePeriod).toLowerCase().includes(q) ||
        formatSalaryPaymentSummary(r).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY);
    setErrors({});
  };

  const openAdd = () => {
    setForm({ ...EMPTY, isDefault: records.every((r) => !r.isDefault || r.status !== "active") });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: PayrollCycleRecord) => {
    setViewRecord(null);
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
    if (!form.cycleName.trim()) e.cycleName = "Cycle Name is required";
    else if (isPayrollCycleNameTaken(form.cycleName, form.id ?? null, records)) {
      e.cycleName = "A payroll cycle with this name already exists";
    }
    if (!form.processingDay) e.processingDay = "Payroll Processing Day is required";
    if (form.attendancePeriod === "custom_cutoff") {
      const c = Number(form.cutoffDay);
      if (!Number.isFinite(c) || c < 1 || c > 28) {
        e.cutoffDay = "Cut-off day must be between 1 and 28";
      }
    }
    if (
      form.salaryPaymentRule === "fixed_day" ||
      form.salaryPaymentRule === "next_month_fixed_day"
    ) {
      const d = Number(form.salaryPaymentDay);
      if (!Number.isFinite(d) || d < 1 || d > 28) {
        e.salaryPaymentDay = "Payment day must be between 1 and 28";
      }
    }
    if (form.isDefault && form.status !== "active") {
      e.status = "Default cycle must be Active";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const buildPayload = (): Omit<
    PayrollCycleRecord,
    "id" | "createdBy" | "updatedBy" | "createdAt" | "updatedAt"
  > => {
    const needsPaymentDay =
      form.salaryPaymentRule === "fixed_day" ||
      form.salaryPaymentRule === "next_month_fixed_day";
    return {
      cycleName: form.cycleName.trim(),
      frequency: form.frequency,
      attendancePeriod: form.attendancePeriod,
      cutoffDay:
        form.attendancePeriod === "custom_cutoff"
          ? Math.min(28, Math.max(1, Number(form.cutoffDay) || 25))
          : null,
      processingDay: parseProcessingDay(form.processingDay),
      salaryPaymentRule: form.salaryPaymentRule,
      salaryPaymentDay: needsPaymentDay
        ? Math.min(28, Math.max(1, Number(form.salaryPaymentDay) || 1))
        : null,
      isDefault: form.isDefault,
      status: form.status,
    };
  };

  const persistList = (next: PayrollCycleRecord[]) => {
    let list = next;
    if (list.some((r) => r.isDefault && r.status === "active")) {
      let kept = false;
      list = list.map((r) => {
        if (r.isDefault && r.status === "active") {
          if (kept) return withPayrollCycleUpdateAudit({ ...r, isDefault: false });
          kept = true;
          return r;
        }
        if (r.isDefault && r.status !== "active") {
          return withPayrollCycleUpdateAudit({ ...r, isDefault: false });
        }
        return r;
      });
    }
    savePayrollCycles(list);
    refresh();
  };

  const handleSave = () => {
    if (!validate()) return;
    const payload = buildPayload();

    if (payload.isDefault) {
      const currentDefault = records.find(
        (r) => r.isDefault && r.status === "active" && r.id !== form.id,
      );
      if (currentDefault) {
        setConfirm({
          type: "make_default",
          record: {
            ...(form.id
              ? { ...records.find((r) => r.id === form.id)!, ...payload, id: form.id }
              : withPayrollCycleNewAudit({
                  ...payload,
                  id: nextPayrollCycleId(records),
                })),
          } as PayrollCycleRecord,
          currentDefaultName: currentDefault.cycleName,
        });
        return;
      }
    }

    commitSave(payload);
  };

  const commitSave = (
    payload: ReturnType<typeof buildPayload>,
    forceDefault = false,
  ) => {
    const isDefault = forceDefault || payload.isDefault;
    let next = [...records];

    if (form.id) {
      next = next.map((r) =>
        r.id === form.id
          ? withPayrollCycleUpdateAudit({ ...r, ...payload, isDefault, id: r.id })
          : isDefault && r.isDefault
            ? withPayrollCycleUpdateAudit({ ...r, isDefault: false })
            : r,
      );
      setToast("Payroll Cycle updated.");
    } else {
      const created = withPayrollCycleNewAudit({
        ...payload,
        isDefault,
        id: nextPayrollCycleId(records),
      });
      next = [
        ...next.map((r) =>
          isDefault && r.isDefault
            ? withPayrollCycleUpdateAudit({ ...r, isDefault: false })
            : r,
        ),
        created,
      ];
      setToast("Payroll Cycle created.");
    }

    persistList(next);
    closeSheet();
  };

  const applyStatus = (record: PayrollCycleRecord, nextActive: boolean) => {
    if (!nextActive && record.isDefault) {
      setToast("Default cycle cannot be deactivated. Set another default first.");
      return;
    }
    persistList(
      records.map((r) =>
        r.id === record.id
          ? withPayrollCycleUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
              isDefault: nextActive ? r.isDefault : false,
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.cycleName, nextActive));
  };

  const handleStatusToggle = (record: PayrollCycleRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      if (record.isDefault) {
        setToast("Default cycle cannot be deactivated. Set another default first.");
        return;
      }
      setConfirm({ type: "deactivate", record });
      return;
    }
    applyStatus(record, true);
  };

  const requestDelete = (record: PayrollCycleRecord) => {
    const usage = countPayrollCycleUsage(record);
    setDeleteTarget({
      record,
      entityLabel: "Payroll Cycle",
      usageCount: usage,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.record.isDefault) {
      setToast("Default cycle cannot be deleted. Set another default first.");
      setDeleteTarget(null);
      return;
    }
    persistList(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    setToast("Payroll Cycle deleted.");
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<PayrollCycleRecord>[] = [
    {
      id: "name",
      label: "Cycle Name",
      sortable: true,
      sortValue: (r) => r.cycleName,
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-foreground hover:text-brand-700 text-left"
          onClick={() => setViewRecord(r)}
        >
          {r.cycleName}
        </button>
      ),
    },
    {
      id: "frequency",
      label: "Frequency",
      sortable: true,
      sortValue: (r) => r.frequency,
      render: (r) => (
        <span className="text-muted-foreground">{frequencyLabel(r.frequency)}</span>
      ),
    },
    {
      id: "attendance",
      label: "Attendance Period",
      sortable: true,
      sortValue: (r) => r.attendancePeriod,
      render: (r) => (
        <span className="text-muted-foreground">
          <span className="block text-xs text-foreground">
            {attendancePeriodLabel(r.attendancePeriod)}
          </span>
          <span className="block text-[11px]">{formatAttendancePeriodSummary(r)}</span>
        </span>
      ),
    },
    {
      id: "processing",
      label: "Processing Day",
      sortable: true,
      sortValue: (r) => (r.processingDay === "last_day" ? 99 : r.processingDay),
      render: (r) => (
        <span className="text-muted-foreground">{formatCycleDay(r.processingDay)}</span>
      ),
    },
    {
      id: "payment",
      label: "Salary Payment",
      sortable: false,
      render: (r) => (
        <span className="text-muted-foreground text-[11px] leading-snug">
          {formatSalaryPaymentSummary(r)}
        </span>
      ),
    },
    {
      id: "default",
      label: "Default",
      sortable: true,
      sortValue: (r) => (r.isDefault ? 1 : 0),
      render: (r) =>
        r.isDefault ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            Default
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
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

  const attendanceHelper =
    ATTENDANCE_PERIOD_OPTIONS.find((o) => o.value === form.attendancePeriod)?.helper ??
    "";
  const paymentHelper =
    SALARY_PAYMENT_RULE_OPTIONS.find((o) => o.value === form.salaryPaymentRule)
      ?.helper ?? "";
  const needsPaymentDay =
    form.salaryPaymentRule === "fixed_day" ||
    form.salaryPaymentRule === "next_month_fixed_day";

  return (
    <HrOrgPageHeader
      title="Payroll Cycle"
      description="Configure payroll periods, processing dates and salary payment schedules."
      icon={CalendarDays}
      sectionLabel="Payroll Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Payroll Cycle
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search payroll cycles…"
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
              "hr-payroll-cycles.csv",
              [
                "Cycle Name",
                "Frequency",
                "Attendance Period",
                "Attendance Summary",
                "Processing Day",
                "Salary Payment",
                "Default",
                "Status",
              ],
              filtered.map((r) => [
                r.cycleName,
                frequencyLabel(r.frequency),
                attendancePeriodLabel(r.attendancePeriod),
                formatAttendancePeriodSummary(r),
                formatCycleDay(r.processingDay),
                formatSalaryPaymentSummary(r),
                r.isDefault ? "Yes" : "No",
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
          emptyTitle="No Payroll Cycles yet"
          emptyDescription="Add a reusable payroll cycle (e.g. Monthly Payroll) with attendance period and payment schedule."
          emptyActionLabel="+ Add Payroll Cycle"
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
        title={form.id ? "Edit Payroll Cycle" : "Add Payroll Cycle"}
        description="Defines when attendance is considered, when payroll is processed, and when salary is paid."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="space-y-3.5 pb-1">
          <HrOrgField label="Cycle Name" required size="full" error={errors.cycleName}>
            <Input
              value={form.cycleName}
              onChange={(e) => set("cycleName", e.target.value)}
              className={hrInput(undefined, errors.cycleName ? "error" : "default")}
              placeholder="Monthly Payroll"
            />
          </HrOrgField>

          <HrOrgField label="Payroll Frequency" required size="full">
            <Select
              value={form.frequency}
              onValueChange={(v) => set("frequency", v as PayrollFrequency)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PAYROLL_FREQUENCY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <HrOrgField
            label="Attendance Period"
            required
            size="full"
            helper={attendanceHelper}
          >
            <Select
              value={form.attendancePeriod}
              onValueChange={(v) => set("attendancePeriod", v as AttendancePeriodType)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {ATTENDANCE_PERIOD_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          {form.attendancePeriod === "custom_cutoff" ? (
            <HrOrgField
              label="Cut-off Day"
              required
              size="full"
              error={errors.cutoffDay}
              helper="Attendance ends on this day of the payroll month; starts the day after the same cut-off in the previous month."
            >
              <Select
                value={form.cutoffDay}
                onValueChange={(v) => set("cutoffDay", v)}
              >
                <SelectTrigger
                  className={cn(
                    hrInput(undefined, errors.cutoffDay ? "error" : "default"),
                    "h-9 text-xs",
                  )}
                >
                  <SelectValue placeholder="Select day" />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_DAY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)} className="text-xs">
                      {formatCycleDay(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
          ) : null}

          <HrOrgField
            label="Payroll Processing Day"
            required
            size="full"
            error={errors.processingDay}
            helper="Day of the month when payroll is processed for this cycle."
          >
            <Select
              value={form.processingDay}
              onValueChange={(v) => set("processingDay", v)}
            >
              <SelectTrigger
                className={cn(
                  hrInput(undefined, errors.processingDay ? "error" : "default"),
                  "h-9 text-xs",
                )}
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PROCESSING_DAY_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          <HrOrgField
            label="Salary Payment Rule"
            required
            size="full"
            helper={paymentHelper}
          >
            <Select
              value={form.salaryPaymentRule}
              onValueChange={(v) => set("salaryPaymentRule", v as SalaryPaymentRule)}
            >
              <SelectTrigger className={cn(hrInput(), "h-9 text-xs")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SALARY_PAYMENT_RULE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value} className="text-xs">
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>

          {needsPaymentDay ? (
            <HrOrgField
              label="Salary Payment Day"
              required
              size="full"
              error={errors.salaryPaymentDay}
            >
              <Select
                value={form.salaryPaymentDay}
                onValueChange={(v) => set("salaryPaymentDay", v)}
              >
                <SelectTrigger
                  className={cn(
                    hrInput(undefined, errors.salaryPaymentDay ? "error" : "default"),
                    "h-9 text-xs",
                  )}
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CYCLE_DAY_OPTIONS.map((d) => (
                    <SelectItem key={d} value={String(d)} className="text-xs">
                      {formatCycleDay(d)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </HrOrgField>
          ) : null}

          <HrStatusToggle
            checked={form.isDefault}
            onCheckedChange={(v) => set("isDefault", v)}
            label="Default Cycle"
            activeLabel="Yes"
            inactiveLabel="No"
            size="sm"
            helper={
              form.isDefault
                ? "Used as the company default payroll cycle"
                : "Only one active cycle can be default"
            }
          />

          <HrStatusToggle
            checked={form.status === "active"}
            onCheckedChange={(v) => {
              if (form.isDefault && !v) {
                setErrors((e) => ({
                  ...e,
                  status: "Default cycle cannot be inactive. Set another default first.",
                }));
                return;
              }
              set("status", v ? "active" : "inactive");
            }}
            label="Active"
            activeLabel="ON"
            inactiveLabel="OFF"
            size="sm"
            helper={
              errors.status
                ? errors.status
                : form.status === "active"
                  ? "Available for assignment when payroll runs"
                  : "Inactive cycles are ignored"
            }
          />
        </div>
      </HrFormDrawer>

      <Sheet open={!!viewRecord} onOpenChange={(o) => !o && setViewRecord(null)}>
        <SheetContent className={cn(HR_DRAWER_WIDTH_CLASS, "flex flex-col p-0 gap-0")}>
          <SheetHeader>
            <SheetTitle>{viewRecord?.cycleName ?? "Payroll Cycle"}</SheetTitle>
            <SheetDescription>Payroll cycle details</SheetDescription>
          </SheetHeader>
          <SheetBody className="space-y-4">
            {viewRecord ? (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ViewRow label="Cycle Name" value={viewRecord.cycleName} />
                  <ViewRow
                    label="Frequency"
                    value={frequencyLabel(viewRecord.frequency)}
                  />
                  <ViewRow
                    label="Attendance Period"
                    value={attendancePeriodLabel(viewRecord.attendancePeriod)}
                  />
                  <ViewRow
                    label="Attendance Window"
                    value={formatAttendancePeriodSummary(viewRecord)}
                  />
                  <ViewRow
                    label="Payroll Processing Day"
                    value={formatCycleDay(viewRecord.processingDay)}
                  />
                  <ViewRow
                    label="Salary Payment Rule"
                    value={salaryPaymentRuleLabel(viewRecord.salaryPaymentRule)}
                  />
                  <ViewRow
                    label="Salary Payment"
                    value={formatSalaryPaymentSummary(viewRecord)}
                  />
                  <ViewRow
                    label="Default Cycle"
                    value={viewRecord.isDefault ? "Yes" : "No"}
                  />
                  <ViewRow
                    label="Status"
                    value={viewRecord.status === "active" ? "Active" : "Inactive"}
                  />
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t border-border">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className={hrBtn("h-8 text-xs")}
                    onClick={() => setViewRecord(null)}
                  >
                    Close
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className={hrBtn("h-8 text-xs", true)}
                    onClick={() => openEdit(viewRecord)}
                  >
                    Edit
                  </Button>
                </div>
              </>
            ) : null}
          </SheetBody>
        </SheetContent>
      </Sheet>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "deactivate") {
            applyStatus(confirm.record, false);
          } else if (confirm.type === "make_default") {
            const payload = buildPayload();
            commitSave({ ...payload, isDefault: true }, true);
          }
          setConfirm(null);
        }}
        destructive={confirm?.type === "deactivate"}
        title={
          confirm?.type === "make_default"
            ? "Make this the default Payroll Cycle?"
            : "Deactivate Payroll Cycle?"
        }
        description={
          confirm?.type === "make_default"
            ? confirm.currentDefaultName
              ? `${confirm.currentDefaultName} is currently the default. Make this the new default?`
              : "This will become the company default payroll cycle."
            : `${confirm && "record" in confirm ? confirm.record.cycleName : ""}. Inactive cycles are not used for payroll scheduling.`
        }
        confirmLabel={confirm?.type === "make_default" ? "Set Default" : "Deactivate"}
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
