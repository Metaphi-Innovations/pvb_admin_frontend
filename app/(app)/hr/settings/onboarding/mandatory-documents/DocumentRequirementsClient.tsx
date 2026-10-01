"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FileCheck, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { loadHrEmployees, type HrEmployee } from "../../../employees/employee-master-data";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrListingToolbar,
  HrDataGrid,
  HrRowActions,
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  loadDocumentRequirements,
  saveDocumentRequirements,
  nextDocumentRequirementId,
  withDocReqNewAudit,
  withDocReqUpdateAudit,
  normalizeDocumentTypeName,
  countEmployeesUsingDocumentType,
  type DocumentRequirementRecord,
} from "../../onboarding-data";

type FormState = {
  id?: number;
  name: string;
  mandatory: boolean;
  status: DocumentRequirementRecord["status"];
};

const EMPTY: FormState = { name: "", mandatory: true, status: "active" };

const COLUMN_DEFS = [
  { id: "name", label: "Document Type" },
  { id: "mandatory", label: "Mandatory" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

const FORM_CLASS = cn(
  "grid grid-cols-1 gap-y-3",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
);

type ConfirmTarget = { type: "deactivate"; record: DocumentRequirementRecord; count: number };

type DeleteState = { record: DocumentRequirementRecord } & HrSettingsDeleteTarget;

function MandatoryToggle({
  checked,
  onCheckedChange,
  size = "sm",
  id,
}: {
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  size?: "sm" | "md";
  id?: string;
}) {
  return (
    <div className="inline-flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        id={id}
        size={size === "sm" ? "sm" : "default"}
        checked={checked}
        onCheckedChange={onCheckedChange}
        aria-label={checked ? "Mandatory" : "Optional"}
      />
      <span
        className={cn(
          "font-medium leading-none",
          size === "sm" ? "text-[11px]" : "text-xs",
          checked ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {checked ? "Mandatory" : "Optional"}
      </span>
    </div>
  );
}

export default function DocumentRequirementsClient() {
  const [records, setRecords] = useState<DocumentRequirementRecord[]>([]);
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
    setRecords(loadDocumentRequirements());
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

  const openEdit = (record: DocumentRequirementRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      mandatory: record.mandatory,
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
    if (!form.name.trim()) e.name = "Document Type Name is required";
    else if (
      records.some(
        (r) =>
          r.id !== form.id &&
          normalizeDocumentTypeName(r.name) === normalizeDocumentTypeName(form.name),
      )
    ) {
      e.name = "Document Type already exists.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    if (form.id) {
      saveDocumentRequirements(
        records.map((r) =>
          r.id === form.id
            ? withDocReqUpdateAudit({
                ...r,
                name,
                mandatory: form.mandatory,
                status: form.status,
              })
            : r,
        ),
      );
    } else {
      saveDocumentRequirements([
        ...records,
        withDocReqNewAudit({
          id: nextDocumentRequirementId(records),
          name,
          mandatory: form.mandatory,
          status: form.status,
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: DocumentRequirementRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveDocumentRequirements(
      records.map((r) =>
        r.id === record.id ? withDocReqUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: DocumentRequirementRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    const usage = countEmployeesUsingDocumentType(record.name, employees);
    if (!nextActive && usage > 0) {
      setConfirm({ type: "deactivate", record, count: usage });
      return;
    }
    applyStatus(record, nextActive);
  };

  const handleMandatoryToggle = (record: DocumentRequirementRecord, mandatory: boolean) => {
    if (record.mandatory === mandatory) return;
    saveDocumentRequirements(
      records.map((r) =>
        r.id === record.id ? withDocReqUpdateAudit({ ...r, mandatory }) : r,
      ),
    );
    refresh();
  };

  const requestDelete = (record: DocumentRequirementRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Document Type",
      usageCount: countEmployeesUsingDocumentType(record.name, employees),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveDocumentRequirements(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<DocumentRequirementRecord>[] = [
    {
      id: "name",
      label: "Document Type",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "mandatory",
      label: "Mandatory",
      sortable: true,
      sortValue: (r) => (r.mandatory ? 1 : 0),
      render: (r) => (
        <MandatoryToggle
          checked={r.mandatory}
          onCheckedChange={(v) => handleMandatoryToggle(r, v)}
        />
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
          editLabel="Edit Document Type"
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Document Requirements"
      description="Manage employee document types and define whether each document is mandatory or optional."
      icon={FileCheck}
      sectionLabel="Employee Onboarding Setup"
      sectionHref="/hr/settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Document Type
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search document types…"
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
              "hr-document-requirements.csv",
              ["Document Type", "Mandatory", "Active"],
              filtered.map((r) => [
                r.name,
                r.mandatory ? "Mandatory" : "Optional",
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
          emptyTitle="No document types yet"
          emptyDescription="Add document types required for employee onboarding."
          emptyActionLabel="+ Add Document Type"
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
        title={form.id ? "Edit Document Type" : "Add Document Type"}
        description="Document type available for employee profile and onboarding."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={FORM_CLASS}>
          <HrOrgField label="Document Type Name" required size="md" error={errors.name} id="dr-name">
            <Input
              id="dr-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput(undefined, errors.name ? "error" : "default")}
              placeholder="e.g. Aadhaar Card"
            />
          </HrOrgField>
          <div className="space-y-1.5">
            <p className="text-xs font-medium leading-none">Mandatory / Optional</p>
            <div className="h-9 flex items-center">
              <MandatoryToggle
                size="md"
                checked={form.mandatory}
                onCheckedChange={(v) => set("mandatory", v)}
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-medium leading-none">Active / Inactive</p>
            <div className="h-9 flex items-center">
              <HrActiveStatusSwitch
                size="md"
                checked={form.status === "active"}
                onCheckedChange={(active) => set("status", active ? "active" : "inactive")}
              />
            </div>
          </div>
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={() => {
          if (confirm) applyStatus(confirm.record, false);
          setConfirm(null);
        }}
        title="Deactivate document type?"
        description={
          confirm
            ? `${confirm.record.name} is already used for employee records. Existing employee documents will remain unchanged, but this document type will not be available for new onboarding/document entry.`
            : ""
        }
        confirmLabel="Deactivate"
        destructive
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
