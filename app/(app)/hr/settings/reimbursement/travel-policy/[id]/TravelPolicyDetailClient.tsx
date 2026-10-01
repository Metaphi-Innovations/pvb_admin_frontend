"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Pencil, Plane, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { HrSuccessToast } from "@/app/(app)/hr/components/HrSuccessToast";
import {
  HrOrgPageHeader,
  hrBtn,
} from "../../../organization/_components";
import {
  ensureMatrixCells,
  getTravelPolicyById,
  HR_TRAVEL_POLICY_EVENT,
  saveTravelPolicy,
  validateTravelPolicy,
  type TravelPolicy,
} from "../travel-policy-data";
import {
  POLICY_SECTIONS,
  TravelPolicySectionBody,
  type PolicySectionId,
} from "../components/TravelPolicySections";

export default function TravelPolicyDetailClient() {
  const params = useParams();
  const search = useSearchParams();
  const router = useRouter();
  const id = Number(params.id);
  const [policy, setPolicy] = useState<TravelPolicy | null>(null);
  const [draft, setDraft] = useState<TravelPolicy | null>(null);
  const [editing, setEditing] = useState(search.get("edit") === "1");
  const [section, setSection] = useState<PolicySectionId>("applicability");
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const refresh = useCallback(() => {
    const rec = Number.isFinite(id) ? getTravelPolicyById(id) : undefined;
    setPolicy(rec ? ensureMatrixCells(rec) : null);
    if (!editing) setDraft(rec ? ensureMatrixCells(rec) : null);
  }, [id, editing]);

  useEffect(() => {
    const rec = Number.isFinite(id) ? getTravelPolicyById(id) : undefined;
    const next = rec ? ensureMatrixCells(rec) : null;
    setPolicy(next);
    setDraft(next);
  }, [id]);

  useEffect(() => {
    const onUpd = () => refresh();
    window.addEventListener(HR_TRAVEL_POLICY_EVENT, onUpd);
    return () => window.removeEventListener(HR_TRAVEL_POLICY_EVENT, onUpd);
  }, [refresh]);

  const working = editing ? draft : policy;

  const handleSave = (activate: boolean) => {
    if (!draft) return;
    const next = activate ? { ...draft, status: "active" as const } : draft;
    const errs = validateTravelPolicy(next);
    setErrors(errs);
    if (errs.length) {
      setToast(errs[0]!);
      return;
    }
    const saved = saveTravelPolicy(next);
    setPolicy(ensureMatrixCells(saved));
    setDraft(ensureMatrixCells(saved));
    setEditing(false);
    setToast(activate ? "Policy saved and active." : "Policy saved.");
  };

  if (!working) {
    return (
      <HrOrgPageHeader title="Travel Policy" sectionLabel="Reimbursement Settings" icon={Plane}>
        <p className="text-sm text-muted-foreground">Policy not found.</p>
        <Button variant="outline" size="sm" className={cn(hrBtn(), "mt-3")} onClick={() => router.push("/hr/settings/reimbursement/travel-policy")}>
          Back
        </Button>
      </HrOrgPageHeader>
    );
  }

  return (
    <HrOrgPageHeader
      title={working.name}
      description={working.policyNumber ? `${working.policyNumber} · ${working.appliesTo}` : working.appliesTo}
      icon={Plane}
      sectionLabel="Reimbursement Settings"
      maxWidthClass="max-w-[1400px] w-full"
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className={hrBtn("gap-1.5")}
            onClick={() => router.push("/hr/settings/reimbursement/travel-policy")}
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back
          </Button>
          {editing ? (
            <>
              <Button
                variant="outline"
                size="sm"
                className={hrBtn()}
                onClick={() => {
                  setDraft(policy);
                  setEditing(false);
                  setErrors([]);
                }}
              >
                Cancel
              </Button>
              <Button variant="outline" size="sm" className={hrBtn("gap-1.5")} onClick={() => handleSave(false)}>
                <Save className="w-3.5 h-3.5" /> Save
              </Button>
              <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={() => handleSave(true)}>
                Save & Activate
              </Button>
            </>
          ) : (
            <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={() => setEditing(true)}>
              <Pencil className="w-3.5 h-3.5" /> Edit Policy
            </Button>
          )}
        </div>
      }
    >
      {errors.length > 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 mb-3">
          {errors.slice(0, 6).map((e) => (
            <p key={e}>{e}</p>
          ))}
        </div>
      ) : null}

      <div className="flex gap-0 border border-border rounded-xl bg-white shadow-sm overflow-hidden min-h-[560px]">
        <aside className="w-52 shrink-0 border-r border-border bg-muted/20 p-2">
          {POLICY_SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setSection(s.id)}
              className={cn(
                "w-full text-left px-2.5 py-1.5 text-xs rounded-lg mb-0.5",
                section === s.id ? "bg-brand-50 text-brand-700 font-semibold" : "text-muted-foreground hover:bg-muted/60",
              )}
            >
              {s.label}
            </button>
          ))}
        </aside>
        <div className="flex-1 min-w-0 p-4 overflow-y-auto max-h-[calc(100vh-220px)]">
          <TravelPolicySectionBody
            section={section}
            policy={working}
            readOnly={!editing}
            onChange={setDraft}
          />
        </div>
      </div>
      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
