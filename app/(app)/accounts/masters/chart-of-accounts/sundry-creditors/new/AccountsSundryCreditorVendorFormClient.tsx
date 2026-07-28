"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, CheckCircle2, Save, X, XCircle } from "lucide-react";
import { VendorForm } from "@/app/(app)/masters/vendors/components/VendorForm";
import {
  DEFAULT_VENDOR_FORM,
  collectVendorFormFieldErrors,
  validateVendorForm,
  type VendorFormValues,
} from "@/app/(app)/masters/vendors/vendor-data";
import {
  useCreateSupplier,
  useSupplier,
  useSupplierPreviewNumber,
  useUpdateSupplier,
} from "@/hooks/masters/use-supplier";
import type {
  SupplierCreatePayload,
  SupplierListRecord,
} from "@/services/supplier-list.service";
import {
  loadPartyMasterAccounting,
  persistPartyMasterAccounting,
} from "@/lib/accounts/party-master-accounting-sync";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import { useClientMounted } from "@/lib/use-client-mounted";
import { useFY, fyOpeningDateIso } from "@/lib/fy-store";
import {
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";
import { useQueryClient } from "@tanstack/react-query";
import { chartOfAccountsKeys } from "@/hooks/accounts/use-chart-of-accounts";
import type { CoaNodeId } from "../../../../data";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button type="button" onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function supplierToForm(supplier: SupplierListRecord): VendorFormValues {
  return {
    ...DEFAULT_VENDOR_FORM,
    vendorType: supplier.supplierTypeId,
    vendorName: supplier.supplierName,
    contactPerson: supplier.contactPerson ?? "",
    mobileCountryCode: supplier.mobileCountryCode ?? "+91",
    mobile: supplier.mobileNumber ?? "",
    email: supplier.email ?? "",
    gstRegistered: supplier.gstRegistered,
    gstRegistrationType: supplier.registrationType ?? "regular",
    gstNumber: supplier.gstinNumber ?? "",
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
      country: "India",
    },
    remarks: supplier.remarks ?? "",
    contacts:
      supplier.contacts?.map((c) => ({
        uid: c.supplier_contact_id,
        name: c.contact_name,
        designation: c.designation ?? "",
        countryCode: c.mobile_country_code ?? "+91",
        mobile: c.mobile_number,
        email: c.email ?? "",
      })) ?? [],
    vendorProducts:
      supplier.products?.map((p) => ({
        id: p.supplier_product_id,
        productId: p.product_id,
        productName: p.product?.product_name ?? "",
        sku: p.product?.product_code,
        price: Number(p.cost_price),
        status: "Active",
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
      (supplier.bankAccounts?.[0]?.payment_type as VendorFormValues["paymentType"]) ?? "",
    creditDays: String(supplier.bankAccounts?.[0]?.credit_days ?? ""),
  };
}

function buildSupplierPayload(form: VendorFormValues, supplierCode: string): SupplierCreatePayload {
  return {
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
}

export interface AccountsSundryCreditorVendorFormProps {
  parentGroupId: CoaNodeId;
  /** Supplier master UUID from Accounts API (preferred) */
  vendorId?: string | number;
  onClose: () => void;
  onSaved?: (ledgerId: CoaNodeId, parentGroupId: CoaNodeId | null) => void;
}

/**
 * Vendor Master form embedded in Chart of Accounts.
 * Loads/saves through the Masters Supplier API so every field populates on edit.
 */
export default function AccountsSundryCreditorVendorFormClient({
  parentGroupId,
  vendorId,
  onClose,
  onSaved,
}: AccountsSundryCreditorVendorFormProps) {
  const mounted = useClientMounted();
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const { selectedFY } = useFY();
  const queryClient = useQueryClient();
  const vendorUuid = vendorId != null ? String(vendorId) : "";
  const isEdit = Boolean(vendorUuid);

  const { data: supplier, isLoading: supplierLoading, isError: supplierError } = useSupplier(
    isEdit ? vendorUuid : null,
  );
  const createSupplier = useCreateSupplier();
  const updateSupplier = useUpdateSupplier();

  const [form, setForm] = useState<VendorFormValues>(() => ({
    ...DEFAULT_VENDOR_FORM,
    openingBalanceDate: fyOpeningDateIso(selectedFY.id),
    balanceType: "Credit",
  }));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [accountingLoading, setAccountingLoading] = useState(false);

  const { data: livePreviewCode } = useSupplierPreviewNumber(form.vendorType, !isEdit);

  useEffect(() => {
    if (!isEdit || !supplier) return;
    setForm((prev) => ({
      ...supplierToForm(supplier),
      openingBalance: prev.openingBalance,
      balanceType: prev.balanceType || "Credit",
      openingBalanceDate: prev.openingBalanceDate || fyOpeningDateIso(selectedFY.id),
      billWiseAccounting: prev.billWiseAccounting,
      accountingDescription: prev.accountingDescription,
    }));
    let cancelled = false;
    setAccountingLoading(true);
    loadPartyMasterAccounting({ kind: "supplier", partyId: supplier.supplierUuid })
      .then((accounting) => {
        if (cancelled) return;
        setForm((prev) => ({ ...prev, ...accounting }));
      })
      .finally(() => {
        if (!cancelled) setAccountingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isEdit, supplier, selectedFY.id]);

  useEffect(() => {
    if (!isEdit || !supplierError) return;
    setToast({ msg: "Supplier not found.", type: "error" });
    const t = setTimeout(() => onClose(), 1200);
    return () => clearTimeout(t);
  }, [isEdit, supplierError, onClose]);

  const allowed = isEdit ? canEdit : canCreate;
  const saving = createSupplier.isPending || updateSupplier.isPending;
  const ready =
    mounted &&
    !accountingLoading &&
    (!isEdit || (!supplierLoading && Boolean(supplier)));

  const vendorCode = isEdit ? supplier?.supplierCode ?? "" : livePreviewCode ?? "";

  const showToast = (msg: string, type: ToastState["type"]) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3200);
  };

  const handleSave = async () => {
    if (!allowed) {
      showToast("You do not have permission to save this vendor.", "error");
      return;
    }

    const fieldErrors = collectVendorFormFieldErrors(form);
    const legacyErr = validateVendorForm(form);
    if (legacyErr) fieldErrors._form = legacyErr;
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) {
      showToast(fieldErrors._form || "Please fix the errors before saving.", "error");
      return;
    }

    if (!form.vendorType) {
      showToast("Supplier type is required.", "error");
      return;
    }
    if (!vendorCode) {
      showToast("Select a supplier type to generate supplier code.", "error");
      return;
    }

    try {
      if (isEdit && supplier) {
        await updateSupplier.mutateAsync({
          id: supplier.supplierUuid,
          payload: buildSupplierPayload(form, supplier.supplierCode),
        });
        const ledgerId = await persistPartyMasterAccounting({
          kind: "supplier",
          partyId: supplier.supplierUuid,
          accounting: {
            openingBalance: form.openingBalance,
            balanceType: form.balanceType === "Debit" ? "Debit" : "Credit",
            openingBalanceDate: form.openingBalanceDate,
            billWiseAccounting: form.billWiseAccounting !== false,
            accountingDescription: form.accountingDescription,
          },
        });
        await queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
        onSaved?.(ledgerId ?? supplier.supplierUuid, parentGroupId);
        showToast("Vendor and ledger updated.", "success");
        setTimeout(() => onClose(), 700);
        return;
      }

      const created = await createSupplier.mutateAsync(
        buildSupplierPayload(form, vendorCode),
      );
      const uuid = created?.supplierUuid ?? "";
      const ledgerId = uuid
        ? await persistPartyMasterAccounting({
            kind: "supplier",
            partyId: String(uuid),
            accounting: {
              openingBalance: form.openingBalance,
              balanceType: form.balanceType === "Debit" ? "Debit" : "Credit",
              openingBalanceDate: form.openingBalanceDate,
              billWiseAccounting: form.billWiseAccounting !== false,
              accountingDescription: form.accountingDescription,
            },
          })
        : null;
      await queryClient.invalidateQueries({ queryKey: chartOfAccountsKeys.all });
      onSaved?.(ledgerId ?? String(uuid || parentGroupId), parentGroupId);
      showToast("Vendor created with linked ledger.", "success");
      setTimeout(() => onClose(), 700);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to save vendor.", "error");
    }
  };

  if (!mounted) return null;

  if (!allowed) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 p-8 text-center">
        <p className="text-sm text-muted-foreground">
          You do not have permission to {isEdit ? "edit" : "create"} vendor ledgers.
        </p>
        <Button type="button" variant="outline" size="sm" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center p-8">
        <p className="text-sm text-muted-foreground">Loading supplier…</p>
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col overflow-hidden bg-background">
      {toast ? <Toast toast={toast} onDismiss={() => setToast(null)} /> : null}
      <div className="flex-shrink-0 border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <button
              type="button"
              onClick={onClose}
              className="mb-1 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Back to Chart of Accounts
            </button>
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>
              {isEdit ? "Edit Vendor Ledger" : "Add Vendor Ledger"}
            </h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              Accounts → Chart of Accounts → Sundry Creditors → {isEdit ? "Edit" : "Add"}
              {vendorCode ? (
                <>
                  {" · "}
                  <span className="font-mono font-semibold text-brand-700">{vendorCode}</span>
                </>
              ) : null}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              className="gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
              onClick={() => void handleSave()}
              disabled={saving}
            >
              <Save className="h-3.5 w-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <VendorForm
          form={form}
          onChange={setForm}
          vendorCode={vendorCode}
          errors={errors}
        />
      </div>
    </div>
  );
}
