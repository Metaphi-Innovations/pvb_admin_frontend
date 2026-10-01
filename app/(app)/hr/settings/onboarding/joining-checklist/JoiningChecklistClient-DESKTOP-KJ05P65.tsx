"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
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
  loadJoiningChecklist,
  saveJoiningChecklist,
  nextJoiningChecklistId,
  withJoiningChecklistNewAudit,
  withJoiningChecklistUpdateAudit,
  normalizeChecklistItemName,
  type JoiningChecklistApplicability,
  type JoiningChecklistRecord,
} from "../../onboarding-data";
import { welcomeEmployeeTypeOptions } from "../../welcome-workflow-data";
import { getEmployeeTypeLabelFromMaster } from "../../organization-data";

type FormState = {
  id?: number;
  name: string;
  sequence: number | "";
  mandatory: boolean;
  status: JoiningChecklistRecord["status"];
  applicability: JoiningChecklistApplicability;
  employeeTypeValues: string[];
};

const EMPTY: FormState = {
  name: "",
  sequence: "",
  mandatory: true,
  status: "active",
  applicability: "all",
  employeeTypeValues: [],
};

const COLUMN_DEFS = [
  { id: "sequence", label: "Order" },
  { id: "name", label: "Checklist Item" },
  { id: "applicable", label: "Applicable To" },
  { id: "mandatory", label: "Mandatory" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

const FORM_CLASS = cn(
  "grid grid-cols-1 gap-y-3",
  "[&_label]:text-xs [&_label]:font-medium [&_label]:leading-none",
  "[&_input]:h-9 [&_input]:text-xs",
);

type DeleteState = { record: JoiningChecklistRecord } & HrSettingsDeleteTarget;

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

export default function JoiningChecklistClient() {
  const [records, setRecords] = useState<JoiningChecklistRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const typeOptions = useMemo(() => welcomeEmployeeTypeOptions(), []);

  const formatApplicable = (r: JoiningChecklistRecord) => {
    if (r.applicability !== "selected" || r.employeeTypeValues.length === 0) {
      return "All Employees";
    }
    return r.employeeTypeValues.map((v) => getEmployeeTypeLabelFromMaster(v)).join(", ");
  };

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadJoiningChecklist());
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
    return [...list].sort((a, b) => a.sequence - b.sequence || a.id - b.id);
  }, [records, search, statusFilter]);

  const closeSheet = () => {
    setSheetOpen(false);
    setForm(EMPTY);
    setErrors({});
  };

  const openAdd = () => {
    const nextSeq =
      records.length > 0 ? Math.max(...records.map((r) => r.sequence)) + 1 : 1;
    setForm({ ...EMPTY, sequence: nextSeq });
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: JoiningChecklistRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      sequence: record.sequence,
      mandatory: record.mandatory,
      status: record.status,
      applicability: record.applicability ?? "all",
      employeeTypeValues: [...(record.employeeTypeValues ?? [])],
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
    if (!form.name.trim()) e.name = "Checklist Item is required";
    else if (
      records.some(
        (r) =>
          r.id !== form.id &&
          normalizeChecklistItemName(r.name) === normalizeChecklistItemName(form.name),
      )
    ) {
      e.name = "Checklist Item already exists.";
    }
    const seq = Number(form.sequence);
    if (form.sequence === "" || Number.isNaN(seq) || seq < 1) {
      e.sequence = "Sequence is required (1 or higher)";
    } else if (records.some((r) => r.id !== form.id && r.sequence === seq)) {
      e.sequence = "Sequence already in use.";
    }
    if (form.applicability === "selected" && form.employeeTypeValues.length === 0) {
      e.employeeTypeValues = "Select at least one Employee Type.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const name = form.name.trim();
    const sequence = Number(form.sequence);
    const applicability = form.applicability;
    const employeeTypeValues =
      applicability === "selected" ? form.employeeTypeValues : [];
    if (form.id) {
      saveJoiningChecklist(
        records.map((r) =>
          r.id === form.id
            ? withJoiningChecklistUpdateAudit({
                ...r,
                name,
                sequence,
                mandatory: form.mandatory,
                status: form.status,
                applicability,
                employeeTypeValues,
                detectKey: r.detectKey,
              })
            : r,
        ),
      );
    } else {
      saveJoiningChecklist([
        ...records,
        withJoiningChecklistNewAudit({
          id: nextJoiningChecklistId(records),
          name,
          sequence,
          mandatory: form.mandatory,
          status: form.status,
          applicability,
          employeeTypeValues,
          detectKey: "manual",
        }),
      ]);
    }
    closeSheet();
    refresh();
  };

  const applyStatus = (record: JoiningChecklistRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveJoiningChecklist(
      records.map((r) =>
        r.id === record.id ? withJoiningChecklistUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: JoiningChecklistRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    applyStatus(record, nextActive);
  };

  const handleMandatoryToggle = (record: JoiningChecklistRecord, mandatory: boolean) => {
    if (record.mandatory === mandatory) return;
    saveJoiningChecklist(
      records.map((r) =>
        r.id === record.id ? withJoiningChecklistUpdateAudit({ ...r, mandatory }) : r,
      ),
    );
    refresh();
  };

  const requestDelete = (record: JoiningChecklistRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Checklist Item",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveJoiningChecklist(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<JoiningChecklistRecord>[] = [
    {
      id: "sequence",
      label: "Order",
      sortable: true,
      sortValue: (r) => r.sequence,
      className: "w-16",
      render: (r) => (
        <span className="font-mono text-xs font-semibold text-brand-700 tabular-nums">
          {r.sequence}
        </span>
      ),
    },
    {
      id: "name",
      label: "Checklist Item",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "applicable",
      label: "Applicable To",
      sortable: true,
      sortValue: (r) => formatApplicable(r),
      render: (r) => (
        <span className="text-xs text-muted-foreground">{formatApplicable(r)}</span>
      ),
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
          editLabel="Edit Checklist Item"
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Joining Checklist"
      description="Configure the standard tasks to be completed for employee onboarding."
      icon={ClipboardList}
      sectionLabel="Employee Onboarding Setup"
      sectionHref="/hr/settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Checklist Item
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search checklist items…"
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
              "hr-joining-checklist.csv",
              ["Order", "Checklist Item", "Applicable To", "Mandatory", "Active"],
              filtered.map((r) => [
                String(r.sequence),
                r.name,
                formatApplicable(r),
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
          emptyTitle="No checklist items yet"
          emptyDescription="Add standard onboarding tasks for new joiners."
          emptyActionLabel="+ Add Checklist Item"
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
        title={form.id ? "Edit Checklist Item" : "Add Checklist Item"}
        description="Task shown on employee onboarding joining checklist."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create"}
      >
        <div className={FORM_CLASS}>
          <HrOrgField label="Checklist Item" required size="md" error={errors.name} id="jc-name">
            <Input
              id="jc-name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              className={hrInput(undefined, errors.name ? "error" : "default")}
              placeholder="e.g. IT Assets Handed Over"
            />
          </HrOrgField>
          <HrOrgField label="Sequence" required size="sm" error={errors.sequence} id="jc-seq">
            <Input
              id="jc-seq"
              type="number"
              min={1}
              value={form.sequence}
              onChange={(e) =>
                set("sequence", e.target.value === "" ? "" : Number(e.target.value))
              }
              className={hrInput(undefined, errors.sequence ? "error" : "default")}
              placeholder="1"
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
            <p className="text-xs font-medium leading-none">Applicability *</p>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "all" as const, label: "All Employees" },
                  { value: "selected" as const, label: "Selected Employee Types" },
                ] as const
              ).map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() =>
                    setForm((f) => ({
                      ...f,
                      applicability: o.value,
                      employeeTypeValues: o.value === "all" ? [] : f.employeeTypeValues,
                    }))
                  }
                  className={cn(
                    "h-8 px-2.5 text-xs rounded-lg border font-medium transition-colors",
                    form.applicability === o.value
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          {form.applicability === "selected" && (
            <div className="space-y-1.5">
              <p className="text-xs font-medium leading-none">Selected Employee Types *</p>
              {errors.employeeTypeValues && (
                <p className="text-xs text-red-500">{errors.employeeTypeValues}</p>
              )}
              <div className="rounded-lg border border-border bg-muted/10 p-2.5 space-y-1.5 max-h-40 overflow-y-auto">
                {typeOptions.map((t) => {
                  const checked = form.employeeTypeValues.includes(t.value);
                  return (
                    <label key={t.value} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded accent-brand-600"
                        checked={checked}
                        onChange={() => {
                          setForm((f) => ({
                            ...f,
                            employeeTypeValues: checked
                              ? f.employeeTypeValues.filter((v) => v !== t.value)
                              : [...f.employeeTypeValues, t.value],
                          }));
                          setErrors((e) => {
                            const n = { ...e };
                            delete n.employeeTypeValues;
                            return n;
                          });
                        }}
                      />
                      <span className="text-xs text-foreground">{t.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}
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
