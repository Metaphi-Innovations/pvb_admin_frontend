"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Save,
  XCircle,
} from "lucide-react";
import { useSupplier, useUpdateSupplier } from "@/hooks/masters/use-supplier";
import {
  DEFAULT_VENDOR_FORM,
  VendorFormValues,
  collectVendorFormFieldErrors,
  firstVendorStepWithErrors,
  validateVendorFormStep,
} from "../../vendor-data";
import { VendorForm, VENDOR_FORM_STEPS, type VendorFormStepId } from "../../components/VendorForm";
import {
  loadPartyMasterAccounting,
  persistPartyMasterAccounting,
} from "@/lib/accounts/party-master-accounting-sync";
import type { SupplierListRecord } from "@/services/supplier-list.service";
import {
  buildGstCategory,
  gstApplicableFromCategory,
} from "@/lib/masters/gst-compliance";

function supplierToForm(supplier: SupplierListRecord): VendorFormValues {
  const gstCategory = buildGstCategory(
    supplier.gstRegistered,
    supplier.registrationType ?? "regular",
  );
  return {
    ...DEFAULT_VENDOR_FORM,
    vendorType: supplier.supplierTypeId,
    vendorName: supplier.supplierName,
    contactPerson: supplier.contactPerson ?? "",
    mobileCountryCode: supplier.mobileCountryCode ?? "+91",
    mobile: supplier.mobileNumber ?? "",
    email: (supplier.email ?? "").trim(),
    companyName: supplier.registeredLegalName || supplier.supplierName || "",
    gstRegistered: supplier.gstRegistered,
    gstApplicable: gstApplicableFromCategory(gstCategory),
    gstRegistrationType: supplier.registrationType ?? "regular",
    gstNumber: supplier.gstinNumber ?? "",
    gstCategory,
    legalCompanyName: supplier.registeredLegalName ?? "",
    panNumber: supplier.panNumber ?? "",
    tanNumber: supplier.tanNumber ?? "",
    tdsApplicable: supplier.tdsApplicable,
    tdsMasterId: supplier.tdsSectionId ?? "",
    msmeRegistered: supplier.msmeRegistered,
    msmeNumber: supplier.msmeRegNo ?? "",
    billingAddress: {
      line1: supplier.address1 ?? "",
      line2: supplier.address2 ?? "",
      pincodeId: supplier.pincodeId ?? "",
      pincode: supplier.pincodeMaster?.pincode ?? "",
      state: supplier.state ?? "",
      city: supplier.city ?? "",
      town: supplier.town ?? "",
      district: "",
      country: "India",
    },
    remarks: supplier.remarks ?? "",
    contacts:
      supplier.contacts && supplier.contacts.length > 0
        ? supplier.contacts.map((c) => ({
            uid: c.supplier_contact_id,
            name: c.contact_name,
            designation: c.designation ?? "",
            countryCode: c.mobile_country_code ?? "+91",
            mobile: c.mobile_number,
            email: c.email ?? "",
          }))
        : DEFAULT_VENDOR_FORM.contacts,
    vendorProducts:
      supplier.products?.map((p) => ({
        id: p.supplier_product_id,
        productId: p.product_id,
        productName: p.product?.product_name ?? "",
        sku: p.product?.product_code,
        price: Number(p.cost_price),
        status: "Active" as const,
      })) ?? [],
    documents:
      supplier.documents?.map((d) => ({
        uid: d.supplier_document_id,
        documentTypeId: undefined,
        documentName: d.document_name,
        file: undefined,
        fileUrl: d.file_url,
        uploaded: true,
        fileName: d.file_name,
        uploadedAt: d.created_at,
        size: "",
      })) ?? [],
    accountHolderName: supplier.bankAccounts?.[0]?.account_holder_name ?? "",
    bankName: supplier.bankAccounts?.[0]?.bank_name ?? "",
    branch: supplier.bankAccounts?.[0]?.branch_name ?? "",
    accountNumber: supplier.bankAccounts?.[0]?.account_number ?? "",
    confirmAccountNumber: supplier.bankAccounts?.[0]?.account_number ?? "",
    ifscCode: supplier.bankAccounts?.[0]?.ifsc_code ?? "",
    swiftCode: supplier.bankAccounts?.[0]?.swift_code ?? "",
    paymentType:
      (supplier.bankAccounts?.[0]?.payment_type?.startsWith("immediate")
        ? "immediate"
        : (supplier.bankAccounts?.[0]?.payment_type as VendorFormValues["paymentType"])) ||
      "credit",
    creditDays: String(supplier.bankAccounts?.[0]?.credit_days ?? "30"),
  };
}

