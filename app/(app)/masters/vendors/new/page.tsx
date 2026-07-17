"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, XCircle } from "lucide-react";
import { useCreateSupplier, useSupplierPreviewNumber } from "@/hooks/masters/use-supplier";
import { VendorForm } from "../components/VendorForm";
import {
  DEFAULT_VENDOR_FORM,
  VendorFormValues,
  VendorStatus,
  validateVendorForm,
} from "../vendor-data";
import { SupplierCreatePayload } from "@/services/supplier-list.service";

export default function NewSupplierPage() {
  const router = useRouter();
  const [form, setForm] = useState<VendorFormValues>(DEFAULT_VENDOR_FORM);
  // const [status] = useState<VendorStatus>("active");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  // Fetch the next supplier code from the API
  const { data: previewCode } = useSupplierPreviewNumber(form.vendorType, true);
  const supplierCode = previewCode ?? "SUP-XXXX";

  const createMutation = useCreateSupplier();

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleSave = () => {
    // validateVendorForm returns a single error message (or null), not a per-field map.
    const validationError = validateVendorForm(form);
    if (validationError) {
      setErrors({ form: validationError });
      setToast({ msg: validationError, type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setErrors({});

    const payload: SupplierCreatePayload = {
      supplier_type_id: form.vendorType,
      supplier_code: supplierCode,
      supplier_name: form.vendorName,
      contact_person: form.contactPerson,
      mobile_country_code: form.mobileCountryCode,
      mobile_number: form.mobile,
      email: form.email,
      gst_registered: form.gstRegistered,
      registration_type: form.gstRegistered ? form.gstRegistrationType : null,
      gstin_number: form.gstRegistered ? form.gstNumber : null,
      registered_legal_name: form.legalCompanyName,
      registered_gst_address: [form.billingAddress.line1, form.billingAddress.line2]
        .filter(Boolean)
        .join(", "),
      pan_number: form.panNumber,
      tan_number: form.tanNumber,
      tds_applicable: form.tdsApplicable,
      tds_section_id: form.tdsApplicable ? form.tdsMasterId : null,
      msme_registered: form.msmeRegistered,
      msme_reg_no: form.msmeRegistered ? form.msmeNumber : null,
      address_1: form.billingAddress.line1,
      address_2: form.billingAddress.line2,
      pincode_id: form.billingAddress.pincodeId,
      state: form.billingAddress.state,
      city: form.billingAddress.city,
      town: form.billingAddress.town,
      remarks: form.remarks,
      contacts: form.contacts.map((c, idx) => ({
        contact_name: c.name,
        designation: c.designation,
        mobile_country_code: c.countryCode,
        mobile_number: c.mobile,
        email: c.email,
        is_primary: idx === 0,
      })),
      bank_accounts: [
        {
          account_holder_name: form.accountHolderName,
          bank_name: form.bankName,
          branch_name: form.branch,
          account_number: form.accountNumber,
          ifsc_code: form.ifscCode,
          swift_code: form.swiftCode,
          is_primary: true,
          payment_type: form.paymentType,
          credit_days: form.creditDays,
        },
      ],
      products: form.vendorProducts.map((p) => ({
        product_id: p.productId,
        cost_price: p.price ?? "",
      })),
      documents: form.documents.map((d) => ({
        document_name: d.documentName,
        document_type_id: d.documentTypeId,
        file: d.file,
        file_url: d.fileUrl,
        uploaded: d.uploaded,
        file_name: d.fileName,
        uploaded_at: d.uploadedAt,
        size: d.size,
      })),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        setToast({ msg: "Supplier created successfully.", type: "success" });
        setTimeout(() => router.push("/masters/vendors"), 900);
      },
      onError: (err: any) => {
        setToast({
          msg: err?.message || "Failed to create supplier.",
          type: "error",
        });
        setTimeout(() => setToast(null), 4000);
      },
    });
  };

  return (
    <AppLayout>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 flex items-center flex-shrink-0 gap-3 px-5 py-3 bg-white border-b border-border">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex items-center justify-center flex-shrink-0 w-8 h-8 transition-colors border rounded-lg border-border hover:bg-muted"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-semibold leading-none text-foreground">Add Supplier</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">Masters → Supplier Master → Add</p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {supplierCode}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            size="sm"
            disabled={createMutation.isPending}
            className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-3.5 h-3.5" /> Save
          </Button>
        </div>

        {/* Form Content */}
        <div className="flex-1 px-6 py-6 overflow-y-auto bg-muted/10">
          <VendorForm form={form} onChange={setForm} vendorCode={supplierCode} />
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}
    </AppLayout>
  );
}