"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CITY_CATEGORY_OPTIONS, VEHICLE_TYPE_OPTIONS } from "@/lib/hr/config";
import { Plus, Trash2 } from "lucide-react";
import type { TadaPolicyFormValues } from "../tada-policy-data";

function uid() {
  return `r-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
}

export function TadaPolicyForm({
  form,
  onChange,
  readOnly,
}: {
  form: TadaPolicyFormValues;
  onChange: (f: TadaPolicyFormValues) => void;
  readOnly?: boolean;
}) {
  const set = (patch: Partial<TadaPolicyFormValues>) => onChange({ ...form, ...patch });

  return (
    <div className="space-y-3">
      <div className="bg-white border border-border/60 rounded-lg p-4">
        <p className="text-xs font-semibold mb-3">Policy Information</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <div className="space-y-1">
            <Label className="text-[11px]">Policy Name *</Label>
            <Input className="h-8 text-xs" disabled={readOnly} value={form.policyName} onChange={(e) => set({ policyName: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Policy Code *</Label>
            <Input className="h-8 text-xs font-mono" disabled={readOnly} value={form.policyCode} onChange={(e) => set({ policyCode: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Effective From *</Label>
            <Input type="date" className="h-8 text-xs" disabled={readOnly} value={form.effectiveFrom} onChange={(e) => set({ effectiveFrom: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Effective To *</Label>
            <Input type="date" className="h-8 text-xs" disabled={readOnly} value={form.effectiveTo} onChange={(e) => set({ effectiveTo: e.target.value })} />
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select value={form.status} disabled={readOnly} onValueChange={(v) => set({ status: v as "active" | "inactive" })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active" className="text-xs">Active</SelectItem>
                <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <PolicySection
        title="Travel Allowance"
        readOnly={readOnly}
        onAdd={() => set({ travelAllowance: [...form.travelAllowance, { id: uid(), vehicleType: "Two Wheeler", ratePerKm: 0 }] })}
        rows={form.travelAllowance.map((row, i) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5 space-y-1">
              <Label className="text-[10px]">Vehicle Type</Label>
              <Select value={row.vehicleType} disabled={readOnly} onValueChange={(v) => {
                const next = [...form.travelAllowance];
                next[i] = { ...row, vehicleType: v };
                set({ travelAllowance: next });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{VEHICLE_TYPE_OPTIONS.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-5 space-y-1">
              <Label className="text-[10px]">Rate Per KM</Label>
              <Input type="number" className="h-8 text-xs" disabled={readOnly} value={row.ratePerKm} onChange={(e) => {
                const next = [...form.travelAllowance];
                next[i] = { ...row, ratePerKm: Number(e.target.value) };
                set({ travelAllowance: next });
              }} />
            </div>
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 col-span-2" onClick={() => set({ travelAllowance: form.travelAllowance.filter((_, j) => j !== i) })}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      />

      <PolicySection
        title="Daily Allowance"
        readOnly={readOnly}
        onAdd={() => set({ dailyAllowance: [...form.dailyAllowance, { id: uid(), cityCategory: "Metro", dailyAllowanceAmount: 0 }] })}
        rows={form.dailyAllowance.map((row, i) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5 space-y-1">
              <Label className="text-[10px]">City Category</Label>
              <Select value={row.cityCategory} disabled={readOnly} onValueChange={(v) => {
                const next = [...form.dailyAllowance];
                next[i] = { ...row, cityCategory: v };
                set({ dailyAllowance: next });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CITY_CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-5 space-y-1">
              <Label className="text-[10px]">Daily Allowance Amount</Label>
              <Input type="number" className="h-8 text-xs" disabled={readOnly} value={row.dailyAllowanceAmount} onChange={(e) => {
                const next = [...form.dailyAllowance];
                next[i] = { ...row, dailyAllowanceAmount: Number(e.target.value) };
                set({ dailyAllowance: next });
              }} />
            </div>
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 col-span-2" onClick={() => set({ dailyAllowance: form.dailyAllowance.filter((_, j) => j !== i) })}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      />

      <PolicySection
        title="Accommodation"
        readOnly={readOnly}
        onAdd={() => set({ accommodation: [...form.accommodation, { id: uid(), cityCategory: "Metro", accommodationLimit: 0 }] })}
        rows={form.accommodation.map((row, i) => (
          <div key={row.id} className="grid grid-cols-12 gap-2 items-end">
            <div className="col-span-5 space-y-1">
              <Label className="text-[10px]">City Category</Label>
              <Select value={row.cityCategory} disabled={readOnly} onValueChange={(v) => {
                const next = [...form.accommodation];
                next[i] = { ...row, cityCategory: v };
                set({ accommodation: next });
              }}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>{CITY_CATEGORY_OPTIONS.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="col-span-5 space-y-1">
              <Label className="text-[10px]">Accommodation Limit</Label>
              <Input type="number" className="h-8 text-xs" disabled={readOnly} value={row.accommodationLimit} onChange={(e) => {
                const next = [...form.accommodation];
                next[i] = { ...row, accommodationLimit: Number(e.target.value) };
                set({ accommodation: next });
              }} />
            </div>
            {!readOnly && (
              <Button type="button" variant="ghost" size="sm" className="h-8 w-8 p-0 col-span-2" onClick={() => set({ accommodation: form.accommodation.filter((_, j) => j !== i) })}>
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
              </Button>
            )}
          </div>
        ))}
      />
    </div>
  );
}

function PolicySection({
  title,
  rows,
  onAdd,
  readOnly,
}: {
  title: string;
  rows: React.ReactNode;
  onAdd: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="bg-white border border-border/60 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs font-semibold">{title}</p>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" className="h-7 text-[11px] gap-1" onClick={onAdd}>
            <Plus className="w-3 h-3" /> Add Row
          </Button>
        )}
      </div>
      <div className="space-y-2">{rows}</div>
    </div>
  );
}
