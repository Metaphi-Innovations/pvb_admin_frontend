"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
      <TadaClaimForm
        form={form}
        onChange={setForm}
        claimNumber={claimNumber}
        onSaveDraft={() => persist(true)}
        onSubmit={() => persist(false)}
      />
      <p className="text-xs text-muted-foreground mt-2">
        Total: ₹{sumClaimAmount(form).toLocaleString("en-IN")} — validated against Sales Force TA/DA Policy Master
      </p>
    </HrFormLayout>
  );
}
