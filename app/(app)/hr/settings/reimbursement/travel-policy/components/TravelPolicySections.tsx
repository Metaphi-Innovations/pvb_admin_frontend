"use client";

import React, { useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { HrOrgField, hrBtn, hrInput, HrIconActionButton } from "../../../organization/_components";
import { loadDesignations } from "@/app/(app)/hr/settings/organization-data";
import { getActiveMockStateNames, getCitiesForState } from "@/app/(app)/hr/sales-force-policy/stateCityMockData";
import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import {
  APPROVER_OPTIONS,
  airTriggerLabel,
  approverLabel,
  ensureMatrixCells,
  formatInr,
  newBandId,
  newClaimRuleId,
  newClassId,
  newExceptionId,
  newExclusionId,
  newGroupId,
  newGuidanceId,
  newKmId,
  newMappingId,
  newSlabId,
  blankClaimTypeRule,
  type AirEligibilityTrigger,
  type ApproverRole,
  type CityClass,
  type DeadlineMethod,
  type ExclusionAction,
  type FieldAllowanceType,
  type GuidanceKind,
  type OddHoursUpgradeRule,
  type OverLimitAction,
  type OvernightReimburseType,
  type PrivateTaxiType,
  type TaxiReimburseType,
  type TimeBandApplicability,
  type TimeBandCategory,
  type TravelPolicy,
} from "../travel-policy-data";
import {
  getApplicableTravelPolicy,
  getEmployeeEntitlementGroup,
  getTravelEntitlement,
  resolveCityClassification,
  validateTravelClaim,
} from "../travel-policy-resolver";
import { ChipMultiSelect, Combo, SectionCard, ToggleRow } from "./travel-policy-ui";

export const POLICY_SECTIONS = [
  { id: "applicability", label: "Applicability" },
  { id: "city", label: "City Classification" },
  { id: "exhq", label: "Ex-HQ Travel" },
  { id: "lodging", label: "Lodging & Boarding" },
  { id: "relatives", label: "Stay with Relatives/Friends" },
  { id: "overnight", label: "Overnight Journey" },
  { id: "local", label: "Local & City Travel" },
  { id: "field", label: "Field Conveyance" },
  { id: "km", label: "KM Reimbursement" },
  { id: "incidental", label: "Incidental Allowance" },
  { id: "claims", label: "Claim Rules" },
  { id: "exclusions", label: "Exclusions" },
  { id: "guidance", label: "Employee Guidance" },
  { id: "summary", label: "Summary" },
] as const;

export type PolicySectionId = (typeof POLICY_SECTIONS)[number]["id"];

export function TravelPolicySectionBody({
  section,
  policy,
  onChange,
  readOnly,
}: {
  section: PolicySectionId;
  policy: TravelPolicy;
  onChange: (next: TravelPolicy) => void;
  readOnly: boolean;
}) {
  const p = ensureMatrixCells(policy);
  const set = (next: TravelPolicy) => onChange(ensureMatrixCells(next));

  switch (section) {
    case "applicability":
      return <ApplicabilitySection p={p} set={set} readOnly={readOnly} />;
    case "city":
      return <CitySection p={p} set={set} readOnly={readOnly} />;
    case "exhq":
      return <ExHqSection p={p} set={set} readOnly={readOnly} />;
    case "lodging":
      return <LodgingSection p={p} set={set} readOnly={readOnly} />;
    case "relatives":
      return <RelativesSection p={p} set={set} readOnly={readOnly} />;
    case "overnight":
      return <OvernightSection p={p} set={set} readOnly={readOnly} />;
    case "local":
      return <LocalSection p={p} set={set} readOnly={readOnly} />;
    case "field":
      return <FieldSection p={p} set={set} readOnly={readOnly} />;
    case "km":
      return <KmSection p={p} set={set} readOnly={readOnly} />;
    case "incidental":
      return <IncidentalSection p={p} set={set} readOnly={readOnly} />;
    case "claims":
      return <ClaimsSection p={p} set={set} readOnly={readOnly} />;
    case "exclusions":
      return <ExclusionsSection p={p} set={set} readOnly={readOnly} />;
    case "guidance":
      return <GuidanceSection p={p} set={set} readOnly={readOnly} />;
    case "summary":
      return <SummarySection p={p} />;
    default:
      return null;
  }
}

function Num({
  value,
  onChange,
  disabled,
  className,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <Input
      value={Number.isFinite(value) ? String(value) : ""}
      disabled={disabled}
      onChange={(e) => onChange(Number(e.target.value.replace(/[^\d.]/g, "") || 0))}
      className={cn("h-8 text-xs rounded-lg", className)}
    />
  );
}

function ApplicabilitySection({
  p,
  set,
  readOnly,
}: {
  p: TravelPolicy;
  set: (p: TravelPolicy) => void;
  readOnly: boolean;
}) {
  const designations = loadDesignations().filter((d) => d.status === "active");
  const [groupName, setGroupName] = useState("");

  return (
    <div className="space-y-3">
      <SectionCard title="Header">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <HrOrgField label="Policy Name" required>
            <Input value={p.name} disabled={readOnly} onChange={(e) => set({ ...p, name: e.target.value })} className={hrInput()} />
          </HrOrgField>
          <HrOrgField label="Policy Number">
            <Input value={p.policyNumber} disabled={readOnly} onChange={(e) => set({ ...p, policyNumber: e.target.value })} className={hrInput()} />
          </HrOrgField>
          <HrOrgField label="Effective From" required>
            <HrDateInput value={p.effectiveFrom} disabled={readOnly} onChange={(v) => set({ ...p, effectiveFrom: v })} />
          </HrOrgField>
          <HrOrgField label="Effective To">
            <HrDateInput value={p.effectiveTo} disabled={readOnly} onChange={(v) => set({ ...p, effectiveTo: v })} />
          </HrOrgField>
          <HrOrgField label="Applies To">
            <Input value={p.appliesTo} disabled={readOnly} onChange={(e) => set({ ...p, appliesTo: e.target.value })} className={hrInput()} />
          </HrOrgField>
          <div className="flex flex-col gap-2">
            <ToggleRow
              label="Active"
              checked={p.status === "active"}
              disabled={readOnly}
              onChange={(v) => set({ ...p, status: v ? "active" : "inactive", isCurrent: v ? p.isCurrent : false })}
            />
            <ToggleRow
              label="Current Policy"
              hint="Only one current policy per overlapping period"
              checked={p.isCurrent}
              disabled={readOnly}
              onChange={(v) => set({ ...p, isCurrent: v })}
            />
          </div>
          <HrOrgField label="Description / Purpose" size="full">
            <Textarea value={p.description} disabled={readOnly} onChange={(e) => set({ ...p, description: e.target.value })} rows={2} className="text-sm" />
          </HrOrgField>
        </div>
      </SectionCard>

      <SectionCard title="Approval metadata" hint="Audit fields only — not an e-signature workflow. File stays in the browser (localStorage preview).">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <HrOrgField label="Approved By">
            <Input
              value={p.approvedBy}
              disabled={readOnly}
              onChange={(e) => set({ ...p, approvedBy: e.target.value })}
              className={hrInput()}
              placeholder="Name / designation"
            />
          </HrOrgField>
          <HrOrgField label="Approval Date">
            <HrDateInput value={p.approvalDate} disabled={readOnly} onChange={(v) => set({ ...p, approvalDate: v })} />
          </HrOrgField>
          <HrOrgField label="Internal Remark" size="full">
            <Textarea
              value={p.internalRemark}
              disabled={readOnly}
              onChange={(e) => set({ ...p, internalRemark: e.target.value })}
              rows={2}
              className="text-sm"
            />
          </HrOrgField>
          <HrOrgField label="Policy document" size="full">
            <div className="flex flex-wrap items-center gap-2">
              {!readOnly ? (
                <label className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-medium cursor-pointer hover:bg-muted/50">
                  Attach PDF / file
                  <input
                    type="file"
                    accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      e.target.value = "";
                      if (!file) return;
                      if (file.size > 2 * 1024 * 1024) {
                        window.alert("File is larger than 2 MB. Choose a smaller file for prototype storage.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        set({
                          ...p,
                          document: {
                            fileName: file.name,
                            sizeLabel: `${Math.max(1, Math.round(file.size / 1024))} KB`,
                            dataUrl: String(reader.result || ""),
                          },
                        });
                      };
                      reader.readAsDataURL(file);
                    }}
                  />
                </label>
              ) : null}
              {p.document ? (
                <span className="text-xs text-foreground">
                  {p.document.fileName}{" "}
                  <span className="text-muted-foreground">({p.document.sizeLabel})</span>
                  {p.document.dataUrl ? (
                    <a href={p.document.dataUrl} download={p.document.fileName} className="ml-2 text-brand-600 hover:underline">
                      Download
                    </a>
                  ) : null}
                </span>
              ) : (
                <span className="text-[11px] text-muted-foreground">No file selected</span>
              )}
              {!readOnly && p.document ? (
                <button type="button" className="text-xs text-red-600 hover:underline" onClick={() => set({ ...p, document: null })}>
                  Remove
                </button>
              ) : null}
            </div>
          </HrOrgField>
        </div>
      </SectionCard>

      <SectionCard title="Entitlement Groups" hint="Roles inherit one group so rules are not duplicated.">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="px-3 py-2 text-left font-semibold">Group Name</th>
              <th className="px-3 py-2 text-left font-semibold">Mapped Roles</th>
              <th className="px-3 py-2 text-left font-semibold">Active</th>
              {!readOnly ? <th className="px-3 py-2 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {p.groups.map((g) => {
              const mapped = p.roleMappings.filter((m) => m.groupId === g.id && m.active);
              return (
                <tr key={g.id} className="border-b border-border/60">
                  <td className="px-3 py-1.5">
                    <Input
                      value={g.name}
                      disabled={readOnly}
                      onChange={(e) =>
                        set({ ...p, groups: p.groups.map((x) => (x.id === g.id ? { ...x, name: e.target.value } : x)) })
                      }
                      className="h-8 text-xs"
                    />
                  </td>
                  <td className="px-3 py-1.5 text-muted-foreground">{mapped.map((m) => m.designationName).join(", ") || "—"}</td>
                  <td className="px-3 py-1.5">
                    <Switch
                      size="sm"
                      checked={g.active}
                      disabled={readOnly}
                      onCheckedChange={(v) =>
                        set({ ...p, groups: p.groups.map((x) => (x.id === g.id ? { ...x, active: v } : x)) })
                      }
                    />
                  </td>
                  {!readOnly ? (
                    <td className="px-3 py-1.5 text-right">
                      <HrIconActionButton
                        label="Remove"
                        destructive
                        onClick={() =>
                          set({
                            ...p,
                            groups: p.groups.filter((x) => x.id !== g.id),
                            roleMappings: p.roleMappings.filter((m) => m.groupId !== g.id),
                          })
                        }
                      >
                        <Trash2 />
                      </HrIconActionButton>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
        {!readOnly ? (
          <div className="flex items-end gap-2">
            <HrOrgField label="New group">
              <Input value={groupName} onChange={(e) => setGroupName(e.target.value)} className="h-8 text-xs w-48" />
            </HrOrgField>
            <Button
              type="button"
              size="sm"
              className={hrBtn("gap-1.5")}
              onClick={() => {
                if (!groupName.trim()) return;
                set({
                  ...p,
                  groups: [...p.groups, { id: newGroupId(), name: groupName.trim(), active: true }],
                });
                setGroupName("");
              }}
            >
              <Plus className="w-3.5 h-3.5" /> Add Entitlement Group
            </Button>
          </div>
        ) : null}
      </SectionCard>

      <SectionCard title="Role mapping" hint="Search designations. Agronomist can inherit TM without duplicating rates.">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              <th className="px-3 py-2 text-left font-semibold">Role</th>
              <th className="px-3 py-2 text-left font-semibold">Entitlement Group</th>
              <th className="px-3 py-2 text-left font-semibold">Active</th>
              {!readOnly ? <th className="px-3 py-2 text-right font-semibold">Actions</th> : null}
            </tr>
          </thead>
          <tbody>
            {p.roleMappings.map((m) => (
              <tr key={m.id} className="border-b border-border/60">
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    m.designationName
                  ) : (
                    <Combo
                      value={m.designationId != null ? String(m.designationId) : m.designationName}
                      onChange={(v) => {
                        const d = designations.find((x) => String(x.id) === v);
                        set({
                          ...p,
                          roleMappings: p.roleMappings.map((x) =>
                            x.id === m.id
                              ? {
                                  ...x,
                                  designationId: d?.id ?? null,
                                  designationName: d?.name ?? v,
                                }
                              : x,
                          ),
                        });
                      }}
                      options={[
                        ...designations.map((d) => ({ value: String(d.id), label: d.name, hint: d.code })),
                        ...(m.designationId == null && m.designationName
                          ? [{ value: m.designationName, label: m.designationName }]
                          : []),
                      ].map((o) => ({ value: o.value, label: o.label }))}
                      placeholder="Designation"
                    />
                  )}
                </td>
                <td className="px-3 py-1.5">
                  <Combo
                    value={m.groupId}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({
                        ...p,
                        roleMappings: p.roleMappings.map((x) => (x.id === m.id ? { ...x, groupId: v } : x)),
                      })
                    }
                    options={p.groups.map((g) => ({ value: g.id, label: g.name }))}
                    placeholder="Group"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Switch
                    size="sm"
                    checked={m.active}
                    disabled={readOnly}
                    onCheckedChange={(v) =>
                      set({
                        ...p,
                        roleMappings: p.roleMappings.map((x) => (x.id === m.id ? { ...x, active: v } : x)),
                      })
                    }
                  />
                </td>
                {!readOnly ? (
                  <td className="px-3 py-1.5 text-right">
                    <HrIconActionButton
                      label="Remove"
                      destructive
                      onClick={() => set({ ...p, roleMappings: p.roleMappings.filter((x) => x.id !== m.id) })}
                    >
                      <Trash2 />
                    </HrIconActionButton>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                roleMappings: [
                  ...p.roleMappings,
                  {
                    id: newMappingId(),
                    designationId: null,
                    designationName: "",
                    groupId: p.groups[0]?.id || "",
                    active: true,
                  },
                ],
              })
            }
          >
            + Add role mapping
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}

function encodeCity(state: string, city: string) {
  return `${state}||${city}`;
}
function decodeCity(v: string): { state: string; city: string } {
  const [state, city] = v.split("||");
  return { state: state || "", city: city || v };
}

function CitySection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  const cityOptions = useMemo(() => {
    const out: { value: string; label: string; hint?: string }[] = [];
    for (const state of getActiveMockStateNames()) {
      for (const c of getCitiesForState(state).filter((x) => x.status === "active")) {
        out.push({ value: encodeCity(c.state, c.city), label: c.city, hint: c.state });
      }
    }
    return out;
  }, []);
  const [editId, setEditId] = useState<string | null>(null);

  return (
    <div className="space-y-3">
      <p className="text-[11px] text-muted-foreground">
        Cities come from the existing City master used by Sales Force. Unmapped cities use the fallback class.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {p.cityClasses.map((cls) => (
          <div key={cls.id} className="rounded-xl border border-border p-3 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-xs font-semibold">{cls.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {cls.isFallback ? "Fallback" : `${cls.cities.length} Cities`}
                  {!cls.active ? " · Inactive" : ""}
                </p>
              </div>
              {!readOnly ? (
                <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setEditId(cls.id)}>
                  Edit
                </button>
              ) : null}
            </div>
            {!cls.isFallback ? (
              <p className="text-[11px] text-muted-foreground line-clamp-2">{cls.cities.map((c) => c.city).join(", ") || "—"}</p>
            ) : (
              <p className="text-[11px] text-muted-foreground">Used when destination city is not mapped.</p>
            )}
          </div>
        ))}
      </div>
      {!readOnly ? (
        <button
          type="button"
          className="text-xs font-medium text-brand-600 hover:underline"
          onClick={() =>
            set({
              ...p,
              cityClasses: [
                ...p.cityClasses,
                { id: newClassId(), name: "New class", description: "", cities: [], isFallback: false, active: true },
              ],
            })
          }
        >
          + Add city classification
        </button>
      ) : null}

      {editId ? (
        <CityClassEditor
          cls={p.cityClasses.find((c) => c.id === editId)!}
          cityOptions={cityOptions}
          readOnly={readOnly}
          onClose={() => setEditId(null)}
          onSave={(next) => {
            const classes = p.cityClasses.map((c) => {
              if (c.id !== next.id) return next.isFallback ? { ...c, isFallback: false } : c;
              return next;
            });
            set({ ...p, cityClasses: classes });
            setEditId(null);
          }}
          onDelete={() => {
            set({ ...p, cityClasses: p.cityClasses.filter((c) => c.id !== editId) });
            setEditId(null);
          }}
        />
      ) : null}
    </div>
  );
}

function CityClassEditor({
  cls,
  cityOptions,
  readOnly,
  onClose,
  onSave,
  onDelete,
}: {
  cls: CityClass;
  cityOptions: { value: string; label: string; hint?: string }[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (c: CityClass) => void;
  onDelete: () => void;
}) {
  const [form, setForm] = useState<CityClass>(cls);
  return (
    <SectionCard title={`Edit — ${cls.name}`} actions={<button type="button" className="text-xs text-muted-foreground" onClick={onClose}>Close</button>}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <HrOrgField label="Category Name">
          <Input value={form.name} disabled={readOnly} onChange={(e) => setForm({ ...form, name: e.target.value })} className={hrInput()} />
        </HrOrgField>
        <HrOrgField label="Description">
          <Input value={form.description} disabled={readOnly} onChange={(e) => setForm({ ...form, description: e.target.value })} className={hrInput()} />
        </HrOrgField>
        <div className="md:col-span-2">
          <ToggleRow label="Active" checked={form.active} disabled={readOnly} onChange={(v) => setForm({ ...form, active: v })} />
        </div>
        <div className="md:col-span-2">
          <ToggleRow
            label="Default fallback"
            hint="Only one classification may be fallback. Unmapped cities use this class."
            checked={form.isFallback}
            disabled={readOnly}
            onChange={(v) => setForm({ ...form, isFallback: v })}
          />
        </div>
        {!form.isFallback ? (
          <HrOrgField label="Cities" size="full">
            <ChipMultiSelect
              values={form.cities.map((c) => encodeCity(c.state, c.city))}
              disabled={readOnly}
              options={cityOptions}
              placeholder="Search and select cities…"
              onChange={(vals) => setForm({ ...form, cities: vals.map(decodeCity) })}
            />
          </HrOrgField>
        ) : null}
      </div>
      {!readOnly ? (
        <div className="flex justify-end gap-2">
          <Button variant="outline" size="sm" className={hrBtn("text-red-600")} onClick={onDelete}>
            Delete class
          </Button>
          <Button size="sm" className={hrBtn("", true)} onClick={() => onSave(form)}>
            Save class
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}

function ExHqSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Ex-HQ definition" hint="HQ / Ex-HQ / overnight / official tour are policy concepts — employees do not configure them.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <HrOrgField label="Ex-HQ Distance Threshold (KM)">
            <Num value={p.exHq.distanceThresholdKm} disabled={readOnly} onChange={(n) => set({ ...p, exHq: { ...p.exHq, distanceThresholdKm: n } })} />
          </HrOrgField>
          <HrOrgField label="Distance basis">
            <Combo
              value={p.exHq.distanceBasis}
              disabled={readOnly}
              onChange={(v) => set({ ...p, exHq: { ...p.exHq, distanceBasis: v as "one_way" | "round_trip" } })}
              options={[
                { value: "one_way", label: "One Way" },
                { value: "round_trip", label: "Round Trip" },
              ]}
            />
          </HrOrgField>
          <ToggleRow
            label="Overnight automatically treated as Ex-HQ"
            checked={p.exHq.overnightIsExHq}
            disabled={readOnly}
            onChange={(v) => set({ ...p, exHq: { ...p.exHq, overnightIsExHq: v } })}
          />
        </div>
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs font-semibold text-amber-800">Headquarters source</p>
          <p className="text-[11px] text-amber-800/90 mt-0.5 leading-relaxed">
            This product does not store a dedicated Employee Headquarters field. The resolver currently uses the
            employee&apos;s assigned Branch city when Branch master has a city, otherwise Ex-HQ is evaluated from the
            claim distance against this threshold. Branch is not treated as HQ unless that city is present on the Branch
            record. Distance / GPS is not on the employee master — supply it on the claim.
          </p>
        </div>
      </SectionCard>
      <SectionCard title="Prior approval">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ToggleRow
            label="Prior Approval Required"
            checked={p.exHq.priorApprovalRequired}
            disabled={readOnly}
            onChange={(v) => set({ ...p, exHq: { ...p.exHq, priorApprovalRequired: v } })}
          />
          <HrOrgField label="Approver">
            <Combo
              value={p.exHq.approver1}
              disabled={readOnly}
              onChange={(v) => set({ ...p, exHq: { ...p.exHq, approver1: v as ApproverRole } })}
              options={APPROVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            />
          </HrOrgField>
          <HrOrgField label="Second-level approver">
            <Combo
              value={p.exHq.approver2 || ""}
              disabled={readOnly}
              onChange={(v) => set({ ...p, exHq: { ...p.exHq, approver2: (v as ApproverRole) || "" } })}
              options={[{ value: "", label: "None" }, ...APPROVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))]}
            />
          </HrOrgField>
        </div>
      </SectionCard>
      <SectionCard title="Mode of travel" hint="Rail class, air eligibility and destination conveyance by entitlement group.">
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-muted/40 border-b">
                {["Group", "Rail Class", "Air", "Air Class", "Air condition", "Min hours", "Air prior approval", "Destination conveyance"].map((h) => (
                  <th key={h} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {p.travelModes.map((row) => {
                const g = p.groups.find((x) => x.id === row.groupId);
                return (
                  <tr key={row.groupId} className="border-b border-border/60">
                    <td className="px-3 py-1.5 font-medium">{g?.name || row.groupId}</td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.railClass}
                        disabled={readOnly}
                        onChange={(e) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) => (x.groupId === row.groupId ? { ...x, railClass: e.target.value } : x)),
                          })
                        }
                        className="h-8 text-xs w-28"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Switch
                        size="sm"
                        checked={row.airAllowed}
                        disabled={readOnly}
                        onCheckedChange={(v) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) => (x.groupId === row.groupId ? { ...x, airAllowed: v } : x)),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.airClass}
                        disabled={readOnly}
                        onChange={(e) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) => (x.groupId === row.groupId ? { ...x, airClass: e.target.value } : x)),
                          })
                        }
                        className="h-8 text-xs w-24"
                      />
                    </td>
                    <td className="px-3 py-1.5 min-w-[11rem]">
                      <Combo
                        value={row.airTrigger}
                        disabled={readOnly}
                        onChange={(v) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) =>
                              x.groupId === row.groupId ? { ...x, airTrigger: v as AirEligibilityTrigger } : x,
                            ),
                          })
                        }
                        options={[
                          { value: "always", label: "Always Allowed" },
                          { value: "journey_duration", label: "Journey Duration" },
                          { value: "manual_approval", label: "Manual Approval Only" },
                          { value: "not_allowed", label: "Not Allowed" },
                        ]}
                      />
                    </td>
                    <td className="px-3 py-1.5 w-24">
                      <Num
                        value={row.airMinJourneyHours}
                        disabled={readOnly || row.airTrigger !== "journey_duration"}
                        onChange={(n) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) => (x.groupId === row.groupId ? { ...x, airMinJourneyHours: n } : x)),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Switch
                        size="sm"
                        checked={row.airPriorApproval}
                        disabled={readOnly}
                        onCheckedChange={(v) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) => (x.groupId === row.groupId ? { ...x, airPriorApproval: v } : x)),
                          })
                        }
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={row.destinationConveyance}
                        disabled={readOnly}
                        onChange={(e) =>
                          set({
                            ...p,
                            travelModes: p.travelModes.map((x) =>
                              x.groupId === row.groupId ? { ...x, destinationConveyance: e.target.value } : x,
                            ),
                          })
                        }
                        className="h-8 text-xs w-36"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>
      <SectionCard title="Taxi / private conveyance">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <HrOrgField label="Shared/Public Taxi">
            <Combo
              value={p.taxi.sharedType}
              disabled={readOnly}
              onChange={(v) => set({ ...p, taxi: { ...p.taxi, sharedType: v as TaxiReimburseType } })}
              options={[
                { value: "actual", label: "Actual" },
                { value: "per_km", label: "Per KM" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="Rate per KM">
            <Num value={p.taxi.sharedRatePerKm} disabled={readOnly || p.taxi.sharedType !== "per_km"} onChange={(n) => set({ ...p, taxi: { ...p.taxi, sharedRatePerKm: n } })} />
          </HrOrgField>
          <ToggleRow
            label="Require Start / Destination / Approx KM"
            checked={p.taxi.requireStartDestKm}
            disabled={readOnly}
            onChange={(v) => set({ ...p, taxi: { ...p.taxi, requireStartDestKm: v } })}
          />
          <HrOrgField label="Private Taxi">
            <Combo
              value={p.taxi.privateType}
              disabled={readOnly}
              onChange={(v) => set({ ...p, taxi: { ...p.taxi, privateType: v as PrivateTaxiType } })}
              options={[
                { value: "actual_against_bill", label: "Actual Against Bill" },
                { value: "fixed_limit", label: "Fixed Limit" },
                { value: "not_allowed", label: "Not Allowed" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="Private taxi fixed limit">
            <Num value={p.taxi.privateFixedLimit} disabled={readOnly || p.taxi.privateType !== "fixed_limit"} onChange={(n) => set({ ...p, taxi: { ...p.taxi, privateFixedLimit: n } })} />
          </HrOrgField>
          <ToggleRow label="Private taxi bill required" checked={p.taxi.privateBillRequired} disabled={readOnly} onChange={(v) => set({ ...p, taxi: { ...p.taxi, privateBillRequired: v } })} />
        </div>
      </SectionCard>
      <SectionCard title="Own vehicle for Ex-HQ" hint="Can reuse KM reimbursement rates.">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              {["Vehicle", "Allowed", "Use shared KM rate", "Rate / KM", "Prior approval"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.ownVehicleExHq.map((row, i) => (
              <tr key={row.vehicleType} className="border-b">
                <td className="px-3 py-1.5">{row.vehicleType}</td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={row.allowed} disabled={readOnly} onCheckedChange={(v) => {
                    const ownVehicleExHq = [...p.ownVehicleExHq];
                    ownVehicleExHq[i] = { ...row, allowed: v };
                    set({ ...p, ownVehicleExHq });
                  }} />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={row.useSharedKmRate} disabled={readOnly} onCheckedChange={(v) => {
                    const ownVehicleExHq = [...p.ownVehicleExHq];
                    ownVehicleExHq[i] = { ...row, useSharedKmRate: v };
                    set({ ...p, ownVehicleExHq });
                  }} />
                </td>
                <td className="px-3 py-1.5 w-28">
                  <Num value={row.ratePerKm} disabled={readOnly || row.useSharedKmRate} onChange={(n) => {
                    const ownVehicleExHq = [...p.ownVehicleExHq];
                    ownVehicleExHq[i] = { ...row, ratePerKm: n };
                    set({ ...p, ownVehicleExHq });
                  }} />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={row.priorApprovalRequired} disabled={readOnly} onCheckedChange={(v) => {
                    const ownVehicleExHq = [...p.ownVehicleExHq];
                    ownVehicleExHq[i] = { ...row, priorApprovalRequired: v };
                    set({ ...p, ownVehicleExHq });
                  }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
    </div>
  );
}

function MatrixTable({
  p,
  readOnly,
  renderCell,
}: {
  p: TravelPolicy;
  readOnly: boolean;
  renderCell: (groupId: string, classId: string) => React.ReactNode;
}) {
  const groups = p.groups.filter((g) => g.active);
  const classes = p.cityClasses.filter((c) => c.active);
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b">
            <th className="px-3 py-2 text-left font-semibold">Group</th>
            {classes.map((c) => (
              <th key={c.id} className="px-3 py-2 text-left font-semibold whitespace-nowrap">
                {c.name}
                {c.isFallback ? <span className="text-[10px] text-muted-foreground font-normal"> · fallback</span> : null}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {groups.map((g) => (
            <tr key={g.id} className="border-b border-border/60">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{g.name}</td>
              {classes.map((c) => (
                <td key={c.id} className="px-3 py-2 align-top">
                  {renderCell(g.id, c.id)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LodgingSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  const [edit, setEdit] = useState<{ g: string; c: string } | null>(null);
  const cell = (g: string, c: string) => p.lodgingBoarding.find((x) => x.groupId === g && x.classId === c);
  return (
    <div className="space-y-3">
      <SectionCard title="Lodging & Boarding matrix" hint="Click a cell to edit lodging / boarding per day.">
        <MatrixTable
          p={p}
          readOnly={readOnly}
          renderCell={(g, c) => {
            const x = cell(g, c);
            return (
              <button
                type="button"
                disabled={readOnly}
                onClick={() => setEdit({ g, c })}
                className="text-left text-xs font-semibold text-brand-700 hover:underline disabled:no-underline disabled:text-foreground"
              >
                {x ? `${formatInr(x.lodgingLimit)} / ${formatInr(x.boardingLimit)}` : "—"}
              </button>
            );
          }}
        />
      </SectionCard>
      {edit ? (
        <SectionCard title="Edit cell">
          <div className="grid grid-cols-2 gap-3 max-w-md">
            <HrOrgField label="Lodging / day">
              <Num
                value={cell(edit.g, edit.c)?.lodgingLimit || 0}
                disabled={readOnly}
                onChange={(n) =>
                  set({
                    ...p,
                    lodgingBoarding: p.lodgingBoarding.map((x) =>
                      x.groupId === edit.g && x.classId === edit.c ? { ...x, lodgingLimit: n } : x,
                    ),
                  })
                }
              />
            </HrOrgField>
            <HrOrgField label="Boarding / day">
              <Num
                value={cell(edit.g, edit.c)?.boardingLimit || 0}
                disabled={readOnly}
                onChange={(n) =>
                  set({
                    ...p,
                    lodgingBoarding: p.lodgingBoarding.map((x) =>
                      x.groupId === edit.g && x.classId === edit.c ? { ...x, boardingLimit: n } : x,
                    ),
                  })
                }
              />
            </HrOrgField>
          </div>
          <button type="button" className="text-xs text-muted-foreground hover:underline" onClick={() => setEdit(null)}>
            Done
          </button>
        </SectionCard>
      ) : null}
      <SectionCard title="Lodging billing rules">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleRow label="Bill Required" checked={p.lodgingRules.billRequired} disabled={readOnly} onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, billRequired: v } })} />
          <ToggleRow label="Bill Must Be in Company Name" checked={p.lodgingRules.billInCompanyName} disabled={readOnly} onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, billInCompanyName: v } })} />
          <ToggleRow label="GSTIN Required on Hotel Bill" checked={p.lodgingRules.gstinRequired} disabled={readOnly} onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, gstinRequired: v } })} />
          <ToggleRow label="GST Reimbursed Separately" checked={p.lodgingRules.gstReimbursedSeparately} disabled={readOnly} onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, gstReimbursedSeparately: v } })} />
          <ToggleRow label="Exceptions Require Prior Approval" checked={p.lodgingRules.exceptionsRequirePriorApproval} disabled={readOnly} onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, exceptionsRequirePriorApproval: v } })} />
          <HrOrgField label="Shared room handling">
            <Combo
              value={p.lodgingRules.sharedRoomHandling}
              disabled={readOnly}
              onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, sharedRoomHandling: v as TravelPolicy["lodgingRules"]["sharedRoomHandling"] } })}
              options={[
                { value: "each_employee", label: "Each Employee May Claim" },
                { value: "single_claims_full", label: "Single Employee Claims Full Bill" },
                { value: "custom", label: "Custom" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="If claimed lodging > entitlement">
            <Combo
              value={p.lodgingRules.overLimitAction}
              disabled={readOnly}
              onChange={(v) => set({ ...p, lodgingRules: { ...p.lodgingRules, overLimitAction: v as OverLimitAction } })}
              options={[
                { value: "block", label: "Block" },
                { value: "allow_with_prior_approval", label: "Allow with Prior Approval" },
                { value: "allow_and_flag", label: "Allow and Flag Exception" },
              ]}
            />
          </HrOrgField>
        </div>
      </SectionCard>
    </div>
  );
}

function RelativesSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <SectionCard title="Flat allowance per night" hint="No hotel bill unless you turn billing on elsewhere. Use empty / 0 and mark N/A with a dash.">
      <MatrixTable
        p={p}
        readOnly={readOnly}
        renderCell={(g, c) => {
          const x = p.relativesStay.find((r) => r.groupId === g && r.classId === c);
          const na = x?.amountPerNight == null;
          return (
            <div className="flex items-center gap-1">
              {na ? (
                <span className="text-muted-foreground">—</span>
              ) : (
                <Num
                  value={x?.amountPerNight || 0}
                  disabled={readOnly}
                  onChange={(n) =>
                    set({
                      ...p,
                      relativesStay: p.relativesStay.map((r) =>
                        r.groupId === g && r.classId === c ? { ...r, amountPerNight: n } : r,
                      ),
                    })
                  }
                  className="w-24"
                />
              )}
              {!readOnly ? (
                <button
                  type="button"
                  className="text-[10px] text-brand-600"
                  onClick={() =>
                    set({
                      ...p,
                      relativesStay: p.relativesStay.map((r) =>
                        r.groupId === g && r.classId === c
                          ? { ...r, amountPerNight: na ? 0 : null }
                          : r,
                      ),
                    })
                  }
                >
                  {na ? "Enable" : "N/A"}
                </button>
              ) : null}
            </div>
          );
        }}
      />
    </SectionCard>
  );
}

function OvernightSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Duration slabs">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              {["From hours", "To hours", "Type", "Amount / %", "Actions"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.overnightSlabs.map((s) => (
              <tr key={s.id} className="border-b">
                <td className="px-3 py-1.5 w-24">
                  <Num
                    value={s.fromHours}
                    disabled={readOnly}
                    onChange={(n) =>
                      set({ ...p, overnightSlabs: p.overnightSlabs.map((x) => (x.id === s.id ? { ...x, fromHours: n } : x)) })
                    }
                  />
                </td>
                <td className="px-3 py-1.5 w-24">
                  <Num
                    value={s.toHours}
                    disabled={readOnly}
                    onChange={(n) =>
                      set({ ...p, overnightSlabs: p.overnightSlabs.map((x) => (x.id === s.id ? { ...x, toHours: n } : x)) })
                    }
                  />
                </td>
                <td className="px-3 py-1.5 min-w-[12rem]">
                  <Combo
                    value={s.reimburseType}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({
                        ...p,
                        overnightSlabs: p.overnightSlabs.map((x) =>
                          x.id === s.id ? { ...x, reimburseType: v as OvernightReimburseType } : x,
                        ),
                      })
                    }
                    options={[
                      { value: "fixed", label: "Fixed Amount" },
                      { value: "percent_boarding", label: "% of Boarding Allowance" },
                    ]}
                  />
                </td>
                <td className="px-3 py-1.5 w-28">
                  <Num
                    value={s.amount}
                    disabled={readOnly}
                    onChange={(n) =>
                      set({ ...p, overnightSlabs: p.overnightSlabs.map((x) => (x.id === s.id ? { ...x, amount: n } : x)) })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  {!readOnly ? (
                    <HrIconActionButton
                      label="Remove"
                      destructive
                      onClick={() => set({ ...p, overnightSlabs: p.overnightSlabs.filter((x) => x.id !== s.id) })}
                    >
                      <Trash2 />
                    </HrIconActionButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                overnightSlabs: [
                  ...p.overnightSlabs,
                  { id: newSlabId(), fromHours: 0, toHours: 1, reimburseType: "fixed", amount: 0 },
                ],
              })
            }
          >
            + Add slab
          </button>
        ) : null}
      </SectionCard>
      <SectionCard title="Exclusions for same overnight transit">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <ToggleRow label="Boarding claim allowed for same transit" checked={p.overnightExclusions.boardingSameTransit} disabled={readOnly} onChange={(v) => set({ ...p, overnightExclusions: { ...p.overnightExclusions, boardingSameTransit: v } })} />
          <ToggleRow label="Field daily conveyance allowed" checked={p.overnightExclusions.fieldConveyance} disabled={readOnly} onChange={(v) => set({ ...p, overnightExclusions: { ...p.overnightExclusions, fieldConveyance: v } })} />
          <ToggleRow label="Incidental allowed" checked={p.overnightExclusions.incidental} disabled={readOnly} onChange={(v) => set({ ...p, overnightExclusions: { ...p.overnightExclusions, incidental: v } })} />
        </div>
      </SectionCard>
    </div>
  );
}

function LocalSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Meals & travel mode by group">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              {["Group", "Meals & Misc / day", "Bills", "Non-peak mode", "Peak / Odd hours mode"].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.localTravel.map((row) => (
              <tr key={row.groupId} className="border-b">
                <td className="px-3 py-1.5 font-medium">{p.groups.find((g) => g.id === row.groupId)?.name}</td>
                <td className="px-3 py-1.5 w-28">
                  <Num
                    value={row.mealsMiscPerDay}
                    disabled={readOnly}
                    onChange={(n) =>
                      set({ ...p, localTravel: p.localTravel.map((x) => (x.groupId === row.groupId ? { ...x, mealsMiscPerDay: n } : x)) })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Switch
                    size="sm"
                    checked={row.mealsBillsRequired}
                    disabled={readOnly}
                    onCheckedChange={(v) =>
                      set({
                        ...p,
                        localTravel: p.localTravel.map((x) => (x.groupId === row.groupId ? { ...x, mealsBillsRequired: v } : x)),
                      })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    value={row.nonPeakMode}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({ ...p, localTravel: p.localTravel.map((x) => (x.groupId === row.groupId ? { ...x, nonPeakMode: e.target.value } : x)) })
                    }
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Input
                    value={row.peakOddMode}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({ ...p, localTravel: p.localTravel.map((x) => (x.groupId === row.groupId ? { ...x, peakOddMode: e.target.value } : x)) })
                    }
                    className="h-8 text-xs"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>
      <SectionCard title="Peak / Odd hour bands" hint="Gender is taken from the employee profile — not asked on the claim.">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              {["Category", "Applicability", "Start", "End", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.timeBands.map((b) => (
              <tr key={b.id} className="border-b">
                <td className="px-3 py-1.5 min-w-[8rem]">
                  <Combo
                    value={b.category}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({ ...p, timeBands: p.timeBands.map((x) => (x.id === b.id ? { ...x, category: v as TimeBandCategory } : x)) })
                    }
                    options={[
                      { value: "peak", label: "Peak Hours" },
                      { value: "odd", label: "Odd Hours" },
                    ]}
                  />
                </td>
                <td className="px-3 py-1.5 min-w-[8rem]">
                  <Combo
                    value={b.applicability}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({
                        ...p,
                        timeBands: p.timeBands.map((x) => (x.id === b.id ? { ...x, applicability: v as TimeBandApplicability } : x)),
                      })
                    }
                    options={[
                      { value: "all", label: "All" },
                      { value: "male", label: "Male" },
                      { value: "female", label: "Female" },
                    ]}
                  />
                </td>
                <td className="px-3 py-1.5 w-28">
                  <Input
                    type="time"
                    value={b.startTime}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({ ...p, timeBands: p.timeBands.map((x) => (x.id === b.id ? { ...x, startTime: e.target.value } : x)) })
                    }
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-1.5 w-28">
                  <Input
                    type="time"
                    value={b.endTime}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({ ...p, timeBands: p.timeBands.map((x) => (x.id === b.id ? { ...x, endTime: e.target.value } : x)) })
                    }
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-1.5">
                  {!readOnly ? (
                    <HrIconActionButton
                      label="Remove"
                      destructive
                      onClick={() => set({ ...p, timeBands: p.timeBands.filter((x) => x.id !== b.id) })}
                    >
                      <Trash2 />
                    </HrIconActionButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                timeBands: [
                  ...p.timeBands,
                  { id: newBandId(), category: "peak", applicability: "all", startTime: "09:00", endTime: "10:00" },
                ],
              })
            }
          >
            + Add time band
          </button>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Odd Hours Safety Upgrade"
        hint="Explicit rule — do not imply this by editing each peak/odd mode row."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Odd Hours Safety Upgrade"
            hint="When on, matching employees receive a higher travel mode during odd hours."
            checked={p.oddHoursSafety.enabled}
            disabled={readOnly}
            onChange={(v) => set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, enabled: v } })}
          />
          <HrOrgField label="Applicability">
            <Combo
              value={p.oddHoursSafety.applicability}
              disabled={readOnly || !p.oddHoursSafety.enabled}
              onChange={(v) =>
                set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, applicability: v as TimeBandApplicability } })
              }
              options={[
                { value: "female", label: "Female" },
                { value: "male", label: "Male" },
                { value: "all", label: "All" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="Upgrade rule">
            <Combo
              value={p.oddHoursSafety.upgradeRule}
              disabled={readOnly || !p.oddHoursSafety.enabled}
              onChange={(v) =>
                set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, upgradeRule: v as OddHoursUpgradeRule } })
              }
              options={[
                { value: "one_level_higher", label: "One level higher on mode ladder" },
                { value: "specific_mode", label: "Specific travel mode" },
                { value: "custom", label: "Custom text" },
              ]}
            />
          </HrOrgField>
          {p.oddHoursSafety.upgradeRule === "specific_mode" ? (
            <HrOrgField label="Specific mode">
              <Input
                value={p.oddHoursSafety.specificMode}
                disabled={readOnly || !p.oddHoursSafety.enabled}
                onChange={(e) => set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, specificMode: e.target.value } })}
                className={hrInput()}
                placeholder="e.g. Private Taxi"
              />
            </HrOrgField>
          ) : null}
          {p.oddHoursSafety.upgradeRule === "custom" ? (
            <HrOrgField label="Custom rule" size="full">
              <Input
                value={p.oddHoursSafety.customNote}
                disabled={readOnly || !p.oddHoursSafety.enabled}
                onChange={(e) => set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, customNote: e.target.value } })}
                className={hrInput()}
                placeholder="Describe the upgraded entitlement"
              />
            </HrOrgField>
          ) : null}
        </div>
        <HrOrgField label="Travel mode ladder (lowest → highest)" size="full">
          <p className="text-[11px] text-muted-foreground mb-1.5">
            Used when upgrade rule is One Level Higher. Match names to Non-peak / Peak-Odd modes above.
          </p>
          <Input
            value={(p.modeLadder || []).join(", ")}
            disabled={readOnly}
            onChange={(e) =>
              set({
                ...p,
                modeLadder: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className={hrInput()}
            placeholder="Auto, Shared Taxi, Bus, Sleeper, 3AC…"
          />
        </HrOrgField>
      </SectionCard>
    </div>
  );
}

function FieldSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Field conveyance matrix">
        <MatrixTable
          p={p}
          readOnly={readOnly}
          renderCell={(g, c) => {
            const x = p.fieldConveyance.find((r) => r.groupId === g && r.classId === c);
            if (!x) return "—";
            return (
              <div className="space-y-1 min-w-[9rem]">
                <Combo
                  value={x.allowanceType}
                  disabled={readOnly}
                  onChange={(v) =>
                    set({
                      ...p,
                      fieldConveyance: p.fieldConveyance.map((r) =>
                        r.groupId === g && r.classId === c ? { ...r, allowanceType: v as FieldAllowanceType } : r,
                      ),
                    })
                  }
                  options={[
                    { value: "fixed", label: "Fixed" },
                    { value: "actual", label: "Actual" },
                  ]}
                />
                {x.allowanceType === "fixed" ? (
                  <Num
                    value={x.amount}
                    disabled={readOnly}
                    onChange={(n) =>
                      set({
                        ...p,
                        fieldConveyance: p.fieldConveyance.map((r) =>
                          r.groupId === g && r.classId === c ? { ...r, amount: n } : r,
                        ),
                      })
                    }
                  />
                ) : (
                  <p className="text-[11px] text-muted-foreground">Bill as configured</p>
                )}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Bills</span>
                  <Switch
                    size="sm"
                    checked={x.billsRequired}
                    disabled={readOnly}
                    onCheckedChange={(v) =>
                      set({
                        ...p,
                        fieldConveyance: p.fieldConveyance.map((r) =>
                          r.groupId === g && r.classId === c ? { ...r, billsRequired: v } : r,
                        ),
                      })
                    }
                  />
                </div>
              </div>
            );
          }}
        />
      </SectionCard>
      <SectionCard title="Applicability">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleRow label="HQ local field travel" checked={p.fieldApplicability.hqLocalFieldTravel} disabled={readOnly} onChange={(v) => set({ ...p, fieldApplicability: { ...p.fieldApplicability, hqLocalFieldTravel: v } })} />
          <ToggleRow label="Not payable during Ex-HQ tour" checked={p.fieldApplicability.notPayableDuringExHq} disabled={readOnly} onChange={(v) => set({ ...p, fieldApplicability: { ...p.fieldApplicability, notPayableDuringExHq: v } })} />
        </div>
      </SectionCard>
    </div>
  );
}

function KmSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Vehicle rates">
        <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-muted/40 border-b">
              {["Vehicle type", "₹ / KM", "Prior approval", "Monthly KM approval", "Bills", "Active", ""].map((h) => (
                <th key={h} className="px-3 py-2 text-left font-semibold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {p.kmRates.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="px-3 py-1.5">
                  <Input
                    value={r.vehicleType}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({ ...p, kmRates: p.kmRates.map((x) => (x.id === r.id ? { ...x, vehicleType: e.target.value } : x)) })
                    }
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-1.5 w-24">
                  <Num
                    value={r.ratePerKm}
                    disabled={readOnly}
                    onChange={(n) => set({ ...p, kmRates: p.kmRates.map((x) => (x.id === r.id ? { ...x, ratePerKm: n } : x)) })}
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={r.priorApprovalRequired} disabled={readOnly} onCheckedChange={(v) => set({ ...p, kmRates: p.kmRates.map((x) => (x.id === r.id ? { ...x, priorApprovalRequired: v } : x)) })} />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={r.monthlyKmApprovalRequired} disabled={readOnly} onCheckedChange={(v) => set({ ...p, kmRates: p.kmRates.map((x) => (x.id === r.id ? { ...x, monthlyKmApprovalRequired: v } : x)) })} />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={r.billsRequired} disabled={readOnly} onCheckedChange={(v) => set({ ...p, kmRates: p.kmRates.map((x) => (x.id === r.id ? { ...x, billsRequired: v } : x)) })} />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={r.active} disabled={readOnly} onCheckedChange={(v) => set({ ...p, kmRates: p.kmRates.map((x) => (x.id === r.id ? { ...x, active: v } : x)) })} />
                </td>
                <td className="px-3 py-1.5">
                  {!readOnly ? (
                    <HrIconActionButton label="Remove" destructive onClick={() => set({ ...p, kmRates: p.kmRates.filter((x) => x.id !== r.id) })}>
                      <Trash2 />
                    </HrIconActionButton>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                kmRates: [
                  ...p.kmRates,
                  {
                    id: newKmId(),
                    vehicleType: "Custom",
                    ratePerKm: 0,
                    priorApprovalRequired: false,
                    monthlyKmApprovalRequired: false,
                    billsRequired: false,
                    active: true,
                  },
                ],
              })
            }
          >
            + Add vehicle type
          </button>
        ) : null}
      </SectionCard>
      <SectionCard title="KM claim required fields">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {(
            [
              ["travelDate", "Travel Date"],
              ["startPoint", "Start Point"],
              ["destination", "Destination"],
              ["purpose", "Purpose of Visit"],
              ["kmTravelled", "KM Travelled"],
              ["startOdometer", "Start Odometer (optional)"],
              ["endOdometer", "End Odometer (optional)"],
              ["routeAttachment", "Route/Map attachment (optional)"],
            ] as const
          ).map(([k, label]) => (
            <ToggleRow
              key={k}
              label={label}
              checked={p.kmClaimFields[k]}
              disabled={readOnly}
              onChange={(v) => set({ ...p, kmClaimFields: { ...p.kmClaimFields, [k]: v } })}
            />
          ))}
        </div>
      </SectionCard>
      <SectionCard title="KM rules">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ToggleRow label="Monthly KM approval required" checked={p.kmRules.monthlyApprovalRequired} disabled={readOnly} onChange={(v) => set({ ...p, kmRules: { ...p.kmRules, monthlyApprovalRequired: v } })} />
          <HrOrgField label="If claimed KM differs from approved">
            <Combo
              value={p.kmRules.deviationAction}
              disabled={readOnly}
              onChange={(v) => set({ ...p, kmRules: { ...p.kmRules, deviationAction: v as TravelPolicy["kmRules"]["deviationAction"] } })}
              options={[
                { value: "block", label: "Block Submission" },
                { value: "require_exception", label: "Require Exception Approval" },
                { value: "allow_with_warning", label: "Allow with Warning" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="KM claims due by day of following month">
            <Num value={p.kmRules.dueDayOfFollowingMonth} disabled={readOnly} onChange={(n) => set({ ...p, kmRules: { ...p.kmRules, dueDayOfFollowingMonth: n } })} />
          </HrOrgField>
        </div>
      </SectionCard>
    </div>
  );
}

function IncidentalSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <SectionCard title="Incidental allowance" hint="Typically Ex-HQ, without vouchers.">
      <table className="w-full text-xs border border-border rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-muted/40 border-b">
            {["Group", "Amount / day", "Bills required", "Travel context"].map((h) => (
              <th key={h} className="px-3 py-2 text-left font-semibold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {p.incidentals.map((row) => (
            <tr key={row.groupId} className="border-b">
              <td className="px-3 py-1.5 font-medium">{p.groups.find((g) => g.id === row.groupId)?.name}</td>
              <td className="px-3 py-1.5 w-28">
                <Num
                  value={row.amountPerDay}
                  disabled={readOnly}
                  onChange={(n) =>
                    set({ ...p, incidentals: p.incidentals.map((x) => (x.groupId === row.groupId ? { ...x, amountPerDay: n } : x)) })
                  }
                />
              </td>
              <td className="px-3 py-1.5">
                <Switch
                  size="sm"
                  checked={row.billsRequired}
                  disabled={readOnly}
                  onCheckedChange={(v) =>
                    set({ ...p, incidentals: p.incidentals.map((x) => (x.groupId === row.groupId ? { ...x, billsRequired: v } : x)) })
                  }
                />
              </td>
              <td className="px-3 py-1.5">
                <Input
                  value={row.travelContext}
                  disabled={readOnly}
                  onChange={(e) =>
                    set({ ...p, incidentals: p.incidentals.map((x) => (x.groupId === row.groupId ? { ...x, travelContext: e.target.value } : x)) })
                  }
                  className="h-8 text-xs"
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </SectionCard>
  );
}

function ClaimsSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  return (
    <div className="space-y-3">
      <SectionCard title="Claim type rules">
        {p.claimRules.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 mb-2 space-y-2">
            <div className="flex items-center justify-between">
              <Input
                value={r.claimType}
                disabled={readOnly}
                onChange={(e) =>
                  set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, claimType: e.target.value } : x)) })
                }
                className="h-8 text-xs font-semibold max-w-xs"
              />
              {!readOnly ? (
                <HrIconActionButton
                  label="Remove"
                  destructive
                  onClick={() => set({ ...p, claimRules: p.claimRules.filter((x) => x.id !== r.id) })}
                >
                  <Trash2 />
                </HrIconActionButton>
              ) : null}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <HrOrgField label="Deadline method">
                <Combo
                  value={r.deadlineMethod}
                  disabled={readOnly}
                  onChange={(v) =>
                    set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, deadlineMethod: v as DeadlineMethod } : x)) })
                  }
                  options={[
                    { value: "within_days_of_completion", label: "Within X days of completion" },
                    { value: "by_day_of_following_month", label: "By X day of following month" },
                    { value: "whichever_earlier", label: "Whichever is earlier" },
                    { value: "absolute_max_days", label: "Absolute maximum X days" },
                  ]}
                />
              </HrOrgField>
              <HrOrgField label="Within days">
                <Num value={r.withinDays} disabled={readOnly} onChange={(n) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, withinDays: n } : x)) })} />
              </HrOrgField>
              <HrOrgField label="Following month day">
                <Num value={r.followingMonthDay} disabled={readOnly} onChange={(n) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, followingMonthDay: n } : x)) })} />
              </HrOrgField>
              <HrOrgField label="Absolute max days">
                <Num value={r.absoluteMaxDays} disabled={readOnly} onChange={(n) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, absoluteMaxDays: n } : x)) })} />
              </HrOrgField>
              <ToggleRow label="Bill required" checked={r.billRequired} disabled={readOnly} onChange={(v) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, billRequired: v } : x)) })} />
              <ToggleRow label="Original bill required" checked={r.originalBillRequired} disabled={readOnly} onChange={(v) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, originalBillRequired: v } : x)) })} />
              <ToggleRow label="Company name on bill" checked={r.companyNameOnBill} disabled={readOnly} onChange={(v) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, companyNameOnBill: v } : x)) })} />
              <ToggleRow label="GSTIN required" checked={r.gstinRequired} disabled={readOnly} onChange={(v) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, gstinRequired: v } : x)) })} />
              <ToggleRow label="Attachment required" checked={r.attachmentRequired} disabled={readOnly} onChange={(v) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, attachmentRequired: v } : x)) })} />
              <ToggleRow label="Prior approval required" checked={r.priorApprovalRequired} disabled={readOnly} onChange={(v) => set({ ...p, claimRules: p.claimRules.map((x) => (x.id === r.id ? { ...x, priorApprovalRequired: v } : x)) })} />
              <HrOrgField label="Exception handling">
                <Combo
                  value={r.exceptionHandling}
                  disabled={readOnly}
                  onChange={(v) =>
                    set({
                      ...p,
                      claimRules: p.claimRules.map((x) =>
                        x.id === r.id ? { ...x, exceptionHandling: v as OverLimitAction } : x,
                      ),
                    })
                  }
                  options={[
                    { value: "block", label: "Block" },
                    { value: "allow_with_prior_approval", label: "Allow with prior approval" },
                    { value: "allow_and_flag", label: "Allow and flag exception" },
                  ]}
                />
              </HrOrgField>
            </div>
          </div>
        ))}
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                claimRules: [...p.claimRules, blankClaimTypeRule(newClaimRuleId())],
              })
            }
          >
            + Add claim type
          </button>
        ) : null}
      </SectionCard>
      <SectionCard title="Maximum claim age">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
          <HrOrgField label="Claims older than (days)">
            <Num value={p.maxClaimAge.days} disabled={readOnly} onChange={(n) => set({ ...p, maxClaimAge: { ...p.maxClaimAge, days: n } })} />
          </HrOrgField>
          <HrOrgField label="Behaviour">
            <Combo
              value={p.maxClaimAge.action}
              disabled={readOnly}
              onChange={(v) => set({ ...p, maxClaimAge: { ...p.maxClaimAge, action: v as TravelPolicy["maxClaimAge"]["action"] } })}
              options={[
                { value: "block", label: "Block Submission" },
                { value: "warn", label: "Warn" },
                { value: "require_exception", label: "Require Exception Approval" },
              ]}
            />
          </HrOrgField>
        </div>
      </SectionCard>
      <SectionCard title="Global billing (only where claim type requires a bill)">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleRow label="Bill in Company Name" checked={p.billing.billInCompanyName} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, billInCompanyName: v } })} />
          <ToggleRow label="Original Bill Required" checked={p.billing.originalBillRequired} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, originalBillRequired: v } })} />
          <ToggleRow label="GSTIN Required" checked={p.billing.gstinRequired} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, gstinRequired: v } })} />
          <ToggleRow label="Attachment Mandatory" checked={p.billing.attachmentMandatory} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, attachmentMandatory: v } })} />
          <ToggleRow label="Approval Attachment Required" checked={p.billing.approvalAttachmentRequired} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, approvalAttachmentRequired: v } })} />
        </div>
      </SectionCard>
      <SectionCard title="Exceptions">
        {p.exceptions.map((ex) => (
          <div key={ex.id} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2">
            <Input
              value={ex.name}
              disabled={readOnly}
              onChange={(e) => set({ ...p, exceptions: p.exceptions.map((x) => (x.id === ex.id ? { ...x, name: e.target.value } : x)) })}
              className="h-8 text-xs w-48"
            />
            <ToggleRow label="Allowed" checked={ex.allowed} disabled={readOnly} onChange={(v) => set({ ...p, exceptions: p.exceptions.map((x) => (x.id === ex.id ? { ...x, allowed: v } : x)) })} />
            <ToggleRow label="Prior approval" checked={ex.requiresPriorApproval} disabled={readOnly} onChange={(v) => set({ ...p, exceptions: p.exceptions.map((x) => (x.id === ex.id ? { ...x, requiresPriorApproval: v } : x)) })} />
            <div className="min-w-[16rem] flex-1">
              <ChipMultiSelect
                values={ex.approvers}
                disabled={readOnly}
                options={APPROVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(vals) =>
                  set({
                    ...p,
                    exceptions: p.exceptions.map((x) => (x.id === ex.id ? { ...x, approvers: vals as ApproverRole[] } : x)),
                  })
                }
              />
            </div>
          </div>
        ))}
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                exceptions: [
                  ...p.exceptions,
                  { id: newExceptionId(), name: "New exception", allowed: true, requiresPriorApproval: true, approvers: ["reporting_manager"] },
                ],
              })
            }
          >
            + Add exception
          </button>
        ) : null}
      </SectionCard>
      <SectionCard title="Travel advance (policy only — no payment engine)">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ToggleRow label="Travel Advance Enabled" checked={p.travelAdvance.enabled} disabled={readOnly} onChange={(v) => set({ ...p, travelAdvance: { ...p.travelAdvance, enabled: v } })} />
          <HrOrgField label="Settlement within (days)">
            <Num value={p.travelAdvance.settlementDays} disabled={readOnly} onChange={(n) => set({ ...p, travelAdvance: { ...p.travelAdvance, settlementDays: n } })} />
          </HrOrgField>
          <ToggleRow label="Block new advance if previous unsettled" checked={p.travelAdvance.blockNewIfUnsettled} disabled={readOnly} onChange={(v) => set({ ...p, travelAdvance: { ...p.travelAdvance, blockNewIfUnsettled: v } })} />
        </div>
      </SectionCard>
      <SectionCard title="Approval chains">
        {p.approvalChains.map((ch) => (
          <p key={ch.id} className="text-xs">
            <span className="font-medium">{ch.name}:</span> {ch.steps.map(approverLabel).join(" → ")}
          </p>
        ))}
      </SectionCard>
    </div>
  );
}

function ExclusionsSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  const typeOptions = p.claimRules.map((r) => ({ value: r.claimType, label: r.claimType }));
  return (
    <div className="space-y-3">
      <SectionCard
        title="Non-reimbursable expenses"
        hint="Configurable exclusions for claims. Empty claim-type list means all types."
      >
        {(p.exclusions || []).map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-3 mb-2 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                <HrOrgField label="Name">
                  <Input
                    value={row.name}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({
                        ...p,
                        exclusions: p.exclusions.map((x) => (x.id === row.id ? { ...x, name: e.target.value } : x)),
                      })
                    }
                    className="h-8 text-xs"
                  />
                </HrOrgField>
                <HrOrgField label="Action">
                  <Combo
                    value={row.action}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({
                        ...p,
                        exclusions: p.exclusions.map((x) =>
                          x.id === row.id ? { ...x, action: v as ExclusionAction } : x,
                        ),
                      })
                    }
                    options={[
                      { value: "block", label: "Block" },
                      { value: "warn", label: "Warning" },
                    ]}
                  />
                </HrOrgField>
                <HrOrgField label="Description" size="full">
                  <Textarea
                    value={row.description}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({
                        ...p,
                        exclusions: p.exclusions.map((x) =>
                          x.id === row.id ? { ...x, description: e.target.value } : x,
                        ),
                      })
                    }
                    rows={2}
                    className="text-sm"
                  />
                </HrOrgField>
                <HrOrgField label="Claim types (empty = all)" size="full">
                  <ChipMultiSelect
                    values={row.claimTypes}
                    disabled={readOnly}
                    options={typeOptions}
                    onChange={(vals) =>
                      set({
                        ...p,
                        exclusions: p.exclusions.map((x) => (x.id === row.id ? { ...x, claimTypes: vals } : x)),
                      })
                    }
                  />
                </HrOrgField>
              </div>
              <div className="flex flex-col items-end gap-2 pt-5">
                <ToggleRow
                  label="Active"
                  checked={row.active}
                  disabled={readOnly}
                  onChange={(v) =>
                    set({
                      ...p,
                      exclusions: p.exclusions.map((x) => (x.id === row.id ? { ...x, active: v } : x)),
                    })
                  }
                />
                {!readOnly ? (
                  <HrIconActionButton
                    label="Remove"
                    destructive
                    onClick={() => set({ ...p, exclusions: p.exclusions.filter((x) => x.id !== row.id) })}
                  >
                    <Trash2 />
                  </HrIconActionButton>
                ) : null}
              </div>
            </div>
          </div>
        ))}
        {!readOnly ? (
          <button
            type="button"
            className="text-xs font-medium text-brand-600 hover:underline"
            onClick={() =>
              set({
                ...p,
                exclusions: [
                  ...p.exclusions,
                  {
                    id: newExclusionId(),
                    name: "New exclusion",
                    description: "",
                    claimTypes: [],
                    action: "block",
                    active: true,
                  },
                ],
              })
            }
          >
            + Add exclusion
          </button>
        ) : null}
      </SectionCard>
    </div>
  );
}

