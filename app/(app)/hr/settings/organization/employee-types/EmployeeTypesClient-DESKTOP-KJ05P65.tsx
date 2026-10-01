"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Users, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
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
  hrTextarea,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../_components";
import {
  loadEmployeeTypes,
  saveEmployeeTypes,
  nextOrgId,
  withNewAudit,
  withUpdateAudit,
  autoUniqueOrgCode,
  employeeTypeValueFromName,
  type EmployeeTypeRecord,
} from "../../organization-data";

type FormState = {
  id?: number;
  name: string;
  description: string;
  status: EmployeeTypeRecord["status"];
};

const EMPTY: FormState = { name: "", description: "", status: "active" };

const COLUMN_DEFS = [
  { id: "name", label: "Employee Type" },
  { id: "description", label: "Description" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

const FORM_CLASS = cn(
  "grid grid-cols-1 gap-y-2.5",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
  "[&_textarea]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: EmployeeTypeRecord; count: number };

type DeleteState = { record: EmployeeTypeRecord } & HrSettingsDeleteTarget;

function displayEmployeeCount(type: EmployeeTypeRecord, employees: HrEmployee[]): number {
  const slug = employeeTypeValueFromName(type.name);
  const code = type.code.trim().toLowerCase();
  return employees.filter((e) => {
    if (e.status !== "active") return false;
    const t = (e.employeeType || "").trim().toLowerCase();
    return t === slug || t === code || t === type.name.toLowerCase();
  }).length;
}

export default function EmployeeTypesClient() {
  const [records, setRecords] = useState<EmployeeTypeRecord[]>([]);
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
    setRecords(loadEmployeeTypes());
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
        r.description.toLowerCase().includes(q),
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

  const openEdit = (record: EmployeeTypeRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      description: record.description,
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
    if (!form.name.trim()) e.name = "Employee Type name is required";
    else if (
      records.some(
        (r) =>
          r.id !== form.id &&
          employeeTypeValueFromName(r.name) === employeeTypeValueFromName(form.name),
      )
    ) {
      e.name = "Employee Type name must be unique";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    if (form.id) {
      saveEmployeeTypes(
        records.map((r) =>
          r.id === form.id
            ? withUpdateAudit({
                ...r,
                name,
                // Preserve internal code
                code: r.code || autoUniqueOrgCode(name, records, r.id),
                description: form.description.trim(),
                status: form.status,
              })
            : r,
        ),
      );
    } else {
      saveEmployeeTypes([
        ...records,
        withNewAudit<EmployeeTypeRecord>({
          id: nextOrgId(records),
          name,
          code: autoUniqueOrgCode(name, records),
          description: form.description.trim(),
          status: form.status,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: EmployeeTypeRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveEmployeeTypes(
      records.map((r) =>
        r.id === record.id ? withUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: EmployeeTypeRecord, nextActive: boolean) => {
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

  const requestDelete = (record: EmployeeTypeRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Employee Type",
      usageCount: displayEmployeeCount(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveEmployeeTypes(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<EmployeeTypeRecord>[] = [
    {
      id: "name",
      label: "Employee Type",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
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
      title="Employee Types"
      description="CLOSED — Employment categories. Employee records store a slug from the type name (e.g. Permanent → permanent); keep names stable when Welcome/Checklist mappings exist."
      icon={Users}
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Employee Type
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search employee types…"
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
              "hr-employee-types.csv",
              ["Employee Type", "Description", "Employees", "Status"],
              filtered.map((r) => [
                r.name,
                r.description,
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
          emptyTitle="No employee types yet"
          emptyDescription="Define types before creating employees."
          emptyActionLabel="+ Add Employee Type"
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
        title={form.id ? "Edit Employee Type" : "Add Employee Type"}
        description="Category used on employee master records."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={FORM_CLASS}>
          <HrOrgField label="Employee Type Name" required size="full" error={errors.name} id="etype-name">
            <Input
              id="etype-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput(undefined, errors.name ? "error" : "default")}
              placeholder="e.g. Permanent"
            />
          </HrOrgField>
          <HrOrgField label="Description" size="full" id="etype-desc">
            <Textarea
              id="etype-desc"
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              rows={2}
              className={hrTextarea()}
              placeholder="e.g. Full-time permanent employee"
            />
          </HrOrgField>
          <div className="max-w-[200px] space-y-1.5">
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
        title="Deactivate employee type?"
        description={
          confirm
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "employees",
                "employee type",
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
