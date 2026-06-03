"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HrFormLayout } from "../../../components/HrFormLayout";
import { TadaClaimForm } from "../components/TadaClaimForm";
import {
  DEFAULT_CLAIM_FORM,
  formToClaim,
  generateClaimNumber,
  loadTadaClaims,
  saveTadaClaims,
  submitClaim,
  sumClaimAmount,
  validateClaimForm,
  type TadaClaimFormValues,
} from "../tada-claim-data";

export default function NewTadaClaimPage() {
  const router = useRouter();
  const [form, setForm] = useState<TadaClaimFormValues>(DEFAULT_CLAIM_FORM);
  const [claimNumber, setClaimNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setClaimNumber(generateClaimNumber());
  }, []);

  const persist = (asDraft: boolean) => {
    const err = validateClaimForm(form);
    if (err) {
      setError(err);
      return;
    }
    const list = loadTadaClaims();
    const id = list.length ? Math.max(...list.map((c) => c.id)) + 1 : 1;
    let claim = formToClaim(form, id, claimNumber, "draft");
    if (!asDraft) claim = submitClaim(claim);
    saveTadaClaims([...list, claim]);
    router.push("/hr/claims/tada");
  };

  return (
    <HrFormLayout
      mode="create"
      title="New TA/DA Claim"
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
