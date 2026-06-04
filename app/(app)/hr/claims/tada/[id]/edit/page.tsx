"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HrFormLayout } from "../../../../components/HrFormLayout";
import { TadaClaimForm } from "../../components/TadaClaimForm";
import {
  claimToForm,
  formToClaim,
  getTadaClaimById,
  loadTadaClaims,
  saveTadaClaims,
  submitClaim,
  sumClaimAmount,
  validateClaimForm,
  type TadaClaimFormValues,
} from "../../tada-claim-data";

export default function EditTadaClaimPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<TadaClaimFormValues | null>(null);
  const [claimNumber, setClaimNumber] = useState("");
  const [status, setStatus] = useState<string>("draft");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const c = getTadaClaimById(id);
    if (!c || (c.status !== "draft" && c.status !== "rejected")) {
      router.replace(`/hr/claims/tada/${id}`);
      return;
    }
    setForm(claimToForm(c));
    setClaimNumber(c.claimNumber);
    setStatus(c.status);
  }, [id, router]);

  const persist = (asDraft: boolean) => {
    if (!form) return;
    const err = validateClaimForm(form);
    if (err) {
      setError(err);
      return;
    }
    const existing = getTadaClaimById(id);
    if (!existing) return;
    let claim = formToClaim(form, id, claimNumber, asDraft ? "draft" : existing.status, existing);
    if (!asDraft) claim = submitClaim(claim);
    saveTadaClaims(loadTadaClaims().map((c) => (c.id === id ? claim : c)));
    router.push("/hr/claims/tada");
  };

  if (!form) return null;

  return (
    <HrFormLayout
      mode="edit"
      title="Edit TA/DA Claim"
      breadcrumb={[
        { label: "HR", href: "/hr/attendance" },
        { label: "TA/DA Claims", href: "/hr/claims/tada" },
      ]}
      code={claimNumber}
    >
      {error && <p className="text-xs text-red-600 mb-2">{error}</p>}
      <TadaClaimForm form={form} onChange={setForm} claimNumber={claimNumber} />
      <div className="flex justify-end gap-2 mt-3">
        <p className="text-xs text-muted-foreground mr-auto self-center">
          Total: ₹{sumClaimAmount(form).toLocaleString("en-IN")}
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => persist(true)}>
          Save Draft
        </Button>
        <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => persist(false)}>
          Submit for Approval
        </Button>
      </div>
    </HrFormLayout>
  );
}
