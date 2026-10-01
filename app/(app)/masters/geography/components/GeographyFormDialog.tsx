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
  type GeographyFormInput,
  type GeographyRecord,
  GEOGRAPHY_TYPES,
  createGeography,
  getGeographyById,
  loadGeographies,
  normalizeGeographyType,
  updateGeography,
  validateGeographyForm,
} from "../geography-master-data";
import { addAuditEntry } from "../geography-audit-data";

interface GeographyFormDialogProps {
  open: boolean;
  onClose: () => void;
  record?: GeographyRecord | null;
  defaultParentId?: number | null;
  onSaved: () => void;
}

const EMPTY: GeographyFormInput = {
  name: "",
  geographyType: "Territory",
  parentId: null,
  effectiveFrom: new Date().toISOString().slice(0, 10),
  status: "active",
};

export function GeographyFormDialog({
  open,
  onClose,
  record,
  defaultParentId,
  onSaved,
}: GeographyFormDialogProps) {
  const isEdit = !!record;
  const [form, setForm] = useState<GeographyFormInput>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!open) return;
    if (record) {
      setForm({
        name: record.name,
        geographyType: normalizeGeographyType(record.geographyType),
        parentId: record.parentId,
        effectiveFrom: record.effectiveFrom,
        status: record.status,
      });
    } else {
      setForm({
        ...EMPTY,
        parentId: defaultParentId ?? null,
        effectiveFrom: new Date().toISOString().slice(0, 10),
      });
    }
    setErrors({});
  }, [open, record, defaultParentId]);

  const parentOptions = useMemo(() => {
    const all = loadGeographies();
    return all.filter((g) => g.id !== record?.id);
  }, [open, record]);

  const setField = <K extends keyof GeographyFormInput>(key: K, value: GeographyFormInput[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key as string];
      return next;
    });
  };

  const handleSave = () => {
    const nextErrors = validateGeographyForm(form, record?.id);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    if (isEdit && record) {
      updateGeography(record.id, form);
      addAuditEntry({
        actionType: "Geography Edited",
        oldGeography: record.name,
        newGeography: form.name.trim(),
        effectiveFrom: form.effectiveFrom,
        remarks: `Geography "${record.name}" updated.`,
      });
    } else {
      const created = createGeography(form);
      addAuditEntry({
        actionType: "Geography Created",
        newGeography: created.name,
        effectiveFrom: form.effectiveFrom,
        remarks: `${created.name} (${created.geographyType}) created.`,
      });
    }
    onSaved();
    onClose();
  };

  const parentLabel =
    form.parentId != null ? getGeographyById(form.parentId)?.name ?? "—" : "None (Root)";

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-base">
            {isEdit ? "Edit Geography" : "Add Geography"}
          </DialogTitle>
          <DialogDescription>
            Business sales hierarchy only — Zone, Region, Area, or Territory. State, district, city, town, and pincode come exclusively from Postal Master upload (Coverage Mapping tab).
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">
              Geography Name <span className="text-red-500">*</span>
            </Label>
            <Input
              className={cn("h-9 text-sm", errors.name && "border-red-500")}
              value={form.name}
              onChange={(e) => setField("name", e.target.value)}
              placeholder="e.g. West Zone"
            />
            {errors.name && <p className="text-[11px] text-red-600">{errors.name}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">
              Geography Type <span className="text-red-500">*</span>
            </Label>
            <Select value={form.geographyType} onValueChange={(v) => setField("geographyType", v)}>
              <SelectTrigger className={cn("h-9 text-sm", errors.geographyType && "border-red-500")}>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                {GEOGRAPHY_TYPES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.geographyType && (
              <p className="text-[11px] text-red-600">{errors.geographyType}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label className="text-xs">Effective From <span className="text-red-500">*</span></Label>
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

          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">Parent Geography</Label>
            <Select
              value={form.parentId != null ? String(form.parentId) : "__root__"}
              onValueChange={(v) => setField("parentId", v === "__root__" ? null : Number(v))}
            >
              <SelectTrigger className={cn("h-9 text-sm", errors.parentId && "border-red-500")}>
                <SelectValue placeholder="Select parent" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__root__" className="text-xs">
                  None (Root geography)
                </SelectItem>
                {parentOptions.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)} className="text-xs">
                    {p.name} ({p.geographyType})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!isEdit && defaultParentId != null && (
              <p className="text-[11px] text-muted-foreground">Default parent: {parentLabel}</p>
            )}
            {errors.parentId && <p className="text-[11px] text-red-600">{errors.parentId}</p>}
          </div>

          {isEdit && (
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setField("status", v as GeographyFormInput["status"])}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
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
            {isEdit ? "Save Changes" : "Add Geography"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
