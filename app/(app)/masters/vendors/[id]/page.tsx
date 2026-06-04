"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { VendorFormLayout } from "../components/VendorFormLayout";
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
    <VendorFormLayout
      mode="view"
      vendorCode={vendorCode}
      vendor={vendor}
      footer={
        <>
          <Button variant="outline" size="sm" className="h-9 text-sm" onClick={() => router.push("/masters/vendors")}>
            Back
          </Button>
          <Button asChild className="h-9 text-sm bg-brand-600 hover:bg-brand-700 text-white">
            <Link href={`/masters/vendors/${id}/edit`}>Edit Vendor</Link>
          </Button>
        </>
      }
    >
      <VendorForm form={form} onChange={setForm} readOnly vendorCode={vendorCode} />
    </VendorFormLayout>
  );
}
