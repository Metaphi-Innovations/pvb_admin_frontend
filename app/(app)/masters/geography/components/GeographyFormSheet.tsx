"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
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
  type GeographyFormInput,
  type GeographyPostalScopeInput,
  type GeographyRecord,
  type GeographyType,
  GEOGRAPHY_TYPES,
  loadGeographies,
  normalizeGeographyType,
  validateGeographyForm,
} from "../geography-master-data";
import {
  EMPTY_POSTAL_SCOPE,
  getCoverageDefinition,
  scopeFromDefinition,
  validatePostalScopeForLevel,
  getAreaDistricts,
  getDefaultLevelForParent,
  getParentOptionsForLevel,
  getParentRegionStates,
  validateParentForLevel,
} from "../geography-coverage-data";
import { saveBusinessGeography } from "../geography-workflow-data";
import {
  AreaDistrictSelector,
  RegionStateSelector,
  TerritoryCoverageSelector,
} from "./PostalScopeSelectors";

interface GeographyFormSheetProps {
  open: boolean;
  onClose: () => void;
  record?: GeographyRecord | null;
  defaultParentId?: number | null;
  postalRecordCount?: number;
  onSaved: () => void;
}

const EMPTY_SCOPE: GeographyPostalScopeInput = { ...EMPTY_POSTAL_SCOPE };

