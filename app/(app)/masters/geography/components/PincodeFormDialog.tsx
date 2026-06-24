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
    () =>
      withCurrent(getDistinctTowns(form.stateName, form.district, form.city), form.town),
    [form.stateName, form.district, form.city, form.town, open],
  );

  const setField = <K extends keyof PincodeFormInput>(key: K, value: PincodeFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
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
            {isEdit ? "Edit Pincode Record" : "Add Pincode Record"}
          </DialogTitle>
          <DialogDescription>
            Select State → District → City → Town, then enter the pincode.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              State <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-sm", errors.stateName && "border-red-500")}
              value={form.stateName}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  stateName: e.target.value,
                  district: "",
                  city: "",
                  town: "",
                }));
                setErrors({});
              }}
              list="pincode-form-states"
              placeholder="Select or enter state"
            />
            <datalist id="pincode-form-states">
              {stateOptions.map((s) => (
                <option key={s} value={s} />
              ))}
            </datalist>
            {errors.stateName && <p className="text-[11px] text-red-600">{errors.stateName}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              District <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-sm", errors.district && "border-red-500")}
              value={form.district}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  district: e.target.value,
                  city: "",
                  town: "",
                }));
                setErrors({});
              }}
              list="pincode-form-districts"
              placeholder="Select or enter district"
              disabled={!form.stateName}
            />
            <datalist id="pincode-form-districts">
              {districtOptions.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>
            {errors.district && <p className="text-[11px] text-red-600">{errors.district}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-sm", errors.city && "border-red-500")}
              value={form.city}
              onChange={(e) => {
                setForm((prev) => ({
                  ...prev,
                  city: e.target.value,
                  town: "",
                }));
                setErrors({});
              }}
              list="pincode-form-cities"
              placeholder="Select or enter city"
              disabled={!form.district}
            />
            <datalist id="pincode-form-cities">
              {cityOptions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {errors.city && <p className="text-[11px] text-red-600">{errors.city}</p>}
          </div>

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              Town <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-sm", errors.town && "border-red-500")}
              value={form.town}
              onChange={(e) => setField("town", e.target.value)}
              list="pincode-form-towns"
              placeholder="Select or enter town"
              disabled={!form.city}
            />
            <datalist id="pincode-form-towns">
              {townOptions.map((t) => (
                <option key={t} value={t} />
              ))}
            </datalist>
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
              placeholder="6-digit pincode"
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
