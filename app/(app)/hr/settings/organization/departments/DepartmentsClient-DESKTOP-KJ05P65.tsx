"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Network, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
  deactivateInUseDescription,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import {
  getActiveHrEmployees,
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
  HrEmployeePicker,
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../_components";
import {
  loadDepartments,
  saveDepartments,
  nextOrgId,
  withNewAudit,
  withUpdateAudit,
  autoUniqueOrgCode,
  type DepartmentRecord,
} from "../../organization-data";

type FormState = {
  id?: number;
  name: string;
  headName: string;
  headEmployeeId: number | null;
  status: DepartmentRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  headName: "",
  headEmployeeId: null,
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Department" },
  { id: "head", label: "Department Head" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

/** Departments drawer — compact labels / 36px inputs */
const DEPT_FORM_CLASS = cn(
  "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
  "[&_button]:h-9 [&_button]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: DepartmentRecord; count: number };

type DeleteState = { record: DepartmentRecord } & HrSettingsDeleteTarget;

export default function DepartmentsClient() {
  const [records, setRecords] = useState<DepartmentRecord[]>([]);
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
    setRecords(loadDepartments());
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

  const activeEmployees = useMemo(() => {
    try {
      return getActiveHrEmployees().filter((e) => e.employmentStatus !== "resigned");
    } catch {
      return employees.filter((e) => e.status === "active");
    }
  }, [employees]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.headName.toLowerCase().includes(q),
    );
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

  const openEdit = (record: DepartmentRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      headName: record.headName,
      headEmployeeId: record.headEmployeeId,
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
    if (!form.name.trim()) e.name = "Department name is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    if (form.id) {
      saveDepartments(
        records.map((r) =>
          r.id === form.id
            ? withUpdateAudit({
                ...r,
                name,
                // Preserve internal code + legacy fields not shown in UI
                code: r.code,
                parentCode: r.parentCode,
                description: r.description,
                headName: form.headName.trim(),
                headEmployeeId: form.headEmployeeId,
                status: form.status,
              })
            : r,
        ),
      );
    } else {
      saveDepartments([
        ...records,
        withNewAudit<DepartmentRecord>({
          id: nextOrgId(records),
          name,
          code: autoUniqueOrgCode(name, records),
          parentCode: "",
          description: "",
          headName: form.headName.trim(),
          headEmployeeId: form.headEmployeeId,
          employeeCount: 0,
          status: form.status,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: DepartmentRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveDepartments(
      records.map((r) =>
        r.id === record.id ? withUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: DepartmentRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive && record.employeeCount > 0) {
      setConfirm({ type: "deactivate", record, count: record.employeeCount });
      return;
    }
    applyStatus(record, nextActive);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    applyStatus(confirm.record, false);
  };

  const requestDelete = (record: DepartmentRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Department",
      usageCount: record.employeeCount,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveDepartments(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<DepartmentRecord>[] = [
    {
      id: "name",
      label: "Department",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "head",
      label: "Department Head",
      sortable: true,
      sortValue: (r) => r.headName,
      render: (r) => <span>{r.headName || "—"}</span>,
    },
    {
      id: "status",
      label: "Status",
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
          onEdit={() => openEdit(r)}
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Departments"
      description="CLOSED — Canonical department master for Employee Employment and HR filters."
      icon={Network}
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Department
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search departments…"
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
              "hr-departments.csv",
              ["Department", "Head", "Status"],
              filtered.map((r) => [r.name, r.headName, r.status]),
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
          emptyTitle="No departments yet"
          emptyDescription="Add departments before assigning them to employees."
          emptyActionLabel="+ Add Department"
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
        title={form.id ? "Edit Department" : "Add Department"}
        description="Simple department master for HR assignment."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={DEPT_FORM_CLASS}>
          <HrOrgField label="Department Name" required size="md" error={errors.name} id="dept-name">
            <Input
              id="dept-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Sales"
              className={hrInput(undefined, errors.name ? "error" : "default")}
            />
          </HrOrgField>
          <HrOrgField label="Department Head" size="md" id="dept-head">
            <HrEmployeePicker
              employees={activeEmployees}
              valueId={form.headEmployeeId}
              displayName={form.headName}
              onChange={(emp) => {
                if (!emp) {
                  setForm((f) => ({ ...f, headEmployeeId: null, headName: "" }));
                  return;
                }
                setForm((f) => ({
                  ...f,
                  headEmployeeId: emp.id,
                  headName: emp.employeeName,
                }));
              }}
              placeholder="Search employee (optional)…"
            />
          </HrOrgField>
          <div className="col-span-1 max-w-[200px] space-y-1.5">
            <p className="text-xs font-medium leading-none">Status</p>
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
        title="Deactivate department?"
        description={
          confirm
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "employees",
                "department",
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
