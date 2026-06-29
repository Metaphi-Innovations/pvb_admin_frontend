"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { Upload, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Send } from "lucide-react";
import {
  getAllowedTravelOptions,
  resolveCityCategoryFromCities,
  getPersonalVehicleKmRule,
  getReportingRoleName,
  getRoleDisplayName,
  isTadaApplicableForRole,
  loadClaimCategories,
  resolveRoleIdFromDesignation,
  TRAVEL_TYPES,
  STAY_TYPES,
  VEHICLE_TYPES,
  LOCAL_TRAVEL_MODES,
  type TravelMode,
  type TravelType,
  type VehicleType,
} from "../../../sales-force-policy/tada-policy-data";
import {
  buildClaimValidationInput,
  computePolicyEligibleAmount,
  getPolicyStatus,
  validateClaim,
} from "../../../sales-force-policy/tada-policy-validation";
import type { ClaimAttachment, TadaClaimFormValues } from "../tada-claim-data";
import { employeeFieldsForClaim, newRowId, sumClaimAmount } from "../tada-claim-data";
import { getActiveHrEmployees } from "../../../employees/employee-master-data";

const STEPS = [
  "Employee & Travel Details",
  "Claim Category",
  "Expense Details",
  "Policy Validation Preview",
  "Submit",
] as const;

const TRAVEL_TYPE_LABELS: Record<TravelType, string> = {
  "Local Travel": "Local",
  "Outstation Travel": "Outstation",
};

function PolicyPreviewPanel({ form }: { form: TadaClaimFormValues }) {
  const preview = useMemo(
    () => validateClaim(buildClaimValidationInput(form)),
    [form],
  );
  const policyStatus = getPolicyStatus(preview.failedRules);
  const difference = preview.claimedAmount - preview.eligibleAmount;

  return (
    <div className="page-shell p-3 space-y-3">
      <p className="text-xs font-semibold">Policy Validation Preview</p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
        {[
          ["Eligible Amount", `₹${preview.eligibleAmount.toLocaleString("en-IN")}`],
          ["Claimed Amount", `₹${preview.claimedAmount.toLocaleString("en-IN")}`],
          ["Difference", `₹${difference.toLocaleString("en-IN")}`],
          ["Policy Status", policyStatus],
          ["Role", preview.roleName],
          ["City Category", preview.cityCategory],
          ["Travel Mode", preview.travelModeStatus],
          ["Travel Class", preview.travelClassStatus],
          ["Auto Approval Status", preview.autoApprovalEligible ? "Eligible" : "Not Eligible"],
          ["Approval Route", preview.approvalRoute.join(" → ")],
        ].map(([k, v]) => (
          <div key={k}>
            <p className="text-muted-foreground text-[10px] uppercase">{k}</p>
            <p
              className={cn(
                "font-semibold",
                k === "Policy Status" && policyStatus === "Non-Compliant" && "text-red-600",
                k === "Policy Status" && policyStatus === "Needs Review" && "text-amber-700",
                k === "Policy Status" && policyStatus === "Compliant" && "text-emerald-700",
                k === "Difference" && difference > 0 && "text-red-600",
                k === "Difference" && difference < 0 && "text-emerald-700",
              )}
            >
              {v}
            </p>
          </div>
        ))}
      </div>
      {preview.failedRules.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-2.5">
          <p className="text-[11px] font-semibold text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" /> Failed Rules
          </p>
          {preview.failedRules.map((r) => (
            <p key={r} className="text-[11px] text-amber-700">• {r}</p>
          ))}
        </div>
      )}
      {preview.autoApprovalEligible && (
        <p className="text-[11px] text-emerald-700 flex items-center gap-1">
          <CheckCircle2 className="w-3.5 h-3.5" /> Eligible for auto approval per policy configuration
        </p>
      )}
    </div>
  );
}

