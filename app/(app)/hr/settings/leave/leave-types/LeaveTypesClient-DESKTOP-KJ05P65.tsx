"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Leaf, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
  deactivateInUseDescription,
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
  HrStatusToggle,
  HrListingToolbar,
  HrDataGrid,
  exportOrgCsv,
  hrInput,
  hrTextarea,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  loadLeaveTypes,
  saveLeaveTypes,
  countLeavePoliciesUsingLeaveType,
  nextLeaveId,
  withLeaveNewAudit,
  withLeaveUpdateAudit,
  type LeaveTypeRecord,
} from "../../leave-data";

type FormState = {
  id?: number;
  name: string;
  description: string;
  isPaid: boolean;
  status: LeaveTypeRecord["status"];
};

const EMPTY: FormState = { name: "", description: "", isPaid: true, status: "active" };

const COLUMN_DEFS = [
  { id: "name", label: "Leave Type" },
  { id: "paid", label: "Paid / Unpaid" },
  { id: "description", label: "Description" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget = { type: "deactivate"; record: LeaveTypeRecord; count: number };

type DeleteState = { record: LeaveTypeRecord } & HrSettingsDeleteTarget;

export default function LeaveTypesClient() {
  const [records, setRecords] = useState<LeaveTypeRecord[]>([]);
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
    setRecords(loadLeaveTypes());
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
        r.description.toLowerCase().includes(q),
    );
  }, [records, search, statusFilter]);

  const openAdd = () => {
    setForm(EMPTY);
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: LeaveTypeRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      description: record.description,
      isPaid: record.isPaid !== false,
      status: record.status,
    });
    setErrors({});
    setSheetOpen(true);
  };

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      return n;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Leave type name is required";
    else if (
      records.some(
        (r) =>
          r.name.trim().toLowerCase() === form.name.trim().toLowerCase() &&
          r.id !== form.id,
      )
    ) {
      e.name = "Leave type name must be unique";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    if (form.id) {
      saveLeaveTypes(
        records.map((r) =>
          r.id === form.id
            ? withLeaveUpdateAudit({
                ...r,
                name: form.name.trim(),
                description: form.description.trim(),
                isPaid: form.isPaid,
                status: form.status,
              })
            : r,
        ),
      );
    } else {
      saveLeaveTypes([
        ...records,
        withLeaveNewAudit<LeaveTypeRecord>({
          id: nextLeaveId(records),
          name: form.name.trim(),
          description: form.description.trim(),
          isPaid: form.isPaid,
          status: form.status,
        }),
      ]);
    }
    setSheetOpen(false);
    refresh();
  };

  const applyStatus = (record: LeaveTypeRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveLeaveTypes(
      records.map((r) =>
        r.id === record.id ? withLeaveUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: LeaveTypeRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive) {
      const usageCount = countLeavePoliciesUsingLeaveType(record.id);
      if (usageCount > 0) {
        setConfirm({ type: "deactivate", record, count: usageCount });
        return;
      }
    }
    applyStatus(record, nextActive);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    applyStatus(confirm.record, false);
  };

  const requestDelete = (record: LeaveTypeRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Leave Type",
      usageCount: countLeavePoliciesUsingLeaveType(record.id),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveLeaveTypes(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<LeaveTypeRecord>[] = [
    {
      id: "name",
      label: "Leave Type",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "paid",
      label: "Paid / Unpaid",
      sortable: true,
      sortValue: (r) => (r.isPaid !== false ? 1 : 0),
      render: (r) => (
        <span
          className={
            r.isPaid !== false
              ? "text-[11px] font-medium text-emerald-700"
              : "text-[11px] font-medium text-amber-700"
          }
        >
          {r.isPaid !== false ? "Paid" : "Unpaid"}
        </span>
      ),
    },
    {
      id: "description",
      label: "Description",
      sortable: true,
      sortValue: (r) => r.description,
      render: (r) => (
        <span className="text-muted-foreground">{r.description || "—"}</span>
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
      title="Leave Types"
      description="Master list of leave types (paid/unpaid). Credit amounts and monthly/yearly frequency live on Leave Policies."
      icon={Leaf}
      sectionLabel="Leave Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Leave Type
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search leave types…"
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
              "hr-leave-types.csv",
              ["Leave Type", "Paid / Unpaid", "Description", "Status"],
              filtered.map((r) => [
                r.name,
                r.isPaid !== false ? "Paid" : "Unpaid",
                r.description,
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
          emptyTitle="No leave types yet"
          emptyDescription="Add leave types before configuring leave policies."
          emptyActionLabel="+ Add Leave Type"
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
        onOpenChange={setSheetOpen}
        title={form.id ? "Edit Leave Type" : "Add Leave Type"}
        description="Defines what the leave type is — not how much is granted."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className="grid grid-cols-1 gap-y-3.5">
          <HrOrgField label="Leave Type Name" required size="full" error={errors.name}>
            <Input
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput()}
              placeholder="Casual Leave"
            />
          </HrOrgField>
          <div className="space-y-1.5">
            <p className="text-xs font-medium leading-none">Paid / Unpaid</p>
            <div className="flex items-center justify-between rounded-[10px] border border-border bg-muted/15 px-3 py-2.5">
              <div>
                <p className={cn("text-xs font-semibold", form.isPaid ? "text-emerald-700" : "text-amber-700")}>
                  {form.isPaid ? "Paid" : "Unpaid"}
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Classification only — Payroll LOP consumption is out of this task.
                </p>
              </div>
              <Switch
                checked={form.isPaid}
                onCheckedChange={(v) => set("isPaid", v)}
                aria-label="Paid leave"
              />
            </div>
          </div>
          <HrOrgField label="Description" size="full">
            <Textarea
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={3}
              className={hrTextarea()}
              placeholder="General short-term personal leave"
            />
          </HrOrgField>
          <HrStatusToggle
            checked={form.status === "active"}
            onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
            size="sm"
            helper={
              form.status === "active"
                ? "Available for leave policy configuration"
                : "Hidden from new policy configuration"
            }
          />
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        destructive
        title="Deactivate leave type?"
        description={
          confirm
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "leave policies",
                "leave type",
              )
            : ""
        }
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
