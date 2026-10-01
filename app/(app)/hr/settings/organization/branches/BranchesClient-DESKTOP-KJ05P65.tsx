"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { GitBranch, Mail, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ensurePostalMasterReady,
  isValidPincodeFormat,
} from "@/lib/address/postal-lookup";
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
  HrStatusToggle,
  HrListingToolbar,
  HrDataGrid,
  HrPhoneField,
  HrIconInput,
  HrAddressFields,
  exportOrgCsv,
  hrBtn,
  hrInput,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../_components";
import {
  loadBranches,
  saveBranches,
  nextOrgId,
  withNewAudit,
  withUpdateAudit,
  formatBranchPhone,
  autoUniqueOrgCode,
  type BranchRecord,
} from "../../organization-data";

type FormState = {
  id?: number;
  name: string;
  addressLine1: string;
  addressLine2: string;
  state: string;
  city: string;
  country: string;
  pincode: string;
  phoneCountryCode: string;
  phoneNumber: string;
  email: string;
  status: BranchRecord["status"];
};

const EMPTY: FormState = {
  name: "",
  addressLine1: "",
  addressLine2: "",
  state: "",
  city: "",
  country: "India",
  pincode: "",
  phoneCountryCode: "+91",
  phoneNumber: "",
  email: "",
  status: "active",
};

