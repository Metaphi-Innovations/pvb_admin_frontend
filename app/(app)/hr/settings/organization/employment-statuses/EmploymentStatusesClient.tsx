"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { UserCog, Plus } from "lucide-react";
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
  deactivateInUseDescription,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import {
  loadHrEmployees,
  type HrEmployee,
} from "../../../employees/employee-master-data";
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
  HrColorSwatch,
  exportOrgCsv,
  hrInput,
  hrSelect,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../_components";
import {
  loadEmploymentStatuses,
  saveEmploymentStatuses,
  nextOrgId,
  withNewAudit,
  withUpdateAudit,
  autoUniqueOrgCode,
  EMPLOYMENT_STATUS_COLORS,
  type EmploymentStatusRecord,
  type EmploymentStatusColor,
} from "../../organization-data";

type FormState = {
  id?: number;
  name: string;
  color: EmploymentStatusColor;
  status: EmploymentStatusRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  color: "emerald",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Status" },
  { id: "color", label: "Color" },
  { id: "recordStatus", label: "Active" },
  { id: "actions", label: "Actions" },
];

const FORM_CLASS = cn(
  "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
  "[&_button]:h-9 [&_button]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: EmploymentStatusRecord; count: number };

type DeleteState = { record: EmploymentStatusRecord } & HrSettingsDeleteTarget;

function countEmployeesWithEmploymentStatus(
  record: EmploymentStatusRecord,
  employees: HrEmployee[],
): number {
  const code = record.code.trim().toLowerCase();
  if (!code) return 0;
  return employees.filter(
    (e) => (e.employmentStatus || "").trim().toLowerCase() === code,
  ).length;
}

export default function EmploymentStatusesClient() {
  const [records, setRecords] = useState<EmploymentStatusRecord[]>([]);
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
    setRecords(loadEmploymentStatuses());
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
    return list.filter((r) => r.name.toLowerCase().includes(q));
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

  const openEdit = (record: EmploymentStatusRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      color: record.color,
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
    if (!form.name.trim()) e.name = "Status name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    if (form.id) {
      saveEmploymentStatuses(
        records.map((r) =>
          r.id === form.id
            ? withUpdateAudit({
                ...r,
                name,
                // Preserve internal fields not shown in UI
                code: r.code,
                description: r.description,
                isTerminal: r.isTerminal,
                color: form.color,
                status: form.status,
              })
            : r,
        ),
      );
    } else {
      saveEmploymentStatuses([
        ...records,
        withNewAudit<EmploymentStatusRecord>({
          id: nextOrgId(records),
          name,
          code: autoUniqueOrgCode(name, records),
          description: "",
          color: form.color,
          isTerminal: false,
          status: form.status,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: EmploymentStatusRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveEmploymentStatuses(
      records.map((r) =>
        r.id === record.id ? withUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: EmploymentStatusRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    const usageCount = countEmployeesWithEmploymentStatus(record, employees);
    if (!nextActive && usageCount > 0) {
      setConfirm({ type: "deactivate", record, count: usageCount });
      return;
    }
    applyStatus(record, nextActive);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    applyStatus(confirm.record, false);
  };

  const requestDelete = (record: EmploymentStatusRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Employment Status",
      usageCount: countEmployeesWithEmploymentStatus(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveEmploymentStatuses(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<EmploymentStatusRecord>[] = [
    {
      id: "name",
      label: "Status",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "color",
      label: "Color",
      sortable: true,
      sortValue: (r) => r.color,
      render: (r) => <HrColorSwatch color={r.color} />,
    },
    {
      id: "recordStatus",
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
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Employment Status"
      description="Lifecycle statuses such as Active, Probation, Notice Period, Exited, and Terminated."
      icon={UserCog}
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Status
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search employment statuses…"
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
              "hr-employment-statuses.csv",
              ["Status", "Color", "Active"],
              filtered.map((r) => [r.name, r.color, r.status]),
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
          emptyTitle="No employment statuses yet"
          emptyDescription="Define statuses before managing employee lifecycle."
          emptyActionLabel="+ Add Status"
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
        title={form.id ? "Edit Employment Status" : "Add Employment Status"}
        description="Status option available for employee lifecycle assignment."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={FORM_CLASS}>
          <HrOrgField label="Status Name" required size="md" error={errors.name} id="es-name">
            <Input
              id="es-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput(undefined, errors.name ? "error" : "default")}
              placeholder="e.g. Active"
            />
          </HrOrgField>
          <HrOrgField label="Color" size="sm" id="es-color">
            <Select
              value={form.color}
              onValueChange={(v) => set("color", v as EmploymentStatusColor)}
            >
              <SelectTrigger id="es-color" className={hrSelect()}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_STATUS_COLORS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    <span className="inline-flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${c.swatch}`} />
                      {c.label}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </HrOrgField>
          <div className="col-span-1 max-w-[200px] space-y-1.5">
            <p className="text-xs font-medium leading-none">Active / Inactive</p>
            <div className="h-9 flex items-center">
              <HrActiveStatusSwitch
                size="md"
                checked={form.status === "active"}
                onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
              />
            </div>
          </div>
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        destructive
        title="Deactivate employment status?"
        description={
          confirm
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "employees",
                "employment status",
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
