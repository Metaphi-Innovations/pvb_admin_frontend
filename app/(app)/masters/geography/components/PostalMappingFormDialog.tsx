"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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

  useEffect(() => {
    if (!open) return;
    setStateId("");
    setDistrictId("");
    setLocationId("");
    setPincode("");
    setErrors({});
  }, [open]);

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
            <Select
              value={stateId || undefined}
              onValueChange={(v) => {
                setStateId(v);
                setDistrictId("");
                setLocationId("");
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.stateId;
                  return next;
                });
              }}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {(statesQuery.data ?? []).map((s) => (
                  <SelectItem key={s.id} value={s.id} className="text-xs">
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stateId && (
              <p className="text-[11px] text-red-600">{errors.stateId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">District</Label>
            <Select
              value={districtId || undefined}
              onValueChange={(v) => {
                setDistrictId(v);
                setLocationId("");
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.districtId;
                  return next;
                });
              }}
              disabled={!stateId}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {(districtsQuery.data ?? []).map((d) => (
                  <SelectItem key={d.id} value={d.id} className="text-xs">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.districtId && (
              <p className="text-[11px] text-red-600">{errors.districtId}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Location</Label>
            <Select
              value={locationId || undefined}
              onValueChange={(v) => {
                setLocationId(v);
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.locationId;
                  return next;
                });
              }}
              disabled={!districtId}
            >
              <SelectTrigger className="h-9 text-xs">
                <SelectValue placeholder="Select location" />
              </SelectTrigger>
              <SelectContent>
                {(locationsQuery.data ?? []).map((loc) => (
                  <SelectItem key={loc.id} value={loc.id} className="text-xs">
                    {loc.label}
                    {loc.locationType === "VILLAGE" ? " (Village)" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                setErrors((prev) => {
                  const next = { ...prev };
                  delete next.pincode;
                  return next;
                });
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
