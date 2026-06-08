"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { VendorForm } from "../components/VendorForm";
import { getVendorById, vendorToForm, type VendorFormValues } from "../vendor-data";

export default function ViewVendorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [form, setForm] = useState<VendorFormValues | null>(null);
  const [vendorCode, setVendorCode] = useState("");

  useEffect(() => {
    const v = getVendorById(id);
    if (!v) {
      router.replace("/masters/vendors");
      return;
    }
    setForm(vendorToForm(v));
    setVendorCode(v.vendorCode);
  }, [id, router]);

  if (!form) return null;

  const vendor = getVendorById(id);

  return (
    <FormContainer
      title="View Vendor"
      description={`Masters → Vendor Master → ${vendorCode}`}
      onBack={() => router.push("/masters/vendors")}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.push("/masters/vendors")}>
            Back
          </Button>
          <Button asChild className="h-9 text-xs font-semibold rounded-lg bg-brand-600 hover:bg-brand-700 text-white">
            <Link href={`/masters/vendors/${id}/edit`}>Edit Vendor</Link>
          </Button>
        </div>
      }
    >
      <VendorForm form={form} onChange={setForm} readOnly vendorCode={vendorCode} />
    </FormContainer>
  );
}
