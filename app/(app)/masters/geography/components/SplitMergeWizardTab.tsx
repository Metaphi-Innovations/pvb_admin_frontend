"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronsUpDown,
  Combine,
  Loader2,
  Plus,
  Search,
  Split,
  Trash2,
} from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { showToast } from "@/lib/toast";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import { masterKeys } from "@/lib/masters/master-query-keys";
import { userManagementKeys } from "@/lib/user-management/user-management-query-keys";
import { cn } from "@/lib/utils";
import { todayStr } from "../geography-master-data";
import {
  getRolesForSplitMergeLevel,
  isInheritedSplitMergeRole,
  type SplitMergeLevel,
} from "../geography-workflow-data";
import {
  BusinessGeographyService,
  toSplitMergeApiLevel,
  type SplitMergeAssignableUser,
  type SplitMergeJobView,
  type SplitMergeSourceOption,
} from "@/services/business-geography.service";
import {
  useBgLookupAreas,
  useBgLookupRegions,
  useBgLookupZones,
} from "@/hooks/masters";
import {
  SplitMergeResultCard,
  type RoleUserAssignment,
  type SplitMergeCardPreview,
} from "./SplitMergeResultCard";
import { GeographyFormSheet } from "./GeographyFormSheet";

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

const LEVEL_CHILD_SINGULAR: Record<SplitMergeLevel, string> = {
  Zone: "region",
  Region: "area",
  Area: "territory",
  Territory: "pincode",
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

function pluralGeoLevel(level: SplitMergeLevel): string {
  if (level === "Territory") return "Territories";
  return `${level}s`;
}

function pluralCountLabel(count: number, singular: string, plural: string) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function compareByName(a: string, b: string) {
  return a.localeCompare(b, undefined, { sensitivity: "base", numeric: true });
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
    : getRolesForSplitMergeLevel(params.geoLevel);

  const findInheritedUser = (role: string) => {
    const norm = role.trim().toUpperCase();
    return params.assignableUsers.find((u) => {
      const gLevel = (u.geography_level || "").trim().toUpperCase();
      const rName = (u.role_name || "").trim().toUpperCase();
      const matchesRole =
        rName.includes(norm) ||
        gLevel === (norm === "ZSM" ? "ZONE" : norm === "RSM" ? "REGION" : norm === "ASM" ? "AREA" : "TERRITORY");
      if (!matchesRole) return false;
      if (norm === "ZSM") return Boolean(u.zone_id);
      if (norm === "RSM") return Boolean(u.region_id);
      if (norm === "ASM") return Boolean(u.area_id);
      return Boolean(u.territory_id);
    });
  };

  const matchesAssignmentRole = (u: SplitMergeAssignableUser, role: string) => {
    const norm = role.trim().toUpperCase();
    const rName = (u.role_name || "").trim().toUpperCase();
    const gLevel = (u.geography_level || "").trim().toUpperCase();
    const targetLevel =
      norm === "ZSM"
        ? "ZONE"
        : norm === "RSM"
          ? "REGION"
          : norm === "ASM"
            ? "AREA"
            : "TERRITORY";
    return rName.includes(norm) || gLevel === targetLevel;
  };

  const findUserOnSource = (role: string) => {
    if (!params.job?.source_id) return undefined;
    const sourceId = params.job.source_id;
    return params.assignableUsers.find((u) => {
      if (!matchesAssignmentRole(u, role)) return false;
      if (params.geoLevel === "Zone") return u.zone_id === sourceId;
      if (params.geoLevel === "Region") return u.region_id === sourceId;
      if (params.geoLevel === "Area") return u.area_id === sourceId;
      if (params.geoLevel === "Territory") return u.territory_id === sourceId;
      return false;
    });
  };

  const resolveUserName = (nodeKey: string, role: string): string | null => {
    if (isInheritedSplitMergeRole(params.geoLevel, role)) {
      return findInheritedUser(role)?.full_name ?? `Parent ${role}`;
    }
    const ua = params.userAssignmentsByCard[nodeKey]?.[role];
    if (ua?.action === "unassigned") return null;
    if (ua?.action === "assign" && ua.userId) {
      return (
        params.assignableUsers.find((u) => u.user_id === ua.userId)?.full_name ?? null
      );
    }
    // Keep Existing on source: only the user actually mapped to this geography
    if (nodeKey === "source" && params.job) {
      return findUserOnSource(role)?.full_name ?? null;
    }
    return null;
  };

  const roleRows = (nodeKey: string) =>
    roles.map((role) => {
      const userName = resolveUserName(nodeKey, role);
      const inherited = isInheritedSplitMergeRole(params.geoLevel, role);
      return {
        role,
        userName,
        status: inherited || userName ? ("assigned" as const) : ("missing" as const),
      };
    });

  if (params.mode === "merge") {
    if (params.mergeSourceNames.length < 2 || !params.mergedName.trim()) return [];
    const usersByRole = roleRows("merge_target");
    const warnings = usersByRole
      .filter((u) => u.status === "missing" && !isInheritedSplitMergeRole(params.geoLevel, u.role))
      .map((u) => `${u.role} not assigned on merge target`);
    const childLabel = LEVEL_CHILD_LABEL[params.geoLevel];
    const childCount = (params.job?.sources ?? []).reduce(
      (sum, s) => sum + (s.children?.length ?? 0),
      0,
    );
    const fallbackChildCount = params.job?.source.children?.length ?? 0;
    const totalChildren = childCount > 0 ? childCount : fallbackChildCount;
    const scopeLabels =
      totalChildren > 0
        ? [
            `${totalChildren} ${childLabel.toLowerCase()} from ${params.mergeSourceNames.length} ${params.geoLevel.toLowerCase()}s`,
            ...params.mergeSourceNames.map((n) => `← ${n}`),
          ]
        : [`All ${childLabel.toLowerCase()} from ${params.mergeSourceNames.length} sources`];
    return [
      {
        key: "merge_target",
        name: params.mergedName.trim(),
        level: params.geoLevel,
        parentName: "—",
        isExisting: false,
        assignedScopeLabels: scopeLabels,
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
      if (u.status === "missing" && !isInheritedSplitMergeRole(params.geoLevel, u.role)) {
        warnings.push(`${u.role} not assigned on source`);
      }
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
      if (u.status === "missing" && !isInheritedSplitMergeRole(params.geoLevel, u.role)) {
        warnings.push(`${u.role} not assigned`);
      }
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

  // Enforce unique user assignments across cards (kept + explicitly assigned).
  const userAssignmentsByRole = new Map<string, { userId: string; userName: string; cardName: string }[]>();
  for (const card of cards) {
    const byRole = params.userAssignmentsByCard[card.key] ?? {};
    for (const role of roles) {
      if (isInheritedSplitMergeRole(params.geoLevel, role)) continue;
      const ua = byRole[role];
      const action = ua?.action ?? (card.isExisting ? "keep" : "unassigned");
      if (action === "assign" && ua?.userId) {
        const uObj = params.assignableUsers.find((u) => u.user_id === ua.userId);
        const name = uObj?.full_name ?? "Selected User";
        const list = userAssignmentsByRole.get(role) ?? [];
        list.push({ userId: ua.userId, userName: name, cardName: card.name });
        userAssignmentsByRole.set(role, list);
      } else if (action === "keep" && card.isExisting && params.job) {
        const keptId = ua?.userId;
        const existing = keptId
          ? params.assignableUsers.find((u) => u.user_id === keptId)
          : findUserOnSource(role);
        if (existing) {
          const list = userAssignmentsByRole.get(role) ?? [];
          list.push({
            userId: existing.user_id,
            userName: existing.full_name,
            cardName: card.name,
          });
          userAssignmentsByRole.set(role, list);
        }
      }
    }
  }

  for (const [, list] of userAssignmentsByRole.entries()) {
    const userCount = new Map<string, { count: number; name: string; cards: string[] }>();
    for (const item of list) {
      const current = userCount.get(item.userId) ?? { count: 0, name: item.userName, cards: [] };
      current.count += 1;
      current.cards.push(item.cardName);
      userCount.set(item.userId, current);
    }
    for (const [, info] of userCount.entries()) {
      if (info.count > 1) {
        // Find the cards involved and add duplicate warning
        for (const card of cards) {
          if (info.cards.includes(card.name)) {
            card.warnings.push(
              `Duplicate user: "${info.name}" is assigned to multiple geographies (${info.cards.join(", ")}). Each geography must have a unique user.`,
            );
          }
        }
      }
    }
  }

  return cards;
}

export function SplitMergeWizardTab() {
  const queryClient = useQueryClient();
  const [mode, setMode] = useState<WizardMode>("split");
  const [wizardActive, setWizardActive] = useState(false);
  const [geoLevel, setGeoLevel] = useState<SplitMergeLevel>("Zone");
  const [sourceId, setSourceId] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState("");
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
  const [sourceSearch, setSourceSearch] = useState("");
  const [sourcePickerOpen, setSourcePickerOpen] = useState(false);
  /** Merge parent cascade filters */
  const [filterZoneId, setFilterZoneId] = useState<string | null>(null);
  const [filterRegionId, setFilterRegionId] = useState<string | null>(null);
  const [filterAreaId, setFilterAreaId] = useState<string | null>(null);
  const [job, setJob] = useState<SplitMergeJobView | null>(null);
  const [jobLoading, setJobLoading] = useState(false);
  const [assignableUsers, setAssignableUsers] = useState<SplitMergeAssignableUser[]>([]);
  const [publishing, setPublishing] = useState(false);
  const [quickAddChildOpen, setQuickAddChildOpen] = useState(false);

  const createLock = useRef(false);
  const apiLevel = toSplitMergeApiLevel(geoLevel);

  const needsMergeZone =
    mode === "merge" && (geoLevel === "Region" || geoLevel === "Area" || geoLevel === "Territory");
  const needsMergeRegion =
    mode === "merge" && (geoLevel === "Area" || geoLevel === "Territory");
  const needsMergeArea = mode === "merge" && geoLevel === "Territory";

  const zonesQuery = useBgLookupZones(needsMergeZone);
  const regionsQuery = useBgLookupRegions(filterZoneId, needsMergeRegion && Boolean(filterZoneId));
  const areasQuery = useBgLookupAreas(filterRegionId, needsMergeArea && Boolean(filterRegionId));

  const mergeParentId = useMemo(() => {
    if (mode !== "merge") return undefined;
    if (geoLevel === "Region") return filterZoneId ?? undefined;
    if (geoLevel === "Area") return filterRegionId ?? undefined;
    if (geoLevel === "Territory") return filterAreaId ?? undefined;
    return undefined;
  }, [mode, geoLevel, filterZoneId, filterRegionId, filterAreaId]);

  const mergeParentsReady =
    mode !== "merge" ||
    geoLevel === "Zone" ||
    (geoLevel === "Region" && Boolean(filterZoneId)) ||
    (geoLevel === "Area" && Boolean(filterRegionId)) ||
    (geoLevel === "Territory" && Boolean(filterAreaId));

  const clearMergeSelection = useCallback(() => {
    setMergeSourceIds([]);
    setMergedName("");
    setJob(null);
    setPublished(false);
    setAssignableUsers([]);
    setUserAssignmentsByCard({});
  }, []);

  const refreshSplitJob = useCallback(async () => {
    if (!sourceId || !effectiveDate) return;
    setJobLoading(true);
    try {
      const created = await BusinessGeographyService.createSplitMergeJob({
        operation_type: "SPLIT",
        geography_level: apiLevel,
        source_ids: [sourceId],
        effective_date: effectiveDate,
      });
      setJob(created);
      setAllocations((prev) => {
        const next = { ...prev };
        for (const child of created.source.children ?? []) {
          if (!next[child.id]) {
            next[child.id] = KEEP;
          }
        }
        return next;
      });
      const assignable = await BusinessGeographyService.listSplitMergeAssignableUsers(created.id);
      setAssignableUsers(assignable.users ?? []);
    } catch (err) {
      console.error("Failed to refresh split job:", err);
    } finally {
      setJobLoading(false);
    }
  }, [sourceId, effectiveDate, apiLevel]);

  const loadSources = useCallback(async (search?: string) => {
    if (mode === "merge" && !mergeParentsReady) {
      setSources([]);
      setSourcesLoading(false);
      return;
    }
    setSourcesLoading(true);
    try {
      const rows = await BusinessGeographyService.listSplitMergeSources({
        geography_level: apiLevel,
        ...(mergeParentId ? { parent_id: mergeParentId } : {}),
        ...(search?.trim() ? { search: search.trim() } : {}),
      });
      setSources(rows.filter((r) => r.status));
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to load geography sources."), "error");
      setSources([]);
    } finally {
      setSourcesLoading(false);
    }
  }, [apiLevel, mode, mergeParentId, mergeParentsReady]);

  useEffect(() => {
    const q = sourceSearch.trim();
    if (!q) {
      void loadSources();
      return;
    }
    const timer = window.setTimeout(() => {
      void loadSources(q);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [loadSources, sourceSearch]);

  const resetWorkflow = useCallback(() => {
    setSourceId(null);
    setSourceLabel("");
    setMergeSourceIds([]);
    setSourceSearch("");
    setSourcePickerOpen(false);
    setFilterZoneId(null);
    setFilterRegionId(null);
    setFilterAreaId(null);
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

  const handleModeTabChange = (next: string) => {
    const nextMode = next as WizardMode;
    if (nextMode === mode) return;
    handleLevelOrModeChange({ mode: nextMode });
    setWizardActive(false);
  };

  const startWizard = () => {
    resetWorkflow();
    setWizardActive(true);
  };

  const exitWizard = () => {
    resetWorkflow();
    setWizardActive(false);
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

  /** Always load assignable users whenever job draft is active */
  useEffect(() => {
    if (!job?.id || published) return;
    let cancelled = false;

    const fetchAssignable = async () => {
      try {
        const assignable = await BusinessGeographyService.listSplitMergeAssignableUsers(job.id);
        if (!cancelled) {
          setAssignableUsers(assignable.users ?? []);
        }
      } catch (err) {
        console.error("Failed to load assignable users for job:", err);
      }
    };

    void fetchAssignable();
    return () => {
      cancelled = true;
    };
  }, [job?.id, published]);

  // Seed Keep Existing on source with the current mapped user id so new geos grey them out immediately
  useEffect(() => {
    if (!job?.source_id || assignableUsers.length === 0) return;
    const sourceId = job.source_id;
    const roles = (job.assignment_roles?.length
      ? job.assignment_roles
      : getRolesForSplitMergeLevel(geoLevel)
    ).filter((r) => !isInheritedSplitMergeRole(geoLevel, r));

    setUserAssignmentsByCard((prev) => {
      let changed = false;
      const next = { ...prev };
      const sourceRoles = { ...(next["source"] ?? {}) };

      for (const role of roles) {
        const current = sourceRoles[role];
        const action = current?.action ?? "keep";
        if (action !== "keep") continue;
        if (current?.userId) continue;

        const existing = assignableUsers.find((u) => {
          const onSource =
            (geoLevel === "Zone" && u.zone_id === sourceId) ||
            (geoLevel === "Region" && u.region_id === sourceId) ||
            (geoLevel === "Area" && u.area_id === sourceId) ||
            (geoLevel === "Territory" && u.territory_id === sourceId);
          if (!onSource) return false;
          const norm = role.trim().toUpperCase();
          const rName = (u.role_name || "").toUpperCase();
          const gLevel = (u.geography_level || "").toUpperCase();
          return (
            rName.includes(norm) ||
            gLevel ===
              (norm === "ZSM"
                ? "ZONE"
                : norm === "RSM"
                  ? "REGION"
                  : norm === "ASM"
                    ? "AREA"
                    : "TERRITORY")
          );
        });
        if (!existing) continue;
        sourceRoles[role] = { action: "keep", userId: existing.user_id };
        changed = true;
      }

      if (!changed) return prev;
      next["source"] = sourceRoles;
      return next;
    });
  }, [job?.source_id, job?.assignment_roles, assignableUsers, geoLevel]);

  const mergeSourceNames = useMemo(
    () =>
      mergeSourceIds
        .map((id) => sources.find((s) => s.id === id)?.name ?? "")
        .filter(Boolean)
        .sort(compareByName),
    [mergeSourceIds, sources],
  );

  const sortedMergeSources = useMemo(() => {
    const selected = new Set(mergeSourceIds);
    return [...sources].sort((a, b) => {
      const aSelected = selected.has(a.id) ? 0 : 1;
      const bSelected = selected.has(b.id) ? 0 : 1;
      if (aSelected !== bSelected) return aSelected - bSelected;
      return compareByName(a.name, b.name);
    });
  }, [sources, mergeSourceIds]);

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
  const hasDuplicateUserWarnings = useMemo(
    () => allWarnings.some((w) => w.startsWith("Duplicate user:")),
    [allWarnings],
  );
  const hasUserWarnings = useMemo(
    () =>
      resultPreviews.some((p) =>
        p.usersByRole.some(
          (u) => u.status === "missing" && !isInheritedSplitMergeRole(geoLevel, u.role),
        ),
      ),
    [resultPreviews, geoLevel],
  );

  const assignedUserIdsByRole = useMemo(() => {
    const map: Record<string, Record<string, string>> = {}; // [role -> [userId -> cardKey]]

    // Explicit Assign / Keep (with stored user id) lock that user on other cards
    for (const [cardKey, byRole] of Object.entries(userAssignmentsByCard)) {
      for (const [role, ua] of Object.entries(byRole)) {
        if ((ua.action === "assign" || ua.action === "keep") && ua.userId) {
          if (!map[role]) map[role] = {};
          map[role][ua.userId] = cardKey;
        }
      }
    }

    // Default Keep Existing on source (no explicit row yet): lock current source user
    if (job?.source_id) {
      const sourceId = job.source_id;
      const sourceByRole = userAssignmentsByCard["source"] ?? {};
      const roles = (job?.assignment_roles?.length
        ? job.assignment_roles
        : getRolesForSplitMergeLevel(geoLevel)
      ).filter((r) => !isInheritedSplitMergeRole(geoLevel, r));

      for (const r of roles) {
        const action = sourceByRole[r]?.action ?? "keep";
        if (action !== "keep") continue;
        // Already locked via stored userId above
        if (sourceByRole[r]?.userId && map[r]?.[sourceByRole[r].userId]) continue;

        const existing = assignableUsers.find((u) => {
          const onSource =
            (geoLevel === "Zone" && u.zone_id === sourceId) ||
            (geoLevel === "Region" && u.region_id === sourceId) ||
            (geoLevel === "Area" && u.area_id === sourceId) ||
            (geoLevel === "Territory" && u.territory_id === sourceId);
          if (!onSource) return false;
          const norm = r.trim().toUpperCase();
          const rName = (u.role_name || "").toUpperCase();
          const gLevel = (u.geography_level || "").toUpperCase();
          return (
            rName.includes(norm) ||
            gLevel ===
              (norm === "ZSM"
                ? "ZONE"
                : norm === "RSM"
                  ? "REGION"
                  : norm === "ASM"
                    ? "AREA"
                    : "TERRITORY")
          );
        });
        if (existing) {
          if (!map[r]) map[r] = {};
          if (!map[r][existing.user_id]) {
            map[r][existing.user_id] = "source";
          }
        }
      }
    }

    return map;
  }, [userAssignmentsByCard, job?.source_id, job?.assignment_roles, geoLevel, assignableUsers]);

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
    if (hasDuplicateUserWarnings) return false;
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

    const roles = (job?.assignment_roles ?? []).filter(
      (role) => !isInheritedSplitMergeRole(geoLevel, role),
    );

    for (const [nodeKey, byRole] of Object.entries(userAssignmentsByCard)) {
      for (const [role, ua] of Object.entries(byRole)) {
        if (isInheritedSplitMergeRole(geoLevel, role)) continue;
        rows.push({
          node_key: nodeKey,
          role_code: role,
          action: actionToApi(ua.action),
          user_id: ua.action === "assign" ? ua.userId || null : null,
        });
      }
    }

    // Default KEEP for any primary role/node not touched
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
      showToast(
        mode === "split"
          ? "Split published successfully."
          : "Merge published successfully.",
        "success",
      );
      void loadSources();
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: masterKeys.businessGeography.all(),
        }),
        queryClient.invalidateQueries({
          queryKey: userManagementKeys.users.all(),
        }),
      ]);
      exitWizard();
    } catch (error) {
      showToast(getErrorMessage(error, "Failed to publish split/merge."), "error");
    } finally {
      setPublishing(false);
    }
  };

  const assignableSourceIds = useMemo(() => {
    const ids = new Set<string>();
    if (mode === "merge") {
      for (const id of job?.source_ids?.length ? job.source_ids : mergeSourceIds) {
        if (id) ids.add(id);
      }
    } else {
      if (sourceId) ids.add(sourceId);
      if (job?.source_id) ids.add(job.source_id);
    }
    return ids;
  }, [mode, mergeSourceIds, sourceId, job?.source_id, job?.source_ids]);

  const assignableOptions = useMemo(
    () =>
      assignableUsers.map((u) => {
        // Users mapped to any geography in this job's sources remain selectable
        const isOnSource =
          (geoLevel === "Zone" && !!u.zone_id && assignableSourceIds.has(u.zone_id)) ||
          (geoLevel === "Region" && !!u.region_id && assignableSourceIds.has(u.region_id)) ||
          (geoLevel === "Area" && !!u.area_id && assignableSourceIds.has(u.area_id)) ||
          (geoLevel === "Territory" &&
            !!u.territory_id &&
            assignableSourceIds.has(u.territory_id));

        const hasNoMapping =
          !u.zone_id && !u.region_id && !u.area_id && !u.territory_id;

        // Prefer API flag; fall back to local rules for older responses / quick-add
        const isSelectable =
          typeof u.is_selectable === "boolean"
            ? u.is_selectable
            : hasNoMapping || isOnSource;

        return {
          id: u.user_id,
          fullName: u.full_name,
          roleName: u.role_name,
          geographyLevel: u.geography_level,
          isCurrentAssignment: Boolean(isOnSource),
          isSelectable,
          zoneId: u.zone_id,
          regionId: u.region_id,
          areaId: u.area_id,
          territoryId: u.territory_id,
        };
      }),
    [assignableUsers, geoLevel, assignableSourceIds],
  );

  const children = job?.source.children ?? [];

  const mergeChildSummary = useMemo(() => {
    const selectedIds = new Set(mergeSourceIds);
    const sortChildren = <T extends { name: string; code?: string | null }>(rows: T[]) =>
      [...rows].sort((a, b) => {
        const byName = compareByName(a.name, b.name);
        if (byName !== 0) return byName;
        return compareByName(a.code ?? "", b.code ?? "");
      });

    let groups = (job?.sources ?? [])
      .filter((src) => selectedIds.size === 0 || selectedIds.has(src.id))
      .map((src) => ({
        id: src.id,
        name: src.name,
        code: src.code ?? null,
        children: sortChildren(src.children ?? []),
      }))
      .sort((a, b) => compareByName(a.name, b.name));

    // Fallback: if sources lack children (older API), use primary source children once
    if (
      mode === "merge" &&
      groups.length > 0 &&
      groups.every((g) => g.children.length === 0) &&
      (job?.source.children?.length ?? 0) > 0
    ) {
      groups = [
        {
          id: job!.source.id,
          name: job!.source.name,
          code: job!.source.code ?? null,
          children: sortChildren(job!.source.children),
        },
      ];
    }

    const totalChildren = groups.reduce((sum, g) => sum + g.children.length, 0);
    return { groups, totalChildren };
  }, [job, mode, mergeSourceIds]);

  const modeTabTriggerClass =
    "rounded-none border-b-2 border-transparent px-4 pb-3 pt-2 text-xs font-semibold text-muted-foreground data-[state=active]:border-brand-600 data-[state=active]:text-brand-650 bg-transparent shadow-none";

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold">Geography Split / Merge</h2>
        <p className="text-xs text-muted-foreground mt-0.5 max-w-3xl">
          Split or merge Zone, Region, Area, or Territory while preserving postal coverage, users,
          customers, and audit history.
        </p>
      </div>

      <Tabs value={mode} onValueChange={handleModeTabChange} className="space-y-4">
        <div className="overflow-x-auto -mx-1 px-1">
          <TabsList className="border-b border-border w-max min-w-full justify-start rounded-none h-auto p-0 bg-transparent gap-0">
            <TabsTrigger value="split" className={modeTabTriggerClass}>
              <span className="inline-flex items-center gap-1.5">
                <Split className="w-3.5 h-3.5" />
                Split
              </span>
            </TabsTrigger>
            <TabsTrigger value="merge" className={modeTabTriggerClass}>
              <span className="inline-flex items-center gap-1.5">
                <Combine className="w-3.5 h-3.5" />
                Merge
              </span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="split" className="m-0 mt-0 outline-none space-y-5">
          {!wizardActive ? (
            <SplitMergeLanding
              mode="split"
              onStart={startWizard}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Splitting a geography into new child scopes.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={exitWizard}
                  disabled={publishing}
                >
                  Back to overview
                </Button>
              </div>
              {renderWizardForm()}
            </>
          )}
        </TabsContent>

        <TabsContent value="merge" className="m-0 mt-0 outline-none space-y-5">
          {!wizardActive ? (
            <SplitMergeLanding
              mode="merge"
              onStart={startWizard}
            />
          ) : (
            <>
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs text-muted-foreground">
                  Merging multiple geographies into one target.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs"
                  onClick={exitWizard}
                  disabled={publishing}
                >
                  Back to overview
                </Button>
              </div>
              {renderWizardForm()}
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );

  function renderWizardForm() {
    const mergeCascadeCount =
      (needsMergeZone ? 1 : 0) + (needsMergeRegion ? 1 : 0) + (needsMergeArea ? 1 : 0);

    return (
      <>
      <div className="rounded-xl border border-border bg-white p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">1. Geography Level</Label>
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

        {mode === "split" ? (
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">2. {scopeLabelForLevel(geoLevel)}</Label>
            <Popover
              open={sourcePickerOpen && !published}
              onOpenChange={(open) => {
                setSourcePickerOpen(open);
                if (!open) setSourceSearch("");
              }}
            >
              <PopoverTrigger asChild>
                <button
                  type="button"
                  disabled={published}
                  className={cn(
                    "w-full h-9 px-3 text-sm text-left border border-border rounded-md bg-background flex items-center justify-between gap-2 transition-colors",
                    published
                      ? "opacity-50 cursor-not-allowed"
                      : "hover:bg-muted/30",
                  )}
                >
                  <span
                    className={cn(
                      "truncate",
                      sourceId ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {sourceId
                      ? sourceLabel || `Selected ${geoLevel.toLowerCase()}`
                      : `Select source ${geoLevel.toLowerCase()}`}
                  </span>
                  <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                </button>
              </PopoverTrigger>
              <PopoverContent
                align="start"
                className="w-[--radix-popover-trigger-width] p-0"
              >
                <div className="border-b border-border p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      className="h-8 text-xs pl-8 focus-visible:ring-0"
                      value={sourceSearch}
                      placeholder={`Search ${geoLevel.toLowerCase()}…`}
                      onChange={(e) => setSourceSearch(e.target.value)}
                      autoFocus
                    />
                  </div>
                </div>
                <div className="max-h-[220px] overflow-y-auto py-1">
                  {sourcesLoading ? (
                    <div className="px-2 py-3 text-xs text-center text-muted-foreground flex items-center justify-center gap-1.5">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching…
                    </div>
                  ) : sources.length === 0 ? (
                    <div className="px-2 py-3 text-xs text-center text-muted-foreground">
                      {sourceSearch.trim()
                        ? "No matching sources"
                        : `No active ${geoLevel.toLowerCase()}s`}
                    </div>
                  ) : (
                    sources.map((o) => {
                      const label = `${o.name}${o.code ? ` (${o.code})` : ""}`;
                      const selected = o.id === sourceId;
                      return (
                        <button
                          key={o.id}
                          type="button"
                          className={cn(
                            "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs text-left hover:bg-muted/60 transition-colors",
                            selected && "bg-brand-50",
                          )}
                          onClick={() => {
                            setSourceId(o.id);
                            setSourceLabel(label);
                            setSourceSearch("");
                            setSourcePickerOpen(false);
                            setPublished(false);
                            setJob(null);
                          }}
                        >
                          <span className="flex-1 truncate">{label}</span>
                          {selected && (
                            <Check className="w-3 h-3 text-brand-600 shrink-0" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>
          </div>
        ) : (
          <div className="space-y-3">
            {mergeCascadeCount > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">
                  2. Parent Path
                  <span className="ml-1.5 font-normal text-muted-foreground">
                    (narrow down to list {pluralGeoLevel(geoLevel).toLowerCase()})
                  </span>
                </Label>
                <div
                  className={cn(
                    "grid gap-3",
                    mergeCascadeCount === 1 && "grid-cols-1 sm:grid-cols-2",
                    mergeCascadeCount === 2 && "grid-cols-1 sm:grid-cols-2",
                    mergeCascadeCount >= 3 && "grid-cols-1 sm:grid-cols-3",
                  )}
                >
                  {needsMergeZone && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Zone *</Label>
                      <AutocompleteSelect
                        options={(zonesQuery.data ?? []).map((z) => ({
                          value: z.id,
                          label: z.label,
                          searchText: [z.label, z.code].filter(Boolean).join(" "),
                          sublabel: z.code || undefined,
                        }))}
                        value={filterZoneId ?? ""}
                        disabled={published}
                        onChange={(v) => {
                          setFilterZoneId(v || null);
                          setFilterRegionId(null);
                          setFilterAreaId(null);
                          setSourceSearch("");
                          clearMergeSelection();
                        }}
                        placeholder="Select zone"
                        searchPlaceholder="Search zone by name or code…"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {needsMergeRegion && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Region *</Label>
                      <AutocompleteSelect
                        options={(regionsQuery.data ?? []).map((r) => ({
                          value: r.id,
                          label: r.label,
                          searchText: [r.label, r.code].filter(Boolean).join(" "),
                          sublabel: r.code || undefined,
                        }))}
                        value={filterRegionId ?? ""}
                        disabled={published || !filterZoneId}
                        onChange={(v) => {
                          setFilterRegionId(v || null);
                          setFilterAreaId(null);
                          setSourceSearch("");
                          clearMergeSelection();
                        }}
                        placeholder={
                          filterZoneId ? "Select region" : "Select zone first"
                        }
                        searchPlaceholder="Search region by name or code…"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {needsMergeArea && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Area *</Label>
                      <AutocompleteSelect
                        options={(areasQuery.data ?? []).map((a) => ({
                          value: a.id,
                          label: a.label,
                          searchText: [a.label, a.code].filter(Boolean).join(" "),
                          sublabel: a.code || undefined,
                        }))}
                        value={filterAreaId ?? ""}
                        disabled={published || !filterRegionId}
                        onChange={(v) => {
                          setFilterAreaId(v || null);
                          setSourceSearch("");
                          clearMergeSelection();
                        }}
                        placeholder={
                          filterRegionId ? "Select area" : "Select region first"
                        }
                        searchPlaceholder="Search area by name or code…"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-xs font-semibold">
                  {mergeCascadeCount > 0 ? "3." : "2."} Select{" "}
                  {pluralGeoLevel(geoLevel)} to Merge
                </Label>
                {mergeSourceIds.length > 0 && (
                  <span className="text-[11px] text-muted-foreground">
                    {mergeSourceIds.length} selected
                  </span>
                )}
              </div>
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="border-b border-border bg-muted/20 p-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                    <Input
                      className="h-8 text-xs pl-8 bg-white"
                      value={sourceSearch}
                      disabled={published || !mergeParentsReady}
                      placeholder={
                        mergeParentsReady
                          ? `Search ${pluralGeoLevel(geoLevel).toLowerCase()}…`
                          : geoLevel === "Region"
                            ? "Select a zone first"
                            : geoLevel === "Area"
                              ? "Select zone and region first"
                              : geoLevel === "Territory"
                                ? "Select zone, region and area first"
                                : `Search ${pluralGeoLevel(geoLevel).toLowerCase()}…`
                      }
                      onChange={(e) => setSourceSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="p-2 max-h-[200px] overflow-y-auto space-y-1">
                  {!mergeParentsReady ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">
                      {geoLevel === "Region"
                        ? "Select a zone to list regions for merge."
                        : geoLevel === "Area"
                          ? "Select zone and region to list areas for merge."
                          : "Select zone, region and area to list territories for merge."}
                    </p>
                  ) : sourcesLoading ? (
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5 py-2 px-1">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Searching…
                    </p>
                  ) : sources.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2 px-1">
                      {sourceSearch.trim()
                        ? `No ${pluralGeoLevel(geoLevel).toLowerCase()} match “${sourceSearch.trim()}”.`
                        : `No active ${pluralGeoLevel(geoLevel).toLowerCase()} under the selected parent.`}
                    </p>
                  ) : (
                    sortedMergeSources.map((o) => (
                      <label
                        key={o.id}
                        className={cn(
                          "flex items-center gap-2 text-xs cursor-pointer rounded-md px-2 py-1.5 hover:bg-muted/40",
                          mergeSourceIds.includes(o.id) && "bg-brand-50",
                        )}
                      >
                        <input
                          type="checkbox"
                          className="accent-brand-600"
                          checked={mergeSourceIds.includes(o.id)}
                          disabled={published}
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
                        <span className="truncate">
                          {o.name}
                          {o.code ? (
                            <span className="text-muted-foreground"> ({o.code})</span>
                          ) : null}
                        </span>
                      </label>
                    ))
                  )}
                </div>
              </div>
              {mergeSourceIds.length > 0 && mergeSourceIds.length < 2 && (
                <p className="text-[11px] text-amber-700">
                  Select at least 2 {pluralGeoLevel(geoLevel).toLowerCase()} to merge.
                </p>
              )}
            </div>
          </div>
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

      {mode === "merge" && mergeSourceIds.length >= 2 && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">Merge Scope Summary</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Child data that will move into{" "}
                {mergedName.trim() ? (
                  <span className="font-medium text-foreground">{mergedName.trim()}</span>
                ) : (
                  "the target geography"
                )}
                .
              </p>
            </div>
            <div className="flex flex-wrap gap-2 text-[11px]">
              <span className="px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
                {pluralCountLabel(
                  mergeSourceNames.length || mergeSourceIds.length,
                  geoLevel.toLowerCase(),
                  pluralGeoLevel(geoLevel).toLowerCase(),
                )}
              </span>
              <span className="px-2 py-0.5 rounded-full border border-border bg-muted/30 text-muted-foreground">
                {pluralCountLabel(
                  mergeChildSummary.totalChildren,
                  LEVEL_CHILD_SINGULAR[geoLevel],
                  LEVEL_CHILD_LABEL[geoLevel].toLowerCase(),
                )}
              </span>
            </div>
          </div>

          {!job ? (
            <p className="text-xs text-muted-foreground italic">
              Enter a target name to load the child-data summary for the selected{" "}
              {pluralGeoLevel(geoLevel).toLowerCase()}.
            </p>
          ) : mergeChildSummary.groups.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No {LEVEL_CHILD_LABEL[geoLevel].toLowerCase()} found under the selected{" "}
              {pluralGeoLevel(geoLevel).toLowerCase()}.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="rounded-lg border border-border overflow-hidden">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 px-3 py-1.5 bg-muted/30 border-b border-border text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                  <span>
                    {geoLevel} / {LEVEL_CHILD_SINGULAR[geoLevel]}
                  </span>
                  <span>Code / Count</span>
                </div>
                <div className="divide-y divide-border/60 max-h-[280px] overflow-y-auto">
                  {mergeChildSummary.groups.map((group) => (
                    <div key={group.id}>
                      <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center px-3 py-2 bg-muted/15">
                        <p className="text-xs font-semibold truncate">
                          {group.name}
                          {group.code ? (
                            <span className="text-muted-foreground font-normal">
                              {" "}
                              ({group.code})
                            </span>
                          ) : null}
                        </p>
                        <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">
                          {pluralCountLabel(
                            group.children.length,
                            LEVEL_CHILD_SINGULAR[geoLevel],
                            LEVEL_CHILD_LABEL[geoLevel].toLowerCase(),
                          )}
                        </span>
                      </div>
                      {group.children.length === 0 ? (
                        <p className="px-3 py-1.5 pl-6 text-[11px] text-muted-foreground italic">
                          No {LEVEL_CHILD_LABEL[geoLevel].toLowerCase()}
                        </p>
                      ) : (
                        group.children.map((child) => (
                          <div
                            key={child.id}
                            className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 items-center px-3 py-1.5 pl-6 text-xs hover:bg-muted/20"
                          >
                            <span className="truncate text-foreground/90">{child.name}</span>
                            <span className="text-muted-foreground tabular-nums shrink-0 text-[11px]">
                              {child.code || "—"}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">
                On publish, these {LEVEL_CHILD_LABEL[geoLevel].toLowerCase()} move to the target
                and the selected {pluralGeoLevel(geoLevel).toLowerCase()} become inactive.
              </p>
            </div>
          )}
        </section>
      )}

      {mode === "split" && job && (
        <section className="rounded-xl border border-border bg-white p-4 space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold">
                Step 2: Allocate {LEVEL_CHILD_LABEL[geoLevel]}
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Move selected scope from the existing geography to new geographies. You can keep items
                in the current geography — not everything must move.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1 shrink-0"
              onClick={() => setQuickAddChildOpen(true)}
              disabled={published || !sourceId}
            >
              <Plus className="w-3.5 h-3.5" /> Quick Add {LEVEL_CHILD_LABEL[geoLevel].slice(0, -1) || "Child"}
            </Button>
          </div>

          {children.length === 0 ? (
            <p className="text-xs text-muted-foreground italic">
              No {LEVEL_CHILD_LABEL[geoLevel].toLowerCase()} exist under {job.source.name} yet. Click &quot;Quick Add {LEVEL_CHILD_LABEL[geoLevel].slice(0, -1)}&quot; above to create one.
            </p>
          ) : (
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
          )}

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
                assignedUserIdsByRole={assignedUserIdsByRole}
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
                onUserCreated={(newUser) => {
                  if (job?.id) {
                    BusinessGeographyService.listSplitMergeAssignableUsers(job.id)
                      .then((res) => {
                        if (res.users) setAssignableUsers(res.users);
                      })
                      .catch(() => {
                        // Fallback add to local list
                        setAssignableUsers((prev) => [
                          ...prev,
                          {
                            user_id: newUser.id,
                            full_name: newUser.fullName,
                            employee_id: "",
                            email: "",
                            role_name: newUser.roleName ?? null,
                            geography_level: null,
                            zone_id: null,
                            region_id: null,
                            area_id: null,
                            territory_id: null,
                            is_selectable: true,
                          },
                        ]);
                      });
                  }
                }}
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

            {hasDuplicateUserWarnings && (
              <div className="rounded-lg bg-rose-50 border border-rose-300 p-3 space-y-1 text-xs text-rose-800">
                <p className="font-semibold text-rose-900 flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Duplicate User Assignment Detected
                </p>
                <p>
                  Each geography at this level must have a unique user assigned. The same user cannot be assigned to multiple geographies. Please assign a different user or leave unassigned before publishing.
                </p>
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

      {mode === "split" && sourceId && (
        <GeographyFormSheet
          open={quickAddChildOpen}
          onClose={() => setQuickAddChildOpen(false)}
          defaultParentId={sourceId}
          defaultParentLevel={geoLevel}
          onSaved={() => {
            setQuickAddChildOpen(false);
            showToast(`New ${LEVEL_CHILD_LABEL[geoLevel].slice(0, -1)} created under ${job?.source.name ?? "source"}.`, "success");
            void refreshSplitJob();
          }}
        />
      )}
      </>
    );
  }
}

function SplitMergeLanding({
  mode,
  onStart,
}: {
  mode: WizardMode;
  onStart: () => void;
}) {
  const isSplit = mode === "split";

  return (
    <div className="rounded-xl border border-border bg-white min-h-[280px] flex flex-col items-center justify-center gap-3 p-8 text-center">
      <p className="text-sm text-muted-foreground">
        {isSplit ? "Split a geography into new scopes." : "Merge sibling geographies into one."}
      </p>
      <Button
        type="button"
        size="sm"
        className="h-9 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
        onClick={onStart}
      >
        {isSplit ? (
          <>
            <Split className="w-3.5 h-3.5" />
            Start Split
          </>
        ) : (
          <>
            <Combine className="w-3.5 h-3.5" />
            Start Merge
          </>
        )}
      </Button>
    </div>
  );
}