const COLUMN_DEFS = [
  { id: "name", label: "Branch Name" },
  { id: "location", label: "Location" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

/** Branches drawer only — compact labels / 36px inputs / tighter rhythm */
const BRANCH_FORM_CLASS = cn(
  "grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-2.5",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
  "[&_button]:h-9 [&_button]:text-xs",
  "[&_[role=combobox]]:h-9 [&_[role=combobox]]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: BranchRecord; count: number };

type DeleteState = { record: BranchRecord } & HrSettingsDeleteTarget;

/** Prefer derived count when employee.branch matches branch code; else seed/static. */
function displayEmployeeCount(branch: BranchRecord, employees: HrEmployee[]): number {
  const code = branch.code.trim().toLowerCase();
  if (!code) return branch.employeeCount;
  const derived = employees.filter(
    (e) => e.status === "active" && (e.branch || "").trim().toLowerCase() === code,
  ).length;
  return derived > 0 ? derived : branch.employeeCount;
}

function recordToForm(record: BranchRecord): FormState {
  return {
    id: record.id,
    name: record.name,
    addressLine1: record.addressLine1 || record.address || "",
    addressLine2: record.addressLine2 || "",
    state: record.state,
    city: record.city,
    country: record.country || "India",
    pincode: record.pincode,
    phoneCountryCode: record.phoneCountryCode || "+91",
    phoneNumber: record.phoneNumber || "",
    email: record.email,
    status: record.status,
  };
}

export default function BranchesClient() {
  const [records, setRecords] = useState<BranchRecord[]>([]);
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
    setRecords(loadBranches());
    try {
      setEmployees(loadHrEmployees());
    } catch {
      setEmployees([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    void ensurePostalMasterReady();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.code.toLowerCase().includes(q) ||
        r.city.toLowerCase().includes(q) ||
        r.state.toLowerCase().includes(q),
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

  const openEdit = (record: BranchRecord) => {
    setForm(recordToForm(record));
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

  const patchAddress = (patch: Partial<FormState>) => {
    setForm((f) => ({ ...f, ...patch }));
    setErrors((e) => {
      const n = { ...e };
      for (const k of Object.keys(patch)) delete n[k];
      return n;
    });
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Branch name is required";
    if (!form.addressLine1.trim()) e.addressLine1 = "Address Line 1 is required";
    if (!form.pincode.trim()) e.pincode = "PIN Code is required";
    else if (!isValidPincodeFormat(form.pincode)) e.pincode = "Enter a valid 6-digit PIN Code";
    if (!form.city.trim()) e.city = "City is required";
    if (!form.state.trim()) e.state = "State is required";
    if (!form.country.trim()) e.country = "Country is required";
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      e.email = "Enter a valid email";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    const phone = formatBranchPhone(form.phoneCountryCode, form.phoneNumber);
    const addressLine1 = form.addressLine1.trim();
    const payload = {
      name,
      address: addressLine1,
      addressLine1,
      addressLine2: form.addressLine2.trim(),
      state: form.state.trim(),
      city: form.city.trim(),
      country: form.country.trim() || "India",
      pincode: form.pincode.trim(),
      phoneCountryCode: form.phoneCountryCode || "+91",
      phoneNumber: form.phoneNumber.replace(/\D/g, ""),
      phone,
      email: form.email.trim(),
      status: form.status,
    };

    if (form.id) {
      // Preserve manager* + internal code — removed from UI only, not deleted from model
      saveBranches(
        records.map((r) =>
          r.id === form.id
            ? withUpdateAudit({
                ...r,
                ...payload,
                code: r.code,
                manager: r.manager,
                managerEmployeeId: r.managerEmployeeId,
              })
            : r,
        ),
      );
    } else {
      saveBranches([
        ...records,
        withNewAudit<BranchRecord>({
          id: nextOrgId(records),
          ...payload,
          code: autoUniqueOrgCode(name, records),
          manager: "",
          managerEmployeeId: null,
          employeeCount: 0,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: BranchRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveBranches(
      records.map((r) =>
        r.id === record.id ? withUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: BranchRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    const usageCount = displayEmployeeCount(record, employees);
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

  const requestDelete = (record: BranchRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Branch",
      usageCount: displayEmployeeCount(record, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveBranches(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<BranchRecord>[] = [
    {
      id: "name",
      label: "Branch Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "location",
      label: "Location",
      sortable: true,
      sortValue: (r) => `${r.city}, ${r.state}`,
      render: (r) => (
        <span className="text-foreground">
          {[r.city, r.state].filter(Boolean).join(", ") || "—"}
        </span>
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
      title="Branches"
      description="CLOSED — Canonical branch master (city/state for Travel HQ context and PT/LWF)."
      icon={GitBranch}
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Branch
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search branches…"
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
              "hr-branches.csv",
              ["Name", "City", "State", "Employees", "Status"],
              filtered.map((r) => [
                r.name,
                r.city,
                r.state,
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
          emptyTitle="No branches yet"
          emptyDescription="Add your first branch to define company locations."
          emptyActionLabel="+ Add Branch"
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
        title={form.id ? "Edit Branch" : "Add Branch"}
        description="Company branch location for HR assignment."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={BRANCH_FORM_CLASS}>
          <HrOrgField label="Branch Name" required size="md" error={errors.name} id="branch-name">
            <Input
              id="branch-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Ahmedabad Branch"
              className={hrInput(undefined, errors.name ? "error" : "default")}
            />
          </HrOrgField>

          <HrAddressFields
            value={{
              addressLine1: form.addressLine1,
              addressLine2: form.addressLine2,
              pincode: form.pincode,
              city: form.city,
              state: form.state,
              country: form.country,
            }}
            onChange={patchAddress}
            errors={{
              addressLine1: errors.addressLine1,
              pincode: errors.pincode,
              city: errors.city,
              state: errors.state,
              country: errors.country,
            }}
          />

          <HrOrgField
            label="Phone"
            size="md"
            id="branch-phone"
            className="[&_button[aria-label='Country code']]:w-[76px] [&_button[aria-label='Country code']]:px-1.5"
          >
            <HrPhoneField
              countryCode={form.phoneCountryCode}
              onCountryCodeChange={(c) => set("phoneCountryCode", c)}
              value={form.phoneNumber}
              onChange={(n) => set("phoneNumber", n)}
              placeholder="e.g. 9876543210"
            />
          </HrOrgField>
          <HrOrgField label="Email" size="md" error={errors.email} id="branch-email">
            <HrIconInput
              icon={Mail}
              id="branch-email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="e.g. ahmedabad@company.com"
              state={errors.email ? "error" : "default"}
            />
          </HrOrgField>

          <HrStatusToggle
            checked={form.status === "active"}
            onCheckedChange={(v) => set("status", v ? "active" : "inactive")}
            size="sm"
            className="max-w-[200px] [&_>div]:h-9 [&_>div]:justify-start [&_>div]:gap-3"
          />
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        destructive
        title="Deactivate branch?"
        description={
          confirm
            ? deactivateInUseDescription(
                confirm.record.name,
                confirm.count,
                "employees",
                "branch",
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
