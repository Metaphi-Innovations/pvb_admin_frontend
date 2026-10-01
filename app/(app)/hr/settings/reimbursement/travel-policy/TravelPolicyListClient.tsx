"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Copy, Plane, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { formatHrDateDisplay } from "@/app/(app)/hr/components/HrDateInput";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { HrSuccessToast } from "@/app/(app)/hr/components/HrSuccessToast";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrSettingsDeleteDialog,
  HrRowActions,
  HrIconActionButton,
  HrListingToolbar,
  exportOrgCsv,
  hrBtn,
  hrInput,
  type HrDensity,
  type HrStatusFilter,
  type HrSettingsDeleteTarget,
} from "../../organization/_components";
import {
  HR_TRAVEL_POLICY_EVENT,
  createTravelPolicy,
  deleteTravelPolicy,
  duplicateTravelPolicy,
  loadTravelPolicies,
  saveTravelPolicy,
  type TravelPolicy,
} from "./travel-policy-data";

export default function TravelPolicyListClient() {
  const router = useRouter();
  const [rows, setRows] = useState<TravelPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [toast, setToast] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<TravelPolicy | null>(null);
  const [deleteMeta, setDeleteMeta] = useState<HrSettingsDeleteTarget | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRows(loadTravelPolicies());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const onUpd = () => refresh();
    window.addEventListener(HR_TRAVEL_POLICY_EVENT, onUpd);
    return () => window.removeEventListener(HR_TRAVEL_POLICY_EVENT, onUpd);
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = rows;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.policyNumber.toLowerCase().includes(q) ||
          r.appliesTo.toLowerCase().includes(q),
      );
    }
    return list;
  }, [rows, search, statusFilter]);

  const open = (id: number, edit?: boolean) => {
    const href = `/hr/settings/reimbursement/travel-policy/${Number(id)}${edit ? "?edit=1" : ""}`;
    router.push(href);
  };

  return (
    <HrOrgPageHeader
      title="Travel Policy"
      description="Configure travel entitlements, reimbursement limits and claim rules for employees."
      icon={Plane}
      sectionLabel="Reimbursement Settings"
      maxWidthClass="max-w-[1400px] w-full"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={() => setAddOpen(true)}>
          <Plus className="w-3.5 h-3.5" /> Add Travel Policy
        </Button>
      }
    >
      <HrListingToolbar
        search={search}
        onSearchChange={setSearch}
        searchPlaceholder="Search policy name or number…"
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        density={density}
        onDensityChange={setDensity}
        columns={[{ id: "name", label: "Policy Name" }]}
        visibleColumns={["name"]}
        onVisibleColumnsChange={() => undefined}
        onExport={() =>
          exportOrgCsv(
            "travel-policies.csv",
            ["Policy Name", "Policy Number", "Effective From", "Effective To", "Applies To", "Status", "Current"],
            filtered.map((r) => [
              r.name,
              r.policyNumber,
              r.effectiveFrom,
              r.effectiveTo || "Current",
              r.appliesTo,
              r.status,
              r.isCurrent ? "Yes" : "No",
            ]),
          )
        }
        onRefresh={refresh}
      />

      <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden mt-3">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Policy Name", "Policy Number", "Effective From", "Effective To", "Applies To", "Status", "Default/Current", "Actions"].map(
                  (h) => (
                    <th
                      key={h}
                      className={cn(
                        "px-4 py-2.5 text-left text-xs font-semibold whitespace-nowrap",
                        h === "Actions" && "text-right",
                      )}
                    >
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-xs text-muted-foreground">
                    Loading…
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center">
                    <p className="text-sm font-medium">No travel policies yet.</p>
                    <button type="button" className="text-xs text-brand-600 hover:underline mt-1" onClick={() => setAddOpen(true)}>
                      + Add Travel Policy
                    </button>
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20">
                    <td className="px-4 py-2">
                      <button type="button" className="text-xs font-semibold hover:text-brand-700" onClick={() => open(r.id)}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 font-mono text-xs text-brand-700">{r.policyNumber || "—"}</td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {r.effectiveFrom ? formatHrDateDisplay(r.effectiveFrom) : "—"}
                    </td>
                    <td className="px-4 py-2 text-xs whitespace-nowrap">
                      {r.effectiveTo ? formatHrDateDisplay(r.effectiveTo) : "Current"}
                    </td>
                    <td className="px-4 py-2 text-xs">{r.appliesTo || "—"}</td>
                    <td className="px-4 py-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                          r.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", r.status === "active" ? "bg-emerald-500" : "bg-slate-400")} />
                        {r.status === "active" ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-2">
                      {r.isCurrent ? (
                        <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-200 px-2 py-0.5 rounded-full">
                          Current
                        </span>
                      ) : (
                        <span className="text-[11px] text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <div className="flex justify-end items-center gap-0.5">
                        <HrRowActions onView={() => open(r.id)} onEdit={() => open(r.id, true)} />
                        <HrIconActionButton
                          label="Duplicate"
                          onClick={() => {
                            const result = duplicateTravelPolicy(r.id);
                            if (!result.ok) {
                              setToast(result.error);
                              return;
                            }
                            setToast("Policy duplicated.");
                            open(result.policy.id, true);
                          }}
                        >
                          <Copy />
                        </HrIconActionButton>
                        <HrIconActionButton
                          label="Delete"
                          destructive
                          onClick={() => {
                            setDeleteTarget(r);
                            setDeleteMeta({
                              entityLabel: r.name,
                              usageCount: r.claimRefCount,
                              isActive: r.status === "active",
                            });
                          }}
                        >
                          <Trash2 />
                        </HrIconActionButton>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AddPolicyDrawer
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onCreated={(id) => {
          setAddOpen(false);
          setToast("Travel policy created.");
          open(id, true);
        }}
      />

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => {
          setDeleteTarget(null);
          setDeleteMeta(null);
        }}
        target={deleteMeta}
        onDelete={() => {
          if (!deleteTarget) return;
          const result = deleteTravelPolicy(deleteTarget.id);
          setToast(result.ok ? "Policy deleted." : result.error);
          setDeleteTarget(null);
          setDeleteMeta(null);
          refresh();
        }}
        onMakeInactive={() => {
          if (!deleteTarget) return;
          saveTravelPolicy({ ...deleteTarget, status: "inactive", isCurrent: false });
          setToast("Policy inactivated.");
          setDeleteTarget(null);
          setDeleteMeta(null);
          refresh();
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}

function AddPolicyDrawer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
}) {
  const [name, setName] = useState("");
  const [number, setNumber] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [applies, setApplies] = useState("Sales Force");
  const [desc, setDesc] = useState("");
  const [active, setActive] = useState(true);
  const [current, setCurrent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName("");
    setNumber("");
    setFrom("");
    setTo("");
    setApplies("Sales Force");
    setDesc("");
    setActive(true);
    setCurrent(false);
    setError(null);
  }, [open]);

  return (
    <HrFormDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Add Travel Policy"
      description="Create a versioned policy. Entitlements are configured on the next screen."
      saveLabel="Create"
      onSave={() => {
        const result = createTravelPolicy({
          name,
          policyNumber: number,
          effectiveFrom: from,
          effectiveTo: to,
          appliesTo: applies,
          description: desc,
          status: active ? "active" : "inactive",
          isCurrent: current,
        });
        if (!result.ok) {
          setError(result.error);
          return;
        }
        onCreated(result.policy.id);
      }}
    >
      <div className="space-y-3">
        {error ? <p className="text-xs text-red-600">{error}</p> : null}
        <HrOrgField label="Policy Name" required>
          <Input value={name} onChange={(e) => setName(e.target.value)} className={hrInput()} placeholder="e.g. Sales Force Travel Policy" />
        </HrOrgField>
        <HrOrgField label="Policy Number">
          <Input value={number} onChange={(e) => setNumber(e.target.value)} className={hrInput()} placeholder="Optional" />
        </HrOrgField>
        <div className="grid grid-cols-2 gap-3">
          <HrOrgField label="Effective From" required>
            <HrDateInput value={from} onChange={setFrom} />
          </HrOrgField>
          <HrOrgField label="Effective To">
            <HrDateInput value={to} onChange={setTo} />
          </HrOrgField>
        </div>
        <HrOrgField label="Applies To">
          <Input value={applies} onChange={(e) => setApplies(e.target.value)} className={hrInput()} />
        </HrOrgField>
        <HrOrgField label="Description / Purpose">
          <Textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={2} className="text-sm rounded-lg" />
        </HrOrgField>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <p className="text-xs font-medium">Active</p>
          <Switch checked={active} onCheckedChange={setActive} size="sm" />
        </div>
        <div className="flex items-center justify-between rounded-lg border px-3 py-2">
          <div>
            <p className="text-xs font-medium">Current Policy</p>
            <p className="text-[11px] text-muted-foreground">Used for new claims in this effective period</p>
          </div>
          <Switch checked={current} onCheckedChange={setCurrent} size="sm" />
        </div>
      </div>
    </HrFormDrawer>
  );
}