function GuidanceSection({ p, set, readOnly }: { p: TravelPolicy; set: (p: TravelPolicy) => void; readOnly: boolean }) {
  const items = [...(p.guidance || [])].sort((a, b) => a.sortOrder - b.sortOrder);
  const move = (id: string, dir: -1 | 1) => {
    const target = p.guidance.find((g) => g.id === id);
    if (!target) return;
    const same = items.filter((g) => g.kind === target.kind);
    const i = same.findIndex((g) => g.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= same.length) return;
    const a = same[i]!;
    const b = same[j]!;
    set({
      ...p,
      guidance: p.guidance.map((g) => {
        if (g.id === a.id) return { ...g, sortOrder: b.sortOrder };
        if (g.id === b.id) return { ...g, sortOrder: a.sortOrder };
        return g;
      }),
    });
  };
  const kinds: { value: GuidanceKind; label: string }[] = [
    { value: "do", label: "Travel Do's" },
    { value: "dont", label: "Travel Don'ts" },
    { value: "instruction", label: "General Instructions" },
  ];

  return (
    <div className="space-y-3">
      <SectionCard
        title="Employee guidance"
        hint="Informational policy text for HR and future mobile display — not calculation rules."
      >
        {kinds.map((k) => (
          <div key={k.value} className="mb-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">{k.label}</p>
            {items
              .filter((g) => g.kind === k.value)
              .map((g) => (
                <div key={g.id} className="flex items-start gap-2 border-b border-border/60 py-2">
                  <Textarea
                    value={g.text}
                    disabled={readOnly}
                    onChange={(e) =>
                      set({
                        ...p,
                        guidance: p.guidance.map((x) => (x.id === g.id ? { ...x, text: e.target.value } : x)),
                      })
                    }
                    rows={2}
                    className="text-sm flex-1"
                  />
                  <div className="flex flex-col gap-1 pt-0.5">
                    <Switch
                      size="sm"
                      checked={g.active}
                      disabled={readOnly}
                      onCheckedChange={(v) =>
                        set({
                          ...p,
                          guidance: p.guidance.map((x) => (x.id === g.id ? { ...x, active: v } : x)),
                        })
                      }
                    />
                    {!readOnly ? (
                      <>
                        <HrIconActionButton label="Move up" onClick={() => move(g.id, -1)}>
                          <ChevronUp />
                        </HrIconActionButton>
                        <HrIconActionButton label="Move down" onClick={() => move(g.id, 1)}>
                          <ChevronDown />
                        </HrIconActionButton>
                        <HrIconActionButton
                          label="Remove"
                          destructive
                          onClick={() => set({ ...p, guidance: p.guidance.filter((x) => x.id !== g.id) })}
                        >
                          <Trash2 />
                        </HrIconActionButton>
                      </>
                    ) : null}
                  </div>
                </div>
              ))}
            {!readOnly ? (
              <button
                type="button"
                className="text-xs font-medium text-brand-600 hover:underline mt-1"
                onClick={() =>
                  set({
                    ...p,
                    guidance: [
                      ...p.guidance,
                      {
                        id: newGuidanceId(),
                        kind: k.value,
                        text: "",
                        sortOrder: p.guidance.length + 1,
                        active: true,
                      },
                    ],
                  })
                }
              >
                + Add {k.label.toLowerCase()}
              </button>
            ) : null}
          </div>
        ))}
      </SectionCard>
    </div>
  );
}

