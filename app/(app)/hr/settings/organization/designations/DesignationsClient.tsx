"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Check, ChevronsUpDown, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../_components";
import {
  loadDesignations,
  saveDesignations,
  loadDepartments,
  nextOrgId,
  withNewAudit,
  withUpdateAudit,
  autoUniqueOrgCode,
  type DesignationRecord,
  type DepartmentRecord,
} from "../../organization-data";

type FormState = {
  id?: number;
  name: string;
  departmentCode: string;
  status: DesignationRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  departmentCode: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Designation" },
  { id: "department", label: "Department" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

const FORM_CLASS = cn(
  "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
  "[&_button]:h-9 [&_button]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: DesignationRecord; count: number };

type DeleteState = { record: DesignationRecord } & HrSettingsDeleteTarget;

/** Prefer derived count when employee.designation matches name/code; else seed. */
function displayEmployeeCount(
  desig: DesignationRecord,
  employees: HrEmployee[],
): number {
  const name = desig.name.trim().toLowerCase();
  const code = desig.code.trim().toLowerCase();
  if (!name && !code) return desig.employeeCount;
  const derived = employees.filter((e) => {
    if (e.status !== "active") return false;
    const d = (e.designation || "").trim().toLowerCase();
    return d === name || d === code;
  }).length;
  return derived > 0 ? derived : desig.employeeCount;
}

/** Searchable department picker — active depts + optional historical current. */
function DepartmentPicker({
  options,
  valueCode,
  onChange,
  error,
  placeholder = "Select department…",
}: {
  options: DepartmentRecord[];
  valueCode: string;
  onChange: (code: string) => void;
  error?: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const selected = options.find((d) => d.code === valueCode);
  const filtered = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!term) return options;
    return options.filter(
      (d) =>
        d.name.toLowerCase().includes(term) ||
        d.code.toLowerCase().includes(term),
    );
  }, [options, q]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput("flex w-full items-center gap-2 text-left font-normal"),
            "hover:bg-muted/30",
            error && "border-red-400",
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              selected ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {selected ? selected.name : placeholder}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0 rounded-lg" align="start">
        <div className="border-b border-border p-1.5">
          <div className="flex h-8 items-center gap-2 rounded-md border border-border px-2">
            <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search department…"
              className="min-w-0 flex-1 bg-transparent text-xs outline-none"
            />
          </div>
        </div>
        <div className="max-h-52 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="px-2.5 py-3 text-xs text-muted-foreground">No departments found</p>
          )}
          {filtered.map((d) => {
            const active = valueCode === d.code;
            return (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  onChange(d.code);
                  setOpen(false);
                  setQ("");
                }}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs hover:bg-muted/60",
                  active && "bg-brand-50",
                )}
              >
                <span className="min-w-0 flex-1 truncate font-medium">{d.name}</span>
                <span className="font-mono text-[10px] text-muted-foreground">{d.code}</span>
                {active && <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />}
              </button>
            );
          })}
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default function DesignationsClient() {
  const [records, setRecords] = useState<DesignationRecord[]>([]);
  const [allDepartments, setAllDepartments] = useState<DepartmentRecord[]>([]);
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
    setRecords(loadDesignations());
    setAllDepartments(loadDepartments());
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

  const deptName = useCallback(
    (code: string) => {
      if (!code) return "—";
      return allDepartments.find((d) => d.code === code)?.name ?? code;
    },
    [allDepartments],
  );

  /** Active departments for new selection; include current (even inactive) when editing. */
  const departmentOptions = useMemo(() => {
    const active = allDepartments.filter((d) => d.status === "active");
    if (!form.departmentCode) return active;
    const current = allDepartments.find((d) => d.code === form.departmentCode);
    if (current && !active.some((d) => d.code === current.code)) {
      return [...active, current];
    }
    return active;
  }, [allDepartments, form.departmentCode]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        deptName(r.departmentCode).toLowerCase().includes(q),
    );
  }, [records, search, statusFilter, deptName]);

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

  const openEdit = (record: DesignationRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      departmentCode: record.departmentCode,
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
    if (!form.name.trim()) e.name = "Designation name is required";
    if (!form.departmentCode) e.departmentCode = "Department is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    if (form.id) {
      saveDesignations(
        records.map((r) =>
          r.id === form.id
            ? withUpdateAudit({
                ...r,
                name,
                // Preserve internal code + legacy fields not shown in UI
                code: r.code,
                departmentCode: form.departmentCode,
                level: r.level,
                description: r.description,
                status: form.status,
              })
            : r,
        ),
      );
    } else {
      saveDesignations([
        ...records,
        withNewAudit<DesignationRecord>({
          id: nextOrgId(records),
          name,
          code: autoUniqueOrgCode(name, records),
          departmentCode: form.departmentCode,
          level: "",
          description: "",
          employeeCount: 0,
          status: form.status,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: DesignationRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveDesignations(
      records.map((r) =>
        r.id === record.id ? withUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: DesignationRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    const usage = displayEmployeeCount(record, employees);
    if (!nextActive && usage > 0) {
      setConfirm({ type: "deactivate", record, count: usage });
      return;
    }
    applyStatus(record, nextActive);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    applyStatus(confirm.record, false);
  };

  const requestDelete = (record: DesignationRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Designation",
      usageCount: displayEmployeeCount(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveDesignations(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<DesignationRecord>[] = [
    {
      id: "name",
      label: "Designation",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "department",
      label: "Department",
      sortable: true,
      sortValue: (r) => deptName(r.departmentCode),
      render: (r) => <span>{deptName(r.departmentCode)}</span>,
    },
    {
      id: "employees",
      label: "Employees",
      sortable: true,
      align: "right",
      sortValue: (r) => displayEmployeeCount(r, employees),
      render: (r) => (
        <span className="tabular-nums">{displayEmployeeCount(r, employees)}</span>
      ),
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
      title="Designations"
      description="Job titles used across employee records."
      icon={BadgeCheck}
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Designation
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search designations…"
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
              "hr-designations.csv",
              ["Designation", "Department", "Employees", "Status"],
              filtered.map((r) => [
                r.name,
                deptName(r.departmentCode),
                String(displayEmployeeCount(r, employees)),
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
          emptyTitle="No designations yet"
          emptyDescription="Add designations before assigning roles to employees."
          emptyActionLabel="+ Add Designation"
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
        title={form.id ? "Edit Designation" : "Add Designation"}
        description="Simple designation master linked to a department."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={FORM_CLASS}>
          <HrOrgField
            label="Designation Name"
            required
            size="md"
            error={errors.name}
            id="desig-name"
          >
            <Input
              id="desig-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Area Sales Manager"
              className={hrInput(undefined, errors.name ? "error" : "default")}
            />
          </HrOrgField>
          <HrOrgField
            label="Department"
            required
            size="md"
            error={errors.departmentCode}
            id="desig-dept"
          >
            <DepartmentPicker
              options={departmentOptions}
              valueCode={form.departmentCode}
              onChange={(code) => set("departmentCode", code)}
              error={!!errors.departmentCode}
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
        title="Deactivate designation?"
        description={
          confirm
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "employees",
                "designation",
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
