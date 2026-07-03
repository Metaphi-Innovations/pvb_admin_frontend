"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  getAreaDistricts,
  getCoverageDefinition,
  getParentRegionStates,
  resolveTerritoryPincodeKeys,
  scopeFromDefinition,
  validatePostalScopeForLevel,
  type GeographyPostalScope,
} from "../geography-coverage-data";
import {
  getGeographyPathLabel,
  getTerritoryOptionsFlat,
  saveTerritoryPostalScope,
} from "../geography-workflow-data";
import { getGeographyById, todayStr } from "../geography-master-data";
import { TerritoryCoverageSelector } from "./PostalScopeSelectors";

export function CoverageMappingTab({
  initialGeographyId,
}: {
  initialGeographyId?: number | null;
}) {
  const [tick, setTick] = useState(0);
  const [geographyId, setGeographyId] = useState<number | null>(initialGeographyId ?? null);
  const [scope, setScope] = useState<GeographyPostalScope>({
    states: [],
    districts: [],
    cities: [],
    towns: [],
    pincodeKeys: [],
  });
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr());
  const [allowShared, setAllowShared] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (initialGeographyId) setGeographyId(initialGeographyId);
  }, [initialGeographyId]);

  const territoryOptions = useMemo(() => getTerritoryOptionsFlat(), [tick]);
  const territory = geographyId != null ? getGeographyById(geographyId) : null;
  const areaDistricts = geographyId != null && territory?.parentId != null ? getAreaDistricts(territory.parentId) : [];
  const regionStates = geographyId != null && territory?.parentId != null ? getParentRegionStates(territory.parentId) : [];

  const loadTerritoryScope = useCallback((id: number) => {
    const def = getCoverageDefinition(id);
    setScope(scopeFromDefinition(def));
    setSaved(false);
    setErrors({});
  }, []);

  useEffect(() => {
    if (geographyId != null) loadTerritoryScope(geographyId);
  }, [geographyId, loadTerritoryScope, tick]);

  const resolvedKeys = useMemo(
    () => resolveTerritoryPincodeKeys(scope, areaDistricts, regionStates),
    [scope, areaDistricts, regionStates],
  );

  const handleSave = () => {
    if (!geographyId || !territory) return;
    const scopeErrors = validatePostalScopeForLevel("Territory", territory.parentId, scope, {
      excludeGeographyId: geographyId,
      allowSharedScope: allowShared,
      areaDistricts,
      regionStates,
    });
    setErrors(scopeErrors);
    if (Object.keys(scopeErrors).length > 0) return;

    try {
      saveTerritoryPostalScope(geographyId, scope, effectiveFrom, allowShared);
      setSaved(true);
      setTick((t) => t + 1);
    } catch (e) {
      setErrors({ form: e instanceof Error ? e.message : "Failed to save coverage." });
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold">Territory Coverage</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          View or edit postal coverage defined for each Territory. Scope is inherited from parent Area districts — no need to re-select State or District.
        </p>
      </div>

      <div className="rounded-xl border border-border bg-white p-4 space-y-4 max-w-2xl">
        <div className="space-y-1">
          <Label className="text-xs">Select Territory *</Label>
          <Select
            value={geographyId != null ? String(geographyId) : ""}
            onValueChange={(v) => setGeographyId(Number(v))}
          >
            <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Choose territory" /></SelectTrigger>
            <SelectContent>
              {territoryOptions.length === 0 ? (
                <SelectItem value="__none__" disabled className="text-xs">Create a Territory in Business Geography first</SelectItem>
              ) : (
                territoryOptions.map((o) => (
                  <SelectItem key={o.id} value={String(o.id)} className="text-xs">{o.label}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        {territory && (
          <>
            <div className="rounded-lg border border-brand-200 bg-brand-50/40 p-3 text-xs space-y-1">
              <p><span className="text-muted-foreground">Business Path:</span> {getGeographyPathLabel(geographyId)}</p>
              <p><span className="text-muted-foreground">Current resolved pincodes:</span> <strong>{resolvedKeys.length}</strong></p>
            </div>

            <TerritoryCoverageSelector
              parentAreaId={territory.parentId}
              scope={scope}
              onChange={(next) => { setScope(next); setSaved(false); setErrors({}); }}
              errors={errors}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Effective Date</Label>
                <Input type="date" className="h-9 text-sm" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
              </div>
              <label className="flex items-center gap-2 text-xs pt-6">
                <input type="checkbox" checked={allowShared} onChange={(e) => setAllowShared(e.target.checked)} />
                Allow shared pincode scope on sibling territories
              </label>
            </div>

            {errors.form && (
              <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle className="w-3.5 h-3.5" />{errors.form}</p>
            )}

            <div className="flex justify-end">
              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={handleSave}>
                <Save className="w-3.5 h-3.5" /> Save Coverage
              </Button>
            </div>

            {saved && (
              <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                <CheckCircle2 className="w-4 h-4" /> Coverage updated for {territory.name}.
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
