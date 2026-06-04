"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_OPTIONS } from "@/lib/hr/config";
import { HrFormLayout } from "../../../../components/HrFormLayout";
import {
  formToTarget,
  getMonthlyTargetById,
  getEmployeeOptions,
  loadMonthlyTargets,
  saveMonthlyTargets,
  targetToForm,
  validateTargetForm,
  type MonthlyTargetFormValues,
} from "../../monthly-target-data";

export default function EditMonthlyTargetPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<MonthlyTargetFormValues | null>(null);
  const [error, setError] = useState<string | null>(null);
  const employees = getEmployeeOptions();

  useEffect(() => {
    const t = getMonthlyTargetById(id);
    if (!t) {
      router.replace("/hr/masters/monthly-target");
      return;
    }
    setForm(targetToForm(t));
  }, [id, router]);

  const save = () => {
    if (!form) return;
    const err = validateTargetForm(form);
    if (err) {
      setError(err);
      return;
    }
    const existing = getMonthlyTargetById(id);
    saveMonthlyTargets(loadMonthlyTargets().map((t) => (t.id === id ? formToTarget(form, id, existing) : t)));
    router.push("/hr/masters/monthly-target");
  };

  if (!form) return null;

  const set = <K extends keyof MonthlyTargetFormValues>(k: K, v: MonthlyTargetFormValues[K]) =>
    setForm({ ...form, [k]: v });

  return (
    <HrFormLayout
      mode="edit"
      title="Edit Monthly Target"
      breadcrumb={[
        { label: "HR", href: "/hr/employees" },
        { label: "Monthly Target", href: "/hr/masters/monthly-target" },
      ]}
      onSave={save}
      saveLabel="Save Target"
    >
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <div className="bg-white border border-border/60 rounded-lg p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="space-y-1">
          <Label className="text-[11px]">Month</Label>
          <Select value={String(form.month)} onValueChange={(v) => set("month", Number(v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{MONTH_OPTIONS.map((m) => <SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Year</Label>
          <Input type="number" className="h-8 text-xs" value={form.year} onChange={(e) => set("year", Number(e.target.value))} />
        </div>
        <div className="space-y-1 lg:col-span-2">
          <Label className="text-[11px]">Employee</Label>
          <Select value={String(form.employeeId)} onValueChange={(v) => set("employeeId", Number(v))}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.employeeName}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Target Type</Label>
          <Select value={form.targetType} onValueChange={(v) => set("targetType", v as "amount" | "quantity")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="amount" className="text-xs">Amount</SelectItem>
              <SelectItem value="quantity" className="text-xs">Quantity</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Target Value</Label>
          <Input type="number" className="h-8 text-xs" value={form.targetValue} onChange={(e) => set("targetValue", Number(e.target.value))} />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px]">Status</Label>
          <Select value={form.status} onValueChange={(v) => set("status", v as "active" | "inactive")}>
            <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="active" className="text-xs">Active</SelectItem>
              <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1 lg:col-span-4">
          <Label className="text-[11px]">Remarks</Label>
          <Textarea className="text-xs min-h-[60px]" value={form.remarks} onChange={(e) => set("remarks", e.target.value)} />
        </div>
      </div>
    </HrFormLayout>
  );
}
