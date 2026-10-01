"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ChevronsUpDown, ScrollText, Plus, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
  applyLeavePolicyDefault,
  buildPolicyFormLines,
  countEmployeesOnLeavePolicy,
  cycleHelperLabels,
  getActiveLeaveTypes,
  getDefaultLeavePolicy,
  LEAVE_CYCLE_OPTIONS,
  loadLeavePolicies,
  mergePolicyLinesOnSave,
  nextLeaveId,
  saveLeavePolicies,
  withLeaveNewAudit,
  withLeaveUpdateAudit,
  type LeaveCycle,
  type LeavePolicyLine,
  type LeavePolicyRecord,
} from "../../leave-data";

type FormState = {
  id?: number;
  name: string;
  description: string;
  lines: LeavePolicyLine[];
  status: LeavePolicyRecord["status"];
  isDefault: boolean;
};

const EMPTY: FormState = {
  name: "",
  description: "",
  lines: [],
  status: "active",
  isDefault: false,
};

const COLUMN_DEFS = [
  { id: "name", label: "Policy" },
  { id: "default", label: "Default" },
  { id: "types", label: "Leave Types" },
  { id: "status", label: "Status" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget =
  | { type: "deactivate"; record: LeavePolicyRecord; count: number }
  | { type: "makeDefault"; form: FormState; currentDefaultName: string };

type DeleteState = { record: LeavePolicyRecord } & HrSettingsDeleteTarget;

function parseDecimal(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return 0;
  const n = Number(t);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function FrequencySelect({
  value,
  onChange,
}: {
  value: LeaveCycle;
  onChange: (v: LeaveCycle) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = LEAVE_CYCLE_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            hrInput(undefined, "default"),
            "h-9 w-full min-w-[7rem] px-2.5 text-xs text-left flex items-center justify-between gap-1",
          )}
        >
          <span>{label}</span>
          <ChevronsUpDown className="w-3 h-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-[8.5rem] p-1 rounded-[12px]">
        {LEAVE_CYCLE_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg transition-colors",
              value === opt.value
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            <span className="flex-1">{opt.label}</span>
            {value === opt.value ? (
              <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export default function LeavePoliciesClient() {
  const [records, setRecords] = useState<LeavePolicyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [previousLines, setPreviousLines] = useState<LeavePolicyLine[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadLeavePolicies());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onTypes = () => {
      if (!sheetOpen) return;
      setForm((f) => ({
        ...f,
        lines: buildPolicyFormLines(f.lines, getActiveLeaveTypes(), f.lines[0]?.cycle ?? "yearly"),
      }));
    };
    window.addEventListener("hr-leave-types-updated", onTypes);
    return () => window.removeEventListener("hr-leave-types-updated", onTypes);
  }, [sheetOpen]);

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

  const isFirstPolicy = records.length === 0;

  const openAdd = () => {
    const lines = buildPolicyFormLines([], getActiveLeaveTypes(), "yearly");
    const defaultPolicy = getDefaultLeavePolicy(records);
    setForm({
      ...EMPTY,
      lines,
      isDefault: !defaultPolicy,
    });
    setPreviousLines([]);
    setErrors({});
    setSheetOpen(true);
  };

  const openEdit = (record: LeavePolicyRecord) => {
    const lines = buildPolicyFormLines(record.lines, getActiveLeaveTypes(), record.cycle);
    setForm({
      id: record.id,
      name: record.name,
      description: record.description,
      lines,
      status: record.status,
      isDefault: record.isDefault,
    });
    setPreviousLines(record.lines);
    setErrors({});
    setSheetOpen(true);
  };

  const setLine = (
    leaveTypeId: number,
    field: keyof Pick<LeavePolicyLine, "allowedLeaves" | "carryForward" | "cycle">,
    value: string | LeaveCycle,
  ) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => {
        if (l.leaveTypeId !== leaveTypeId) return l;
        if (field === "cycle") return { ...l, cycle: value as LeaveCycle };
        const n = parseDecimal(String(value));
        return { ...l, [field]: n === null ? l[field] : n };
      }),
    }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Policy name is required";
    if (form.lines.length === 0) {
      e.lines = "No active leave types available. Add leave types in Settings first.";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const commitSave = (payload: FormState) => {
    const lines = mergePolicyLinesOnSave(previousLines, payload.lines).map((l) => ({
      ...l,
      leaveTypeName:
        getActiveLeaveTypes().find((t) => t.id === l.leaveTypeId)?.name ?? l.leaveTypeName,
    }));
    const legacyCycle = lines[0]?.cycle ?? "yearly";

    let next: LeavePolicyRecord[];
    if (payload.id) {
      next = records.map((r) =>
        r.id === payload.id
          ? withLeaveUpdateAudit({
              ...r,
              name: payload.name.trim(),
              description: payload.description.trim(),
              cycle: legacyCycle,
              lines,
              status: payload.status,
              isDefault: payload.isDefault,
            })
          : r,
      );
    } else {
      next = [
        ...records,
        withLeaveNewAudit<LeavePolicyRecord>({
          id: nextLeaveId(records),
          name: payload.name.trim(),
          description: payload.description.trim(),
          cycle: legacyCycle,
          lines,
          status: payload.status,
          isDefault: payload.isDefault,
        }),
      ];
    }

    if (payload.isDefault) {
      const id = payload.id ?? next[next.length - 1]!.id;
      next = applyLeavePolicyDefault(next, id);
    } else if (payload.id) {
      const prev = records.find((p) => p.id === payload.id);
      if (prev?.isDefault && !payload.isDefault) {
        const other = next.find((p) => p.id !== payload.id && p.status === "active");
        if (other) next = applyLeavePolicyDefault(next, other.id);
      }
    }

    if (payload.status === "inactive") {
      const saved = next.find((p) => p.id === (payload.id ?? next[next.length - 1]!.id));
      if (saved?.isDefault) {
        setToast("Default policy cannot be inactive. Set another active policy as default first.");
        return;
      }
    }

    saveLeavePolicies(next);
    setSheetOpen(false);
    refresh();
    setToast(
      payload.id ? "Leave policy updated successfully." : "Leave policy created successfully.",
    );
  };

  const handleSave = () => {
    if (!validate()) return;
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
    commitSave(form);
  };

  const applyStatus = (record: LeavePolicyRecord, nextActive: boolean) => {
    const nextStatus = nextActive ? "active" : "inactive";
    saveLeavePolicies(
      records.map((r) =>
        r.id === record.id ? withLeaveUpdateAudit({ ...r, status: nextStatus }) : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: LeavePolicyRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive && record.isDefault) {
      setToast("Default policy cannot be deactivated. Set another active policy as default first.");
      return;
    }
    if (!nextActive) {
      const usageCount = countEmployeesOnLeavePolicy(record.id);
      if (usageCount > 0) {
        setConfirm({ type: "deactivate", record, count: usageCount });
        return;
      }
    }
    applyStatus(record, nextActive);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === "makeDefault") {
      commitSave(confirm.form);
      setConfirm(null);
      return;
    }
    applyStatus(confirm.record, false);
    setConfirm(null);
  };

  const requestDelete = (record: LeavePolicyRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Leave Policy",
      usageCount: countEmployeesOnLeavePolicy(record.id),
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveLeavePolicies(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const columns: HrDataGridColumn<LeavePolicyRecord>[] = [
    {
      id: "name",
      label: "Policy",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <div>
          <p className="font-semibold text-foreground">{r.name}</p>
          <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">
            {r.description || "—"}
          </p>
        </div>
      ),
    },
    {
      id: "default",
      label: "Default",
      sortable: true,
      sortValue: (r) => (r.isDefault ? 1 : 0),
      render: (r) =>
        r.isDefault ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            Default
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "types",
      label: "Leave Types",
      sortable: true,
      sortValue: (r) => r.lines.length,
      render: (r) => (
        <span className="text-muted-foreground tabular-nums">{r.lines.length} configured</span>
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
      title="Leave Policies"
      description="Configure credit frequency and entitlements per leave type."
      icon={ScrollText}
      sectionLabel="Leave and Holiday Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Create Policy
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search leave policies…"
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
              "hr-leave-policies.csv",
              ["Policy", "Default", "Leave Types", "Status"],
              filtered.map((r) => [
                r.name,
                r.isDefault ? "Yes" : "No",
                String(r.lines.length),
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
          emptyTitle="No leave policies yet"
          emptyDescription="Create a policy using leave types from Settings."
          emptyActionLabel="+ Create Policy"
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
        title={form.id ? "Edit Leave Policy" : "Create Leave Policy"}
        description="Set frequency and allowed leaves for each active leave type."
        onSave={handleSave}
        saveLabel={form.id ? "Update" : "Create Policy"}
      >
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
            <HrOrgField label="Policy Name" required size="md" error={errors.name}>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                className={hrInput()}
                placeholder="Standard Leave Policy"
              />
            </HrOrgField>
            <HrOrgField label="Description" size="full">
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={2}
                className={hrTextarea()}
              />
            </HrOrgField>
            <HrStatusToggle
              checked={form.status === "active"}
              onCheckedChange={(v) =>
                setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))
              }
              size="sm"
            />
            <HrStatusToggle
              label="Default Policy"
              checked={form.isDefault}
              onCheckedChange={(v) => setForm((f) => ({ ...f, isDefault: v }))}
              size="sm"
              helper={
                form.isDefault
                  ? "New employees use this policy unless HR assigns another"
                  : "Only one active policy can be default"
              }
            />
          </div>

          <div className="rounded-xl border border-border overflow-hidden">
            <div className="px-3 py-2 border-b border-border bg-muted/20 flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  Leave Entitlements
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Each leave type has its own credit frequency
                </p>
              </div>
              <Link
                href="/hr/settings/leave/leave-types"
                className="inline-flex items-center gap-1 text-[11px] font-medium text-brand-700 hover:underline"
              >
                Manage Leave Types
                <ExternalLink className="w-3 h-3" />
              </Link>
            </div>

            {form.lines.length === 0 ? (
              <div className="px-3 py-6 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  No active leave types. Leave types are managed from HR Settings → Leave Types.
                </p>
                {errors.lines && <p className="text-xs text-red-500">{errors.lines}</p>}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/30 border-b border-border text-left">
                      <th className="px-3 py-2 font-semibold">Leave Type</th>
                      <th className="px-3 py-2 font-semibold w-32">Frequency</th>
                      <th className="px-3 py-2 font-semibold w-36">Allowed Leaves</th>
                      <th className="px-3 py-2 font-semibold w-36">Carry Forward</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.lines.map((line) => {
                      const helpers = cycleHelperLabels(line.cycle);
                      return (
                        <tr
                          key={line.leaveTypeId}
                          className="border-b border-border/60 last:border-0"
                        >
                          <td className="px-3 py-2 font-medium whitespace-nowrap">
                            {line.leaveTypeName}
                          </td>
                          <td className="px-3 py-2">
                            <FrequencySelect
                              value={line.cycle}
                              onChange={(v) => setLine(line.leaveTypeId, "cycle", v)}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={line.allowedLeaves}
                              onChange={(e) =>
                                setLine(line.leaveTypeId, "allowedLeaves", e.target.value)
                              }
                              className={hrInput("h-9")}
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {helpers.allowed}
                            </p>
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={line.carryForward}
                              onChange={(e) =>
                                setLine(line.leaveTypeId, "carryForward", e.target.value)
                              }
                              className={hrInput("h-9")}
                            />
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {helpers.carryForward}
                            </p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <p className="text-[11px] text-muted-foreground">
            Leave types are managed from HR Settings → Leave Types. Inactive types are not shown
            for new configuration.
          </p>
        </div>
      </HrFormDrawer>

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        destructive={confirm?.type !== "makeDefault"}
        title={
          confirm?.type === "makeDefault"
            ? "Make this the default Leave Policy?"
            : "Deactivate leave policy?"
        }
        description={
          confirm?.type === "makeDefault"
            ? `${confirm.currentDefaultName} is currently the default Leave Policy. Make this policy the new default?`
            : confirm?.type === "deactivate"
              ? deactivateInUseDescription(
                  confirm.record.name,
                  confirm.count,
                  "employees",
                  "leave policy",
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