function SubmitSummaryPanel({
  form,
  claimNumber,
  onSubmit,
}: {
  form: TadaClaimFormValues;
  claimNumber: string;
  onSubmit?: () => void;
}) {
  const preview = useMemo(() => validateClaim(buildClaimValidationInput(form)), [form]);
  const cat = loadClaimCategories().find((c) => c.id === form.claimCategoryId);
  const policyStatus = getPolicyStatus(preview.failedRules);

  return (
    <div className="page-shell p-3 space-y-4">
      <p className="text-xs font-semibold">Review & Submit</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
        <div><p className="text-muted-foreground text-[10px] uppercase">Claim No.</p><p className="font-mono font-semibold">{claimNumber}</p></div>
        <div><p className="text-muted-foreground text-[10px] uppercase">Category</p><p className="font-semibold">{cat?.claimCategoryName ?? "—"}</p></div>
        <div><p className="text-muted-foreground text-[10px] uppercase">Travel</p><p className="font-semibold">{TRAVEL_TYPE_LABELS[form.travelType]}</p></div>
        <div><p className="text-muted-foreground text-[10px] uppercase">Period</p><p className="font-semibold">{form.periodFrom} — {form.periodTo}</p></div>
        <div><p className="text-muted-foreground text-[10px] uppercase">Claimed Amount</p><p className="font-semibold">₹{sumClaimAmount(form).toLocaleString("en-IN")}</p></div>
        <div><p className="text-muted-foreground text-[10px] uppercase">Policy Status</p><p className={cn("font-semibold", policyStatus === "Compliant" ? "text-emerald-700" : policyStatus === "Needs Review" ? "text-amber-700" : "text-red-600")}>{policyStatus}</p></div>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Submitting will route this claim through: {preview.approvalRoute.join(" → ")}. All amounts are validated against Sales Force TA/DA Policy Master.
      </p>
      {onSubmit && (
        <div className="flex justify-end gap-2 pt-2 border-t">
          <Button type="button" size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={onSubmit}>
            <Send className="w-3.5 h-3.5" /> Submit for Approval
          </Button>
        </div>
      )}
    </div>
  );
}

