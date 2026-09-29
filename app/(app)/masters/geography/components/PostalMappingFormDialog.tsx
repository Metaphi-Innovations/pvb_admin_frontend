"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  usePostalLookupDistricts,
  usePostalLookupLocations,
  usePostalLookupStates,
} from "@/hooks/masters";
import type { CreatePostalMappingPayload } from "@/services/postal-master-list.service";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

interface PostalMappingFormDialogProps {
  open: boolean;
  onClose: () => void;
  saving?: boolean;
  onSubmit: (payload: CreatePostalMappingPayload) => Promise<void>;
  onError: (message: string) => void;
}

export function PostalMappingFormDialog({
  open,
  onClose,
  saving = false,
  onSubmit,
  onError,
}: PostalMappingFormDialogProps) {
  const [stateId, setStateId] = useState("");
  const [districtId, setDistrictId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [pincode, setPincode] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const statesQuery = usePostalLookupStates();
  const districtsQuery = usePostalLookupDistricts(stateId || undefined);
  const locationsQuery = usePostalLookupLocations(districtId || undefined);

  const stateOptions = useMemo(
    () =>
      (statesQuery.data ?? []).map((s) => ({
        value: s.id,
        label: s.label,
        searchText: s.label,
      })),
    [statesQuery.data],
  );

  const districtOptions = useMemo(
    () =>
      (districtsQuery.data ?? []).map((d) => ({
        value: d.id,
        label: d.label,
        searchText: d.label,
      })),
    [districtsQuery.data],
  );

  const locationOptions = useMemo(
    () =>
      (locationsQuery.data ?? []).map((loc) => {
        const typeSuffix =
          loc.locationType === "VILLAGE"
            ? "Village"
            : loc.locationType === "CITY"
              ? "City"
              : loc.locationType || "";
        return {
          value: loc.id,
          label: loc.label,
          sublabel: typeSuffix || undefined,
          searchText: `${loc.label} ${typeSuffix}`.trim(),
        };
      }),
    [locationsQuery.data],
  );

  useEffect(() => {
    if (!open) return;
    setStateId("");
    setDistrictId("");
    setLocationId("");
    setPincode("");
    setErrors({});
  }, [open]);

  const clearError = (key: string) => {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  };

  const validate = () => {
    const next: Record<string, string> = {};
    if (!stateId) next.stateId = "State is required";
    if (!districtId) next.districtId = "District is required";
    if (!locationId) next.locationId = "City / Village is required";
    const code = pincode.trim();
    if (!code) next.pincode = "Pincode is required";
    else if (!/^\d{6}$/.test(code)) next.pincode = "Enter a valid 6-digit pincode";
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    try {
      await onSubmit({
        location_id: locationId,
        pincode: pincode.trim(),
      });
    } catch (error) {
      onError(getErrorMessage(error, "Failed to create postal mapping."));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base">Add Postal Mapping</DialogTitle>
          <DialogDescription>
            Link a city or village to a pincode from the postal master.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 pt-1">
          <div className="space-y-1.5">
            <Label className="text-xs">State</Label>
            <AutocompleteSelect
              options={stateOptions}
              value={stateId}
              onChange={(v) => {
                setStateId(String(v ?? ""));
                setDistrictId("");
                setLocationId("");
                clearError("stateId");
              }}
              disabled={statesQuery.isLoading}
              error={Boolean(errors.stateId)}
              placeholder={
                statesQuery.isLoading ? "Loading states…" : "Select state"
              }
              searchPlaceholder="Search state…"
              className="h-9 text-xs"
            />
            {errors.stateId && (
              <p className="text-[11px] text-red-600">{errors.stateId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">District</Label>
            <AutocompleteSelect
              options={districtOptions}
              value={districtId}
              onChange={(v) => {
                setDistrictId(String(v ?? ""));
                setLocationId("");
                clearError("districtId");
              }}
              disabled={!stateId || districtsQuery.isLoading}
              error={Boolean(errors.districtId)}
              placeholder={
                !stateId
                  ? "Select state first"
                  : districtsQuery.isLoading
                    ? "Loading districts…"
                    : "Select district"
              }
              searchPlaceholder="Search district…"
              className="h-9 text-xs"
            />
            {errors.districtId && (
              <p className="text-[11px] text-red-600">{errors.districtId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Location</Label>
            <AutocompleteSelect
              options={locationOptions}
              value={locationId}
              onChange={(v) => {
                setLocationId(String(v ?? ""));
                clearError("locationId");
              }}
              disabled={!districtId || locationsQuery.isLoading}
              error={Boolean(errors.locationId)}
              placeholder={
                !districtId
                  ? "Select district first"
                  : locationsQuery.isLoading
                    ? "Loading locations…"
                    : "Select location"
              }
              searchPlaceholder="Search city or village…"
              className="h-9 text-xs"
            />
            {errors.locationId && (
              <p className="text-[11px] text-red-600">{errors.locationId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Pincode</Label>
            <Input
              className="h-9 text-xs font-mono"
              placeholder="6-digit pincode"
              maxLength={6}
              value={pincode}
              onChange={(e) => {
                setPincode(e.target.value.replace(/\D/g, "").slice(0, 6));
                clearError("pincode");
              }}
            />
            {errors.pincode && (
              <p className="text-[11px] text-red-600">{errors.pincode}</p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-3">
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
            disabled={saving}
            onClick={() => void handleSave()}
          >
            {saving ? "Saving…" : "Save Mapping"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
