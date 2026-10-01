"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, CheckCircle2, Pencil, Plane, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatHrDateDisplay } from "@/app/(app)/hr/components/HrDateInput";
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
  const rawId = params?.id;
  const id = Number(Array.isArray(rawId) ? rawId[0] : rawId);
  const editQuery = search.get("edit") === "1";

  const [policy, setPolicy] = useState<TravelPolicy | null>(null);
  const [draft, setDraft] = useState<TravelPolicy | null>(null);
  const [editing, setEditing] = useState(editQuery);
  const [section, setSection] = useState<PolicySectionId>("general");
  const [toast, setToast] = useState<string | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  const detailPath = Number.isFinite(id)
    ? `/hr/settings/reimbursement/travel-policy/${id}`
    : "/hr/settings/reimbursement/travel-policy";

  const setEditMode = useCallback(
    (next: boolean) => {
      setEditing(next);
      if (!Number.isFinite(id)) return;
      const href = next ? `${detailPath}?edit=1` : detailPath;
      router.replace(href, { scroll: false });
    },
    [detailPath, id, router],
  );

  const loadPolicy = useCallback(() => {
    if (!Number.isFinite(id)) {
      setPolicy(null);
      setDraft(null);
      return null;
    }
    const rec = getTravelPolicyById(id);
    const next = rec ? ensureMatrixCells(rec) : null;
    setPolicy(next);
    return next;
  }, [id]);

  useEffect(() => {
    const next = loadPolicy();
    setDraft(next);
  }, [loadPolicy]);

  // Keep edit mode in sync with ?edit=1 (list pencil → detail)
  useEffect(() => {
    setEditing(editQuery);
    if (editQuery) {
      const next = loadPolicy();
      if (next) setDraft(ensureMatrixCells(next));
    }
  }, [editQuery, loadPolicy]);

  useEffect(() => {
    const onUpd = () => {
      const next = loadPolicy();
      if (!editing && next) setDraft(next);
    };
    window.addEventListener(HR_TRAVEL_POLICY_EVENT, onUpd);
    return () => window.removeEventListener(HR_TRAVEL_POLICY_EVENT, onUpd);
  }, [loadPolicy, editing]);

  const working = editing ? draft : policy;

  const handleCancel = () => {
    setDraft(policy);
    setErrors([]);
    setEditMode(false);
  };

  const handleSave = (activate = false) => {
    if (!draft) return;
    const toSave: TravelPolicy = activate ? { ...draft, status: "active" } : draft;
    const errs = validateTravelPolicy(toSave);
    setErrors(errs);
    if (errs.length) {
      setToast(errs[0]!);
      return;
    }
    const saved = saveTravelPolicy(toSave);
    const next = ensureMatrixCells(saved);
    setPolicy(next);
    setDraft(next);
    setEditMode(false);
    setToast(activate ? "Policy activated." : "Policy updated.");
  };

  if (!working) {
    return (
      <HrOrgPageHeader title="Travel Policy" sectionLabel="Reimbursement Settings" icon={Plane}>
        <p className="text-sm text-muted-foreground">
          {Number.isFinite(id) ? "Policy not found." : "Invalid policy link."}
        </p>
        <Button
          variant="outline"
          size="sm"
          className={cn(hrBtn(), "mt-3")}
          onClick={() => router.push("/hr/settings/reimbursement/travel-policy")}
        >
          Back
        </Button>
      </HrOrgPageHeader>
    );
  }

  return (
    <HrOrgPageHeader
      title={editing ? "Edit Travel Policy" : working.name}
      description={
        editing
          ? working.name
          : working.policyNumber
            ? `${working.policyNumber} · ${working.appliesTo || "Travel"}`
            : working.appliesTo || "Travel Policy"
      }
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
              <Button variant="outline" size="sm" className={hrBtn()} onClick={handleCancel}>
                Cancel
              </Button>
              <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={() => handleSave()}>
                <Save className="w-3.5 h-3.5" /> Update Policy
              </Button>
              {working.status !== "active" ? (
                <Button
                  variant="outline"
                  size="sm"
                  className={hrBtn("gap-1.5")}
                  onClick={() => handleSave(true)}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" /> Activate
                </Button>
              ) : null}
            </>
          ) : (
            <Button
              size="sm"
              className={hrBtn("gap-1.5", true)}
              onClick={() => {
                setDraft(policy ? ensureMatrixCells(policy) : null);
                setEditMode(true);
              }}
            >
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

      {!editing ? (
        <div className="mb-3 rounded-xl border border-border bg-white shadow-sm px-4 py-3">
          <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">Policy Summary</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-2 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground">Policy Name</p>
              <p className="font-semibold">{working.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Effective From</p>
              <p className="font-semibold">{working.effectiveFrom ? formatHrDateDisplay(working.effectiveFrom) : "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{working.status}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Applies To</p>
              <p className="font-semibold">{working.appliesTo || "—"}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">Ex-HQ Threshold</p>
              <p className="font-semibold">
                {working.exHq.distanceThresholdKm} KM
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground">City Categories</p>
              <p className="font-semibold">
                {working.cityClasses.filter((c) => c.active).map((c) => c.name).join(", ") || "—"}
              </p>
            </div>
            <div className="md:col-span-2">
              <p className="text-[10px] text-muted-foreground">Applicable Designations</p>
              <p className="font-semibold">
                {working.roleMappings.filter((m) => m.active).map((m) => m.designationName).join(", ") || "—"}
              </p>
            </div>
          </div>
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
            onChange={(next) => {
              if (!editing) return;
              setDraft(next);
            }}
          />
        </div>
      </div>
      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
