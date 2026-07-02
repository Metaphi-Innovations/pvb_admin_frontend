"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { addAuditEntry } from "../geography-audit-data";
import {
  createGeography,
  getGeographyById,
  loadGeographies,
  saveGeographies,
  setGeographyStatus,
  todayStr,
  type GeographyFormInput,
} from "../geography-master-data";
import {
  buildSplitMergeResultPreviews,
  getAssignableUserById,
  getGeographyOptionsForSplitMerge,
  getSplittableScopeItems,
  getUnassignedPostalMasterOptions,
  isPostalMasterScopeAvailable,
  loadCoverageMappings,
  loadUserAssignments,
  postalMasterScopeToSplittable,
  saveCoverageMappings,
  saveUserAssignments,
  SOURCE_GEO_ALLOC_INDEX,
  syncGeographyCoverageCounts,
  type SalesRole,
  type SplittableScopeItem,
  type SplitMergeLevel,
} from "../geography-workflow-data";
import {
  getCoverageDefinition,
  upsertCoverageDefinition,
  type GeographyCoverageDefinition,
} from "../geography-coverage-data";
import { SplitMergeResultCard, type RoleUserAssignment } from "./SplitMergeResultCard";

type WizardMode = "split" | "merge";

interface NewGeographyRow {
  key: string;
  name: string;
  effectiveFrom: string;
  status: "active" | "inactive";
}

const LEVEL_CHILD_LABEL: Record<SplitMergeLevel, string> = {
  Zone: "Regions",
  Region: "States / Areas",
  Area: "Districts / Territories",
  Territory: "Towns / Pincodes",
};

const LEVEL_SCOPE_LABEL: Record<SplitMergeLevel, string> = {
  Zone: "Region",
  Region: "State",
  Area: "District / Territory",
  Territory: "Town / Pincode",
};

