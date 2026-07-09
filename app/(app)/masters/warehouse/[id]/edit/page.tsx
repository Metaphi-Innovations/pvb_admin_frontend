"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Save, Check, XCircle } from "lucide-react";
import {
  WarehouseForm,
  validateWarehouseForm,
  type WarehouseFormValues,
} from "../../components/WarehouseForm";
import { useWarehouse, useUpdateWarehouse } from "@/hooks/masters";
import { WarehouseListService, type WarehouseListRecord } from "@/services/warehouse-list.service";

function warehouseApiRecordToForm(record: WarehouseListRecord): WarehouseFormValues {
  return {
    warehouseName: record.warehouseName,
    gstApplicable: record.gstApplicable,
    gstRegistrationType: record.registrationType || "",
    gstin: record.gstNumber || "",
    registeredLegalName: record.registeredLegalName || "",
    registeredAddress: record.registeredGstAddress || "",
    accountHolderName: record.accountHolderName || "",
    bankName: record.bankName || "",
    branch: record.branchName || "",
    accountNumber: record.accountNumber || "",
    confirmAccountNumber: record.accountNumber || "",
    ifscCode: record.ifscCode || "",
    swiftCode: record.swiftCode || "",
    address: record.address || "",
    addressLine2: record.address1 || "",
    town: record.town || "",
    state: record.state || "",
    district: record.district || "",
    city: record.city || "",
    pincode: record.pincode || "",
    status: record.status as any,
    operatedBy: record.operatedBy as any,
    customerType: record.cfAgentId || "",
    contacts: (record.contacts ?? []).map((c, idx) => ({
      id: `CON-${idx + 1}`,
      contactPerson: c.contact_person,
      designation: c.designation || undefined,
      mobileNumber: c.mobile_number,
      emailAddress: c.email_address || "",
      alternateContact: c.alternate_contact || undefined,
      isPrimary: c.is_primary,
      mobileCountryCode: c.mobile_country_code || "+91",
    })),
    documents: (record.documents ?? []).map((d, idx) => ({
      uid: `DOC-${idx + 1}`,
      documentName: d.document_name,
      uploaded: true,
      fileName: "",
      uploadedAt: "",
      size: "",
    })),
  };
}

export default function EditWarehousePage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [form, setForm] = useState<WarehouseFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const { data: warehouse, isLoading, isError } = useWarehouse(id);
  const updateMutation = useUpdateWarehouse();

  useEffect(() => {
    if (!warehouse) return;
    setForm(warehouseApiRecordToForm(warehouse));
  }, [warehouse]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const clearErr = (key: string) => {
    setErrors((prev) => {
      const copy = { ...prev };
      delete copy[key];
      return copy;
    });
  };

  const handleSave = () => {
    if (!form || !id) return;
    const e = validateWarehouseForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    updateMutation.mutate(
      {
        id,
        payload: {
          warehouse_name: form.warehouseName.trim(),
          operated_by: form.operatedBy || null,
          gst_applicable: form.gstApplicable,
          c_f_agent_id: form.operatedBy === "C&F Agent" ? form.customerType : null,
          gst_number: form.gstApplicable ? form.gstin.trim().toUpperCase() : null,
          registration_type: form.gstApplicable ? form.gstRegistrationType : null,
          registered_legal_name: form.gstApplicable ? form.registeredLegalName.trim() : null,
          registered_gst_address: form.gstApplicable ? form.registeredAddress.trim() : null,
          account_holder_name: form.accountHolderName.trim() || null,
          bank_name: form.bankName.trim() || null,
          branch_name: form.branch.trim() || null,
          account_number: form.accountNumber.trim() || null,
          confirm_account_number: form.confirmAccountNumber.trim() || null,
          ifsc_code: form.ifscCode.trim().toUpperCase() || null,
          swift_code: form.swiftCode.trim() || null,
          address: form.address.trim() || null,
          address_1: form.addressLine2.trim() || null,
          town: form.town.trim() || null,
          state: form.state || null,
          district: form.district || null,
          city: form.city || null,
          pincode: form.pincode || null,
          status: form.status,
          contacts: form.contacts.map((c) => ({
            contact_person: c.contactPerson,
            designation: c.designation || null,
            mobile_country_code: c.mobileCountryCode || "+91",
            mobile_number: c.mobileNumber,
            alternate_contact: c.alternateContact || null,
            email_address: c.emailAddress || null,
            is_primary: Boolean(c.isPrimary),
          })),
          warehouse_documents: form.documents.map((d) => ({
            document_name: d.documentName,
          })),
          files: form.documents.map((d) => d.file).filter((f): f is File => !!f),
        },
      },
      {
        onSuccess: () => {
          setToast({ msg: "Warehouse updated successfully.", type: "success" });
          setTimeout(() => router.push(`/masters/warehouse/${id}`), 900);
        },
        onError: (err) => {
          const msg =
            err instanceof Error
              ? err.message
              : WarehouseListService.extractErrorMessage(err, "Failed to update warehouse.");
          setToast({ msg, type: "error" });
        },
      },
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (isError || !form) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Warehouse not found.</p>
        <Link href="/masters/warehouse" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title="Edit Warehouse"
      description={`Masters → Warehouse Master → ${form.warehouseName}`}
      compact
      onBack={() => router.back()}
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" className="h-9 text-xs font-semibold rounded-lg" onClick={() => router.back()}>
            Discard
          </Button>
          <Button
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
            disabled={updateMutation.isPending}
          >
            <Save className="w-4 h-4" /> Update Warehouse
          </Button>
        </div>
      }
    >
      <WarehouseForm
        form={form}
        onChange={setForm}
        errors={errors}
        onClearError={clearErr}
      />

      {/* Toast */}
      {toast && (
        <div
          className={cn(
            "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
            "animate-in slide-in-from-top-2 fade-in-0 duration-300",
            toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
          )}
        >
          {toast.type === "success" ? (
            <Check className="w-4 h-4 flex-shrink-0" />
          ) : (
            <XCircle className="w-4 h-4 flex-shrink-0" />
          )}
          {toast.msg}
        </div>
      )}
    </FormContainer>
  );
}
