"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Loader2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { showToast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { todayStr } from "../geography-master-data";
import type { SplitMergeLevel } from "../geography-workflow-data";
import {
  BusinessGeographyService,
  toSplitMergeApiLevel,
  type SplitMergeAssignableUser,
  type SplitMergeJobView,
  type SplitMergeSourceOption,
} from "@/services/business-geography.service";
import {
  SplitMergeResultCard,
  type RoleUserAssignment,
  type SplitMergeCardPreview,
} from "./SplitMergeResultCard";

type WizardMode = "split" | "merge";

interface NewGeographyRow {
  key: string;
  name: string;
  effectiveFrom: string;
  status: "active" | "inactive";
}

/** Allocation value: "__keep__" or a target draft key */
type AllocValue = string;

const KEEP = "__keep__";

const LEVEL_CHILD_LABEL: Record<SplitMergeLevel, string> = {
  Zone: "Regions",
  Region: "Areas",
  Area: "Territories",
  Territory: "Pincodes",
};

function newRowKey() {
  return `tgt-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function scopeLabelForLevel(level: SplitMergeLevel): string {
  switch (level) {
    case "Zone":
      return "Select Source Zone";
    case "Region":
      return "Select Source Region";
    case "Area":
      return "Select Source Area";
    case "Territory":
      return "Select Source Territory";
  }
}

function actionToApi(action: RoleUserAssignment["action"]): "KEEP" | "ASSIGN" | "UNASSIGN" {
  if (action === "keep") return "KEEP";
  if (action === "assign") return "ASSIGN";
  return "UNASSIGN";
}

function buildPreviews(params: {
  mode: WizardMode;
  geoLevel: SplitMergeLevel;
  job: SplitMergeJobView | null;
  newGeoRows: NewGeographyRow[];
  allocations: Record<string, AllocValue>;
  mergedName: string;
  mergeSourceNames: string[];
  userAssignmentsByCard: Record<string, Record<string, RoleUserAssignment>>;
  assignableUsers: SplitMergeAssignableUser[];
}): SplitMergeCardPreview[] {
  const roles = params.job?.assignment_roles?.length
    ? params.job.assignment_roles
    : params.geoLevel === "Zone"
      ? ["ZSM"]
      : params.geoLevel === "Region"
        ? ["RSM", "ZSM"]
        : params.geoLevel === "Area"
          ? ["ASM", "RSM"]
          : ["TM", "ASM"];

  const resolveUserName = (nodeKey: string, role: string): string | null => {
    const ua = params.userAssignmentsByCard[nodeKey]?.[role];
    if (!ua || ua.action === "unassigned") return null;
    if (ua.action === "assign" && ua.userId) {
      return (
        params.assignableUsers.find((u) => u.user_id === ua.userId)?.full_name ?? null
      );
    }
    return "Keep existing";
  };

  const roleRows = (nodeKey: string) =>
    roles.map((role) => {
      const userName = resolveUserName(nodeKey, role);
      return {
        role,
        userName,
        status: userName ? ("assigned" as const) : ("missing" as const),
      };
    });

  if (params.mode === "merge") {
    if (params.mergeSourceNames.length < 2 || !params.mergedName.trim()) return [];
    const usersByRole = roleRows("merge_target");
    const warnings = usersByRole
      .filter((u) => u.status === "missing")
      .map((u) => `${u.role} not assigned on merge target`);
    return [
      {
        key: "merge_target",
        name: params.mergedName.trim(),
        level: params.geoLevel,
        parentName: "—",
        isExisting: false,
        assignedScopeLabels: [`All children from ${params.mergeSourceNames.length} sources`],
        pincodeCount: 0,
        customerCount: 0,
        customers: [],
        usersByRole,
        approvalChain: usersByRole.map((u) => ({ role: u.role, userName: u.userName })),
        warnings,
      },
    ];
  }

  if (!params.job) return [];

  const children = params.job.source.children ?? [];
  const namedTargets = params.newGeoRows.filter((r) => r.name.trim());
  const cards: SplitMergeCardPreview[] = [];

  const scopeFor = (targetKey: string | typeof KEEP) =>
    children
      .filter((c) => {
        const v = params.allocations[c.id] ?? KEEP;
        return targetKey === KEEP ? v === KEEP : v === targetKey;
      })
      .map((c) => c.name);

  // Existing source card
  {
    const scope = scopeFor(KEEP);
    const usersByRole = roleRows("source");
    const warnings: string[] = [];
    if (scope.length === 0 && children.length > 0) {
      warnings.push("Source will have no remaining children after publish.");
    }
    for (const u of usersByRole) {
      if (u.status === "missing") warnings.push(`${u.role} not assigned on source`);
    }
    cards.push({
      key: "source",
      name: params.job.source.name,
      level: params.geoLevel,
      parentName: "—",
      isExisting: true,
      assignedScopeLabels: scope,
      pincodeCount: 0,
      customerCount: 0,
      customers: [],
      usersByRole,
      approvalChain: usersByRole.map((u) => ({ role: u.role, userName: u.userName })),
      warnings,
    });
  }

  for (const row of namedTargets) {
    const scope = scopeFor(row.key);
    const usersByRole = roleRows(row.key);
    const warnings: string[] = [];
    if (scope.length === 0) warnings.push("No children allocated to this geography.");
    for (const u of usersByRole) {
      if (u.status === "missing") warnings.push(`${u.role} not assigned`);
    }
    cards.push({
      key: row.key,
      name: row.name.trim(),
      level: params.geoLevel,
      parentName: "—",
      isExisting: false,
      assignedScopeLabels: scope,
      pincodeCount: 0,
      customerCount: 0,
      customers: [],
      usersByRole,
      approvalChain: usersByRole.map((u) => ({ role: u.role, userName: u.userName })),
      warnings,
    });
  }

  return cards;
}

export function SplitMergeWizardTab() {
  const [mode, setMode] = useState<WizardMode>("split");
  const [geoLevel, setGeoLevel] = useState<SplitMergeLevel>("Region");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [mergeSourceIds, setMergeSourceIds] = useState<string[]>([]);
  const [mergedName, setMergedName] = useState("");
  const [newGeoRows, setNewGeoRows] = useState<NewGeographyRow[]>([]);
  const [allocations, setAllocations] = useState<Record<string, AllocValue>>({});
  const [userAssignmentsByCard, setUserAssignmentsByCard] = useState<
    Record<string, Record<string, RoleUserAssignment>>
  >({});
  const [effectiveDate, setEffectiveDate] = useState(todayStr());
  const [ackWarnings, setAckWarnings] = useState(false);
  const [ackUserIncomplete, setAckUserIncomplete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [published, setPublished] = useState(false);

  const [sources, setSources] = useState<SplitMergeSourceOption[]>([]);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [job, setJob] = useState<SplitMergeJobView | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<SplitMergeAssignableUser[]>([]);
  const [publishing, setPublishing] = useState(false);

  const createLock = useRef(false);

  const apiLevel = toSplitMergeApiLevel(geoLevel);

  const loadSources = useCallback(async () => {
    setSourcesLoading(true);
    try {
      const rows = await BusinessGeographyService.listSplitMergeSources({
        geography_level: apiLevel,
      });
      setSources(rows.filter((r) => r.status));
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to load geography sources."), "error");
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  }, [apiLevel]);

  useEffect(() => {
    void loadSources();
  }, [loadSources]);

  const resetWorkflow = useCallback(() => {
    setSourceId(null);
    setMergeSourceIds([]);
    setNewGeoRows([]);
    setAllocations({});
    setMergedName("");
    setUserAssignmentsByCard({});
    setJob(null);
    setAssignableUsers([]);
    setPublished(false);
    setAckWarnings(false);
    setAckUserIncomplete(false);
    setConfirmPublish(false);
  }, []);

  const handleLevelOrModeChange = (patch: { mode?: WizardMode; level?: SplitMergeLevel }) => {
    if (patch.mode) setMode(patch.mode);
    if (patch.level) setGeoLevel(patch.level);
    resetWorkflow();
  };

  /** Create / refresh draft when split source is chosen */
  useEffect(() => {
    if (mode !== "split" || !sourceId || !effectiveDate || published) return;
    if (
      job &&
      job.operation_type === "SPLIT" &&
      job.source_id === sourceId &&
      job.effective_date === effectiveDate &&
      job.geography_level === apiLevel &&
      job.status !== "PUBLISHED" &&
      job.status !== "CANCELLED"
    ) {
      return;
    }

    let cancelled = false;
    const run = async () => {
      if (createLock.current) return;
      createLock.current = true;
      setJobLoading(true);
      try {
        const created = await BusinessGeographyService.createSplitMergeJob({
          operation_type: "SPLIT",
          geography_level: apiLevel,
          source_ids: [sourceId],
          effective_date: effectiveDate,
        });
        if (cancelled) return;
        setJob(created);
        const defaults: Record<string, AllocValue> = {};
        for (const child of created.source.children ?? []) {
          defaults[child.id] = KEEP;
        }
        setAllocations(defaults);
        setNewGeoRows([]);
        setUserAssignmentsByCard({});

        const assignable = await BusinessGeographyService.listSplitMergeAssignableUsers(created.id);
        if (!cancelled) setAssignableUsers(assignable.users);
      } catch (error) {
        if (!cancelled) {
          showToast(getErrorMessage(error, "Failed to create split draft."), "error");
          setJob(null);
        }
      } finally {
        createLock.current = false;
        if (!cancelled) setJobLoading(false);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [mode, sourceId, effectiveDate, apiLevel, published, job]);

  /** Create merge draft when enough sources + name (debounced) */
  useEffect(() => {
    if (mode !== "merge" || mergeSourceIds.length < 2 || !mergedName.trim() || !effectiveDate || published) {
      return;
    }
    if (
      job &&
      job.operation_type === "MERGE" &&
      job.effective_date === effectiveDate &&
      job.geography_level === apiLevel &&
      job.merge_target?.name?.trim() === mergedName.trim() &&
      JSON.stringify(job.source_ids.slice().sort()) ===
        JSON.stringify([...mergeSourceIds].sort()) &&
      job.status !== "PUBLISHED" &&
      job.status !== "CANCELLED"
    ) {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(() => {
      const run = async () => {
        if (createLock.current) return;
        createLock.current = true;
        setJobLoading(true);
        try {
          const created = await BusinessGeographyService.createSplitMergeJob({
            operation_type: "MERGE",
            geography_level: apiLevel,
            source_ids: mergeSourceIds,
            effective_date: effectiveDate,
            merge_target: {
              mode: "NEW",
              name: mergedName.trim(),
              status: true,
              effective_date: effectiveDate,
            },
          });
          if (cancelled) return;
          setJob(created);
          const assignable = await BusinessGeographyService.listSplitMergeAssignableUsers(
            created.id,
          );
          if (!cancelled) setAssignableUsers(assignable.users);
        } catch (error) {
          if (!cancelled) {
            showToast(getErrorMessage(error, "Failed to create merge draft."), "error");
            setJob(null);
          }
        } finally {
          createLock.current = false;
          if (!cancelled) setJobLoading(false);
        }
      };
      void run();
    }, 600);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    mode,
    mergeSourceIds.join(","),
    mergedName.trim(),
    effectiveDate,
    apiLevel,
    published,
    job?.id,
    job?.merge_target?.name,
  ]);

  const mergeSourceNames = useMemo(
    () =>
      mergeSourceIds
        .map((id) => sources.find((s) => s.id === id)?.name ?? "")
        .filter(Boolean),
    [mergeSourceIds, sources],
  );

  const resultPreviews = useMemo(
    () =>
      buildPreviews({
        mode,
        geoLevel,
        job,
        newGeoRows,
        allocations,
        mergedName,
        mergeSourceNames,
        userAssignmentsByCard,
        assignableUsers,
      }),
    [
      mode,
      geoLevel,
      job,
      newGeoRows,
      allocations,
      mergedName,
      mergeSourceNames,
      userAssignmentsByCard,
      assignableUsers,
    ],
  );

  const allWarnings = useMemo(() => resultPreviews.flatMap((p) => p.warnings), [resultPreviews]);
  const hasUserWarnings = useMemo(
    () => resultPreviews.some((p) => p.usersByRole.some((u) => u.status === "missing")),
    [resultPreviews],
  );

  const unallocatedCount = useMemo(() => {
    if (mode === "merge" || !job) return 0;
    return (job.source.children ?? []).filter((c) => !allocations[c.id]).length;
  }, [mode, job, allocations]);

  const quickAddGeography = () => {
    setNewGeoRows((rows) => [
      ...rows,
      { key: newRowKey(), name: "", effectiveFrom: effectiveDate, status: "active" },
    ]);
  };

  const allocationTargets = useMemo(() => {
    if (mode === "merge" || !job) return [];
    const targets: Array<{ value: string; label: string }> = [
      { value: KEEP, label: `Keep in ${job.source.name}` },
    ];
    newGeoRows.forEach((r) => {
      if (r.name.trim()) targets.push({ value: r.key, label: r.name.trim() });
    });
    return targets;
  }, [mode, job, newGeoRows]);

  const canPublish = () => {
    if (!effectiveDate || !confirmPublish || !job) return false;
    if (mode === "split") {
      if (!sourceId) return false;
      if (newGeoRows.filter((r) => r.name.trim()).length === 0) return false;
      if (unallocatedCount > 0) return false;
      const hasMove = Object.values(allocations).some((v) => v !== KEEP);
      if (!hasMove) return false;
    }
    if (mode === "merge") {
      if (mergeSourceIds.length < 2 || !mergedName.trim()) return false;
    }
    if (allWarnings.length > 0 && !ackWarnings) return false;
    if (hasUserWarnings && !ackUserIncomplete) return false;
    return true;
  };

  const buildUserPayload = () => {
    const rows: Array<{
      node_key: string;
      role_code: string;
      action: "KEEP" | "ASSIGN" | "UNASSIGN";
      user_id?: string | null;
    }> = [];

    for (const [nodeKey, byRole] of Object.entries(userAssignmentsByCard)) {
      for (const [role, ua] of Object.entries(byRole)) {
        rows.push({
          node_key: nodeKey,
          role_code: role,
          action: actionToApi(ua.action),
          user_id: ua.action === "assign" ? ua.userId || null : null,
        });
      }
    }

    // Default KEEP for any role/node not touched
    const roles = job?.assignment_roles ?? [];
    const nodeKeys =
      mode === "merge"
        ? ["merge_target"]
        : ["source", ...newGeoRows.filter((r) => r.name.trim()).map((r) => r.key)];

    for (const nodeKey of nodeKeys) {
      for (const role of roles) {
        if (!rows.some((r) => r.node_key === nodeKey && r.role_code === role)) {
          rows.push({
            node_key: nodeKey,
            role_code: role,
            action: "KEEP",
            user_id: null,
          });
        }
      }
    }
    return rows;
  };

  const handlePublish = async () => {
    if (!canPublish() || !job) return;
    setPublishing(true);
    try {
      let current = job;

      if (mode === "split") {
        const targets = newGeoRows
          .filter((r) => r.name.trim())
          .map((r) => ({
            key: r.key,
            name: r.name.trim(),
            status: r.status === "active",
            effective_date: r.effectiveFrom || effectiveDate,
          }));

        current = await BusinessGeographyService.quickAddSplitMergeTargets(current.id, {
          targets,
        });

        const allocationPayload = (current.source.children ?? []).map((child) => {
          const v = allocations[child.id] ?? KEEP;
          if (v === KEEP) {
            return { child_id: child.id, action: "KEEP" as const, target_key: null };
          }
          return { child_id: child.id, action: "MOVE" as const, target_key: v };
        });

        current = await BusinessGeographyService.allocateSplitMerge(
          current.id,
          allocationPayload,
        );
      }

      current = await BusinessGeographyService.assignSplitMergeUsers(
        current.id,
        buildUserPayload(),
      );

      current = await BusinessGeographyService.publishSplitMerge(current.id);
      setJob(current);
      setPublished(true);
      showToast("Split/merge published successfully.", "success");
      void loadSources();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to publish split/merge."), "error");
    } finally {
      setPublishing(false);
    }
  };

  const assignableOptions = useMemo(
    () =>
      assignableUsers.map((u) => ({
        id: u.user_id,
        fullName: u.full_name,
        roleName: u.role_name,
      })),
    [assignableUsers],
  );

  const children = job?.source.children ?? [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Geography Split / Merge</h2>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
          Split or merge Zone, Region, Area, or Territory while preserving postal coverage, users,
          customers, and audit history.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">1. Operation Type</Label>
            <Select
              value={mode}
              onValueChange={(v) => handleLevelOrModeChange({ mode: v as WizardMode })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="split" className="text-xs">
                  Split
                </SelectItem>
                <SelectItem value="merge" className="text-xs">
                  Merge
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">2. Geography Level</Label>
            <Select
              value={geoLevel}
              onValueChange={(v) => handleLevelOrModeChange({ level: v as SplitMergeLevel })}
            >
              <SelectTrigger className="h-9 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(["Zone", "Region", "Area", "Territory"] as SplitMergeLevel[]).map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">
              3. {mode === "split" ? scopeLabelForLevel(geoLevel) : `Select ${geoLevel}s to Merge`}
            </Label>
            {mode === "split" ? (
              <Select
                value={sourceId ?? ""}
                onValueChange={(v) => {
                  setSourceId(v);
                  setPublished(false);
                  setJob(null);
                }}
                disabled={sourcesLoading}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue
                    placeholder={
                      sourcesLoading
                        ? "Loading…"
                        : `Select source ${geoLevel.toLowerCase()}`
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {sources.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.name}
                      {o.code ? ` (${o.code})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border border-border rounded-lg p-2 max-h-[120px] overflow-y-auto space-y-1">
                {sourcesLoading ? (
                  <p className="text-xs text-muted-foreground">Loading…</p>
                ) : sources.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No active {geoLevel.toLowerCase()}s.</p>
                ) : (
                  sources.map((o) => (
                    <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
                      <input
                        type="checkbox"
                        checked={mergeSourceIds.includes(o.id)}
                        onChange={() => {
                          setMergeSourceIds((prev) =>
                            prev.includes(o.id)
                              ? prev.filter((id) => id !== o.id)
                              : [...prev, o.id],
                          );
                          setPublished(false);
                          setJob(null);
                        }}
                      />
                      {o.name}
                      {o.code ? ` (${o.code})` : ""}
                    </label>
                  ))
                )}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Effective Date</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={effectiveDate}
              onChange={(e) => {
                setEffectiveDate(e.target.value);
                setJob(null);
                setPublished(false);
              }}
            />
          </div>
        </div>
        {jobLoading && (
          <p className="text-xs text-muted-foreground mt-3 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" /> Preparing draft…
          </p>
        )}
      </div>

      {published && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Published successfully. Customer master unchanged — visibility recalculates from pincode
          mapping.
        </div>
      )}

      {mode === "split" && job && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">
            Current Scope — {geoLevel} {job.source.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {geoLevel} {job.source.name} currently contains:
          </p>
          {children.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">No child geographies / pincodes.</p>
          ) : (
            <ul className="text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
              {children.map((item) => (
                <li key={item.id} className="flex items-center gap-1">
                  <span className="font-medium">{item.name}</span>
                  {item.code && (
                    <span className="text-muted-foreground">({item.code})</span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {mode === "split" && job && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Step 1: Create New Geographies</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={quickAddGeography}
              disabled={published}
            >
              <Plus className="w-3.5 h-3.5" /> Quick Add Geography
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Existing geography <strong>{job.source.name}</strong> stays active. Add new{" "}
            {geoLevel.toLowerCase()}s to receive allocated scope.
          </p>
          {newGeoRows.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No new geographies yet. Use Quick Add Geography to create result geographies.
            </p>
          ) : (
            <div className="space-y-2">
              {newGeoRows.map((row, i) => (
                <div
                  key={row.key}
                  className="grid grid-cols-1 sm:grid-cols-4 gap-2 items-end border border-border rounded-lg p-3"
                >
                  <div className="sm:col-span-2 space-y-1">
                    <Label className="text-[10px]">Geography Name</Label>
                    <Input
                      className="h-8 text-sm"
                      value={row.name}
                      placeholder={`New ${geoLevel} name`}
                      disabled={published}
                      onChange={(e) => {
                        const next = [...newGeoRows];
                        next[i] = { ...row, name: e.target.value };
                        setNewGeoRows(next);
                      }}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-[10px]">Effective From</Label>
                    <Input
                      type="date"
                      className="h-8 text-sm"
                      value={row.effectiveFrom}
                      disabled={published}
                      onChange={(e) => {
                        const next = [...newGeoRows];
                        next[i] = { ...row, effectiveFrom: e.target.value };
                        setNewGeoRows(next);
                      }}
                    />
                  </div>
                  <div className="flex gap-2 items-end">
                    <div className="flex-1 space-y-1">
                      <Label className="text-[10px]">Status</Label>
                      <Select
                        value={row.status}
                        disabled={published}
                        onValueChange={(v) => {
                          const next = [...newGeoRows];
                          next[i] = { ...row, status: v as "active" | "inactive" };
                          setNewGeoRows(next);
                        }}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="active" className="text-xs">
                            Active
                          </SelectItem>
                          <SelectItem value="inactive" className="text-xs">
                            Inactive
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 w-8 p-0 text-muted-foreground"
                      disabled={published}
                      onClick={() => setNewGeoRows((rows) => rows.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {mode === "merge" && mergeSourceIds.length >= 2 && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Create Target Geography</h3>
          <div className="max-w-md space-y-1">
            <Label className="text-xs">Target {geoLevel} Name</Label>
            <Input
              className="h-9 text-sm"
              value={mergedName}
              disabled={published}
              onChange={(e) => {
                setMergedName(e.target.value);
                setJob(null);
                setPublished(false);
              }}
              placeholder={`e.g. West Coastal ${geoLevel}`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            All {LEVEL_CHILD_LABEL[geoLevel].toLowerCase()} from selected geographies will move to
            the target. Old geographies become inactive — not deleted.
          </p>
        </section>
      )}

      {mode === "split" && job && children.length > 0 && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-4">
          <h3 className="text-sm font-semibold">
            Step 2: Allocate {LEVEL_CHILD_LABEL[geoLevel]}
          </h3>
          <p className="text-xs text-muted-foreground">
            Move selected scope from the existing geography to new geographies. You can keep items
            in the current geography — not everything must move.
          </p>

          <div className="space-y-2">
            {children.map((item) => (
              <div
                key={item.id}
                className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs border-b border-border/60 pb-2"
              >
                <span className="sm:w-48 font-medium">{item.name}</span>
                {item.code && (
                  <span className="text-muted-foreground sm:w-32">{item.code}</span>
                )}
                <Select
                  value={allocations[item.id] ?? KEEP}
                  disabled={published || allocationTargets.length < 2}
                  onValueChange={(v) => setAllocations((p) => ({ ...p, [item.id]: v }))}
                >
                  <SelectTrigger className="h-8 text-xs sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allocationTargets.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-xs">
                        {t.value === KEEP ? "Keep in Current" : `Move to New — ${t.label}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {newGeoRows.filter((r) => r.name.trim()).length === 0 && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              Add at least one named geography in Step 1 before allocating moves.
            </p>
          )}
        </section>
      )}

      {resultPreviews.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Step 3: Review Result Cards</h3>
          <p className="text-xs text-muted-foreground">
            Review what each resulting geography will contain and assign users before publishing.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {resultPreviews.map((preview) => (
              <SplitMergeResultCard
                key={preview.key}
                preview={preview}
                userAssignments={userAssignmentsByCard[preview.key] ?? {}}
                assignableUsers={assignableOptions}
                onUserAssignmentChange={(role, patch) => {
                  setUserAssignmentsByCard((prev) => ({
                    ...prev,
                    [preview.key]: {
                      ...(prev[preview.key] ?? {}),
                      [role]: {
                        ...(prev[preview.key]?.[role] ?? {
                          action: "unassigned" as const,
                          userId: "",
                        }),
                        ...patch,
                      },
                    },
                  }));
                }}
                mergeSourceNames={mode === "merge" ? mergeSourceNames : undefined}
              />
            ))}
          </div>
        </section>
      )}

      {(mode === "split" ? job != null : mergeSourceIds.length >= 2 && !!mergedName.trim()) &&
        !published && (
          <section className="rounded-xl border border-border bg-white p-4 space-y-4">
            <h3 className="text-sm font-semibold">Confirm &amp; Publish</h3>

            {mode === "split" && job && (
              <div className="text-xs space-y-1 text-muted-foreground">
                <p className="font-medium text-foreground">This split will:</p>
                {children
                  .filter((item) => (allocations[item.id] ?? KEEP) !== KEEP)
                  .map((item) => {
                    const targetKey = allocations[item.id];
                    const target = newGeoRows.find((r) => r.key === targetKey);
                    return (
                      <p key={item.id}>
                        · Move <strong>{item.name}</strong> from {job.source.name} to{" "}
                        <strong>{target?.name.trim() || "new geography"}</strong>
                      </p>
                    );
                  })}
                {children
                  .filter((item) => (allocations[item.id] ?? KEEP) === KEEP)
                  .map((item) => (
                    <p key={item.id}>
                      · Keep <strong>{item.name}</strong> in {job.source.name}
                    </p>
                  ))}
                <p>· Recalculate customer visibility from pincode mapping</p>
                <p>· Apply effective date {effectiveDate}</p>
              </div>
            )}

            {allWarnings.length > 0 && (
              <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 space-y-2">
                <p className="text-xs font-semibold text-amber-900">Warnings</p>
                <ul className="text-xs text-amber-800 space-y-1">
                  {allWarnings.map((w) => (
                    <li key={w}>· {w}</li>
                  ))}
                </ul>
                <label className="flex items-center gap-2 text-xs">
                  <input
                    type="checkbox"
                    checked={ackWarnings}
                    onChange={(e) => setAckWarnings(e.target.checked)}
                  />
                  I acknowledge warnings before publishing.
                </label>
              </div>
            )}

            {hasUserWarnings && (
              <label className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={ackUserIncomplete}
                  onChange={(e) => setAckUserIncomplete(e.target.checked)}
                />
                I understand user assignments may be incomplete.
              </label>
            )}

            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={confirmPublish}
                onChange={(e) => setConfirmPublish(e.target.checked)}
              />
              I confirm this split/merge. Customer master will not be changed.
            </label>

            <Button
              size="sm"
              className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              disabled={!canPublish() || publishing}
              onClick={() => void handlePublish()}
            >
              {publishing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Publish
            </Button>
          </section>
        )}
    </div>
  );
}
