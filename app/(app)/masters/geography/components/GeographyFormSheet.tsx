"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { showToast } from "@/lib/toast";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { ListingStatusToggle, isActiveStatus } from "@/components/listing";
import {
  useBgLookupAreas,
  useBgLookupRegions,
  useBgLookupStates,
  useBgLookupZones,
  useBusinessGeographyTree,
  useCreateBusinessGeo,
  useUpdateBusinessGeo,
} from "@/hooks/masters";
import {
  generateGeoCode,
  nextBusinessGeoLevel,
  type BusinessGeoLevel,
  type BusinessGeoListItem,
  type BusinessGeoSaveInput,
} from "@/services/business-geography.service";
import { GEOGRAPHY_TYPES, type GeographyType } from "../geography-master-data";
import {
  AreaDistrictSelector,
  RegionStateSelector,
  TerritoryCoverageSelector,
} from "./BusinessGeographyScopeSelectors";

interface GeographyFormSheetProps {
  open: boolean;
  onClose: () => void;
  record?: BusinessGeoListItem | null;
  defaultParentId?: string | null;
  defaultParentLevel?: BusinessGeoLevel | null;
  onSaved: () => void;
}

interface FormState {
  name: string;
  level: BusinessGeoLevel;
  parentId: string | null;
  /** Ancestors used to cascade parent pickers (not sent to API). */
  pathZoneId: string | null;
  pathRegionId: string | null;
  effectiveFrom: string;
  status: "active" | "inactive";
  stateIds: string[];
  districtIds: string[];
  locationIds: string[];
  pincodeIds: string[];
  code: string;
}

function emptyForm(level: BusinessGeoLevel = "Zone"): FormState {
  return {
    name: "",
    level,
    parentId: null,
    pathZoneId: null,
    pathRegionId: null,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    status: "active",
    stateIds: [],
    districtIds: [],
    locationIds: [],
    pincodeIds: [],
    code: "",
  };
}

function resolveParentPath(
  level: BusinessGeoLevel,
  parentId: string | null,
  records: BusinessGeoListItem[],
): Pick<FormState, "pathZoneId" | "pathRegionId" | "parentId"> {
  if (!parentId || level === "Zone") {
    return { parentId: null, pathZoneId: null, pathRegionId: null };
  }

  const byId = new Map(records.map((r) => [r.id, r]));
  const parent = byId.get(parentId);

  if (level === "Region") {
    return { parentId, pathZoneId: parentId, pathRegionId: null };
  }

  if (level === "Area") {
    const zoneId = parent?.zoneId ?? parent?.parentId ?? null;
    return { parentId, pathZoneId: zoneId, pathRegionId: parentId };
  }

  // Territory — immediate parent is Area
  const area = parent?.level === "Area" ? parent : parent;
  const regionId = area?.regionId ?? area?.parentId ?? null;
  const region = regionId ? byId.get(regionId) : undefined;
  const zoneId = area?.zoneId ?? region?.zoneId ?? region?.parentId ?? null;
  return { parentId, pathZoneId: zoneId, pathRegionId: regionId };
}

function itemToForm(
  record: BusinessGeoListItem,
  records: BusinessGeoListItem[],
): FormState {
  const path = resolveParentPath(record.level, record.parentId, records);
  return {
    name: record.name,
    level: record.level,
    parentId: path.parentId,
    pathZoneId: path.pathZoneId,
    pathRegionId: path.pathRegionId,
    effectiveFrom: record.effectiveDate || new Date().toISOString().slice(0, 10),
    status: record.status,
    stateIds: record.stateIds ?? [],
    districtIds: record.districtIds ?? [],
    locationIds: record.locationIds ?? [],
    pincodeIds: record.pincodeIds ?? [],
    code: record.code ?? "",
  };
}

function toLookupOptions(
  rows: Array<{ id: string; label: string; code?: string }> = [],
) {
  return rows.map((p) => ({
    value: p.id,
    label: p.label,
    searchText: [p.label, p.code].filter(Boolean).join(" "),
    sublabel: p.code || undefined,
  }));
}