export default function EditSupplierPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: supplier, isLoading, isError } = useSupplier(id);
  const [form, setForm] = useState<VendorFormValues>(DEFAULT_VENDOR_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [errorFocusToken, setErrorFocusToken] = useState(0);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  const updateMutation = useUpdateSupplier();
  const currentStep = VENDOR_FORM_STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === VENDOR_FORM_STEPS.length - 1;

  useEffect(() => {
    if (!supplier) return;
    setForm(supplierToForm(supplier));
    setHydrated(true);

    let cancelled = false;
    loadPartyMasterAccounting({ kind: "supplier", partyId: supplier.supplierUuid }).then(
      (accounting) => {
        if (cancelled) return;
        setForm((prev) => ({ ...prev, ...accounting }));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [supplier]);

  if (isLoading || !hydrated) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-xs text-muted-foreground">
          Loading supplier details…
        </div>
      </AppLayout>
    );
  }

  if (isError || !supplier) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-[#6B80A0]">Supplier not found.</p>
          <Link href="/masters/vendors" className="mt-2 inline-block text-xs text-[#1554B4]">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const clearErr = (key: string) =>
    setErrors((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

  const handleNext = () => {
    const stepErrors = validateVendorFormStep(form, currentStep.id as VendorFormStepId);
    setErrors(stepErrors);
    if (Object.keys(stepErrors).length > 0) {
      setErrorFocusToken((t) => t + 1);
      setToast({ msg: "Please fix the errors before continuing.", type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }
    setErrors({});
    setStepIndex((i) => Math.min(i + 1, VENDOR_FORM_STEPS.length - 1));
  };

  const handleBack = () => {
    setErrors({});
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const handleSave = () => {
    const fieldErrors = collectVendorFormFieldErrors(form);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      const firstStep = firstVendorStepWithErrors(form, VENDOR_FORM_STEPS);
      if (firstStep >= 0) setStepIndex(firstStep);
      setErrorFocusToken((t) => t + 1);
      setToast({ msg: Object.values(fieldErrors)[0], type: "error" });
      setTimeout(() => setToast(null), 3200);
      return;
    }

    setErrors({});

    const payload = {
      supplier_type_id: form.vendorType,
      supplier_code: supplier.supplierCode,
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

    updateMutation.mutate(
      { id, payload },
      {
        onSuccess: async () => {
          try {
            await persistPartyMasterAccounting({
              kind: "supplier",
              partyId: id,
              accounting: {
                openingBalance: form.openingBalance,
                balanceType: form.balanceType === "Debit" ? "Debit" : "Credit",
                openingBalanceDate: form.openingBalanceDate,
                billWiseAccounting: form.billWiseAccounting !== false,
                accountingDescription: form.accountingDescription,
              },
            });
          } catch {
            // Profile saved; accounting sync is best-effort.
          }
          setToast({ msg: "Supplier updated successfully.", type: "success" });
          setTimeout(() => router.push("/masters/vendors"), 900);
        },
        onError: (err: any) => {
          setToast({
            msg: err?.message || "Failed to update supplier.",
            type: "error",
          });
          setTimeout(() => setToast(null), 4000);
        },
      },
    );
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
            <h2 className="text-sm font-semibold leading-none text-foreground">
              Edit Supplier — {supplier.supplierName}
            </h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Masters → Supplier Master → Edit · Step {stepIndex + 1} of {VENDOR_FORM_STEPS.length}:{" "}
              {currentStep.label}
            </p>
          </div>
          <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-brand-50 text-brand-700">
            {supplier.supplierCode}
          </span>
          <Button variant="outline" size="sm" className="h-7 text-[11px] px-3" onClick={() => router.back()}>
            Discard
          </Button>
          {!isFirstStep && (
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-[11px] gap-1 px-3"
              onClick={handleBack}
            >
              <ChevronLeft className="w-3.5 h-3.5" /> Previous
            </Button>
          )}
          {!isLastStep ? (
            <Button
              size="sm"
              className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleNext}
            >
              Next <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          ) : (
            <Button
              size="sm"
              disabled={updateMutation.isPending}
              className="h-7 text-[11px] gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
              onClick={handleSave}
            >
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          )}
        </div>

        <div className="flex-1 px-6 py-6 pb-24 overflow-y-auto bg-muted/10">
          <div className="mb-3 flex flex-wrap gap-1.5">
            {VENDOR_FORM_STEPS.map((step, idx) => (
              <button
                key={step.id}
                type="button"
                onClick={() => {
                  if (idx <= stepIndex) {
                    setErrors({});
                    setStepIndex(idx);
                  }
                }}
                className={cn(
                  "rounded-full px-2.5 py-1 text-[10px] font-semibold border transition-colors",
                  idx === stepIndex
                    ? "bg-brand-600 text-white border-brand-600"
                    : idx < stepIndex
                      ? "bg-brand-50 text-brand-700 border-brand-200 cursor-pointer"
                      : "bg-muted/40 text-muted-foreground border-border cursor-default",
                )}
              >
                {idx + 1}. {step.label}
              </button>
            ))}
          </div>

          <VendorForm
            form={form}
            onChange={setForm}
            vendorCode={supplier.supplierCode}
            errors={errors}
            onClearError={clearErr}
            errorFocusToken={errorFocusToken}
            activeStep={currentStep.id}
            onStepChange={(step) => {
              const idx = VENDOR_FORM_STEPS.findIndex((s) => s.id === step);
              if (idx >= 0) setStepIndex(idx);
            }}
          />
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
