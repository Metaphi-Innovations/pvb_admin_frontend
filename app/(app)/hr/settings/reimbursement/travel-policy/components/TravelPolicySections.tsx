"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { HrOrgField, hrBtn, hrInput, HrIconActionButton } from "../../../organization/_components";
import {
  loadBranches,
  loadCompanyProfile,
  loadDepartments,
  loadDesignations,
  loadEmployeeTypes,
} from "@/app/(app)/hr/settings/organization-data";
import { getActiveMockStateNames, getCitiesForState } from "@/app/(app)/hr/sales-force-policy/stateCityMockData";
import { loadHrEmployees, type HrEmployee } from "@/app/(app)/hr/employees/employee-master-data";
import {
  APPROVER_OPTIONS,
  approverLabel,
  ensureMatrixCells,
  formatInr,
  newBandId,
  newClaimRuleId,
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
  type RoleMapping,
  type TimeBandApplicability,
  type TimeBandCategory,
  type TravelModeRow,
  type TravelPolicy,
} from "../travel-policy-data";
import {
  getTravelEntitlement,
} from "../travel-policy-resolver";
import { ChipMultiSelect, Combo, SectionCard, ToggleRow } from "./travel-policy-ui";

export const POLICY_SECTIONS = [
  { id: "general", label: "General" },
  { id: "applicability", label: "Applicability" },
  { id: "city", label: "City Classification" },
  { id: "exhq", label: "Ex-HQ Travel" },
  { id: "lodging", label: "Lodging & Boarding" },
  { id: "relatives", label: "Relatives / Friends Stay" },
  { id: "overnight", label: "Overnight Journey" },
  { id: "local", label: "Local / City Travel" },
  { id: "field", label: "Field Conveyance" },
  { id: "km", label: "Personal Vehicle / KM" },
  { id: "incidental", label: "Incidental Allowance" },
  { id: "claims", label: "Claim Rules" },
  { id: "approval", label: "Approval & Exceptions" },
  { id: "exclusions", label: "Exclusions" },
  { id: "guidance", label: "Employee Guidance" },
  { id: "summary", label: "Entitlement Preview" },
] as const;

export type PolicySectionId = (typeof POLICY_SECTIONS)[number]["id"];

type SetPolicy = (p: TravelPolicy) => void;

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
    case "general":
      return <GeneralSection p={p} set={set} readOnly={readOnly} />;
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
    case "approval":
      return <ApprovalExceptionsSection p={p} set={set} readOnly={readOnly} />;
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

/* ------------------------------------------------------------------ */
/* Small shared UI helpers                                              */
/* ------------------------------------------------------------------ */

const TABLE_CLASS = "w-full text-xs border border-border rounded-lg overflow-hidden";

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-3 py-2 text-left font-semibold whitespace-nowrap", className)}>{children}</th>;
}