export function GeographyFormSheet({
  open,
  onClose,
  record,
  defaultParentId = null,
  defaultParentLevel = null,
  onSaved,
}: GeographyFormSheetProps) {
  const isEdit = !!record;
  const [form, setForm] = useState<FormState>(emptyForm());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const createMutation = useCreateBusinessGeo();
  const updateMutation = useUpdateBusinessGeo();
  const treeQuery = useBusinessGeographyTree();
  const allRecords = treeQuery.data ?? [];

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm(itemToForm(record, allRecords));
    } else {
      const level = nextBusinessGeoLevel(defaultParentLevel);
      const path = resolveParentPath(
        level,
        level === "Zone" ? null : defaultParentId,
        allRecords,
      );
      setForm({
        ...emptyForm(level),
        ...path,
        code: generateGeoCode(level, allRecords),
      });
    }
    setErrors({});
    setSaving(false);
  }, [open, record, defaultParentId, defaultParentLevel, allRecords]);

  const level = form.level;
  const needsZone = level === "Region" || level === "Area" || level === "Territory";
  const needsRegion = level === "Area" || level === "Territory";
  const needsArea = level === "Territory";
  const parentPathCount =
    (needsZone ? 1 : 0) + (needsRegion ? 1 : 0) + (needsArea ? 1 : 0);

  const zonesQuery = useBgLookupZones(open && needsZone);
  const regionsQuery = useBgLookupRegions(
    form.pathZoneId,
    open && needsRegion && Boolean(form.pathZoneId),
  );
  const areasQuery = useBgLookupAreas(
    form.pathRegionId,
    open && needsArea && Boolean(form.pathRegionId),
  );
  const statesQuery = useBgLookupStates(open && level === "Region");

  const zoneOptions = useMemo(
    () => toLookupOptions(zonesQuery.data ?? []),
    [zonesQuery.data],
  );
  const regionOptions = useMemo(
    () => toLookupOptions(regionsQuery.data ?? []),
    [regionsQuery.data],
  );
  const areaOptions = useMemo(
    () => toLookupOptions(areasQuery.data ?? []),
    [areasQuery.data],
  );

  const clearScopeFields = (prev: FormState): FormState => ({
    ...prev,
    stateIds: [],
    districtIds: [],
    locationIds: [],
    pincodeIds: [],
  });

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleLevelChange = (nextLevel: BusinessGeoLevel) => {
    setForm((prev) =>
      clearScopeFields({
        ...prev,
        level: nextLevel,
        parentId: null,
        pathZoneId: null,
        pathRegionId: null,
        code: !isEdit ? generateGeoCode(nextLevel, allRecords) : prev.code,
      }),
    );
    setErrors({});
  };

  const handleZoneChange = (zoneId: string) => {
    setForm((prev) => {
      const next = clearScopeFields({
        ...prev,
        pathZoneId: zoneId || null,
        pathRegionId: null,
        parentId: prev.level === "Region" ? zoneId || null : null,
      });
      return next;
    });
    setErrors((prev) => {
      const next = { ...prev };
      delete next.parentId;
      delete next.stateIds;
      delete next.districtIds;
      delete next.locationIds;
      delete next.pincodeIds;
      return next;
    });
  };

  const handleRegionChange = (regionId: string) => {
    setForm((prev) =>
      clearScopeFields({
        ...prev,
        pathRegionId: regionId || null,
        parentId:
          prev.level === "Area"
            ? regionId || null
            : prev.level === "Territory"
              ? null
              : prev.parentId,
      }),
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.parentId;
      delete next.districtIds;
      delete next.locationIds;
      delete next.pincodeIds;
      return next;
    });
  };

  const handleAreaChange = (areaId: string) => {
    setForm((prev) =>
      clearScopeFields({
        ...prev,
        parentId: areaId || null,
      }),
    );
    setErrors((prev) => {
      const next = { ...prev };
      delete next.parentId;
      delete next.locationIds;
      delete next.pincodeIds;
      return next;
    });
  };

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Geography name is required.";
    if (!form.effectiveFrom) next.effectiveFrom = "Effective date is required.";

    if (level !== "Zone" && !form.parentId) {
      next.parentId = `${level} requires a parent ${
        level === "Region" ? "Zone" : level === "Area" ? "Region" : "Area"
      }.`;
    }
    if (level === "Area" && !form.pathZoneId) {
      next.parentId = "Select a zone, then the parent region.";
    }
    if (level === "Territory" && (!form.pathZoneId || !form.pathRegionId)) {
      next.parentId = "Select zone and region, then the parent area.";
    }

    if (level === "Region" && form.stateIds.length === 0) {
      next.stateIds = "Select at least one state.";
    }
    if (level === "Area" && form.districtIds.length === 0) {
      next.districtIds = "Select at least one district.";
    }
    if (level === "Territory") {
      if (form.locationIds.length === 0) {
        next.locationIds = "Select at least one location.";
      }
      if (form.pincodeIds.length === 0) {
        next.pincodeIds = "Select at least one pincode.";
      }
    }

    return next;
  };

  const toSaveInput = (): BusinessGeoSaveInput => ({
    level: form.level,
    name: form.name,
    code: form.code.trim() || undefined,
    parentId: form.parentId,
    effectiveDate: form.effectiveFrom,
    status: form.status,
    stateIds: form.stateIds,
    districtIds: form.districtIds,
    locationIds: form.locationIds,
    pincodeIds: form.pincodeIds,
  });

  const handleSave = async () => {
    const nextErrors = validate();
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);
    try {
      const input = toSaveInput();
      if (isEdit && record) {
        await updateMutation.mutateAsync({ id: record.id, input });
      } else {
        await createMutation.mutateAsync(input);
      }
      showToast(`${form.level} saved successfully.`, "success");
      onSaved();
      onClose();
    } catch (e: any) {
      const errMsg =
        e?.message ||
        e?.error ||
        (typeof e?.response?.data?.message === "string" && e.response.data.message) ||
        (typeof e?.response?.data?.error === "string" && e.response.data.error) ||
        (e instanceof Error ? e.message : "Failed to save geography.");
      
      setErrors((prev) => ({
        ...prev,
        form: errMsg,
        ...(errMsg.toLowerCase().includes("name") ? { name: errMsg } : {}),
      }));
      showToast(errMsg, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[720px] sm:max-w-[720px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">
            {isEdit ? "Edit Business Geography" : "Add Business Geography"}
          </SheetTitle>
          <SheetDescription>
            {level === "Zone"
              ? "Enter zone name only. Map states in child regions."
              : level === "Region"
                ? "Select the parent zone, then map one or more states."
                : level === "Area"
                  ? "Select zone → region, then districts from that region’s states."
                  : "Select zone → region → area, then locations and pincodes."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto p-6 space-y-5">
          {errors.form && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600 mt-0.5" />
              <div className="flex-1">{errors.form}</div>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5 sm:col-span-2">
              <Label className="text-xs">
                Geography Name <span className="text-red-500">*</span>
              </Label>
              <Input
                className={cn("h-9 text-sm", errors.name && "border-red-500")}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Andheri Territory"
              />
              {errors.name && <p className="text-[11px] text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">
                Geography Level <span className="text-red-500">*</span>
              </Label>
              <Select
                value={level}
                onValueChange={(v) => handleLevelChange(v as GeographyType)}
                disabled={isEdit}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEOGRAPHY_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Code</Label>
              <Input
                className="h-9 text-sm font-mono"
                value={form.code}
                onChange={(e) => setField("code", e.target.value)}
                placeholder="Auto-generated"
              />
            </div>

            {level !== "Zone" && (
              <div className="sm:col-span-2 space-y-2">
                <div>
                  <Label className="text-xs">
                    Parent Path <span className="text-red-500">*</span>
                  </Label>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    {level === "Region"
                      ? "Select the parent zone."
                      : level === "Area"
                        ? "Select zone, then the parent region."
                        : "Select zone and region, then the parent area."}
                  </p>
                </div>
                <div
                  className={cn(
                    "grid gap-3",
                    parentPathCount === 1 && "grid-cols-1",
                    parentPathCount === 2 && "grid-cols-1 sm:grid-cols-2",
                    parentPathCount >= 3 && "grid-cols-1 sm:grid-cols-3",
                  )}
                >
                  {needsZone && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">Zone *</Label>
                      <AutocompleteSelect
                        options={zoneOptions}
                        value={form.pathZoneId ?? ""}
                        onChange={handleZoneChange}
                        disabled={zonesQuery.isLoading}
                        error={level === "Region" && Boolean(errors.parentId)}
                        placeholder={
                          zonesQuery.isLoading ? "Loading…" : "Select zone"
                        }
                        searchPlaceholder="Search zone by name or code…"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {needsRegion && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Region *
                      </Label>
                      <AutocompleteSelect
                        options={regionOptions}
                        value={
                          level === "Area"
                            ? form.parentId ?? ""
                            : form.pathRegionId ?? ""
                        }
                        onChange={handleRegionChange}
                        disabled={!form.pathZoneId || regionsQuery.isLoading}
                        error={level === "Area" && Boolean(errors.parentId)}
                        placeholder={
                          !form.pathZoneId
                            ? "Select zone first"
                            : regionsQuery.isLoading
                              ? "Loading…"
                              : "Select region"
                        }
                        searchPlaceholder="Search region by name or code…"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}

                  {needsArea && (
                    <div className="space-y-1">
                      <Label className="text-[11px] text-muted-foreground">
                        Area *
                      </Label>
                      <AutocompleteSelect
                        options={areaOptions}
                        value={form.parentId ?? ""}
                        onChange={handleAreaChange}
                        disabled={!form.pathRegionId || areasQuery.isLoading}
                        error={Boolean(errors.parentId)}
                        placeholder={
                          !form.pathRegionId
                            ? "Select region first"
                            : areasQuery.isLoading
                              ? "Loading…"
                              : "Select area"
                        }
                        searchPlaceholder="Search area by name or code…"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
                {errors.parentId && (
                  <p className="text-[11px] text-red-600">{errors.parentId}</p>
                )}
              </div>
            )}

            {level === "Region" && (
              <div className="sm:col-span-2">
                <RegionStateSelector
                  selectedIds={form.stateIds}
                  onChange={(stateIds) => setField("stateIds", stateIds)}
                  error={errors.stateIds}
                />
              </div>
            )}

            {level === "Area" && (
              <div className="sm:col-span-2">
                <AreaDistrictSelector
                  regionId={form.parentId}
                  areaId={isEdit && record ? record.id : null}
                  selectedIds={form.districtIds}
                  onChange={(districtIds) => setField("districtIds", districtIds)}
                  error={errors.districtIds}
                />
              </div>
            )}

            {level === "Territory" && (
              <div className="sm:col-span-2">
                <TerritoryCoverageSelector
                  areaId={form.parentId}
                  territoryId={isEdit && record ? record.id : null}
                  selectedLocationIds={form.locationIds}
                  selectedPincodeIds={form.pincodeIds}
                  onChangeLocations={(locationIds) => setField("locationIds", locationIds)}
                  onChangePincodes={(pincodeIds) => setField("pincodeIds", pincodeIds)}
                  errors={{
                    locations: errors.locationIds,
                    pincodes: errors.pincodeIds,
                  }}
                />
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs">
                Effective Date <span className="text-red-500">*</span>
              </Label>
              <Input
                type="date"
                className={cn("h-9 text-sm", errors.effectiveFrom && "border-red-500")}
                value={form.effectiveFrom}
                onChange={(e) => setField("effectiveFrom", e.target.value)}
              />
              {errors.effectiveFrom && (
                <p className="text-[11px] text-red-600">{errors.effectiveFrom}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs">Status</Label>
              <div className="h-9 flex items-center">
                <ListingStatusToggle
                  active={isActiveStatus(form.status)}
                  onChange={() =>
                    setField("status", form.status === "active" ? "inactive" : "active")
                  }
                />
              </div>
            </div>
          </div>

          {level === "Zone" && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
              Zone level has no postal selection. Child regions define state scope.
            </div>
          )}
        </SheetBody>

        <SheetFooter className="px-6 py-4 bg-muted/10 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={onClose}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Geography"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
