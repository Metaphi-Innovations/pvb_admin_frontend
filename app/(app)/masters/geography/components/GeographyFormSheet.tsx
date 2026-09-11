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
    effectiveFrom: new Date().toISOString().slice(0, 10),
    status: "active",
    stateIds: [],
    districtIds: [],
    locationIds: [],
    pincodeIds: [],
    code: "",
  };
}

function itemToForm(record: BusinessGeoListItem): FormState {
  return {
    name: record.name,
    level: record.level,
    parentId: record.parentId,
    effectiveFrom: record.effectiveDate || new Date().toISOString().slice(0, 10),
    status: record.status,
    stateIds: record.stateIds ?? [],
    districtIds: record.districtIds ?? [],
    locationIds: record.locationIds ?? [],
    pincodeIds: record.pincodeIds ?? [],
    code: record.code ?? "",
  };
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
      setForm(itemToForm(record));
    } else {
      const level = nextBusinessGeoLevel(defaultParentLevel);
      setForm({
        ...emptyForm(level),
        parentId: level === "Zone" ? null : defaultParentId,
        code: generateGeoCode(level, allRecords),
      });
    }
    setErrors({});
    setSaving(false);
  }, [open, record, defaultParentId, defaultParentLevel, allRecords]);

  const level = form.level;

  const zonesQuery = useBgLookupZones(open && level === "Region");
  const regionsQuery = useBgLookupRegions(undefined, open && level === "Area");
  const areasQuery = useBgLookupAreas(undefined, open && level === "Territory");
  const statesQuery = useBgLookupStates(open && level === "Region");

  const parentOptions = useMemo(() => {
    if (level === "Region") return zonesQuery.data ?? [];
    if (level === "Area") return regionsQuery.data ?? [];
    if (level === "Territory") return areasQuery.data ?? [];
    return [];
  }, [level, zonesQuery.data, regionsQuery.data, areasQuery.data]);

  const parentLoading =
    (level === "Region" && zonesQuery.isLoading) ||
    (level === "Area" && regionsQuery.isLoading) ||
    (level === "Territory" && areasQuery.isLoading);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleLevelChange = (nextLevel: BusinessGeoLevel) => {
    setForm((prev) => ({
      ...prev,
      level: nextLevel,
      parentId: nextLevel === "Zone" ? null : prev.parentId,
      code: !isEdit ? generateGeoCode(nextLevel, allRecords) : prev.code,
      stateIds: [],
      districtIds: [],
      locationIds: [],
      pincodeIds: [],
    }));
    setErrors({});
  };

  const handleParentChange = (parentId: string) => {
    setForm((prev) => ({
      ...prev,
      parentId,
      stateIds: [],
      districtIds: [],
      locationIds: [],
      pincodeIds: [],
    }));
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

  const validate = (): Record<string, string> => {
    const next: Record<string, string> = {};
    if (!form.name.trim()) next.name = "Geography name is required.";
    if (!form.effectiveFrom) next.effectiveFrom = "Effective date is required.";

    if (level !== "Zone" && !form.parentId) {
      next.parentId = `${level} requires a parent ${
        level === "Region" ? "Zone" : level === "Area" ? "Region" : "Area"
      }.`;
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
                ? "Select parent zone and one or more states."
                : level === "Area"
                  ? "Select parent region and districts from its states."
                  : "Select locations and pincodes from the parent area."}
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
              <div className="space-y-1.5 sm:col-span-2">
                <Label className="text-xs">
                  Parent Geography <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={form.parentId ?? ""}
                  onValueChange={handleParentChange}
                >
                  <SelectTrigger
                    className={cn("h-9 text-sm", errors.parentId && "border-red-500")}
                  >
                    <SelectValue
                      placeholder={
                        parentLoading
                          ? "Loading…"
                          : `Select parent ${
                              level === "Region"
                                ? "Zone"
                                : level === "Area"
                                  ? "Region"
                                  : "Area"
                            }`
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={p.id} className="text-xs">
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