function SummarySection({ p }: { p: TravelPolicy }) {
  const employees = loadHrEmployees().filter((e) => e.status === "active").slice(0, 12);
  const [empId, setEmpId] = useState(String(employees[0]?.id || ""));
  const [city, setCity] = useState("Mumbai");
  const [date, setDate] = useState(p.effectiveFrom || "2026-04-15");
  const [stay, setStay] = useState<"hotel" | "relatives_friends">("hotel");
  const [hours, setHours] = useState("7");
  const [km, setKm] = useState("100");
  const [vehicle, setVehicle] = useState("Two-Wheeler");
  const [lodging, setLodging] = useState("3500");
  const [time, setTime] = useState("09:30");
  const [distance, setDistance] = useState("80");
  const [oldDate, setOldDate] = useState("2020-01-01");

  const employee = employees.find((e) => String(e.id) === empId) ?? employees[0];
  const preview = employee
    ? getTravelEntitlement({
        employee,
        travelDate: date,
        city,
        stayType: stay,
        journeyHours: Number(hours),
        distanceKm: Number(distance),
        vehicleType: vehicle,
        timeOfDay: time,
        overnight: Number(hours) >= 18,
      })
    : null;
  const validation =
    employee && preview && !("error" in preview)
      ? validateTravelClaim({
          employee,
          travelDate: date,
          city,
          stayType: stay,
          lodgingAmount: Number(lodging),
          kmTravelled: Number(km),
          vehicleType: vehicle,
          startPoint: "HQ",
          destination: city,
          purpose: "Beat",
          distanceKm: Number(distance),
          overnight: Number(hours) >= 18,
          journeyHours: Number(hours),
        })
      : null;
  const oldPolicy = employee ? getApplicableTravelPolicy(employee, oldDate) : null;
  const cityClass = resolveCityClassification(p, city);
  const group = employee ? getEmployeeEntitlementGroup(p, employee) : null;

  return (
    <div className="space-y-3">
      <SectionCard title="Configuration snapshot">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
          <Stat label="Policy Name" value={p.name} />
          <Stat label="Policy Number" value={p.policyNumber || "—"} />
          <Stat
            label="Effective Period"
            value={p.effectiveTo ? `${p.effectiveFrom} → ${p.effectiveTo}` : `${p.effectiveFrom} → open`}
          />
          <Stat label="Current / Active" value={`${p.isCurrent ? "Current" : "Historical"} · ${p.status}`} />
          <Stat
            label="Roles Covered"
            value={p.roleMappings.filter((m) => m.active).map((m) => m.designationName).join(", ") || "—"}
          />
          <Stat label="Entitlement Groups" value={p.groups.filter((g) => g.active).map((g) => g.name).join(", ") || "—"} />
          <Stat
            label="City Classes"
            value={
              p.cityClasses.filter((c) => c.active).map((c) => `${c.name}${c.isFallback ? " (fallback)" : ""}`).join(", ") ||
              "—"
            }
          />
          <Stat
            label="Ex-HQ Threshold"
            value={`${p.exHq.distanceThresholdKm} KM ${p.exHq.distanceBasis.replace("_", " ")}`}
          />
          <Stat label="Prior Approval" value={p.exHq.priorApprovalRequired ? "Required" : "Off"} />
          <Stat
            label="Lodging Matrix"
            value={`${p.lodgingBoarding.filter((c) => c.lodgingLimit > 0 || c.boardingLimit > 0).length}/${p.lodgingBoarding.length} cells set`}
          />
          <Stat label="KM Rates Configured" value={String(p.kmRates.filter((k) => k.active).length)} />
          <Stat label="Overnight Slabs" value={String(p.overnightSlabs.length)} />
          <Stat
            label="Claim Deadline"
            value={
              p.claimRules[0]
                ? `${p.claimRules[0].claimType}: ${p.claimRules[0].deadlineMethod.replace(/_/g, " ")}`
                : "—"
            }
          />
          <Stat label="Maximum Claim Age" value={`${p.maxClaimAge.days} days · ${p.maxClaimAge.action.replace(/_/g, " ")}`} />
          <Stat
            label="Exception Approval"
            value={`${p.exceptions.filter((e) => e.allowed).length} allowed / ${p.exceptions.length}`}
          />
          <Stat
            label="Travel Advance"
            value={
              p.travelAdvance.enabled
                ? `On · settle ${p.travelAdvance.settlementDays}d`
                : "Off"
            }
          />
          <Stat label="Exclusions" value={String((p.exclusions || []).filter((e) => e.active).length)} />
          <Stat label="Guidance Items" value={String((p.guidance || []).filter((g) => g.active).length)} />
          <Stat label="Odd Hours Safety" value={p.oddHoursSafety?.enabled ? `On · ${p.oddHoursSafety.applicability}` : "Off"} />
          <Stat label="Approved By" value={p.approvedBy || "—"} />
          <Stat label="Policy Document" value={p.document?.fileName || "None"} />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Mode of travel: {p.travelModes.map((m) => `${p.groups.find((g) => g.id === m.groupId)?.name} air=${airTriggerLabel(m.airTrigger)}`).join(" · ")}
        </p>
      </SectionCard>

      <SectionCard title="Resolver preview" hint="Admin helper only — not a mobile claim form.">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
          <HrOrgField label="Employee">
            <Combo
              value={empId}
              onChange={setEmpId}
              options={employees.map((e) => ({ value: String(e.id), label: `${e.employeeName} · ${e.designation}` }))}
              placeholder="Employee"
            />
          </HrOrgField>
          <HrOrgField label="City">
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 text-xs" />
          </HrOrgField>
          <HrOrgField label="Travel date">
            <HrDateInput value={date} onChange={setDate} />
          </HrOrgField>
          <HrOrgField label="Stay">
            <Combo
              value={stay}
              onChange={(v) => setStay(v as "hotel" | "relatives_friends")}
              options={[
                { value: "hotel", label: "Hotel" },
                { value: "relatives_friends", label: "Stay with Relatives/Friends" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="Journey hours">
            <Input value={hours} onChange={(e) => setHours(e.target.value)} className="h-8 text-xs" />
          </HrOrgField>
          <HrOrgField label="Distance KM">
            <Input value={distance} onChange={(e) => setDistance(e.target.value)} className="h-8 text-xs" />
          </HrOrgField>
          <HrOrgField label="Vehicle">
            <Combo
              value={vehicle}
              onChange={setVehicle}
              options={p.kmRates.map((k) => ({ value: k.vehicleType, label: k.vehicleType }))}
            />
          </HrOrgField>
          <HrOrgField label="Local time">
            <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} className="h-8 text-xs" />
          </HrOrgField>
          <HrOrgField label="Claimed lodging">
            <Input value={lodging} onChange={(e) => setLodging(e.target.value)} className="h-8 text-xs" />
          </HrOrgField>
          <HrOrgField label="Claimed KM">
            <Input value={km} onChange={(e) => setKm(e.target.value)} className="h-8 text-xs" />
          </HrOrgField>
          <HrOrgField label="Older travel date (version test)">
            <HrDateInput value={oldDate} onChange={setOldDate} />
          </HrOrgField>
        </div>
        {employee ? (
          <div className="rounded-lg border border-border bg-muted/20 p-3 text-xs space-y-1">
            <p>
              <span className="text-muted-foreground">Group:</span> {group?.name || "Unmapped"} ·{" "}
              <span className="text-muted-foreground">City class:</span> {cityClass?.name || "—"}
            </p>
            {preview && "error" in preview ? (
              <p className="text-red-600">{preview.error}</p>
            ) : preview ? (
              <>
                {preview.guidance.map((g) => (
                  <p key={g.label}>
                    <span className="text-muted-foreground">{g.label}:</span> {g.value}
                  </p>
                ))}
                <p>
                  Overnight slab:{" "}
                  {preview.overnightSlab
                    ? `${preview.overnightSlab.fromHours}–${preview.overnightSlab.toHours}h → ${
                        preview.overnightAmount != null ? formatInr(preview.overnightAmount) : "—"
                      }`
                    : "—"}
                </p>
                <p>Local mode ({preview.timeCategory}): {preview.localMode || "—"}{preview.safetyUpgradeApplied ? " · safety upgrade" : ""}</p>
                <p className="text-[11px] text-muted-foreground">{preview.hqNote}</p>
              </>
            ) : null}
            {validation ? (
              <div className="pt-2">
                <p className="font-medium">{validation.ok ? "Validation: allowed" : "Validation: blocked"}</p>
                {validation.issues.map((i, idx) => (
                  <p key={idx} className={i.level === "block" ? "text-red-600" : i.level === "exception" ? "text-amber-700" : ""}>
                    [{i.level}] {i.message}
                  </p>
                ))}
              </div>
            ) : null}
            <p className="text-[11px] text-muted-foreground pt-1">
              Policy on {oldDate}: {oldPolicy ? `${oldPolicy.name} (${oldPolicy.effectiveFrom})` : "none"}
            </p>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">No active employees available for preview.</p>
        )}
      </SectionCard>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold mt-0.5">{value}</p>
    </div>
  );
}