export function TadaClaimForm({
  form,
  onChange,
  claimNumber,
  readOnly,
  onSubmit,
}: {
  form: TadaClaimFormValues;
  onChange: (f: TadaClaimFormValues) => void;
  claimNumber: string;
  readOnly?: boolean;
  onSubmit?: () => void;
}) {
  const [step, setStep] = useState(0);
  const employees = getActiveHrEmployees().filter((e) => {
    const rid = resolveRoleIdFromDesignation(e.designation);
    return rid && isTadaApplicableForRole(rid);
  });
  const claimCategories = loadClaimCategories().filter((c) => c.status === "active");
  const set = (patch: Partial<TadaClaimFormValues>) => onChange({ ...form, ...patch });

  const onEmployeeChange = (employeeId: number) => {
    onChange({ ...form, employeeId, ...employeeFieldsForClaim(employeeId) });
  };

  const travelOptions = form.roleId ? getAllowedTravelOptions(form.roleId) : [];
  const modesForRole = [...new Set(travelOptions.map((o) => o.travelMode))];
  const classesForMode = form.travelMode
    ? travelOptions.filter((o) => o.travelMode === form.travelMode).map((o) => o.travelClass)
    : [];

  const onToCityChange = (toCity: string) => {
    set({ toCity, cityCategory: resolveCityCategoryFromCities(toCity, form.localCity, form.fromCity) });
  };

  const onFromCityChange = (fromCity: string) => {
    set({ fromCity, cityCategory: resolveCityCategoryFromCities(form.toCity, form.localCity, fromCity) });
  };

  const onLocalCityChange = (localCity: string) => {
    set({ localCity, cityCategory: resolveCityCategoryFromCities(form.toCity, localCity, form.fromCity) });
  };

  const applyPolicyAmount = (patch: Partial<TadaClaimFormValues>) => {
    const next = { ...form, ...patch };
    const cat = claimCategories.find((c) => c.id === next.claimCategoryId);
    const autoCategories = ["Boarding / Meals", "Incidental Allowance", "Flat Stay Allowance"];
    if (cat && autoCategories.includes(cat.claimCategoryName)) {
      const eligible = computePolicyEligibleAmount(next);
      onChange({ ...next, claimedAmount: eligible });
    } else {
      onChange(next);
    }
  };

  const onKmChange = (km: number) => {
    const rule = form.roleId && form.vehicleType ? getPersonalVehicleKmRule(form.roleId, form.vehicleType) : undefined;
    const rate = rule?.ratePerKm ?? 0;
    set({ km, ratePerKm: rate, claimedAmount: Math.round(km * rate) });
  };

  const addAttachment = () => {
    set({
      attachments: [
        ...form.attachments,
        { id: newRowId("att"), documentName: "Bill / Receipt", fileName: `upload_${Date.now()}.pdf` },
      ],
    });
  };

  const selectedCategory = claimCategories.find((c) => c.id === form.claimCategoryId);
  const billRequired = selectedCategory?.billRequired ?? false;

  const canProceed = () => {
    if (step === 0) return !!form.employeeId && !!form.periodFrom && !!form.periodTo;
    if (step === 1) return !!form.claimCategoryId;
    if (step === 2) return sumClaimAmount(form) > 0;
    return true;
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 border-b pb-2">
        {STEPS.map((s, i) => (
          <button
            key={s}
            type="button"
            disabled={readOnly && i < STEPS.length - 1}
            onClick={() => !readOnly && setStep(i)}
            className={cn(
              "px-3 py-1.5 text-[11px] rounded-md font-medium",
              step === i ? "bg-brand-600 text-white" : "text-muted-foreground hover:bg-muted",
            )}
          >
            {i + 1}. {s}
          </button>
        ))}
      </div>

      {step === 0 && (
        <div className="page-shell p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="space-y-1"><Label className="text-[11px]">Claim No.</Label><Input value={claimNumber} disabled className="h-8 text-xs font-mono bg-muted/30" /></div>
          <div className="space-y-1">
            <Label className="text-[11px]">Employee *</Label>
            <Select value={form.employeeId ? String(form.employeeId) : ""} disabled={readOnly} onValueChange={(v) => onEmployeeChange(Number(v))}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.employeeName}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[11px]">Role</Label><Input disabled className="h-8 text-xs bg-muted/20" value={form.roleId ? getRoleDisplayName(form.roleId) : "—"} /></div>
          <div className="space-y-1"><Label className="text-[11px]">Reporting Manager</Label><Input disabled className="h-8 text-xs bg-muted/20" value={form.reportingManager || (form.roleId ? getReportingRoleName(form.roleId) : "—")} /></div>
          <div className="space-y-1">
            <Label className="text-[11px]">Travel Type *</Label>
            <Select value={form.travelType} disabled={readOnly} onValueChange={(v) => set({ travelType: v as TadaClaimFormValues["travelType"] })}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{TRAVEL_TYPES.map((t) => <SelectItem key={t} value={t} className="text-xs">{TRAVEL_TYPE_LABELS[t]}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="space-y-1"><Label className="text-[11px]">From City</Label><Input className="h-8 text-xs" disabled={readOnly} value={form.fromCity} onChange={(e) => onFromCityChange(e.target.value)} /></div>
          <div className="space-y-1"><Label className="text-[11px]">To City</Label><Input className="h-8 text-xs" disabled={readOnly} value={form.toCity} onChange={(e) => onToCityChange(e.target.value)} /></div>
          <div className="space-y-1">
            <Label className="text-[11px]">City Category (auto)</Label>
            <Input disabled className="h-8 text-xs bg-muted/20" value={form.cityCategory} title="Derived from City Category Master" />
          </div>
          <div className="space-y-1"><Label className="text-[11px]">Start Date *</Label><Input type="date" className="h-8 text-xs" disabled={readOnly} value={form.periodFrom} onChange={(e) => set({ periodFrom: e.target.value })} /></div>
          <div className="space-y-1"><Label className="text-[11px]">End Date *</Label><Input type="date" className="h-8 text-xs" disabled={readOnly} value={form.periodTo} onChange={(e) => set({ periodTo: e.target.value })} /></div>
          <div className="space-y-1 sm:col-span-2"><Label className="text-[11px]">Purpose</Label><Input className="h-8 text-xs" disabled={readOnly} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} placeholder="Purpose of travel" /></div>
        </div>
      )}

      {step === 1 && (
        <div className="page-shell p-3 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {claimCategories.map((c) => (
            <button
              key={c.id}
              type="button"
              disabled={readOnly}
              onClick={() => applyPolicyAmount({ claimCategoryId: c.id, claimedAmount: 0 })}
              className={cn(
                "text-left p-3 rounded-lg border text-xs transition-colors",
                form.claimCategoryId === c.id ? "border-brand-600 bg-brand-50" : "hover:bg-muted/30",
              )}
            >
              <p className="font-semibold">{c.claimCategoryName}</p>
              <p className="text-muted-foreground mt-0.5">{c.description}</p>
              <p className="text-[10px] mt-1">Bill: {c.billRequired ? "Required" : "Not required"} · {c.limitType}</p>
            </button>
          ))}
        </div>
      )}

      {step === 2 && selectedCategory && (
        <div className="page-shell p-3 space-y-3">
          <p className="text-xs font-semibold">{selectedCategory.claimCategoryName} — Expense Details</p>

          {selectedCategory.claimCategoryName === "Travel Fare" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Travel Mode</Label>
                <Select value={form.travelMode ?? ""} disabled={readOnly} onValueChange={(v) => set({ travelMode: v as TravelMode, travelClass: "" })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{modesForRole.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Travel Class</Label>
                <Select value={form.travelClass ?? ""} disabled={readOnly} onValueChange={(v) => set({ travelClass: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{classesForMode.map((c) => <SelectItem key={c} value={c} className="text-xs">{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-[11px]">Ticket Amount</Label><Input type="number" className="h-8 text-xs" disabled={readOnly} value={form.claimedAmount || ""} onChange={(e) => set({ claimedAmount: Number(e.target.value) })} /></div>
            </div>
          )}

          {selectedCategory.claimCategoryName === "Lodging" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Stay Type</Label>
                <Select value={form.stayType ?? "Hotel"} disabled={readOnly} onValueChange={(v) => set({ stayType: v as TadaClaimFormValues["stayType"] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAY_TYPES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-[11px]">Hotel Name</Label><Input className="h-8 text-xs" disabled={readOnly} value={form.hotelName} onChange={(e) => set({ hotelName: e.target.value })} /></div>
              <div className="space-y-1"><Label className="text-[11px]">Nights</Label><Input type="number" className="h-8 text-xs" disabled={readOnly} value={form.nights || ""} onChange={(e) => set({ nights: Number(e.target.value) })} /></div>
              <div className="space-y-1"><Label className="text-[11px]">Amount</Label><Input type="number" className="h-8 text-xs" disabled={readOnly} value={form.claimedAmount || ""} onChange={(e) => set({ claimedAmount: Number(e.target.value) })} /></div>
            </div>
          )}

          {selectedCategory.claimCategoryName === "Flat Stay Allowance" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Stay Type</Label>
                <Select value={form.stayType ?? "Friends / Family / Relative"} disabled={readOnly} onValueChange={(v) => set({ stayType: v as TadaClaimFormValues["stayType"] })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{STAY_TYPES.filter((s) => s !== "Hotel").map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Days</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  disabled={readOnly}
                  value={form.nights || ""}
                  onChange={(e) => applyPolicyAmount({ nights: Number(e.target.value), incidentalDays: Number(e.target.value), stayType: "Friends / Family / Relative" })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Amount (policy)</Label>
                <Input disabled className="h-8 text-xs bg-muted/20" value={form.claimedAmount || ""} />
              </div>
              <div className="col-span-2 flex items-center gap-2">
                <Checkbox checked={form.declarationAccepted} disabled={readOnly} onCheckedChange={(v) => set({ declarationAccepted: !!v, stayType: "Friends / Family / Relative" })} />
                <Label className="text-[11px]">Declaration — stay with friends/family/relative (no hotel bill)</Label>
              </div>
            </div>
          )}

          {selectedCategory.claimCategoryName === "Local Conveyance" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Mode</Label>
                <Select value={form.localMode} disabled={readOnly} onValueChange={(v) => set({ localMode: v })}>
                  <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select mode" /></SelectTrigger>
                  <SelectContent>{LOCAL_TRAVEL_MODES.map((m) => <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-[11px]">Amount</Label><Input type="number" className="h-8 text-xs" disabled={readOnly} value={form.claimedAmount || ""} onChange={(e) => set({ claimedAmount: Number(e.target.value) })} /></div>
              <div className="space-y-1 sm:col-span-2"><Label className="text-[11px]">Purpose</Label><Input className="h-8 text-xs" disabled={readOnly} value={form.purpose} onChange={(e) => set({ purpose: e.target.value })} /></div>
            </div>
          )}

          {selectedCategory.claimCategoryName === "Boarding / Meals" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Days</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  disabled={readOnly}
                  value={form.incidentalDays || ""}
                  onChange={(e) => applyPolicyAmount({ incidentalDays: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Amount (policy)</Label>
                <Input disabled className="h-8 text-xs bg-muted/20" value={form.claimedAmount || ""} />
              </div>
            </div>
          )}

          {selectedCategory.claimCategoryName === "Personal Vehicle KM" && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Vehicle Type</Label>
                <Select
                  value={form.vehicleType ?? ""}
                  disabled={readOnly}
                  onValueChange={(v) => {
                    const vt = v as VehicleType;
                    const rule = form.roleId ? getPersonalVehicleKmRule(form.roleId, vt) : undefined;
                    const rate = rule?.ratePerKm ?? 0;
                    set({ vehicleType: vt, ratePerKm: rate, claimedAmount: Math.round((form.km || 0) * rate) });
                  }}
                >
                  <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>{VEHICLE_TYPES.map((v) => <SelectItem key={v} value={v} className="text-xs">{v}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-1"><Label className="text-[11px]">KM</Label><Input type="number" className="h-8 text-xs" disabled={readOnly} value={form.km || ""} onChange={(e) => onKmChange(Number(e.target.value))} /></div>
              <div className="space-y-1"><Label className="text-[11px]">Rate/KM (auto)</Label><Input disabled className="h-8 text-xs bg-muted/20" value={form.ratePerKm || ""} /></div>
              <div className="space-y-1"><Label className="text-[11px]">Amount (auto)</Label><Input disabled className="h-8 text-xs bg-muted/20" value={form.claimedAmount || ""} /></div>
            </div>
          )}

          {selectedCategory.claimCategoryName === "Incidental Allowance" && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-[11px]">Days</Label>
                <Input
                  type="number"
                  className="h-8 text-xs"
                  disabled={readOnly}
                  value={form.incidentalDays || ""}
                  onChange={(e) => applyPolicyAmount({ incidentalDays: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1">
                <Label className="text-[11px]">Amount (auto)</Label>
                <Input disabled className="h-8 text-xs bg-muted/20" value={form.claimedAmount || ""} />
              </div>
            </div>
          )}

          {(billRequired || selectedCategory.claimCategoryName === "Travel Fare" || selectedCategory.claimCategoryName === "Lodging") && (
            <div className="border-t pt-3">
              <div className="flex justify-between items-center mb-2">
                <p className="text-xs font-semibold">
                  {selectedCategory.claimCategoryName === "Lodging" ? "Bill" : "Attachment"}
                  {billRequired && <span className="text-red-500 ml-1">*</span>}
                </p>
                {!readOnly && (
                  <Button type="button" variant="outline" size="sm" className="h-7 text-[11px]" onClick={addAttachment}>
                    <Upload className="w-3 h-3" /> Upload
                  </Button>
                )}
              </div>
              {form.attachments.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">No attachment uploaded.</p>
              ) : (
                form.attachments.map((a, i) => (
                  <AttachmentRow key={a.id} attachment={a} readOnly={readOnly} onRemove={() => set({ attachments: form.attachments.filter((_, j) => j !== i) })} />
                ))
              )}
            </div>
          )}
        </div>
      )}

      {step === 3 && <PolicyPreviewPanel form={form} />}

      {step === 4 && !readOnly && (
        <SubmitSummaryPanel form={form} claimNumber={claimNumber} onSubmit={onSubmit} />
      )}

      {step === 4 && readOnly && <PolicyPreviewPanel form={form} />}

      {!readOnly && step < 4 && (
        <div className="flex justify-between">
          <Button type="button" variant="outline" size="sm" className="h-8 text-xs" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
            <ChevronLeft className="w-3.5 h-3.5" /> Back
          </Button>
          <Button
            type="button"
            size="sm"
            className="h-8 text-xs"
            disabled={!canProceed()}
            onClick={() => setStep((s) => s + 1)}
          >
            Next <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}

function AttachmentRow({
  attachment,
  readOnly,
  onRemove,
}: {
  attachment: ClaimAttachment;
  readOnly?: boolean;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2 text-xs py-1">
      <span className="font-mono text-muted-foreground">{attachment.fileName}</span>
      {!readOnly && (
        <button type="button" onClick={onRemove}>
          <Trash2 className="w-3.5 h-3.5 text-red-500" />
        </button>
      )}
    </div>
  );
}
