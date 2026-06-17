"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { HrFormLayout } from "../../../components/HrFormLayout";
import { HrStatusBadge } from "../../../components/HrStatusBadge";
import { TadaClaimForm } from "../components/TadaClaimForm";
import { claimToForm, getTadaClaimById, type TadaClaimFormValues } from "../tada-claim-data";

export default function ViewTadaClaimPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<TadaClaimFormValues | null>(null);
  const [claimNumber, setClaimNumber] = useState("");
  const [status, setStatus] = useState("");

  useEffect(() => {
    const c = getTadaClaimById(id);
    if (!c) {
      router.replace("/hr/claims/tada");
      return;
    }
    setForm(claimToForm(c));
    setClaimNumber(c.claimNumber);
    setStatus(c.status);
  }, [id, router]);

  if (!form) return null;

  return (
    <HrFormLayout
      mode="view"
      title="View TA/DA Claim"
      breadcrumb={[
        { label: "HR", href: "/hr/attendance" },
        { label: "TA/DA Claims", href: "/hr/claims/tada" },
      ]}
      code={claimNumber}
    >
      <div className="flex items-center gap-2 mb-2">
        <HrStatusBadge status={status} />
        {(status === "draft" || status === "rejected") && (
          <Button size="sm" variant="outline" className="h-8 text-xs ml-auto" onClick={() => router.push(`/hr/claims/tada/${id}/edit`)}>
            Edit
          </Button>
        )}
      </div>
      <TadaClaimForm form={form} onChange={() => {}} claimNumber={claimNumber} readOnly />
    </HrFormLayout>
  );
}
