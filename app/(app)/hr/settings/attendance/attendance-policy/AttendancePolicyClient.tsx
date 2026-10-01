"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
  deactivateInUseDescription,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { loadHrEmployees, type HrEmployee } from "../../../employees/employee-master-data";
import {
  HrOrgPageHeader,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrListingToolbar,
  HrDataGrid,
  HrRowActions,
  exportOrgCsv,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  afterAllowedLimitLabel,
  formatDurationList,
  formatLateAllowanceList,
  formatOvertimeList,
  countEmployeesOnPolicy,
  loadAttendancePolicies,
  nextAttendancePolicyId,
  saveAttendancePolicies,
  withPolicyNewAudit,
  withPolicyUpdateAudit,
  type AttendancePolicyRecord,
} from "../../attendance-policy-data";
import {
  AttendancePolicyEditDrawer,
  type AttendancePolicyFormState,
} from "./AttendancePolicyEditDrawer";

const COLUMN_DEFS = [
  { id: "name", label: "Policy Name" },
  { id: "halfDay", label: "Half Day" },
  { id: "absent", label: "Absent" },
  { id: "lateAllowance", label: "Late Allowance" },
  { id: "afterLimit", label: "After Limit" },
  { id: "overtime", label: "Overtime" },
  { id: "default", label: "Default" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget =
  | { type: "makeDefault"; form: AttendancePolicyFormState; currentDefaultName: string }
  | { type: "deactivate"; record: AttendancePolicyRecord; count: number };

type DeleteState = { record: AttendancePolicyRecord } & HrSettingsDeleteTarget;

function formToRecord(
  form: AttendancePolicyFormState,
  existing?: AttendancePolicyRecord,
): AttendancePolicyRecord {
  const base = existing
    ? withPolicyUpdateAudit({
        ...existing,
        name: form.name.trim(),
        isDefault: form.isDefault,
        status: form.status,
        trackLateComing: form.trackLateComing,
        allowedLateEntriesPerMonth: Number(form.allowedLateEntriesPerMonth) || 0,
        afterAllowedLimit: form.afterAllowedLimit,
        trackEarlyGoing: form.trackEarlyGoing,
        halfDayHours: Number(form.halfDayHours) || 0,
        halfDayMinutes: Number(form.halfDayMinutes) || 0,
        absentHours: Number(form.absentHours) || 0,
        absentMinutes: Number(form.absentMinutes) || 0,
        overtimeEnabled: form.overtimeEnabled,
        overtimeAfterMinutes: Number(form.overtimeAfterMinutes) || 0,
      })
    : withPolicyNewAudit({
        id: form.id ?? 0,
        name: form.name.trim(),
        isDefault: form.isDefault,
        status: form.status,
        trackLateComing: form.trackLateComing,
        allowedLateEntriesPerMonth: Number(form.allowedLateEntriesPerMonth) || 0,
        afterAllowedLimit: form.afterAllowedLimit,
        trackEarlyGoing: form.trackEarlyGoing,
        halfDayHours: Number(form.halfDayHours) || 0,
        halfDayMinutes: Number(form.halfDayMinutes) || 0,
        absentHours: Number(form.absentHours) || 0,
        absentMinutes: Number(form.absentMinutes) || 0,
        overtimeEnabled: form.overtimeEnabled,
        overtimeAfterMinutes: Number(form.overtimeAfterMinutes) || 0,
      });
  return base;
}

function applyDefault(list: AttendancePolicyRecord[], defaultId: number): AttendancePolicyRecord[] {
  return list.map((p) => ({ ...p, isDefault: p.id === defaultId }));
}

export default function AttendancePolicyClient() {
  const [records, setRecords] = useState<AttendancePolicyRecord[]>([]);
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editRecord, setEditRecord] = useState<AttendancePolicyRecord | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadAttendancePolicies());
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
    if (q) list = list.filter((r) => r.name.toLowerCase().includes(q));
    return list;
  }, [records, search, statusFilter]);

  const openAdd = () => {
    setEditRecord(null);
    setDrawerOpen(true);
  };

  const openEdit = (record: AttendancePolicyRecord) => {
    setEditRecord(record);
    setDrawerOpen(true);
  };

  const persist = (next: AttendancePolicyRecord[], message: string) => {
    saveAttendancePolicies(next);
    setRecords(next);
    setDrawerOpen(false);
    setEditRecord(null);
    setToast(message);
  };

  const commitForm = (form: AttendancePolicyFormState) => {
    const existing = form.id ? records.find((p) => p.id === form.id) : undefined;
    const nextRecord = formToRecord(form, existing);
    const id = existing?.id ?? nextAttendancePolicyId(records);
    const savedRecord = { ...nextRecord, id };

    let next = existing
      ? records.map((p) => (p.id === id ? savedRecord : p))
      : [...records, { ...savedRecord, id }];

    if (form.isDefault) {
      next = applyDefault(next, id);
    } else if (existing?.isDefault && !form.isDefault) {
      const otherActive = next.find((p) => p.id !== id && p.status === "active");
      if (otherActive) next = applyDefault(next, otherActive.id);
      else next = applyDefault(next, id);
    }

    if (form.status === "inactive" && savedRecord.isDefault) {
      setToast("Default policy cannot be inactive. Set another active policy as default first.");
      return;
    }

    persist(
      next,
      existing ? "Attendance policy updated successfully." : "Attendance policy created successfully.",
    );
  };

  const handleSubmit = (form: AttendancePolicyFormState) => {
    if (form.isDefault) {
      const currentDefault = records.find((p) => p.isDefault && p.id !== form.id);
      if (currentDefault) {
        setConfirm({
          type: "makeDefault",
          form,
          currentDefaultName: currentDefault.name,
        });
        return;
      }
    }
    commitForm(form);
  };

  const applyStatus = (record: AttendancePolicyRecord, nextActive: boolean) => {
    const next = records.map((p) =>
      p.id === record.id
        ? withPolicyUpdateAudit({ ...p, status: nextActive ? "active" : "inactive" })
        : p,
    );
    saveAttendancePolicies(next);
    setRecords(next);
    setToast(activeStatusToastMessage(record.name, nextActive));
  };

  const handleStatusToggle = (record: AttendancePolicyRecord, active: boolean) => {
    if (record.status === (active ? "active" : "inactive")) return;
    if (!active && record.isDefault) {
      setToast("Default policy cannot be deactivated. Set another active policy as default first.");
      return;
    }
    if (!active) {
      const usageCount = countEmployeesOnPolicy(record, employees);
      if (usageCount > 0) {
        setConfirm({ type: "deactivate", record, count: usageCount });
        return;
      }
    }
    applyStatus(record, active);
  };

  const requestDelete = (record: AttendancePolicyRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Attendance Policy",
      usageCount: countEmployeesOnPolicy(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    const next = records.filter((p) => p.id !== deleteTarget.record.id);
    saveAttendancePolicies(next);
    setRecords(next);
    setSelectedIds([]);
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<AttendancePolicyRecord>[] = [
    {
      id: "name",
      label: "Policy Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <span className="text-xs font-semibold text-foreground">{r.name}</span>
      ),
    },
    {
      id: "halfDay",
      label: "Half Day",
      sortable: true,
      sortValue: (r) => r.halfDayHours * 60 + r.halfDayMinutes,
      render: (r) => (
        <span className="text-xs tabular-nums whitespace-nowrap">
          {formatDurationList(r.halfDayHours, r.halfDayMinutes)}
        </span>
      ),
    },
    {
      id: "absent",
      label: "Absent",
      sortable: true,
      sortValue: (r) => r.absentHours * 60 + r.absentMinutes,
      render: (r) => (
        <span className="text-xs tabular-nums whitespace-nowrap">
          {formatDurationList(r.absentHours, r.absentMinutes)}
        </span>
      ),
    },
    {
      id: "lateAllowance",
      label: "Late Allowance",
      sortable: true,
      sortValue: (r) => (r.trackLateComing ? r.allowedLateEntriesPerMonth : -1),
      render: (r) => (
        <span className="text-xs whitespace-nowrap">{formatLateAllowanceList(r)}</span>
      ),
    },
    {
      id: "afterLimit",
      label: "After Limit",
      sortable: true,
      sortValue: (r) => r.afterAllowedLimit,
      render: (r) => (
        <span className="text-xs whitespace-nowrap">
          {r.trackLateComing ? afterAllowedLimitLabel(r.afterAllowedLimit) : "—"}
        </span>
      ),
    },
    {
      id: "overtime",
      label: "Overtime",
      sortable: true,
      sortValue: (r) => (r.overtimeEnabled ? r.overtimeAfterMinutes : -1),
      render: (r) => (
        <span className="text-xs tabular-nums whitespace-nowrap">{formatOvertimeList(r)}</span>
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
          <span className="text-xs text-muted-foreground">—</span>
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
          editLabel="Edit Policy"
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Attendance Policy"
      description="Reusable attendance rules that can be assigned to employees."
      icon={Shield}
      sectionLabel="Attendance Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Attendance Policy
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search policies…"
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          density={density}
          onDensityChange={setDensity}
          columns={COLUMN_DEFS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          onRefresh={refresh}
          onExport={() =>
            exportOrgCsv(
              "attendance-policies",
              [
                "Policy Name",
                "Half Day",
                "Absent",
                "Late Allowance",
                "After Limit",
                "Overtime",
                "Default",
                "Active",
              ],
              filtered.map((r) => [
                r.name,
                formatDurationList(r.halfDayHours, r.halfDayMinutes),
                formatDurationList(r.absentHours, r.absentMinutes),
                formatLateAllowanceList(r),
                r.trackLateComing ? afterAllowedLimitLabel(r.afterAllowedLimit) : "—",
                formatOvertimeList(r),
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
          emptyTitle="No attendance policies"
          emptyDescription="Create attendance policies to define how employee attendance is interpreted."
          emptyActionLabel="Add Attendance Policy"
          onEmptyAction={openAdd}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <AttendancePolicyEditDrawer
        open={drawerOpen}
        onOpenChange={(o) => {
          setDrawerOpen(o);
          if (!o) setEditRecord(null);
        }}
        record={editRecord}
        isFirstPolicy={records.length === 0}
        onSubmit={handleSubmit}
      />

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (!confirm) return;
          if (confirm.type === "makeDefault") {
            commitForm(confirm.form);
          } else {
            applyStatus(confirm.record, false);
          }
          setConfirm(null);
        }}
        destructive={confirm?.type === "deactivate"}
        title={
          confirm?.type === "makeDefault"
            ? "Change default policy?"
            : "Deactivate attendance policy?"
        }
        description={
          confirm?.type === "makeDefault"
            ? `${confirm.currentDefaultName} is currently the default policy. Make this policy the new default?`
            : confirm?.type === "deactivate"
              ? deactivateInUseDescription(
                  confirm.record.name,
                  confirm.count,
                  "employees",
                  "attendance policy",
                )
              : ""
        }
        confirmLabel={confirm?.type === "makeDefault" ? "Make Default" : "Deactivate"}
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