function Num({
  value,
  onChange,
  disabled,
  className,
  prefix,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  disabled?: boolean;
  className?: string;
  prefix?: string;
  suffix?: string;
}) {
  const fmt = (n: number) => (Number.isFinite(n) ? String(n) : "");
  const [text, setText] = useState(fmt(value));
  useEffect(() => {
    if (Number(text || 0) !== value) setText(fmt(value));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const input = (
    <Input
      value={text}
      disabled={disabled}
      inputMode="decimal"
      onChange={(e) => {
        const cleaned = e.target.value.replace(/[^\d.]/g, "");
        setText(cleaned);
        onChange(Number(cleaned || 0) || 0);
      }}
      className={cn(
        "h-8 text-xs rounded-lg",
        prefix || suffix ? "w-full" : className,
        prefix && "pl-6",
        suffix && "pr-9",
      )}
    />
  );
  if (!prefix && !suffix) return input;
  return (
    <div className={cn("relative", className)}>
      {prefix ? (
        <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          {prefix}
        </span>
      ) : null}
      {input}
      {suffix ? (
        <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">
          {suffix}
        </span>
      ) : null}
    </div>
  );
}

function AddLink({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" className="text-xs font-medium text-brand-600 hover:underline" onClick={onClick}>
      {children}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted-foreground py-2">{children}</p>;
}

/* ------------------------------------------------------------------ */
/* Designation / entitlement helpers (display + mapping edits only)     */
/* ------------------------------------------------------------------ */

const norm = (s: string) => (s || "").trim().toLowerCase();

function matchScore(groupName: string, designationName: string): number {
  const g = norm(groupName);
  const d = norm(designationName);
  if (!g || !d) return 0;
  if (g === d) return 100;
  if (d.includes(g) || g.includes(d)) return 50;
  const gTokens = g.split(/[^a-z0-9]+/).filter((t) => t.length >= 2);
  const dTokens = d.split(/[^a-z0-9]+/).filter(Boolean);
  return gTokens.filter((t) => dTokens.includes(t)).length * 10;
}

/** The designation that "owns" a shared entitlement: best name match, else first active, else first. */
function primaryMapping(p: TravelPolicy, groupId: string): RoleMapping | undefined {
  const maps = p.roleMappings.filter((m) => m.groupId === groupId);
  if (!maps.length) return undefined;
  const g = p.groups.find((x) => x.id === groupId);
  let best: RoleMapping | undefined;
  let bestScore = -1;
  for (const m of maps) {
    const score = matchScore(g?.name || "", m.designationName) * 2 + (m.active ? 1 : 0);
    if (score > bestScore) {
      best = m;
      bestScore = score;
    }
  }
  return best;
}

function isOwnMapping(p: TravelPolicy, m: RoleMapping): boolean {
  return primaryMapping(p, m.groupId)?.id === m.id;
}

function designationNameFor(p: TravelPolicy, groupId: string): string {
  return primaryMapping(p, groupId)?.designationName || p.groups.find((g) => g.id === groupId)?.name || "—";
}

function otherDesignationsFor(p: TravelPolicy, groupId: string): string[] {
  const prim = primaryMapping(p, groupId);
  return p.roleMappings
    .filter((m) => m.groupId === groupId && m.id !== prim?.id && m.active && m.designationName)
    .map((m) => m.designationName);
}

function DesignationCell({ p, groupId }: { p: TravelPolicy; groupId: string }) {
  const others = otherDesignationsFor(p, groupId);
  return (
    <div>
      <p className="font-medium">{designationNameFor(p, groupId)}</p>
      {others.length ? (
        <p className="text-[11px] text-muted-foreground font-normal">Also applies to {others.join(", ")}</p>
      ) : null}
    </div>
  );
}

function cloneGroupRows(p: TravelPolicy, from: string, to: string): TravelPolicy {
  const cl = <T extends { groupId: string }>(rows: T[]): T[] => [
    ...rows,
    ...rows.filter((r) => r.groupId === from).map((r) => ({ ...r, groupId: to })),
  ];
  return {
    ...p,
    travelModes: cl(p.travelModes),
    localTravel: cl(p.localTravel),
    incidentals: cl(p.incidentals),
    lodgingBoarding: cl(p.lodgingBoarding),
    relativesStay: cl(p.relativesStay),
    fieldConveyance: cl(p.fieldConveyance),
  };
}

/** After a mapping leaves a group: drop the group if nobody uses it; otherwise keep its name meaningful. */
function settleGroup(p: TravelPolicy, groupId: string): TravelPolicy {
  if (p.roleMappings.some((m) => m.groupId === groupId)) {
    const prim = primaryMapping(p, groupId);
    const g = p.groups.find((x) => x.id === groupId);
    if (prim && g && matchScore(g.name, prim.designationName) === 0) {
      return { ...p, groups: p.groups.map((x) => (x.id === groupId ? { ...x, name: prim.designationName } : x)) };
    }
    return p;
  }
  return {
    ...p,
    groups: p.groups.filter((g) => g.id !== groupId),
    travelModes: p.travelModes.filter((r) => r.groupId !== groupId),
    localTravel: p.localTravel.filter((r) => r.groupId !== groupId),
    incidentals: p.incidentals.filter((r) => r.groupId !== groupId),
    lodgingBoarding: p.lodgingBoarding.filter((r) => r.groupId !== groupId),
    relativesStay: p.relativesStay.filter((r) => r.groupId !== groupId),
    fieldConveyance: p.fieldConveyance.filter((r) => r.groupId !== groupId),
  };
}

function addDesignationMapping(p: TravelPolicy, d: { id: number; name: string }): TravelPolicy {
  const existing = p.roleMappings.find(
    (m) => (m.designationId != null && m.designationId === d.id) || norm(m.designationName) === norm(d.name),
  );
  if (existing) {
    return {
      ...p,
      roleMappings: p.roleMappings.map((m) =>
        m.id === existing.id ? { ...m, designationId: d.id, designationName: d.name, active: true } : m,
      ),
    };
  }
  const gid = newGroupId();
  return {
    ...p,
    groups: [...p.groups, { id: gid, name: d.name, active: true }],
    roleMappings: [
      ...p.roleMappings,
      { id: newMappingId(), designationId: d.id, designationName: d.name, groupId: gid, active: true },
    ],
  };
}

function removeDesignationMapping(p: TravelPolicy, mappingId: string): TravelPolicy {
  const m = p.roleMappings.find((x) => x.id === mappingId);
  if (!m) return p;
  return settleGroup({ ...p, roleMappings: p.roleMappings.filter((x) => x.id !== mappingId) }, m.groupId);
}

function makeMappingOwn(p: TravelPolicy, mappingId: string): TravelPolicy {
  const m = p.roleMappings.find((x) => x.id === mappingId);
  if (!m || isOwnMapping(p, m)) return p;
  const oldGid = m.groupId;
  const gid = newGroupId();
  const next: TravelPolicy = {
    ...p,
    groups: [...p.groups, { id: gid, name: m.designationName || "Designation", active: true }],
    roleMappings: p.roleMappings.map((x) => (x.id === mappingId ? { ...x, groupId: gid } : x)),
  };
  // Start from the same rates so nothing is blank; HR can then change them.
  return cloneGroupRows(next, oldGid, gid);
}

function makeMappingSameAs(p: TravelPolicy, mappingId: string, targetMappingId: string): TravelPolicy {
  const m = p.roleMappings.find((x) => x.id === mappingId);
  const target = p.roleMappings.find((x) => x.id === targetMappingId);
  if (!m || !target || target.groupId === m.groupId) return p;
  const oldGid = m.groupId;
  const next: TravelPolicy = {
    ...p,
    roleMappings: p.roleMappings.map((x) => (x.id === mappingId ? { ...x, groupId: target.groupId } : x)),
  };
  return settleGroup(next, oldGid);
}

/* ------------------------------------------------------------------ */
/* A. General                                                           */
/* ------------------------------------------------------------------ */

function GeneralSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const hasMore = !!(p.approvedBy || p.approvalDate || p.internalRemark || p.document);
  const [showMore, setShowMore] = useState(hasMore);
  const moreVisible = showMore || (readOnly && hasMore);

  return (
    <div className="space-y-3">
      <SectionCard title="Policy Details">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <HrOrgField label="Policy Name" required>
            <Input value={p.name} disabled={readOnly} onChange={(e) => set({ ...p, name: e.target.value })} className={hrInput()} />
          </HrOrgField>
          {p.policyNumber ? (
            <HrOrgField label="Policy Number">
              <Input value={p.policyNumber} disabled readOnly className={hrInput()} />
            </HrOrgField>
          ) : null}
          <HrOrgField label="Effective From" required>
            <HrDateInput value={p.effectiveFrom} disabled={readOnly} onChange={(v) => set({ ...p, effectiveFrom: v })} />
          </HrOrgField>
          <HrOrgField label="Effective To">
            <HrDateInput value={p.effectiveTo} disabled={readOnly} onChange={(v) => set({ ...p, effectiveTo: v })} />
          </HrOrgField>
          <ToggleRow
            label="Active"
            checked={p.status === "active"}
            disabled={readOnly}
            onChange={(v) => set({ ...p, status: v ? "active" : "inactive", isCurrent: v ? p.isCurrent : false })}
          />
          <ToggleRow
            label="Use as default for new claims"
            hint="Only one default policy applies for an overlapping period."
            checked={p.isCurrent}
            disabled={readOnly || p.status !== "active"}
            onChange={(v) => set({ ...p, isCurrent: v })}
          />
          <HrOrgField label="Purpose / Description" size="full">
            <Textarea value={p.description} disabled={readOnly} onChange={(e) => set({ ...p, description: e.target.value })} rows={2} className="text-sm" />
          </HrOrgField>
        </div>
      </SectionCard>

      {!readOnly || hasMore ? (
        <SectionCard
          title="Approval record & document"
          hint="Optional — who approved this policy and the supporting document."
          actions={
            !readOnly ? (
              <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setShowMore((v) => !v)}>
                {moreVisible ? "Hide" : "Show"}
              </button>
            ) : undefined
          }
        >
          {moreVisible ? (
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
          ) : null}
        </SectionCard>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* B. Applicability                                                     */
/* ------------------------------------------------------------------ */

const OWN_VALUE = "__own__";

function ApplicabilitySection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const designations = useMemo(() => loadDesignations().filter((d) => d.status === "active"), []);
  const company = loadCompanyProfile();
  const branches = loadBranches().filter((b) => b.status === "active");
  const departments = loadDepartments().filter((d) => d.status === "active");
  const employeeTypes = loadEmployeeTypes().filter((t) => t.status === "active");
  const app = p.applicability ?? {
    companyAll: true,
    companies: [] as string[],
    branchAll: true,
    branches: [] as string[],
    departmentAll: true,
    departments: [] as string[],
    employeeTypeAll: true,
    employeeTypes: [] as string[],
  };

  const setApp = (patch: Partial<typeof app>) => set({ ...p, applicability: { ...app, ...patch } });

  const keyOf = (m: RoleMapping): string => {
    const d = designations.find(
      (x) => (m.designationId != null && x.id === m.designationId) || norm(x.name) === norm(m.designationName),
    );
    return d ? String(d.id) : m.designationName;
  };

  const designationOptions: { value: string; label: string; hint?: string }[] = designations.map((d) => ({
    value: String(d.id),
    label: d.name,
    hint: d.code,
  }));
  for (const m of p.roleMappings) {
    const k = keyOf(m);
    if (!designationOptions.some((o) => o.value === k)) designationOptions.push({ value: k, label: m.designationName });
  }
  const selectedKeys = Array.from(new Set(p.roleMappings.map(keyOf)));

  const handleSelect = (next: string[]) => {
    let cur = p;
    const removed = selectedKeys.filter((k) => !next.includes(k));
    const added = next.filter((k) => !selectedKeys.includes(k));
    for (const k of removed) {
      for (const m of cur.roleMappings.filter((x) => keyOf(x) === k)) {
        cur = removeDesignationMapping(cur, m.id);
      }
    }
    for (const k of added) {
      const d = designations.find((x) => String(x.id) === k);
      if (d) cur = addDesignationMapping(cur, d);
    }
    set(cur);
  };

  const ownMappings = p.groups
    .filter((g) => g.active)
    .map((g) => primaryMapping(p, g.id))
    .filter((m): m is RoleMapping => !!m);

  return (
    <div className="space-y-3">
      <SectionCard title="Policy Applies To" hint="Choose who this policy covers. Keep “All” on to cover everyone on that filter.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <ToggleRow
              label="Company — All"
              checked={app.companyAll}
              disabled={readOnly}
              onChange={(v) => setApp({ companyAll: v })}
            />
            {!app.companyAll ? (
              <ChipMultiSelect
                values={app.companies}
                disabled={readOnly}
                placeholder="Select company…"
                options={[{ value: company.companyName || company.legalName || "Company", label: company.companyName || company.legalName || "Company" }]}
                onChange={(companies) => setApp({ companies })}
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Branches — All"
              checked={app.branchAll}
              disabled={readOnly}
              onChange={(v) => setApp({ branchAll: v })}
            />
            {!app.branchAll ? (
              <ChipMultiSelect
                values={app.branches}
                disabled={readOnly}
                placeholder="Select branches…"
                options={branches.map((b) => ({ value: b.name, label: b.name, hint: b.code }))}
                onChange={(branches) => setApp({ branches })}
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Departments — All"
              checked={app.departmentAll}
              disabled={readOnly}
              onChange={(v) => setApp({ departmentAll: v })}
            />
            {!app.departmentAll ? (
              <ChipMultiSelect
                values={app.departments}
                disabled={readOnly}
                placeholder="Select departments…"
                options={departments.map((d) => ({ value: d.name, label: d.name, hint: d.code }))}
                onChange={(departments) => setApp({ departments })}
              />
            ) : null}
          </div>
          <div className="space-y-2">
            <ToggleRow
              label="Employee Types — All"
              checked={app.employeeTypeAll}
              disabled={readOnly}
              onChange={(v) => setApp({ employeeTypeAll: v })}
            />
            {!app.employeeTypeAll ? (
              <ChipMultiSelect
                values={app.employeeTypes}
                disabled={readOnly}
                placeholder="Select employee types…"
                options={employeeTypes.map((t) => ({ value: t.name, label: t.name, hint: t.code }))}
                onChange={(employeeTypes) => setApp({ employeeTypes })}
              />
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Applicable Designations"
        hint="Select from Organization → Designations. Choose Own entitlement or Same as another designation."
      >
        {!readOnly ? (
          <ChipMultiSelect
            values={selectedKeys}
            options={designationOptions}
            placeholder="Select designations…"
            onChange={handleSelect}
          />
        ) : null}

        {p.roleMappings.length === 0 ? (
          <Empty>No designations selected yet.</Empty>
        ) : (
          <table className={TABLE_CLASS}>
            <thead>
              <tr className="bg-muted/40 border-b">
                <Th>Designation</Th>
                <Th>Entitlement</Th>
                <Th>Active</Th>
              </tr>
            </thead>
            <tbody>
              {p.roleMappings.map((m) => {
                const own = isOwnMapping(p, m);
                const prim = primaryMapping(p, m.groupId);
                const sameAsOptions = ownMappings
                  .filter((o) => o.id !== m.id && (o.active || o.id === prim?.id))
                  .map((o) => ({ value: o.id, label: `Same as ${o.designationName}` }));
                return (
                  <tr key={m.id} className={cn("border-b border-border/60", !m.active && "opacity-60")}>
                    <td className="px-3 py-1.5 font-medium">{m.designationName || "—"}</td>
                    <td className="px-3 py-1.5 min-w-[14rem]">
                      {readOnly ? (
                        own ? "Own" : `Same as ${prim?.designationName ?? "—"}`
                      ) : (
                        <Combo
                          value={own ? OWN_VALUE : prim?.id ?? OWN_VALUE}
                          onChange={(v) =>
                            set(v === OWN_VALUE ? makeMappingOwn(p, m.id) : makeMappingSameAs(p, m.id, v))
                          }
                          options={[{ value: OWN_VALUE, label: "Own Entitlement" }, ...sameAsOptions]}
                        />
                      )}
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
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* D. City                                                              */
/* ------------------------------------------------------------------ */

function encodeCity(state: string, city: string) {
  return `${state}||${city}`;
}
function decodeCity(v: string): { state: string; city: string } {
  const [state, city] = v.split("||");
  return { state: state || "", city: city || v };
}

const OTHERS_TEXT = "Any location not included above";

function CitySection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
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
      <SectionCard
        title="City Categories"
        hint="Cities come from the City master. Lodging, boarding and field limits are set per category."
      >
        <table className={TABLE_CLASS}>
          <thead>
            <tr className="bg-muted/40 border-b">
              <Th>Category</Th>
              <Th>Cities</Th>
              {!readOnly ? <Th className="text-right">&nbsp;</Th> : null}
            </tr>
          </thead>
          <tbody>
            {p.cityClasses.map((cls) => (
              <tr key={cls.id} className={cn("border-b border-border/60 align-top", !cls.active && "opacity-60")}>
                <td className="px-3 py-2 font-medium whitespace-nowrap">
                  {cls.name}
                  {!cls.active ? <span className="ml-1.5 text-[11px] font-normal text-muted-foreground">Inactive</span> : null}
                </td>
                <td className="px-3 py-2 text-muted-foreground">
                  {cls.isFallback ? OTHERS_TEXT : cls.cities.map((c) => c.city).join(", ") || "—"}
                </td>
                {!readOnly ? (
                  <td className="px-3 py-2 text-right">
                    <button type="button" className="text-xs text-brand-600 hover:underline" onClick={() => setEditId(cls.id)}>
                      Edit
                    </button>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {editId && p.cityClasses.some((c) => c.id === editId) ? (
        <CityClassEditor
          key={editId}
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
}: {
  cls: CityClass;
  cityOptions: { value: string; label: string; hint?: string }[];
  readOnly: boolean;
  onClose: () => void;
  onSave: (c: CityClass) => void;
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
            label="Use for cities not listed above"
            hint="Applies to any city that is not listed under another category."
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
          <Button variant="outline" size="sm" className={hrBtn()} onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className={hrBtn("", true)} onClick={() => onSave(form)}>
            Save category
          </Button>
        </div>
      ) : null}
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* C. Ex-HQ                                                             */
/* ------------------------------------------------------------------ */

const airOn = (r: TravelModeRow) => r.airAllowed && r.airTrigger !== "not_allowed";

/** Reference row for the shared Air Travel Rule: first conditional air row, else first air row. */
function airReference(p: TravelPolicy): TravelModeRow | null {
  const on = p.travelModes.filter(airOn);
  return on.find((r) => r.airTrigger !== "always") ?? on[0] ?? null;
}

function airSummary(r: TravelModeRow): string {
  return airOn(r) ? `${r.airClass || "Economy"}*` : "Not allowed";
}

/**
 * Apply an air-rule change to travel mode rows.
 * - "all": every row that currently allows air
 * - "conditional": rows that allow air but are not "always allowed" (so e.g. NSM stays always allowed)
 * If nothing matches, falls back to enabled rows, then every row.
 */
function patchAirRows(
  p: TravelPolicy,
  patch: Partial<TravelModeRow>,
  scope: "all" | "conditional",
): TravelModeRow[] {
  const enabled = p.travelModes.filter(airOn);
  let targets = enabled;
  if (scope === "conditional") {
    const conditional = enabled.filter((r) => r.airTrigger !== "always");
    if (conditional.length) targets = conditional;
  }
  const ids = new Set((targets.length ? targets : p.travelModes).map((r) => r.groupId));
  return p.travelModes.map((r) => (ids.has(r.groupId) ? { ...r, ...patch } : r));
}

function ExHqSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const [addSecond, setAddSecond] = useState(false);
  const showSecond = !!p.exHq.approver2 || (addSecond && !readOnly);

  const updateMode = (groupId: string, patch: Partial<TravelModeRow>) =>
    set({ ...p, travelModes: p.travelModes.map((x) => (x.groupId === groupId ? { ...x, ...patch } : x)) });

  const ref = airReference(p);
  const trigger: AirEligibilityTrigger = ref ? ref.airTrigger : "not_allowed";
  const hours = ref?.airMinJourneyHours || 12;
  const anyAlways = p.travelModes.some((r) => airOn(r) && r.airTrigger === "always");

  const setTrigger = (v: AirEligibilityTrigger) => {
    if (v === "not_allowed") {
      set({ ...p, travelModes: p.travelModes.map((r) => ({ ...r, airAllowed: false, airTrigger: "not_allowed" as const })) });
    } else if (v === "always") {
      set({ ...p, travelModes: patchAirRows(p, { airAllowed: true, airTrigger: "always" }, "all") });
    } else if (v === "journey_duration") {
      set({ ...p, travelModes: patchAirRows(p, { airAllowed: true, airTrigger: v, airMinJourneyHours: hours }, "conditional") });
    } else {
      set({ ...p, travelModes: patchAirRows(p, { airAllowed: true, airTrigger: v, airPriorApproval: true }, "conditional") });
    }
  };

  const entitlementRows = p.roleMappings.filter((m) => m.active && p.groups.some((g) => g.id === m.groupId));

  return (
    <div className="space-y-3">
      <SectionCard title="When is travel considered Ex-HQ?">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <HrOrgField
            label="Distance from Headquarters"
            helper="Travel beyond this distance from the employee's Headquarters is treated as Ex-HQ."
          >
            <Num
              value={p.exHq.distanceThresholdKm}
              disabled={readOnly}
              suffix="KM"
              onChange={(n) => set({ ...p, exHq: { ...p.exHq, distanceThresholdKm: n, distanceBasis: "one_way" } })}
            />
          </HrOrgField>
          <ToggleRow
            label="Also treat overnight stay as Ex-HQ"
            checked={p.exHq.overnightIsExHq}
            disabled={readOnly}
            onChange={(v) => set({ ...p, exHq: { ...p.exHq, overnightIsExHq: v } })}
          />
        </div>
      </SectionCard>

      <SectionCard title="Approval">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
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
          {showSecond ? (
            <HrOrgField label="Additional Approver">
              <div className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <Combo
                    value={p.exHq.approver2 || ""}
                    disabled={readOnly}
                    placeholder="Select approver"
                    onChange={(v) => set({ ...p, exHq: { ...p.exHq, approver2: v as ApproverRole } })}
                    options={APPROVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                  />
                </div>
                {!readOnly ? (
                  <button
                    type="button"
                    className="text-xs text-red-600 hover:underline shrink-0"
                    onClick={() => {
                      setAddSecond(false);
                      set({ ...p, exHq: { ...p.exHq, approver2: "" } });
                    }}
                  >
                    Remove
                  </button>
                ) : null}
              </div>
            </HrOrgField>
          ) : !readOnly ? (
            <div className="flex items-end pb-1.5">
              <AddLink onClick={() => setAddSecond(true)}>+ Add additional approver</AddLink>
            </div>
          ) : null}
        </div>
      </SectionCard>

      <SectionCard
        title="Travel Entitlement"
        hint="Rail / bus class and travel at the destination, by designation."
      >
        {entitlementRows.length === 0 ? (
          <Empty>Add designations under Applicability to set their travel entitlement.</Empty>
        ) : (
          <>
            <div className="overflow-x-auto border border-border rounded-lg">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted/40 border-b">
                    <Th>Designation</Th>
                    <Th>Rail / Bus</Th>
                    <Th>Air Travel</Th>
                    <Th>Destination Travel</Th>
                  </tr>
                </thead>
                <tbody>
                  {entitlementRows.map((m) => {
                    const prim = primaryMapping(p, m.groupId);
                    const own = prim?.id === m.id;
                    const row = p.travelModes.find((x) => x.groupId === m.groupId);
                    if (!own || !row) {
                      const sameAs = `Same as ${prim?.designationName ?? "—"}`;
                      return (
                        <tr key={m.id} className="border-b border-border/60">
                          <td className="px-3 py-1.5 font-medium">{m.designationName}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{sameAs}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{sameAs}</td>
                          <td className="px-3 py-1.5 text-muted-foreground">{sameAs}</td>
                        </tr>
                      );
                    }
                    return (
                      <tr key={m.id} className="border-b border-border/60">
                        <td className="px-3 py-1.5 font-medium">{m.designationName}</td>
                        <td className="px-3 py-1.5">
                          {readOnly ? (
                            row.railClass || "—"
                          ) : (
                            <Input
                              value={row.railClass}
                              onChange={(e) => updateMode(row.groupId, { railClass: e.target.value })}
                              className="h-8 text-xs w-36"
                            />
                          )}
                        </td>
                        <td className="px-3 py-1.5 text-muted-foreground">{airSummary(row)}</td>
                        <td className="px-3 py-1.5">
                          {readOnly ? (
                            row.destinationConveyance || "—"
                          ) : (
                            <Input
                              value={row.destinationConveyance}
                              onChange={(e) => updateMode(row.groupId, { destinationConveyance: e.target.value })}
                              className="h-8 text-xs w-48"
                            />
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-muted-foreground">* Air travel follows the Air Travel Rule below.</p>
          </>
        )}
      </SectionCard>

      <SectionCard title="Air Travel Rule" hint="Applies to every designation that is allowed to travel by air.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <HrOrgField label="Allowed Class">
            <Input
              value={ref?.airClass ?? "Economy"}
              disabled={readOnly || !ref}
              onChange={(e) => set({ ...p, travelModes: patchAirRows(p, { airClass: e.target.value }, "all") })}
              className={hrInput()}
            />
          </HrOrgField>
          <HrOrgField label="When Allowed">
            <Combo
              value={trigger}
              disabled={readOnly}
              onChange={(v) => setTrigger(v as AirEligibilityTrigger)}
              options={[
                { value: "always", label: "Always" },
                { value: "journey_duration", label: `Road or rail journey exceeds ${hours} hours` },
                { value: "manual_approval", label: "Prior approval only" },
                { value: "not_allowed", label: "Not allowed" },
              ]}
            />
          </HrOrgField>
          {trigger === "journey_duration" ? (
            <HrOrgField label="Road / rail journey longer than">
              <Num
                value={ref?.airMinJourneyHours ?? 0}
                disabled={readOnly}
                suffix="hours"
                onChange={(n) => set({ ...p, travelModes: patchAirRows(p, { airMinJourneyHours: n }, "conditional") })}
              />
            </HrOrgField>
          ) : null}
          <ToggleRow
            label="Prior Approval Required"
            checked={trigger === "manual_approval" ? true : ref?.airPriorApproval ?? false}
            disabled={readOnly || !ref || trigger === "manual_approval" || trigger === "always"}
            onChange={(v) => set({ ...p, travelModes: patchAirRows(p, { airPriorApproval: v }, "conditional") })}
          />
          <HrOrgField label="Approver">
            <Input value={approverLabel(p.exHq.approver1)} disabled readOnly className={hrInput()} />
          </HrOrgField>
          <ToggleRow
            label="Lowest Available Fare"
            hint="Employees must book the lowest available fare."
            checked={ref?.lowestAvailableFareRequired ?? true}
            disabled={readOnly || !ref}
            onChange={(v) => set({ ...p, travelModes: patchAirRows(p, { lowestAvailableFareRequired: v }, "all") })}
          />
        </div>
        {anyAlways && trigger !== "always" ? (
          <p className="text-[11px] text-muted-foreground">
            Designations that are always allowed to fly keep that setting.
          </p>
        ) : null}
      </SectionCard>

      <SectionCard title="Destination Taxi Rates">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <HrOrgField label="Shared taxi">
            <Num
              value={p.taxi.sharedRatePerKm}
              disabled={readOnly}
              prefix="₹"
              suffix="/ KM"
              onChange={(n) => set({ ...p, taxi: { ...p.taxi, sharedType: "per_km", sharedRatePerKm: n } })}
            />
          </HrOrgField>
          <HrOrgField label="Private taxi">
            <Combo
              value={p.taxi.privateType}
              disabled={readOnly}
              onChange={(v) => set({ ...p, taxi: { ...p.taxi, privateType: v as PrivateTaxiType } })}
              options={[
                { value: "actual_against_bill", label: "Actuals against bill" },
                { value: "fixed_limit", label: "Up to a fixed limit" },
                { value: "not_allowed", label: "Not allowed" },
              ]}
            />
          </HrOrgField>
          {p.taxi.privateType === "fixed_limit" ? (
            <HrOrgField label="Private taxi limit">
              <Num
                value={p.taxi.privateFixedLimit}
                disabled={readOnly}
                prefix="₹"
                onChange={(n) => set({ ...p, taxi: { ...p.taxi, privateFixedLimit: n } })}
              />
            </HrOrgField>
          ) : null}
          {p.taxi.privateType !== "not_allowed" ? (
            <ToggleRow
              label="Private taxi bill required"
              checked={p.taxi.privateBillRequired}
              disabled={readOnly}
              onChange={(v) => set({ ...p, taxi: { ...p.taxi, privateBillRequired: v } })}
            />
          ) : null}
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* E. Lodging                                                           */
/* ------------------------------------------------------------------ */

/** Own entitlement rows + inherited (Same as) designation rows for matrix UIs. */
function entitlementDisplayRows(p: TravelPolicy): {
  mapping: RoleMapping;
  groupId: string;
  own: boolean;
  sameAsName: string | null;
}[] {
  return p.roleMappings
    .filter((m) => m.active && p.groups.some((g) => g.id === m.groupId && g.active))
    .map((m) => {
      const prim = primaryMapping(p, m.groupId);
      const own = prim?.id === m.id;
      return {
        mapping: m,
        groupId: m.groupId,
        own,
        sameAsName: own ? null : prim?.designationName ?? designationNameFor(p, m.groupId),
      };
    });
}

function LodgingAmountPopover({
  designation,
  cityLabel,
  lodging,
  boarding,
  open,
  onOpenChange,
  onApply,
  readOnly,
  children,
}: {
  designation: string;
  cityLabel: string;
  lodging: number;
  boarding: number;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onApply: (lodging: number, boarding: number) => void;
  readOnly: boolean;
  children: React.ReactNode;
}) {
  const [lod, setLod] = useState(lodging);
  const [board, setBoard] = useState(boarding);
  useEffect(() => {
    if (open) {
      setLod(lodging);
      setBoard(boarding);
    }
  }, [open, lodging, boarding]);

  if (readOnly) return <>{children}</>;

  return (
    <Popover open={open} onOpenChange={onOpenChange}>
      <PopoverTrigger asChild>{children}</PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-3 space-y-3">
        <div>
          <p className="text-xs font-semibold text-foreground">{designation}</p>
          <p className="text-[11px] text-muted-foreground">{cityLabel}</p>
        </div>
        <HrOrgField label="Lodging / Day">
          <Num value={lod} prefix="₹" onChange={setLod} />
        </HrOrgField>
        <HrOrgField label="Boarding / Day">
          <Num value={board} prefix="₹" onChange={setBoard} />
        </HrOrgField>
        <div className="flex justify-end gap-2 pt-1">
          <Button type="button" variant="outline" size="sm" className={hrBtn()} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={hrBtn("", true)}
            onClick={() => {
              onApply(lod, board);
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function MatrixTable({
  p,
  renderOwnCell,
  sameAsColSpan,
}: {
  p: TravelPolicy;
  renderOwnCell: (groupId: string, classId: string, designationName: string) => React.ReactNode;
  /** When set, Same-as rows span all city columns with this text pattern */
  sameAsColSpan?: boolean;
}) {
  const classes = p.cityClasses.filter((c) => c.active);
  const rows = entitlementDisplayRows(p);
  return (
    <div className="overflow-x-auto border border-border rounded-lg">
      <table className="w-full text-xs">
        <thead>
          <tr className="bg-muted/40 border-b">
            <Th>Designation</Th>
            {classes.map((c) => (
              <Th key={c.id}>{c.name}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(({ mapping, groupId, own, sameAsName }) => (
            <tr key={mapping.id} className="border-b border-border/60">
              <td className="px-3 py-2 font-medium whitespace-nowrap">{mapping.designationName}</td>
              {own ? (
                classes.map((c) => (
                  <td key={c.id} className="px-3 py-2 align-top">
                    {renderOwnCell(groupId, c.id, mapping.designationName)}
                  </td>
                ))
              ) : sameAsColSpan !== false ? (
                <td colSpan={Math.max(classes.length, 1)} className="px-3 py-2 text-muted-foreground">
                  Same as {sameAsName || "—"}
                </td>
              ) : (
                classes.map((c) => (
                  <td key={c.id} className="px-3 py-2 text-muted-foreground">
                    Same as {sameAsName || "—"}
                  </td>
                ))
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const OVER_LIMIT_OPTIONS: { value: OverLimitAction; label: string }[] = [
  { value: "block", label: "Do not allow" },
  { value: "allow_with_prior_approval", label: "Allow with prior approval" },
  { value: "allow_and_flag", label: "Allow and flag for review" },
];

function LodgingSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const [editKey, setEditKey] = useState<string | null>(null);
  const cell = (g: string, c: string) => p.lodgingBoarding.find((x) => x.groupId === g && x.classId === c);
  const setRules = (patch: Partial<TravelPolicy["lodgingRules"]>) => set({ ...p, lodgingRules: { ...p.lodgingRules, ...patch } });

  return (
    <div className="space-y-3">
      <SectionCard title="Hotel Bill Rules">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleRow label="Hotel Bill Required" checked={p.lodgingRules.billRequired} disabled={readOnly} onChange={(v) => setRules({ billRequired: v })} />
          <ToggleRow label="Bill Must Be in Company Name" checked={p.lodgingRules.billInCompanyName} disabled={readOnly} onChange={(v) => setRules({ billInCompanyName: v })} />
          <ToggleRow label="GST Reimbursed Separately" checked={p.lodgingRules.gstReimbursedSeparately} disabled={readOnly} onChange={(v) => setRules({ gstReimbursedSeparately: v })} />
          <ToggleRow label="Hotel GSTIN Required when GST is Charged" checked={p.lodgingRules.gstinRequired} disabled={readOnly} onChange={(v) => setRules({ gstinRequired: v })} />
        </div>
      </SectionCard>

      <SectionCard
        title="Lodging & Boarding Limits"
        hint={readOnly ? "Daily limits (₹) by designation and city category." : "Click a city cell to edit Lodging and Boarding for that designation."}
      >
        <MatrixTable
          p={p}
          renderOwnCell={(g, c, designationName) => {
            const x = cell(g, c);
            const cityLabel = p.cityClasses.find((cl) => cl.id === c)?.name ?? "";
            const key = `${g}::${c}`;
            return (
              <LodgingAmountPopover
                designation={designationName}
                cityLabel={cityLabel}
                lodging={x?.lodgingLimit ?? 0}
                boarding={x?.boardingLimit ?? 0}
                open={editKey === key}
                onOpenChange={(o) => setEditKey(o ? key : null)}
                readOnly={readOnly}
                onApply={(lodgingLimit, boardingLimit) => {
                  const exists = p.lodgingBoarding.some((r) => r.groupId === g && r.classId === c);
                  set({
                    ...p,
                    lodgingBoarding: exists
                      ? p.lodgingBoarding.map((r) =>
                          r.groupId === g && r.classId === c ? { ...r, lodgingLimit, boardingLimit } : r,
                        )
                      : [...p.lodgingBoarding, { groupId: g, classId: c, lodgingLimit, boardingLimit }],
                  });
                }}
              >
                <button
                  type="button"
                  disabled={readOnly}
                  className="text-left text-xs text-brand-700 hover:underline disabled:no-underline disabled:text-foreground disabled:cursor-default"
                >
                  {x ? (
                    <>
                      <span className="block font-semibold">Lodging {formatInr(x.lodgingLimit)}</span>
                      <span className="block text-[11px] font-normal text-muted-foreground">Boarding {formatInr(x.boardingLimit)}</span>
                    </>
                  ) : (
                    "—"
                  )}
                </button>
              </LodgingAmountPopover>
            );
          }}
        />
      </SectionCard>

      <SectionCard title="Other Lodging Rules">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Exceptions need prior approval"
            checked={p.lodgingRules.exceptionsRequirePriorApproval}
            disabled={readOnly}
            onChange={(v) => setRules({ exceptionsRequirePriorApproval: v })}
          />
          <HrOrgField label="When a room is shared">
            <Combo
              value={p.lodgingRules.sharedRoomHandling}
              disabled={readOnly}
              onChange={(v) => setRules({ sharedRoomHandling: v as TravelPolicy["lodgingRules"]["sharedRoomHandling"] })}
              options={[
                { value: "each_employee", label: "Each employee may claim" },
                { value: "single_claims_full", label: "One employee claims the full bill" },
                { value: "custom", label: "Decided case by case" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="If hotel cost is above the limit">
            <Combo
              value={p.lodgingRules.overLimitAction}
              disabled={readOnly}
              onChange={(v) => setRules({ overLimitAction: v as OverLimitAction })}
              options={OVER_LIMIT_OPTIONS}
            />
          </HrOrgField>
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* F. Relatives / friends                                               */
/* ------------------------------------------------------------------ */

function RelativesSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  return (
    <SectionCard
      title="Staying with Relatives / Friends"
      hint="Allowance payable instead of hotel lodging and boarding."
    >
      <MatrixTable
        p={p}
        renderOwnCell={(g, c) => {
          const x = p.relativesStay.find((r) => r.groupId === g && r.classId === c);
          const na = x?.amountPerNight == null;
          const update = (amountPerNight: number | null) => {
            const exists = p.relativesStay.some((r) => r.groupId === g && r.classId === c);
            set({
              ...p,
              relativesStay: exists
                ? p.relativesStay.map((r) => (r.groupId === g && r.classId === c ? { ...r, amountPerNight } : r))
                : [...p.relativesStay, { groupId: g, classId: c, amountPerNight }],
            });
          };
          if (readOnly) {
            return na ? (
              <span className="text-muted-foreground">Not Allowed</span>
            ) : (
              <span className="font-semibold">
                {formatInr(x?.amountPerNight || 0)}
                <span className="font-normal text-muted-foreground"> / night</span>
              </span>
            );
          }
          return (
            <div className="flex items-center gap-2 min-w-[8rem]">
              {na ? (
                <span className="text-muted-foreground">Not Allowed</span>
              ) : (
                <Num value={x?.amountPerNight || 0} prefix="₹" className="w-24" onChange={(n) => update(n)} />
              )}
              <button type="button" className="text-[11px] text-brand-600 hover:underline whitespace-nowrap" onClick={() => update(na ? 0 : null)}>
                {na ? "Set amount" : "Not Allowed"}
              </button>
            </div>
          );
        }}
      />
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* G. Overnight                                                         */
/* ------------------------------------------------------------------ */

function OvernightSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const updateSlab = (id: string, patch: Partial<TravelPolicy["overnightSlabs"][number]>) =>
    set({ ...p, overnightSlabs: p.overnightSlabs.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  const allowanceText = (type: OvernightReimburseType, amount: number) =>
    type === "percent_boarding" ? `${amount}% of Boarding Allowance` : formatInr(amount);

  return (
    <div className="space-y-3">
      <SectionCard title="Overnight Journey Allowance" hint="Allowance for long journeys, based on how long the journey takes.">
        <table className={TABLE_CLASS}>
          <thead>
            <tr className="bg-muted/40 border-b">
              <Th>Journey Duration</Th>
              <Th>Allowance</Th>
              {!readOnly ? <Th>&nbsp;</Th> : null}
            </tr>
          </thead>
          <tbody>
            {p.overnightSlabs.map((s) => (
              <tr key={s.id} className="border-b border-border/60">
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    `${s.fromHours} – ${s.toHours} hours`
                  ) : (
                    <div className="flex items-center gap-1.5">
                      <Num value={s.fromHours} className="w-16" onChange={(n) => updateSlab(s.id, { fromHours: n })} />
                      <span className="text-muted-foreground">to</span>
                      <Num value={s.toHours} className="w-16" onChange={(n) => updateSlab(s.id, { toHours: n })} />
                      <span className="text-muted-foreground">hours</span>
                    </div>
                  )}
                </td>
                <td className="px-3 py-1.5">
                  {readOnly ? (
                    allowanceText(s.reimburseType, s.amount)
                  ) : (
                    <div className="flex items-center gap-2">
                      <div className="w-52">
                        <Combo
                          value={s.reimburseType}
                          onChange={(v) => updateSlab(s.id, { reimburseType: v as OvernightReimburseType })}
                          options={[
                            { value: "fixed", label: "Fixed amount" },
                            { value: "percent_boarding", label: "Share of Boarding Allowance" },
                          ]}
                        />
                      </div>
                      <Num
                        value={s.amount}
                        className="w-24"
                        prefix={s.reimburseType === "fixed" ? "₹" : undefined}
                        suffix={s.reimburseType === "percent_boarding" ? "%" : undefined}
                        onChange={(n) => updateSlab(s.id, { amount: n })}
                      />
                    </div>
                  )}
                </td>
                {!readOnly ? (
                  <td className="px-3 py-1.5">
                    <HrIconActionButton
                      label="Remove"
                      destructive
                      onClick={() => set({ ...p, overnightSlabs: p.overnightSlabs.filter((x) => x.id !== s.id) })}
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
          <AddLink
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
            + Add journey duration
          </AddLink>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Claiming Along with Overnight Journey"
        hint="Switch off to stop these from being claimed together with the overnight journey allowance."
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <ToggleRow
            label="Boarding Allowance"
            checked={p.overnightExclusions.boardingSameTransit}
            disabled={readOnly}
            onChange={(v) => set({ ...p, overnightExclusions: { ...p.overnightExclusions, boardingSameTransit: v } })}
          />
          <ToggleRow
            label="Field Conveyance"
            checked={p.overnightExclusions.fieldConveyance}
            disabled={readOnly}
            onChange={(v) => set({ ...p, overnightExclusions: { ...p.overnightExclusions, fieldConveyance: v } })}
          />
          <ToggleRow
            label="Incidental Allowance"
            checked={p.overnightExclusions.incidental}
            disabled={readOnly}
            onChange={(v) => set({ ...p, overnightExclusions: { ...p.overnightExclusions, incidental: v } })}
          />
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* H. Local travel                                                      */
/* ------------------------------------------------------------------ */

const APPLICABILITY_OPTIONS: { value: TimeBandApplicability; label: string }[] = [
  { value: "all", label: "Everyone" },
  { value: "male", label: "Male employees" },
  { value: "female", label: "Female employees" },
];

function LocalSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const rows = entitlementDisplayRows(p);
  const update = (groupId: string, patch: Partial<TravelPolicy["localTravel"][number]>) =>
    set({ ...p, localTravel: p.localTravel.map((x) => (x.groupId === groupId ? { ...x, ...patch } : x)) });

  return (
    <div className="space-y-3">
      <SectionCard title="Meals & Local Travel" hint="Daily meals allowance and the local travel mode, by designation.">
        <div className="overflow-x-auto">
          <table className={TABLE_CLASS}>
            <thead>
              <tr className="bg-muted/40 border-b">
                <Th>Designation</Th>
                <Th>Meals & Misc / Day</Th>
                <Th>Normal Travel Mode</Th>
                <Th>Peak / Odd Hours Mode</Th>
              </tr>
            </thead>
            <tbody>
              {rows.map(({ mapping, groupId, own, sameAsName }) => {
                const row = p.localTravel.find((r) => r.groupId === groupId);
                if (!own) {
                  return (
                    <tr key={mapping.id} className="border-b border-border/60">
                      <td className="px-3 py-1.5 font-medium">{mapping.designationName}</td>
                      <td colSpan={3} className="px-3 py-1.5 text-muted-foreground">
                        Same as {sameAsName || "—"}
                      </td>
                    </tr>
                  );
                }
                return (
                  <tr key={mapping.id} className="border-b border-border/60">
                    <td className="px-3 py-1.5 font-medium">{mapping.designationName}</td>
                    <td className="px-3 py-1.5 w-32">
                      <Num
                        value={row?.mealsMiscPerDay ?? 0}
                        disabled={readOnly}
                        prefix="₹"
                        onChange={(n) => update(groupId, { mealsMiscPerDay: n })}
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={row?.nonPeakMode ?? ""}
                        disabled={readOnly}
                        onChange={(e) => update(groupId, { nonPeakMode: e.target.value })}
                        className="h-8 text-xs min-w-[10rem]"
                      />
                    </td>
                    <td className="px-3 py-1.5">
                      <Input
                        value={row?.peakOddMode ?? ""}
                        disabled={readOnly}
                        onChange={(e) => update(groupId, { peakOddMode: e.target.value })}
                        className="h-8 text-xs min-w-[10rem]"
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </SectionCard>

      <SectionCard title="Peak & Late-night Hours" hint="Gender is taken from the employee profile — not asked on the claim.">
        <table className={TABLE_CLASS}>
          <thead>
            <tr className="bg-muted/40 border-b">
              <Th>Type</Th>
              <Th>Applies to</Th>
              <Th>From</Th>
              <Th>To</Th>
              {!readOnly ? <Th>&nbsp;</Th> : null}
            </tr>
          </thead>
          <tbody>
            {p.timeBands.map((b) => (
              <tr key={b.id} className="border-b border-border/60">
                <td className="px-3 py-1.5 min-w-[9rem]">
                  <Combo
                    value={b.category}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({ ...p, timeBands: p.timeBands.map((x) => (x.id === b.id ? { ...x, category: v as TimeBandCategory } : x)) })
                    }
                    options={[
                      { value: "peak", label: "Peak hours" },
                      { value: "odd", label: "Late-night hours" },
                    ]}
                  />
                </td>
                <td className="px-3 py-1.5 min-w-[10rem]">
                  <Combo
                    value={b.applicability}
                    disabled={readOnly}
                    onChange={(v) =>
                      set({
                        ...p,
                        timeBands: p.timeBands.map((x) => (x.id === b.id ? { ...x, applicability: v as TimeBandApplicability } : x)),
                      })
                    }
                    options={APPLICABILITY_OPTIONS}
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
                {!readOnly ? (
                  <td className="px-3 py-1.5">
                    <HrIconActionButton
                      label="Remove"
                      destructive
                      onClick={() => set({ ...p, timeBands: p.timeBands.filter((x) => x.id !== b.id) })}
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
          <AddLink
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
            + Add time range
          </AddLink>
        ) : null}
      </SectionCard>

      <SectionCard
        title="Late-night Safety Upgrade"
        hint="Employees travelling during late-night hours get a safer, higher travel mode."
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <ToggleRow
            label="Safety upgrade for late-night travel"
            checked={p.oddHoursSafety.enabled}
            disabled={readOnly}
            onChange={(v) => set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, enabled: v } })}
          />
          <HrOrgField label="Applies to">
            <Combo
              value={p.oddHoursSafety.applicability}
              disabled={readOnly || !p.oddHoursSafety.enabled}
              onChange={(v) =>
                set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, applicability: v as TimeBandApplicability } })
              }
              options={APPLICABILITY_OPTIONS}
            />
          </HrOrgField>
          <HrOrgField label="Upgrade to">
            <Combo
              value={p.oddHoursSafety.upgradeRule}
              disabled={readOnly || !p.oddHoursSafety.enabled}
              onChange={(v) =>
                set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, upgradeRule: v as OddHoursUpgradeRule } })
              }
              options={[
                { value: "one_level_higher", label: "One step higher travel mode" },
                { value: "specific_mode", label: "A specific travel mode" },
                { value: "custom", label: "Custom note" },
              ]}
            />
          </HrOrgField>
          {p.oddHoursSafety.upgradeRule === "specific_mode" ? (
            <HrOrgField label="Travel mode">
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
            <HrOrgField label="Note" size="full">
              <Input
                value={p.oddHoursSafety.customNote}
                disabled={readOnly || !p.oddHoursSafety.enabled}
                onChange={(e) => set({ ...p, oddHoursSafety: { ...p.oddHoursSafety, customNote: e.target.value } })}
                className={hrInput()}
                placeholder="Describe the upgraded travel entitlement"
              />
            </HrOrgField>
          ) : null}
        </div>
        {p.oddHoursSafety.upgradeRule === "one_level_higher" ? (
          <HrOrgField
            label="Travel modes, lowest to highest"
            size="full"
            helper="Used for “one step higher”. Names should match the travel modes above."
          >
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
        ) : null}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Field conveyance                                                     */
/* ------------------------------------------------------------------ */

function FieldSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const updateCell = (g: string, c: string, patch: Partial<TravelPolicy["fieldConveyance"][number]>) => {
    const exists = p.fieldConveyance.some((r) => r.groupId === g && r.classId === c);
    if (exists) {
      set({
        ...p,
        fieldConveyance: p.fieldConveyance.map((r) => (r.groupId === g && r.classId === c ? { ...r, ...patch } : r)),
      });
      return;
    }
    set({
      ...p,
      fieldConveyance: [
        ...p.fieldConveyance,
        { groupId: g, classId: c, allowanceType: "fixed", amount: 0, billsRequired: false, ...patch },
      ],
    });
  };
  return (
    <div className="space-y-3">
      <SectionCard title="Field Conveyance" hint="Daily conveyance for local field work, by designation and city category.">
        <MatrixTable
          p={p}
          renderOwnCell={(g, c) => {
            const x = p.fieldConveyance.find((r) => r.groupId === g && r.classId === c);
            if (!x) return "—";
            if (readOnly) {
              return (
                <div>
                  <p className="font-semibold">
                    {x.allowanceType === "actual" ? "Actuals against bills" : `${formatInr(x.amount)} / day`}
                  </p>
                  <p className="text-[11px] text-muted-foreground">{x.billsRequired ? "Bills required" : "No bills needed"}</p>
                </div>
              );
            }
            return (
              <div className="space-y-1 min-w-[9rem]">
                <Combo
                  value={x.allowanceType}
                  onChange={(v) => updateCell(g, c, { allowanceType: v as FieldAllowanceType })}
                  options={[
                    { value: "fixed", label: "Fixed amount" },
                    { value: "actual", label: "Actuals against bills" },
                  ]}
                />
                {x.allowanceType === "fixed" ? (
                  <Num value={x.amount} prefix="₹" suffix="/ day" onChange={(n) => updateCell(g, c, { amount: n })} />
                ) : null}
                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-muted-foreground">Bills required</span>
                  <Switch size="sm" checked={x.billsRequired} onCheckedChange={(v) => updateCell(g, c, { billsRequired: v })} />
                </div>
              </div>
            );
          }}
        />
      </SectionCard>
      <SectionCard title="When Field Conveyance Applies">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleRow
            label="Payable for local field work at Headquarters"
            checked={p.fieldApplicability.hqLocalFieldTravel}
            disabled={readOnly}
            onChange={(v) => set({ ...p, fieldApplicability: { ...p.fieldApplicability, hqLocalFieldTravel: v } })}
          />
          <ToggleRow
            label="Not payable during Ex-HQ tours"
            hint="Field Conveyance does not apply during Ex-HQ official tours."
            checked={p.fieldApplicability.notPayableDuringExHq}
            disabled={readOnly}
            onChange={(v) => set({ ...p, fieldApplicability: { ...p.fieldApplicability, notPayableDuringExHq: v } })}
          />
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* KM                                                                   */
/* ------------------------------------------------------------------ */

function KmSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const updateRate = (id: string, patch: Partial<TravelPolicy["kmRates"][number]>) =>
    set({ ...p, kmRates: p.kmRates.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-3">
      <SectionCard title="Vehicle Rates" hint="Reimbursement per KM when an employee uses their own vehicle.">
        <table className={TABLE_CLASS}>
          <thead>
            <tr className="bg-muted/40 border-b">
              <Th>Vehicle</Th>
              <Th>Rate / KM</Th>
              <Th>Approval Required</Th>
              {!readOnly ? <Th>&nbsp;</Th> : null}
            </tr>
          </thead>
          <tbody>
            {p.kmRates.map((r) => (
              <tr key={r.id} className={cn("border-b border-border/60", !r.active && "opacity-60")}>
                <td className="px-3 py-1.5">
                  <Input
                    value={r.vehicleType}
                    disabled={readOnly}
                    onChange={(e) => updateRate(r.id, { vehicleType: e.target.value })}
                    className="h-8 text-xs"
                  />
                </td>
                <td className="px-3 py-1.5 w-32">
                  <Num value={r.ratePerKm} disabled={readOnly} prefix="₹" onChange={(n) => updateRate(r.id, { ratePerKm: n })} />
                </td>
                <td className="px-3 py-1.5">
                  <Switch size="sm" checked={r.priorApprovalRequired} disabled={readOnly} onCheckedChange={(v) => updateRate(r.id, { priorApprovalRequired: v })} />
                </td>
                {!readOnly ? (
                  <td className="px-3 py-1.5">
                    <HrIconActionButton label="Remove" destructive onClick={() => set({ ...p, kmRates: p.kmRates.filter((x) => x.id !== r.id) })}>
                      <Trash2 />
                    </HrIconActionButton>
                  </td>
                ) : null}
              </tr>
            ))}
          </tbody>
        </table>
        {!readOnly ? (
          <AddLink
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
            + Add vehicle
          </AddLink>
        ) : null}
      </SectionCard>
      <SectionCard title="Details Needed on a KM Claim">
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
              ["routeAttachment", "Route / Map attachment (optional)"],
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
      <SectionCard title="KM Claim Rules">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ToggleRow label="Monthly KM approval required" checked={p.kmRules.monthlyApprovalRequired} disabled={readOnly} onChange={(v) => set({ ...p, kmRules: { ...p.kmRules, monthlyApprovalRequired: v } })} />
          <HrOrgField label="If claimed KM differs from approved KM">
            <Combo
              value={p.kmRules.deviationAction}
              disabled={readOnly}
              onChange={(v) => set({ ...p, kmRules: { ...p.kmRules, deviationAction: v as TravelPolicy["kmRules"]["deviationAction"] } })}
              options={[
                { value: "block", label: "Do not allow submission" },
                { value: "require_exception", label: "Needs exception approval" },
                { value: "allow_with_warning", label: "Allow with a warning" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="Claim by day of next month">
            <Num value={p.kmRules.dueDayOfFollowingMonth} disabled={readOnly} onChange={(n) => set({ ...p, kmRules: { ...p.kmRules, dueDayOfFollowingMonth: n } })} />
          </HrOrgField>
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Incidental                                                           */
/* ------------------------------------------------------------------ */

function IncidentalSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const ownRows = entitlementDisplayRows(p).filter((r) => r.own);
  const amounts = ownRows
    .map((r) => p.incidentals.find((i) => i.groupId === r.groupId))
    .filter(Boolean);
  const allSame =
    amounts.length > 0 &&
    amounts.every(
      (a) => a!.amountPerDay === amounts[0]!.amountPerDay && a!.billsRequired === amounts[0]!.billsRequired,
    );
  const shared = amounts[0];

  const updateAll = (patch: Partial<TravelPolicy["incidentals"][number]>) => {
    const ids = new Set(ownRows.map((r) => r.groupId));
    set({
      ...p,
      incidentals: p.incidentals.map((x) => (ids.has(x.groupId) ? { ...x, ...patch } : x)),
    });
  };

  if (allSame && shared) {
    return (
      <SectionCard title="Incidental Allowance" hint="Small daily allowance for minor travel expenses.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-xl">
          <HrOrgField label="Ex-HQ Incidental Allowance">
            <Num
              value={shared.amountPerDay}
              disabled={readOnly}
              prefix="₹"
              suffix="/ day"
              onChange={(n) => updateAll({ amountPerDay: n })}
            />
          </HrOrgField>
          <ToggleRow
            label="Bills Required"
            checked={shared.billsRequired}
            disabled={readOnly}
            onChange={(v) => updateAll({ billsRequired: v })}
          />
        </div>
        <p className="text-[11px] text-muted-foreground mt-2">
          Applies to: All designations covered by this policy
          {p.overnightExclusions.incidental
            ? "."
            : ". Not payable for transit nights covered by Overnight Journey Allowance."}
        </p>
      </SectionCard>
    );
  }

  return (
    <SectionCard title="Incidental Allowance" hint="Small daily allowance for minor travel expenses.">
      <table className={TABLE_CLASS}>
        <thead>
          <tr className="bg-muted/40 border-b">
            <Th>Designation</Th>
            <Th>Amount per day</Th>
            <Th>Bills required</Th>
          </tr>
        </thead>
        <tbody>
          {entitlementDisplayRows(p).map(({ mapping, groupId, own, sameAsName }) => {
            if (!own) {
              return (
                <tr key={mapping.id} className="border-b border-border/60">
                  <td className="px-3 py-1.5 font-medium">{mapping.designationName}</td>
                  <td colSpan={2} className="px-3 py-1.5 text-muted-foreground">
                    Same as {sameAsName || "—"}
                  </td>
                </tr>
              );
            }
            const row = p.incidentals.find((r) => r.groupId === groupId);
            return (
              <tr key={mapping.id} className="border-b border-border/60">
                <td className="px-3 py-1.5 font-medium">{mapping.designationName}</td>
                <td className="px-3 py-1.5 w-36">
                  <Num
                    value={row?.amountPerDay ?? 0}
                    disabled={readOnly}
                    prefix="₹"
                    suffix="/ day"
                    onChange={(n) =>
                      set({
                        ...p,
                        incidentals: p.incidentals.map((x) => (x.groupId === groupId ? { ...x, amountPerDay: n } : x)),
                      })
                    }
                  />
                </td>
                <td className="px-3 py-1.5">
                  <Switch
                    size="sm"
                    checked={row?.billsRequired ?? false}
                    disabled={readOnly}
                    onCheckedChange={(v) =>
                      set({
                        ...p,
                        incidentals: p.incidentals.map((x) => (x.groupId === groupId ? { ...x, billsRequired: v } : x)),
                      })
                    }
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="text-[11px] text-muted-foreground">
        {p.overnightExclusions.incidental
          ? "Can also be claimed during an overnight journey."
          : "Not payable for transit nights covered by Overnight Journey Allowance."}
      </p>
    </SectionCard>
  );
}

/* ------------------------------------------------------------------ */
/* Claims                                                               */
/* ------------------------------------------------------------------ */

function deadlineSummary(r: TravelPolicy["claimRules"][number]): string {
  switch (r.deadlineMethod) {
    case "within_days_of_completion":
      return `Within ${r.withinDays} days of completing the travel`;
    case "by_day_of_following_month":
      return `By day ${r.followingMonthDay} of the following month`;
    case "whichever_earlier":
      return `Within ${r.withinDays} days of travel, or by day ${r.followingMonthDay} of the following month — whichever is earlier`;
    case "absolute_max_days":
      return `Within ${r.absoluteMaxDays} days at the latest`;
    default:
      return "";
  }
}

function ClaimsSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const updateRule = (id: string, patch: Partial<TravelPolicy["claimRules"][number]>) =>
    set({ ...p, claimRules: p.claimRules.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-3">
      <SectionCard title="Claim Types" hint="Submission deadline and documents needed for each type of claim.">
        {p.claimRules.map((r) => (
          <div key={r.id} className="rounded-lg border border-border p-3 mb-2 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Input
                value={r.claimType}
                disabled={readOnly}
                onChange={(e) => updateRule(r.id, { claimType: e.target.value })}
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
            <p className="text-[11px] text-muted-foreground">Submit: {deadlineSummary(r)}</p>
            {!readOnly ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <HrOrgField label="Submission deadline">
                  <Combo
                    value={r.deadlineMethod}
                    onChange={(v) => updateRule(r.id, { deadlineMethod: v as DeadlineMethod })}
                    options={[
                      { value: "within_days_of_completion", label: "Within a number of days" },
                      { value: "by_day_of_following_month", label: "By a day of the next month" },
                      { value: "whichever_earlier", label: "Whichever is earlier" },
                      { value: "absolute_max_days", label: "Within a maximum number of days" },
                    ]}
                  />
                </HrOrgField>
                {r.deadlineMethod === "within_days_of_completion" || r.deadlineMethod === "whichever_earlier" ? (
                  <HrOrgField label="Within (days)">
                    <Num value={r.withinDays} onChange={(n) => updateRule(r.id, { withinDays: n })} />
                  </HrOrgField>
                ) : null}
                {r.deadlineMethod === "by_day_of_following_month" || r.deadlineMethod === "whichever_earlier" ? (
                  <HrOrgField label="Day of next month">
                    <Num value={r.followingMonthDay} onChange={(n) => updateRule(r.id, { followingMonthDay: n })} />
                  </HrOrgField>
                ) : null}
                {r.deadlineMethod === "absolute_max_days" ? (
                  <HrOrgField label="Maximum days">
                    <Num value={r.absoluteMaxDays} onChange={(n) => updateRule(r.id, { absoluteMaxDays: n })} />
                  </HrOrgField>
                ) : null}
              </div>
            ) : null}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <ToggleRow label="Bill required" checked={r.billRequired} disabled={readOnly} onChange={(v) => updateRule(r.id, { billRequired: v })} />
              <ToggleRow label="Original bill required" checked={r.originalBillRequired} disabled={readOnly} onChange={(v) => updateRule(r.id, { originalBillRequired: v })} />
              <ToggleRow label="Company name on bill" checked={r.companyNameOnBill} disabled={readOnly} onChange={(v) => updateRule(r.id, { companyNameOnBill: v })} />
              <ToggleRow label="GSTIN on bill" checked={r.gstinRequired} disabled={readOnly} onChange={(v) => updateRule(r.id, { gstinRequired: v })} />
              <ToggleRow label="Attachment required" checked={r.attachmentRequired} disabled={readOnly} onChange={(v) => updateRule(r.id, { attachmentRequired: v })} />
              <ToggleRow label="Prior approval required" checked={r.priorApprovalRequired} disabled={readOnly} onChange={(v) => updateRule(r.id, { priorApprovalRequired: v })} />
            </div>
            <HrOrgField label="If a claim falls outside these rules">
              <Combo
                value={r.exceptionHandling}
                disabled={readOnly}
                onChange={(v) => updateRule(r.id, { exceptionHandling: v as OverLimitAction })}
                options={OVER_LIMIT_OPTIONS}
              />
            </HrOrgField>
          </div>
        ))}
        {!readOnly ? (
          <AddLink onClick={() => set({ ...p, claimRules: [...p.claimRules, blankClaimTypeRule(newClaimRuleId())] })}>
            + Add claim type
          </AddLink>
        ) : null}
      </SectionCard>
      <SectionCard title="Oldest Claim Accepted">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-w-lg">
          <HrOrgField label="Claims older than">
            <Num value={p.maxClaimAge.days} disabled={readOnly} suffix="days" onChange={(n) => set({ ...p, maxClaimAge: { ...p.maxClaimAge, days: n } })} />
          </HrOrgField>
          <HrOrgField label="Then">
            <Combo
              value={p.maxClaimAge.action}
              disabled={readOnly}
              onChange={(v) => set({ ...p, maxClaimAge: { ...p.maxClaimAge, action: v as TravelPolicy["maxClaimAge"]["action"] } })}
              options={[
                { value: "block", label: "Do not allow submission" },
                { value: "warn", label: "Show a warning" },
                { value: "require_exception", label: "Needs exception approval" },
              ]}
            />
          </HrOrgField>
        </div>
      </SectionCard>
      <SectionCard title="Billing Requirements" hint="Applied wherever a claim type requires a bill.">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <ToggleRow label="Bill in Company Name" checked={p.billing.billInCompanyName} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, billInCompanyName: v } })} />
          <ToggleRow label="Original Bill Required" checked={p.billing.originalBillRequired} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, originalBillRequired: v } })} />
          <ToggleRow label="GSTIN Required" checked={p.billing.gstinRequired} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, gstinRequired: v } })} />
          <ToggleRow label="Attachment Mandatory" checked={p.billing.attachmentMandatory} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, attachmentMandatory: v } })} />
          <ToggleRow label="Attach approval with claim" checked={p.billing.approvalAttachmentRequired} disabled={readOnly} onChange={(v) => set({ ...p, billing: { ...p.billing, approvalAttachmentRequired: v } })} />
        </div>
      </SectionCard>
      <SectionCard title="Travel Advance" hint="Policy settings only — advance payment is set up separately.">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <ToggleRow label="Travel Advance Allowed" checked={p.travelAdvance.enabled} disabled={readOnly} onChange={(v) => set({ ...p, travelAdvance: { ...p.travelAdvance, enabled: v } })} />
          <HrOrgField label="Settle within">
            <Num value={p.travelAdvance.settlementDays} disabled={readOnly} suffix="days" onChange={(n) => set({ ...p, travelAdvance: { ...p.travelAdvance, settlementDays: n } })} />
          </HrOrgField>
          <ToggleRow label="Block new advance until previous is settled" checked={p.travelAdvance.blockNewIfUnsettled} disabled={readOnly} onChange={(v) => set({ ...p, travelAdvance: { ...p.travelAdvance, blockNewIfUnsettled: v } })} />
        </div>
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Approval & exceptions                                                */
/* ------------------------------------------------------------------ */

function ApprovalExceptionsSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const updateEx = (id: string, patch: Partial<TravelPolicy["exceptions"][number]>) =>
    set({ ...p, exceptions: p.exceptions.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-3">
      <SectionCard title="Exceptions" hint="Situations where employees may go beyond the policy, and who approves them.">
        {p.exceptions.map((ex) => (
          <div key={ex.id} className="flex flex-wrap items-center gap-2 border-b border-border/60 py-2">
            <Input
              value={ex.name}
              disabled={readOnly}
              onChange={(e) => updateEx(ex.id, { name: e.target.value })}
              className="h-8 text-xs w-48"
            />
            <ToggleRow label="Allowed" checked={ex.allowed} disabled={readOnly} onChange={(v) => updateEx(ex.id, { allowed: v })} />
            <ToggleRow label="Prior approval" checked={ex.requiresPriorApproval} disabled={readOnly} onChange={(v) => updateEx(ex.id, { requiresPriorApproval: v })} />
            <div className="min-w-[16rem] flex-1">
              <ChipMultiSelect
                values={ex.approvers}
                disabled={readOnly}
                placeholder="Select approvers…"
                options={APPROVER_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                onChange={(vals) => updateEx(ex.id, { approvers: vals as ApproverRole[] })}
              />
            </div>
            {!readOnly ? (
              <HrIconActionButton
                label="Remove"
                destructive
                onClick={() => set({ ...p, exceptions: p.exceptions.filter((x) => x.id !== ex.id) })}
              >
                <Trash2 />
              </HrIconActionButton>
            ) : null}
          </div>
        ))}
        {!readOnly ? (
          <AddLink
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
          </AddLink>
        ) : null}
      </SectionCard>
      <SectionCard title="Approval Flow" hint="Who approves a claim, in order.">
        {p.approvalChains.map((ch) => {
          const steps = ch.steps.filter(Boolean);
          if (!steps.length) return null;
          return (
            <p key={ch.id} className="text-xs">
              <span className="font-medium">{ch.name}:</span> {steps.map(approverLabel).join(" → ")}
            </p>
          );
        })}
      </SectionCard>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Exclusions                                                           */
/* ------------------------------------------------------------------ */

function ExclusionsSection({ p, set, readOnly }: { p: TravelPolicy; set: SetPolicy; readOnly: boolean }) {
  const typeOptions = p.claimRules.map((r) => ({ value: r.claimType, label: r.claimType }));
  const updateRow = (id: string, patch: Partial<TravelPolicy["exclusions"][number]>) =>
    set({ ...p, exclusions: p.exclusions.map((x) => (x.id === id ? { ...x, ...patch } : x)) });
  return (
    <div className="space-y-3">
      <SectionCard
        title="Non-reimbursable Expenses"
        hint="Expenses that cannot be reimbursed. Leave claim types empty to apply to all claims."
      >
        {(p.exclusions || []).map((row) => (
          <div key={row.id} className="rounded-lg border border-border p-3 mb-2 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 flex-1">
                <HrOrgField label="Name">
                  <Input value={row.name} disabled={readOnly} onChange={(e) => updateRow(row.id, { name: e.target.value })} className="h-8 text-xs" />
                </HrOrgField>
                <HrOrgField label="If claimed">
                  <Combo
                    value={row.action}
                    disabled={readOnly}
                    onChange={(v) => updateRow(row.id, { action: v as ExclusionAction })}
                    options={[
                      { value: "block", label: "Do not allow" },
                      { value: "warn", label: "Show a warning" },
                    ]}
                  />
                </HrOrgField>
                <HrOrgField label="Description" size="full">
                  <Textarea
                    value={row.description}
                    disabled={readOnly}
                    onChange={(e) => updateRow(row.id, { description: e.target.value })}
                    rows={2}
                    className="text-sm"
                  />
                </HrOrgField>
                <HrOrgField label="Applies to claim types" size="full" helper="Leave empty to apply to all claim types.">
                  <ChipMultiSelect
                    values={row.claimTypes}
                    disabled={readOnly}
                    options={typeOptions}
                    placeholder="All claim types"
                    onChange={(vals) => updateRow(row.id, { claimTypes: vals })}
                  />
                </HrOrgField>
              </div>
              <div className="flex flex-col items-end gap-2 pt-5">
                <ToggleRow label="Active" checked={row.active} disabled={readOnly} onChange={(v) => updateRow(row.id, { active: v })} />
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
          <AddLink
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
          </AddLink>
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
        title="Employee Guidance"
        hint="Tips and instructions shown to employees. These do not affect any calculation."
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
  const allEmployees = loadHrEmployees().filter((e) => e.status === "active");
  const preferred =
    allEmployees.find((e) => /area sales|asm/i.test(e.designation || "")) ??
    allEmployees.find((e) => /sales|territory|nsm|rsm|agronomist/i.test(e.designation || "")) ??
    allEmployees[0];

  const designationOptions = (() => {
    const fromMaps = p.roleMappings.filter((m) => m.active && m.designationName).map((m) => m.designationName);
    const fromEmps = allEmployees.map((e) => e.designation).filter(Boolean);
    return Array.from(new Set([...fromMaps, ...fromEmps])).sort((a, b) => a.localeCompare(b));
  })();

  const [mode, setMode] = useState<"employee" | "designation">("designation");
  const [empId, setEmpId] = useState(String(preferred?.id || ""));
  const [designation, setDesignation] = useState(
    preferred?.designation || designationOptions.find((d) => /asm|area sales/i.test(d)) || designationOptions[0] || "Area Sales Manager (ASM)",
  );
  const [city, setCity] = useState("Mumbai");
  const [date, setDate] = useState(p.effectiveFrom || "2026-04-15");
  const [travelKind, setTravelKind] = useState<"ex_hq" | "hq_local">("ex_hq");
  const [stay, setStay] = useState<"hotel" | "relatives_friends">("hotel");
  const [hours, setHours] = useState("7");
  const [vehicle, setVehicle] = useState(p.kmRates.find((k) => /four/i.test(k.vehicleType))?.vehicleType || p.kmRates[0]?.vehicleType || "Four-Wheeler (Own)");
  const [distance, setDistance] = useState("80");

  const employee: HrEmployee | null = (() => {
    if (mode === "employee") {
      return allEmployees.find((e) => String(e.id) === empId) ?? preferred ?? null;
    }
    const match = allEmployees.find((e) => normLabel(e.designation) === normLabel(designation));
    if (match) return match;
    if (!designation) return preferred ?? null;
    // Preview stub when no employee matches the selected designation
    const base: HrEmployee =
      preferred ??
      ({
        id: -1,
        employeeCode: "PREVIEW",
        employeeName: "Preview",
        mobileNumber: "",
        emailId: "",
        department: "Sales",
        designation,
        reportingManagerId: null,
        reportingManagerName: "",
        branch: "",
        employeeType: "permanent",
        employmentStatus: "active",
        dateOfJoining: "2024-01-01",
        status: "active",
        createdBy: "system",
        updatedBy: "system",
        createdAt: "2024-01-01",
        updatedAt: "2024-01-01",
      } as unknown as HrEmployee);
    return {
      ...base,
      designation,
      employeeName: preferred?.employeeName ? `${preferred.employeeName} (preview)` : `Preview · ${designation}`,
    };
  })();

  const preview = employee
    ? getTravelEntitlement({
        employee,
        policy: p,
        travelDate: date,
        city,
        travelType: travelKind,
        stayType: stay,
        journeyHours: Number(hours),
        distanceKm: travelKind === "ex_hq" ? Number(distance) || 80 : 10,
        vehicleType: vehicle,
        overnight: false,
      })
    : null;

  const airLabel = (air: NonNullable<Extract<typeof preview, { air: unknown }>["air"]>) => {
    if (!air?.allowed) return "Not allowed";
    const bits = [air.airClass || "Economy"];
    if (air.trigger === "journey_duration" && air.minHours > 0) bits.push(`if journey > ${air.minHours}h`);
    if (air.priorApproval) bits.push("prior approval");
    if (air.lowestAvailableFareRequired) bits.push("lowest available fare");
    return bits.join(" · ");
  };

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-sm font-semibold text-navy-700">Entitlement Preview</h2>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Check what limits apply for a designation, destination and travel type. Read-only helper for HR demos.
        </p>
      </div>

      <SectionCard title="Preview inputs">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <HrOrgField label="Lookup by">
            <Combo
              value={mode}
              onChange={(v) => setMode(v as "employee" | "designation")}
              options={[
                { value: "designation", label: "Designation" },
                { value: "employee", label: "Employee" },
              ]}
            />
          </HrOrgField>
          {mode === "employee" ? (
            <HrOrgField label="Employee">
              <Combo
                value={empId}
                onChange={setEmpId}
                options={allEmployees.map((e) => ({ value: String(e.id), label: `${e.employeeName} · ${e.designation}` }))}
                placeholder="Employee"
              />
            </HrOrgField>
          ) : (
            <HrOrgField label="Designation">
              <Combo
                value={designation}
                onChange={setDesignation}
                options={designationOptions.map((d) => ({ value: d, label: d }))}
                placeholder="Designation"
              />
            </HrOrgField>
          )}
          <HrOrgField label="Travel type">
            <Combo
              value={travelKind}
              onChange={(v) => setTravelKind(v as "ex_hq" | "hq_local")}
              options={[
                { value: "ex_hq", label: "Ex-HQ" },
                { value: "hq_local", label: "HQ / Local" },
              ]}
            />
          </HrOrgField>
          <HrOrgField label="Destination">
            <Input value={city} onChange={(e) => setCity(e.target.value)} className="h-8 text-xs" placeholder="e.g. Mumbai" />
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
          {travelKind === "ex_hq" ? (
            <HrOrgField label="Distance (KM one-way)">
              <Input value={distance} onChange={(e) => setDistance(e.target.value)} className="h-8 text-xs" />
            </HrOrgField>
          ) : null}
          <HrOrgField label="Vehicle (optional)">
            <Combo
              value={vehicle}
              onChange={setVehicle}
              options={(p.kmRates.length ? p.kmRates : [{ id: "x", vehicleType: "Four-Wheeler (Own)" } as { id: string; vehicleType: string }]).map((k) => ({
                value: k.vehicleType,
                label: k.vehicleType,
              }))}
            />
          </HrOrgField>
        </div>
      </SectionCard>

      <SectionCard title="Resolved entitlement">
        {!employee ? (
          <p className="text-xs text-muted-foreground">Select a designation or employee to preview.</p>
        ) : preview && "error" in preview ? (
          <p className="text-xs text-red-600">{preview.error}</p>
        ) : preview ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <Stat label="Policy" value={preview.policyName} />
            <Stat
              label="Entitlement"
              value={preview.group ? designationNameFor(p, preview.group.id) : "Not mapped"}
            />
            <Stat label="City Category" value={preview.cityClass?.name || "—"} />
            <Stat label="Travel Context" value={preview.context.exHq ? "Ex-HQ" : "HQ / Local"} />
            <Stat label="Rail" value={preview.railClass || "—"} />
            <Stat label="Air" value={preview.air ? airLabel(preview.air) : "—"} />
            <Stat label="Destination Conveyance" value={preview.destinationConveyance || "—"} />
            <Stat label="Lodging" value={preview.lodgingLimit != null ? `${formatInr(preview.lodgingLimit)}/day` : stay === "relatives_friends" ? "N/A (alt. stay)" : "—"} />
            <Stat label="Boarding" value={preview.boardingLimit != null ? `${formatInr(preview.boardingLimit)}/day` : "—"} />
            <Stat
              label="Alternative Stay"
              value={
                stay === "relatives_friends"
                  ? preview.relativesPerNight == null
                    ? "Not Allowed"
                    : `${formatInr(preview.relativesPerNight)}/night`
                  : "—"
              }
            />
            <Stat label="Incidental" value={preview.incidentalPerDay != null ? `${formatInr(preview.incidentalPerDay)}/day` : "—"} />
            <Stat
              label="Field Conveyance"
              value={
                preview.fieldConveyance
                  ? preview.fieldConveyance.allowanceType === "actual"
                    ? "Actuals against bills"
                    : `${formatInr(preview.fieldConveyance.amount)}/day`
                  : "—"
              }
            />
            <Stat label="KM Rate" value={preview.kmRate != null ? `₹${preview.kmRate}/km` : "—"} />
            <Stat label="Prior Approval" value={preview.priorApproval || preview.context.priorApprovalRequired ? "Required" : "Not required"} />
            <Stat label="Hotel Bill" value={preview.billRequiredHotel ? "Required" : "Not required"} />
          </div>
        ) : null}
      </SectionCard>
    </div>
  );
}

function normLabel(s: string): string {
  return (s || "").trim().toLowerCase();
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="text-xs font-semibold mt-0.5">{value}</p>
    </div>
  );
}