function newRowKey() {
  return `geo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
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

export function SplitMergeWizardTab() {
  const [mode, setMode] = useState<WizardMode>("split");
  const [geoLevel, setGeoLevel] = useState<SplitMergeLevel>("Region");
  const [sourceId, setSourceId] = useState<number | null>(null);
  const [mergeSourceIds, setMergeSourceIds] = useState<number[]>([]);
  const [mergedName, setMergedName] = useState("");
  const [newGeoRows, setNewGeoRows] = useState<NewGeographyRow[]>([]);
  const [extraScopeItems, setExtraScopeItems] = useState<SplittableScopeItem[]>([]);
  const [allocations, setAllocations] = useState<Record<string, number>>({});
  const [postalAddKey, setPostalAddKey] = useState("");
  const [postalAddError, setPostalAddError] = useState("");
  const [userAssignmentsByCard, setUserAssignmentsByCard] = useState<
    Record<string, Record<string, RoleUserAssignment>>
  >({});
  const [effectiveDate, setEffectiveDate] = useState(todayStr());
  const [ackWarnings, setAckWarnings] = useState(false);
  const [ackUserIncomplete, setAckUserIncomplete] = useState(false);
  const [confirmPublish, setConfirmPublish] = useState(false);
  const [published, setPublished] = useState(false);
  const [tick, setTick] = useState(0);

  const geoOptions = useMemo(() => getGeographyOptionsForSplitMerge(geoLevel), [geoLevel, tick]);
  const sourceGeo = sourceId != null ? getGeographyById(sourceId) : null;

  const baseScopeItems = useMemo(() => {
    if (mode === "split" && sourceId != null) return getSplittableScopeItems(sourceId);
    if (mode === "merge") {
      const items: SplittableScopeItem[] = [];
      const seen = new Set<string>();
      for (const id of mergeSourceIds) {
        for (const item of getSplittableScopeItems(id)) {
          if (!seen.has(item.key)) {
            seen.add(item.key);
            items.push(item);
          }
        }
      }
      return items;
    }
    return [];
  }, [mode, sourceId, mergeSourceIds, tick]);

  const scopeItems = useMemo(() => {
    const keys = new Set(baseScopeItems.map((i) => i.key));
    return [...baseScopeItems, ...extraScopeItems.filter((e) => !keys.has(e.key))];
  }, [baseScopeItems, extraScopeItems]);

  const resultGeographies = useMemo(() => {
    if (mode === "merge") return [];
    const rows: Array<{ key: string; name: string; isExisting: boolean }> = [];
    if (sourceGeo) {
      rows.push({ key: "source", name: sourceGeo.name, isExisting: true });
    }
    newGeoRows.forEach((r, i) => {
      if (r.name.trim()) rows.push({ key: r.key, name: r.name.trim(), isExisting: false });
    });
    return rows;
  }, [mode, sourceGeo, newGeoRows]);

  const allocationTargets = useMemo(() => {
    if (mode === "merge") return [];
    const targets: Array<{ index: number; label: string }> = [
      { index: SOURCE_GEO_ALLOC_INDEX, label: sourceGeo ? `Keep in ${sourceGeo.name}` : "Keep in Current" },
    ];
    newGeoRows.forEach((r, i) => {
      if (r.name.trim()) targets.push({ index: i, label: r.name.trim() });
    });
    return targets;
  }, [mode, sourceGeo, newGeoRows]);

  const resultPreviews = useMemo(() => {
    if (mode === "split" && sourceId == null) return [];
    if (mode === "split") {
      return buildSplitMergeResultPreviews({
        mode: "split",
        level: geoLevel,
        sourceGeographyId: sourceId,
        resultGeographies: resultGeographies.filter((r) => !r.isExisting).length
          ? resultGeographies
          : resultGeographies,
        scopeItems,
        allocations,
      });
    }
    if (mode === "merge" && mergeSourceIds.length >= 2 && mergedName.trim()) {
      return buildSplitMergeResultPreviews({
        mode: "merge",
        level: geoLevel,
        sourceGeographyId: mergeSourceIds[0],
        resultGeographies: [],
        scopeItems,
        allocations: {},
        mergeTargetName: mergedName.trim(),
      });
    }
    return [];
  }, [mode, geoLevel, sourceId, mergeSourceIds, mergedName, resultGeographies, scopeItems, allocations, tick]);

  const allWarnings = useMemo(() => resultPreviews.flatMap((p) => p.warnings), [resultPreviews]);
  const hasUserWarnings = useMemo(
    () => resultPreviews.some((p) => p.usersByRole.some((u) => !u.userName)),
    [resultPreviews],
  );

  const unallocatedCount = useMemo(() => {
    if (mode === "merge") return 0;
    return scopeItems.filter((item) => allocations[item.key] == null).length;
  }, [mode, scopeItems, allocations]);

  const postalMasterOptions = useMemo(() => {
    if (mode !== "split" || sourceId == null) return [];
    return getUnassignedPostalMasterOptions(
      geoLevel,
      sourceId,
      scopeItems.map((s) => s.key),
    );
  }, [mode, geoLevel, sourceId, scopeItems]);

  useEffect(() => {
    if (mode === "split" && sourceId != null) {
      const items = getSplittableScopeItems(sourceId);
      const defaults: Record<string, number> = {};
      items.forEach((item) => {
        defaults[item.key] = SOURCE_GEO_ALLOC_INDEX;
      });
      setAllocations(defaults);
      setExtraScopeItems([]);
      setNewGeoRows([]);
      setPostalAddKey("");
      setPostalAddError("");
    }
  }, [mode, sourceId, geoLevel]);

  const resetWorkflow = () => {
    setSourceId(null);
    setMergeSourceIds([]);
    setNewGeoRows([]);
    setExtraScopeItems([]);
    setAllocations({});
    setMergedName("");
    setPublished(false);
    setAckWarnings(false);
    setAckUserIncomplete(false);
    setConfirmPublish(false);
  };

  const handleLevelOrModeChange = (patch: { mode?: WizardMode; level?: SplitMergeLevel }) => {
    if (patch.mode) setMode(patch.mode);
    if (patch.level) setGeoLevel(patch.level);
    resetWorkflow();
  };

  const quickAddGeography = () => {
    setNewGeoRows((rows) => [
      ...rows,
      { key: newRowKey(), name: "", effectiveFrom: effectiveDate, status: "active" },
    ]);
  };

  const handleAddFromPostalMaster = () => {
    if (!postalAddKey) return;
    const option = postalMasterOptions.find((o) => o.key === postalAddKey);
    if (!option) return;
    const check = isPostalMasterScopeAvailable(geoLevel, option.label);
    if (!check.available) {
      setPostalAddError(check.message ?? "Not available in Postal Master.");
      return;
    }
    const item = postalMasterScopeToSplittable(option);
    if (scopeItems.some((s) => s.key === item.key)) {
      setPostalAddError(`${option.label} is already in scope.`);
      return;
    }
    setExtraScopeItems((prev) => [...prev, item]);
    setAllocations((prev) => ({ ...prev, [item.key]: SOURCE_GEO_ALLOC_INDEX }));
    setPostalAddKey("");
    setPostalAddError("");
  };

  const canPublish = () => {
    if (!effectiveDate) return false;
    if (!confirmPublish) return false;
    if (mode === "split") {
      if (sourceId == null) return false;
      if (newGeoRows.filter((r) => r.name.trim()).length === 0) return false;
      if (unallocatedCount > 0) return false;
    }
    if (mode === "merge") {
      if (mergeSourceIds.length < 2 || !mergedName.trim()) return false;
    }
    if (allWarnings.length > 0 && !ackWarnings) return false;
    if (hasUserWarnings && !ackUserIncomplete) return false;
    return true;
  };

  const applyUserAssignments = (
    geographyId: number,
    cardKey: string,
    effectiveFrom: string,
  ) => {
    const cardAssignments = userAssignmentsByCard[cardKey] ?? {};
    const assignments = loadUserAssignments();
    let next = [...assignments];
    let nextId = Math.max(0, ...next.map((a) => a.id)) + 1;

    for (const [role, ua] of Object.entries(cardAssignments) as Array<[SalesRole, RoleUserAssignment]>) {
      const existing = next.find(
        (a) => a.geographyId === geographyId && a.role === role && a.status === "active",
      );
      if (ua.action === "keep" && existing) continue;
      if (ua.action === "unassigned") {
        if (existing) {
          const idx = next.findIndex((a) => a.id === existing.id);
          next[idx] = { ...existing, effectiveTo: effectiveFrom, status: "ended" };
        }
        continue;
      }
      if (ua.action === "assign" && ua.userId) {
        const user = getAssignableUserById(Number(ua.userId));
        if (!user) continue;
        if (existing) {
          const idx = next.findIndex((a) => a.id === existing.id);
          next[idx] = { ...existing, effectiveTo: effectiveFrom, status: "ended" };
        }
        next.push({
          id: nextId++,
          geographyId,
          role,
          userName: user.fullName,
          parentManager: "",
          effectiveFrom,
          effectiveTo: null,
          status: "active",
          allowSharedOwnership: false,
        });
      }
    }
    saveUserAssignments(next);
  };

  const handlePublish = () => {
    if (!canPublish()) return;

    if (mode === "split" && sourceId != null && sourceGeo) {
      const createdIds: number[] = [];
      const createdKeys: string[] = [];

      for (const row of newGeoRows.filter((r) => r.name.trim())) {
        const input: GeographyFormInput = {
          name: row.name.trim(),
          geographyType: geoLevel,
          parentId: sourceGeo.parentId,
          effectiveFrom: row.effectiveFrom || effectiveDate,
          status: row.status,
        };
        const g = createGeography(input);
        createdIds.push(g.id);
        createdKeys.push(row.key);
      }

      const itemsForSource = scopeItems.filter(
        (item) => (allocations[item.key] ?? SOURCE_GEO_ALLOC_INDEX) === SOURCE_GEO_ALLOC_INDEX,
      );

      if (geoLevel === "Zone") {
        const allGeos = loadGeographies();
        const nextGeos = [...allGeos];
        for (const item of scopeItems) {
          if (!item.key.startsWith("region:")) continue;
          const regionId = Number(item.key.replace(/^region:/, ""));
          const alloc = allocations[item.key] ?? SOURCE_GEO_ALLOC_INDEX;
          if (alloc === SOURCE_GEO_ALLOC_INDEX) continue;
          const targetZoneId = createdIds[alloc];
          if (!targetZoneId) continue;
          const idx = nextGeos.findIndex((g) => g.id === regionId);
          if (idx >= 0) nextGeos[idx] = { ...nextGeos[idx], parentId: targetZoneId };
        }
        saveGeographies(nextGeos);
        const remainingRegions = itemsForSource.filter((i) => i.kind === "region");
        if (remainingRegions.length === 0 && itemsForSource.length === 0) {
          setGeographyStatus(sourceId, "inactive");
        }
      } else if (geoLevel === "Territory") {
        const mappings = loadCoverageMappings();
        let nextMapId = Math.max(0, ...mappings.map((m) => m.id)) + 1;
        const movedKeys = new Set(
          scopeItems
            .filter((i) => (allocations[i.key] ?? SOURCE_GEO_ALLOC_INDEX) !== SOURCE_GEO_ALLOC_INDEX)
            .map((i) => i.key.replace(/^pincode:/, "")),
        );
        let nextMappings = mappings.map((m) => {
          if (m.geographyId === sourceId && m.status === "active" && movedKeys.has(m.pincodeKey)) {
            return { ...m, effectiveTo: effectiveDate, status: "ended" as const };
          }
          return m;
        });
        for (const item of scopeItems) {
          const alloc = allocations[item.key] ?? SOURCE_GEO_ALLOC_INDEX;
          if (alloc === SOURCE_GEO_ALLOC_INDEX) continue;
          const targetGeoId = createdIds[alloc];
          const pinKey = item.key.replace(/^pincode:/, "");
          if (targetGeoId) {
            nextMappings.push({
              id: nextMapId++,
              pincodeKey: pinKey,
              geographyId: targetGeoId,
              effectiveFrom: effectiveDate,
              effectiveTo: null,
              status: "active",
            });
          }
        }
        const keptCount = itemsForSource.filter((i) => i.kind === "pincode").length;
        if (keptCount === 0) {
          setGeographyStatus(sourceId, "inactive");
        }
        saveCoverageMappings(nextMappings);
      } else if (geoLevel === "Region") {
        for (let i = 0; i < createdIds.length; i++) {
          const states = scopeItems
            .filter((item) => item.kind === "state" && allocations[item.key] === i)
            .map((item) => item.key.replace(/^state:/, ""));
          if (states.length) {
            upsertCoverageDefinition({
              geographyId: createdIds[i],
              geographyType: "Region",
              states,
              districts: [],
              cities: [],
              towns: [],
              pincodeKeys: [],
            });
          }
          applyUserAssignments(createdIds[i], createdKeys[i], effectiveDate);
        }
        const remainingStates = itemsForSource
          .filter((i) => i.kind === "state")
          .map((i) => i.key.replace(/^state:/, ""));
        upsertCoverageDefinition({
          geographyId: sourceId,
          geographyType: "Region",
          states: remainingStates,
          districts: [],
          cities: [],
          towns: [],
          pincodeKeys: [],
        });
        if (remainingStates.length === 0) setGeographyStatus(sourceId, "inactive");
        applyUserAssignments(sourceId, "source", effectiveDate);
      } else if (geoLevel === "Area") {
        for (let i = 0; i < createdIds.length; i++) {
          const districts = scopeItems
            .filter((item) => item.kind === "district" && allocations[item.key] === i)
            .map((item) => item.key.replace(/^district:/, ""));
          if (districts.length) {
            upsertCoverageDefinition({
              geographyId: createdIds[i],
              geographyType: "Area",
              states: [],
              districts,
              cities: [],
              towns: [],
              pincodeKeys: [],
            });
          }
          const allGeos = loadGeographies();
          const nextGeos = [...allGeos];
          for (const item of scopeItems) {
            if (item.kind !== "territory") continue;
            if (allocations[item.key] !== i) continue;
            const territoryId = Number(item.key.replace(/^territory:/, ""));
            const idx = nextGeos.findIndex((g) => g.id === territoryId);
            if (idx >= 0) nextGeos[idx] = { ...nextGeos[idx], parentId: createdIds[i] };
          }
          saveGeographies(nextGeos);
          applyUserAssignments(createdIds[i], createdKeys[i], effectiveDate);
        }
        const remainingDistricts = itemsForSource
          .filter((i) => i.kind === "district")
          .map((i) => i.key.replace(/^district:/, ""));
        const srcDef = getCoverageDefinition(sourceId);
        upsertCoverageDefinition({
          geographyId: sourceId,
          geographyType: "Area",
          states: [],
          districts: remainingDistricts,
          cities: [],
          towns: [],
          pincodeKeys: srcDef?.pincodeKeys ?? [],
        });
        if (remainingDistricts.length === 0 && !itemsForSource.some((i) => i.kind === "territory")) {
          setGeographyStatus(sourceId, "inactive");
        }
        applyUserAssignments(sourceId, "source", effectiveDate);
      }

      if (geoLevel !== "Region" && geoLevel !== "Area") {
        createdIds.forEach((id, i) => applyUserAssignments(id, createdKeys[i], effectiveDate));
        if (geoLevel === "Zone") applyUserAssignments(sourceId, "source", effectiveDate);
        if (geoLevel === "Territory") applyUserAssignments(sourceId, "source", effectiveDate);
      }

      syncGeographyCoverageCounts();
      addAuditEntry({
        actionType: "Geography Split",
        oldGeography: sourceGeo.name,
        newGeography: newGeoRows.map((r) => r.name).join(", "),
        effectiveFrom: effectiveDate,
        remarks: `Split ${geoLevel} ${sourceGeo.name}. Customer master unchanged; visibility recalculates from pincode.`,
      });
    } else if (mode === "merge" && mergeSourceIds.length >= 2) {
      const first = getGeographyById(mergeSourceIds[0]);
      const parentId = first?.parentId ?? null;
      const merged = createGeography({
        name: mergedName.trim(),
        geographyType: geoLevel,
        parentId,
        effectiveFrom: effectiveDate,
        status: "active",
      });

      if (geoLevel === "Territory") {
        const mappings = loadCoverageMappings();
        let nextMapId = Math.max(0, ...mappings.map((m) => m.id)) + 1;
        let nextMappings = [...mappings];
        for (const srcId of mergeSourceIds) {
          nextMappings = nextMappings.map((m) =>
            m.geographyId === srcId && m.status === "active"
              ? { ...m, effectiveTo: effectiveDate, status: "ended" as const }
              : m,
          );
          for (const item of getSplittableScopeItems(srcId)) {
            const pinKey = item.key.replace(/^pincode:/, "");
            nextMappings.push({
              id: nextMapId++,
              pincodeKey: pinKey,
              geographyId: merged.id,
              effectiveFrom: effectiveDate,
              effectiveTo: null,
              status: "active",
            });
          }
          setGeographyStatus(srcId, "inactive");
        }
        saveCoverageMappings(nextMappings);
      } else if (geoLevel === "Zone") {
        const allGeos = loadGeographies();
        const nextGeos = [...allGeos];
        for (const srcId of mergeSourceIds) {
          for (const region of loadGeographies().filter((g) => g.parentId === srcId)) {
            const idx = nextGeos.findIndex((g) => g.id === region.id);
            if (idx >= 0) nextGeos[idx] = { ...nextGeos[idx], parentId: merged.id };
          }
          setGeographyStatus(srcId, "inactive");
        }
        saveGeographies(nextGeos);
      } else {
        const states: string[] = [];
        const districts: string[] = [];
        for (const srcId of mergeSourceIds) {
          const def = getCoverageDefinition(srcId);
          if (geoLevel === "Region" && def) states.push(...def.states);
          if (geoLevel === "Area" && def) districts.push(...def.districts);
          if (geoLevel === "Area") {
            const allGeos = loadGeographies();
            const nextGeos = allGeos.map((g) =>
              g.parentId === srcId && g.geographyType === "Territory"
                ? { ...g, parentId: merged.id }
                : g,
            );
            saveGeographies(nextGeos);
          }
          setGeographyStatus(srcId, "inactive");
        }
        const def: GeographyCoverageDefinition = {
          geographyId: merged.id,
          geographyType: geoLevel,
          states: geoLevel === "Region" ? [...new Set(states)] : [],
          districts: geoLevel === "Area" ? [...new Set(districts)] : [],
          cities: [],
          towns: [],
          pincodeKeys: [],
        };
        upsertCoverageDefinition(def);
      }

      applyUserAssignments(merged.id, "merge-target", effectiveDate);
      syncGeographyCoverageCounts();
      addAuditEntry({
        actionType: "Geography Merged",
        oldGeography: mergeSourceIds.map((id) => getGeographyById(id)?.name).join(", "),
        newGeography: merged.name,
        effectiveFrom: effectiveDate,
        remarks: `Merged ${geoLevel}s into ${merged.name}. Old geographies set inactive with effective-to date.`,
      });
    }

    setPublished(true);
    setTick((t) => t + 1);
  };

  const childGeographies = useMemo(() => {
    if (!sourceId) return [];
    return loadGeographies().filter((g) => g.parentId === sourceId && g.status === "active");
  }, [sourceId, tick]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-base font-semibold">Geography Split / Merge</h2>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
          Split or merge Zone, Region, Area, or Territory while preserving postal coverage, users,
          customers, and audit history.
        </p>
      </div>

      {/* Top controls — left aligned */}
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
                value={sourceId != null ? String(sourceId) : ""}
                onValueChange={(v) => {
                  setSourceId(Number(v));
                  setPublished(false);
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder={`Select source ${geoLevel.toLowerCase()}`} />
                </SelectTrigger>
                <SelectContent>
                  {geoOptions.map((o) => (
                    <SelectItem key={o.id} value={String(o.id)} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="border border-border rounded-lg p-2 max-h-[120px] overflow-y-auto space-y-1">
                {geoOptions.map((o) => (
                  <label key={o.id} className="flex items-center gap-2 text-xs cursor-pointer">
                    <input
                      type="checkbox"
                      checked={mergeSourceIds.includes(o.id)}
                      onChange={() => {
                        setMergeSourceIds((prev) =>
                          prev.includes(o.id) ? prev.filter((id) => id !== o.id) : [...prev, o.id],
                        );
                        setPublished(false);
                      }}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Effective Date</Label>
            <Input
              type="date"
              className="h-9 text-sm"
              value={effectiveDate}
              onChange={(e) => setEffectiveDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {published && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs text-emerald-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          Published successfully. Audit entry created. Customer master unchanged — visibility
          recalculates from pincode mapping.
        </div>
      )}

      {/* Split: current scope */}
      {mode === "split" && sourceGeo && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">
            Current Scope — {geoLevel} {sourceGeo.name}
          </h3>
          <p className="text-xs text-muted-foreground">
            {geoLevel} {sourceGeo.name} currently contains:
          </p>
          <ul className="text-xs grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-1">
            {scopeItems.map((item) => (
              <li key={item.key} className="flex items-center gap-1">
                <span className="font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="text-muted-foreground">({item.sublabel})</span>
                )}
              </li>
            ))}
          </ul>
          {childGeographies.length > 0 && (
            <div className="pt-2 border-t border-border">
              <p className="text-[11px] font-medium text-muted-foreground mb-1">Child geographies</p>
              <ul className="text-xs flex flex-wrap gap-2">
                {childGeographies.map((c) => (
                  <li key={c.id} className="px-2 py-0.5 rounded-md bg-muted/40">
                    {c.name} ({c.geographyType})
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      {/* Step 1: Create / Select Result Geographies */}
      {mode === "split" && sourceId != null && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h3 className="text-sm font-semibold">Step 1: Create New Geographies</h3>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1"
              onClick={quickAddGeography}
            >
              <Plus className="w-3.5 h-3.5" /> Quick Add Geography
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Existing geography <strong>{sourceGeo?.name}</strong> stays active. Add new{" "}
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

      {/* Merge target */}
      {mode === "merge" && mergeSourceIds.length >= 2 && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <h3 className="text-sm font-semibold">Create / Select Target Geography</h3>
          <div className="max-w-md space-y-1">
            <Label className="text-xs">Target {geoLevel} Name</Label>
            <Input
              className="h-9 text-sm"
              value={mergedName}
              onChange={(e) => setMergedName(e.target.value)}
              placeholder={`e.g. West Coastal ${geoLevel}`}
            />
          </div>
          <p className="text-xs text-muted-foreground">
            All {LEVEL_CHILD_LABEL[geoLevel].toLowerCase()} from selected geographies will move to
            the target. Old geographies become inactive — not deleted.
          </p>
        </section>
      )}

      {/* Step 2: Allocate scope */}
      {mode === "split" && sourceId != null && scopeItems.length > 0 && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-4">
          <h3 className="text-sm font-semibold">
            Step 2: Allocate {LEVEL_CHILD_LABEL[geoLevel]}
          </h3>
          <p className="text-xs text-muted-foreground">
            Move selected postal scope from the existing geography to new geographies. You can keep
            items in the current geography — not everything must move.
          </p>

          <div className="space-y-2">
            {scopeItems.map((item) => (
              <div
                key={item.key}
                className="flex flex-col sm:flex-row sm:items-center gap-2 text-xs border-b border-border/60 pb-2"
              >
                <span className="sm:w-48 font-medium">{item.label}</span>
                {item.sublabel && (
                  <span className="text-muted-foreground sm:w-32">{item.sublabel}</span>
                )}
                <Select
                  value={String(allocations[item.key] ?? SOURCE_GEO_ALLOC_INDEX)}
                  onValueChange={(v) =>
                    setAllocations((p) => ({ ...p, [item.key]: Number(v) }))
                  }
                >
                  <SelectTrigger className="h-8 text-xs sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allocationTargets.map((t) => (
                      <SelectItem key={t.index} value={String(t.index)} className="text-xs">
                        {t.index === SOURCE_GEO_ALLOC_INDEX ? "Keep in Current" : `Move to New — ${t.label}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {unallocatedCount > 0 && (
            <p className="text-xs text-amber-700 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5" />
              {unallocatedCount} {LEVEL_SCOPE_LABEL[geoLevel].toLowerCase()}
              (s) still need allocation before publish.
            </p>
          )}

          {(geoLevel === "Region" || geoLevel === "Area" || geoLevel === "Territory") && (
            <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
              <p className="text-xs font-semibold">Add From Postal Master</p>
              <div className="flex flex-col sm:flex-row gap-2">
                <Select value={postalAddKey} onValueChange={setPostalAddKey}>
                  <SelectTrigger className="h-8 text-xs sm:flex-1">
                    <SelectValue placeholder="Select from Postal Master…" />
                  </SelectTrigger>
                  <SelectContent>
                    {postalMasterOptions.length === 0 ? (
                      <SelectItem value="__none__" disabled className="text-xs">
                        No additional scope available
                      </SelectItem>
                    ) : (
                      postalMasterOptions.map((o) => (
                        <SelectItem key={o.key} value={o.key} className="text-xs">
                          {o.label}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs shrink-0"
                  onClick={handleAddFromPostalMaster}
                  disabled={!postalAddKey}
                >
                  Add Scope
                </Button>
              </div>
              {postalAddError && (
                <p className="text-xs text-amber-700">{postalAddError}</p>
              )}
            </div>
          )}
        </section>
      )}

      {/* Step 3: Result cards */}
      {resultPreviews.length > 0 && (
        <section className="space-y-3">
          <h3 className="text-sm font-semibold">Step 3: Review Result Cards</h3>
          <p className="text-xs text-muted-foreground">
            Review what each resulting geography will contain before publishing.
          </p>
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
            {resultPreviews.map((preview) => (
              <SplitMergeResultCard
                key={preview.key}
                preview={preview}
                userAssignments={userAssignmentsByCard[preview.key] ?? {}}
                onUserAssignmentChange={(role, patch) => {
                  setUserAssignmentsByCard((prev) => ({
                    ...prev,
                    [preview.key]: {
                      ...(prev[preview.key] ?? {}),
                      [role]: {
                        ...(prev[preview.key]?.[role] ?? { action: "unassigned" as const, userId: "" }),
                        ...patch,
                      },
                    },
                  }));
                }}
                mergeSourceNames={
                  mode === "merge"
                    ? mergeSourceIds.map((id) => getGeographyById(id)?.name ?? "").filter(Boolean)
                    : undefined
                }
              />
            ))}
          </div>
        </section>
      )}

      {/* Bottom: summary + publish */}
      {(mode === "split" ? sourceId != null : mergeSourceIds.length >= 2) && !published && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-4">
          <h3 className="text-sm font-semibold">Confirm &amp; Publish</h3>

          {mode === "split" && sourceGeo && (
            <div className="text-xs space-y-1 text-muted-foreground">
              <p className="font-medium text-foreground">This split will:</p>
              {scopeItems
                .filter((item) => allocations[item.key] != null && allocations[item.key] !== SOURCE_GEO_ALLOC_INDEX)
                .map((item) => {
                  const target = allocationTargets.find((t) => t.index === allocations[item.key]);
                  return (
                    <p key={item.key}>
                      · Move <strong>{item.label}</strong> from {sourceGeo.name} to{" "}
                      <strong>{target?.label.replace(/^Move to New — /, "") ?? "new geography"}</strong>
                    </p>
                  );
                })}
              {scopeItems
                .filter((item) => (allocations[item.key] ?? SOURCE_GEO_ALLOC_INDEX) === SOURCE_GEO_ALLOC_INDEX)
                .map((item) => (
                  <p key={item.key}>
                    · Keep <strong>{item.label}</strong> in {sourceGeo.name}
                  </p>
                ))}
              <p>· Recalculate customer visibility from pincode mapping</p>
              <p>· Apply effective date {effectiveDate} (old mapping Effective To, new Effective From)</p>
              <p>· Create audit history entry</p>
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
            className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!canPublish()}
            onClick={handlePublish}
          >
            Publish
          </Button>
        </section>
      )}
    </div>
  );
}
