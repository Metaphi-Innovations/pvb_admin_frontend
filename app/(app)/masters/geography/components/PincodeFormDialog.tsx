"use client";

import { useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
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
  type PincodeFormInput,
  type PincodeRecord,
  createPincodeRecord,
  getDistinctCities,
  getDistinctDistricts,
  getDistinctStates,
  getDistinctTowns,
  updatePincodeRecord,
  validatePincodeForm,
} from "../pincode-data";

interface PincodeFormDialogProps {
  open: boolean;
  onClose: () => void;
  record?: PincodeRecord | null;
  onSaved: () => void;
}

const EMPTY_FORM: PincodeFormInput = {
  pincode: "",
  stateName: "",
  district: "",
  city: "",
  town: "",
  status: "active",
};

function withCurrent(options: string[], current: string): string[] {
  if (!current || options.includes(current)) return options;
  return [...options, current].sort((a, b) => a.localeCompare(b));
}

export function PincodeFormDialog({ open, onClose, record, onSaved }: PincodeFormDialogProps) {
  const isEdit = !!record;
  const [form, setForm] = useState<PincodeFormInput>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm({
        pincode: record.pincode,
        stateName: record.stateName,
        district: record.district,
        city: record.city,
        town: record.town,
        status: record.status,
      });
    } else {
      setForm(EMPTY_FORM);
    }
    setErrors({});
  }, [open, record]);

  const stateOptions = useMemo(
    () => withCurrent(getDistinctStates(), form.stateName),
    [open, form.stateName],
  );
  const districtOptions = useMemo(
    () => withCurrent(getDistinctDistricts(form.stateName), form.district),
    [form.stateName, form.district, open],
  );
  const cityOptions = useMemo(
    () => withCurrent(getDistinctCities(form.stateName, form.district), form.city),
    [form.stateName, form.district, form.city, open],
  );
  const townOptions = useMemo(
    () => withCurrent(getDistinctTowns(form.stateName, form.district, form.city), form.town),
    [form.stateName, form.district, form.city, form.town, open],
  );

  const clearErrors = (...keys: string[]) => {
    setErrors((prev) => {
      const next = { ...prev };
      for (const key of keys) delete next[key];
      return next;
    });
  };

  const setField = <K extends keyof PincodeFormInput>(key: K, value: PincodeFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    clearErrors(key as string);
  };

  const handleSave = () => {
    const nextErrors = validatePincodeForm(form, record?.id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isEdit && record) {
      updatePincodeRecord(record.id, form);
    } else {
      createPincodeRecord(form);
    }
    onSaved();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Edit Postal Record" : "Add Postal Record"}
          </DialogTitle>
          <DialogDescription>
            Select location from Postal Master. New State/District/City/Town must be added via Bulk Upload.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              State <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.stateName || undefined}
              onValueChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  stateName: value,
                  district: "",
                  city: "",
                  town: "",
                  pincode: "",
                }));
                clearErrors("stateName", "district", "city", "town", "pincode");
              }}
            >
              <SelectTrigger className={cn("h-9 text-sm", errors.stateName && "border-red-500")}>
                <SelectValue placeholder="Select state" />
              </SelectTrigger>
              <SelectContent>
                {stateOptions.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.stateName && <p className="text-[11px] text-red-600">{errors.stateName}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              District <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.district || undefined}
              onValueChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  district: value,
                  city: "",
                  town: "",
                  pincode: "",
                }));
                clearErrors("district", "city", "town", "pincode");
              }}
              disabled={!form.stateName}
            >
              <SelectTrigger className={cn("h-9 text-sm", errors.district && "border-red-500")}>
                <SelectValue placeholder="Select district" />
              </SelectTrigger>
              <SelectContent>
                {districtOptions.map((d) => (
                  <SelectItem key={d} value={d} className="text-xs">
                    {d}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.district && <p className="text-[11px] text-red-600">{errors.district}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              City <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.city || undefined}
              onValueChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  city: value,
                  town: "",
                  pincode: "",
                }));
                clearErrors("city", "town", "pincode");
              }}
              disabled={!form.district}
            >
              <SelectTrigger className={cn("h-9 text-sm", errors.city && "border-red-500")}>
                <SelectValue placeholder="Select city" />
              </SelectTrigger>
              <SelectContent>
                {cityOptions.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.city && <p className="text-[11px] text-red-600">{errors.city}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              Town <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.town || undefined}
              onValueChange={(value) => {
                setForm((prev) => ({
                  ...prev,
                  town: value,
                  pincode: "",
                }));
                clearErrors("town", "pincode");
              }}
              disabled={!form.city}
            >
              <SelectTrigger className={cn("h-9 text-sm", errors.town && "border-red-500")}>
                <SelectValue placeholder="Select town" />
              </SelectTrigger>
              <SelectContent>
                {townOptions.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.town && <p className="text-[11px] text-red-600">{errors.town}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              Pincode <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-sm font-mono", errors.pincode && "border-red-500")}
              value={form.pincode}
              maxLength={6}
              inputMode="numeric"
              onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="Enter 6-digit pincode"
              disabled={!form.town}
            />
            {errors.pincode && <p className="text-[11px] text-red-600">{errors.pincode}</p>}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={handleSave}
          >
            {isEdit ? "Save Changes" : "Add Record"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