export function GeographyFormSheet({
  open,
  onClose,
  record,
  defaultParentId,
  postalRecordCount = 0,
  onSaved,
}: GeographyFormSheetProps) {
  const isEdit = !!record;
  const [geographies, setGeographies] = useState<GeographyRecord[]>([]);
  const [form, setForm] = useState<GeographyFormInput>({
    name: "",
    geographyType: "Territory",
    parentId: null,
    effectiveFrom: new Date().toISOString().slice(0, 10),
    status: "active",
    postalScope: { ...EMPTY_SCOPE },
    allowSharedPostalScope: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    setGeographies(loadGeographies());
    if (record) {
      const def = getCoverageDefinition(record.id);
      setForm({
        name: record.name,
        geographyType: normalizeGeographyType(record.geographyType),
        parentId: record.parentId,
        coverageType: undefined,
        effectiveFrom: record.effectiveFrom,
        status: record.status,
        postalScope: scopeFromDefinition(def),
        allowSharedPostalScope: false,
      });
    } else {
      const level = getDefaultLevelForParent(defaultParentId ?? null, loadGeographies());
      setForm({
        name: "",
        geographyType: level,
        parentId: level === "Zone" ? null : defaultParentId ?? null,
        effectiveFrom: new Date().toISOString().slice(0, 10),
        status: "active",
        postalScope: { ...EMPTY_SCOPE },
        allowSharedPostalScope: false,
      });
    }
    setErrors({});
  }, [open, record, defaultParentId]);

  const level = normalizeGeographyType(form.geographyType) as GeographyType;
  const parentOptions = useMemo(
    () => getParentOptionsForLevel(level, geographies, record?.id),
    [level, geographies, record?.id],
  );
  const scope = form.postalScope ?? { ...EMPTY_SCOPE };

  const setField = <K extends keyof GeographyFormInput>(key: K, value: GeographyFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const setScope = (postalScope: GeographyPostalScopeInput) => {
    setField("postalScope", postalScope);
    setErrors((prev) => {
      const next = { ...prev };
      delete next.states;
      delete next.districts;
      delete next.cities;
      delete next.towns;
      delete next.pincodeKeys;
      return next;
    });
  };

  const handleLevelChange = (nextLevel: GeographyType) => {
    setForm((prev) => ({
      ...prev,
      geographyType: nextLevel,
      parentId: nextLevel === "Zone" ? null : prev.parentId,
      postalScope: { ...EMPTY_SCOPE },
    }));
    setErrors({});
  };

  const handleParentChange = (parentId: number) => {
    setForm((prev) => ({
      ...prev,
      parentId,
      postalScope: { ...EMPTY_SCOPE },
    }));
  };

  const handleSave = () => {
    const nextErrors = {
      ...validateGeographyForm(form, record?.id, geographies),
    };
    const parentError = validateParentForLevel(level, form.parentId, geographies);
    if (parentError) nextErrors.parentId = parentError;

    const areaDistricts =
      level === "Territory" && form.parentId != null ? getAreaDistricts(form.parentId) : [];
    const regionStates =
      level === "Territory" && form.parentId != null ? getParentRegionStates(form.parentId) : [];

    const scopeErrors = validatePostalScopeForLevel(level, form.parentId, scope, {
      excludeGeographyId: record?.id,
      allowSharedScope: form.allowSharedPostalScope,
      areaDistricts,
      regionStates,
    });
    Object.assign(nextErrors, scopeErrors);

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    try {
      saveBusinessGeography(form, { geographyId: record?.id });
      onSaved();
      onClose();
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "Failed to save geography." });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="max-w-[720px] sm:max-w-[720px] flex flex-col">
        <SheetHeader>
          <SheetTitle className="text-base">{isEdit ? "Edit Business Geography" : "Add Business Geography"}</SheetTitle>
          <SheetDescription>
            {level === "Zone"
              ? "Enter zone name only. Map states in child regions."
              : level === "Region"
                ? "Select parent zone and one or more states."
                : level === "Area"
                  ? "Select parent region and districts from its states."
                  : "Select cities, towns, and pincodes from the parent area."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="flex-1 overflow-y-auto space-y-4 pr-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Geography Name <span className="text-red-500">*</span></Label>
              <Input
                className={cn("h-9 text-sm", errors.name && "border-red-500")}
                value={form.name}
                onChange={(e) => setField("name", e.target.value)}
                placeholder="e.g. Andheri Territory"
              />
              {errors.name && <p className="text-[11px] text-red-600">{errors.name}</p>}
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Geography Level <span className="text-red-500">*</span></Label>
              <Select value={level} onValueChange={(v) => handleLevelChange(v as GeographyType)}>
                <SelectTrigger className={cn("h-9 text-sm", errors.geographyType && "border-red-500")}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GEOGRAPHY_TYPES.map((t) => (
                    <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="hidden sm:block" />

            {level !== "Zone" && (
              <div className="space-y-1 sm:col-span-2">
                <Label className="text-xs">Parent Geography <span className="text-red-500">*</span></Label>
                <Select
                  value={form.parentId != null ? String(form.parentId) : ""}
                  onValueChange={(v) => handleParentChange(Number(v))}
                >
                  <SelectTrigger className={cn("h-9 text-sm", errors.parentId && "border-red-500")}>
                    <SelectValue placeholder={`Select parent ${level === "Region" ? "Zone" : level === "Area" ? "Region" : "Area"}`} />
                  </SelectTrigger>
                  <SelectContent>
                    {parentOptions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                        {p.name} ({p.geographyType})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.parentId && <p className="text-[11px] text-red-600">{errors.parentId}</p>}
              </div>
            )}

            {level === "Region" && (
              <div className="sm:col-span-2">
                <RegionStateSelector
                  scope={scope}
                  onChange={setScope}
                  errors={errors}
                  parentZoneId={form.parentId}
                  excludeGeographyId={record?.id}
                  allowSharedCoverage={form.allowSharedPostalScope}
                  postalRecordCount={postalRecordCount}
                />
              </div>
            )}

            {level === "Area" && (
              <div className="sm:col-span-2">
                <AreaDistrictSelector
                  parentRegionId={form.parentId}
                  scope={scope}
                  onChange={setScope}
                  errors={errors}
                  excludeGeographyId={record?.id}
                  allowSharedCoverage={form.allowSharedPostalScope}
                  postalRecordCount={postalRecordCount}
                />
              </div>
            )}

            {level === "Territory" && (
              <div className="sm:col-span-2">
                <TerritoryCoverageSelector
                  parentAreaId={form.parentId}
                  scope={scope}
                  onChange={setScope}
                  errors={errors}
                  excludeGeographyId={record?.id}
                  allowSharedCoverage={form.allowSharedPostalScope}
                  postalRecordCount={postalRecordCount}
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Effective Date <span className="text-red-500">*</span></Label>
              <Input
                type="date"
                className={cn("h-9 text-sm", errors.effectiveFrom && "border-red-500")}
                value={form.effectiveFrom}
                onChange={(e) => setField("effectiveFrom", e.target.value)}
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <div className="h-9 flex items-center">
                <ListingStatusToggle
                  active={isActiveStatus(form.status)}
                  onChange={() => setField("status", form.status === "active" ? "inactive" : "active")}
                />
              </div>
            </div>

            {(level === "Region" || level === "Area" || level === "Territory") && (
              <label className="sm:col-span-2 flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  checked={form.allowSharedPostalScope ?? false}
                  onChange={(e) => setField("allowSharedPostalScope", e.target.checked)}
                />
                Allow Shared Coverage (permit duplicate state/district/town/pincode on sibling geographies)
              </label>
            )}
          </div>

          {errors.form && (
            <p className="text-[11px] text-red-600">{errors.form}</p>
          )}

          {level === "Zone" && (
            <div className="rounded-lg border border-border bg-muted/20 p-3 text-[11px] text-muted-foreground">
              Zone level has no postal selection. Child regions define state scope.
            </div>
          )}
        </SheetBody>

        <div className="flex items-center justify-end gap-2 pt-3 border-t border-border mt-2 shrink-0">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
            {isEdit ? "Save Changes" : "Add Geography"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
