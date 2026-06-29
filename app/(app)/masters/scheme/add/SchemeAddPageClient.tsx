"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords } from "@/lib/masters/common";
import { ProductDiscountSchemeForm } from "../components/ProductDiscountSchemeForm";
import { ProductNearExpirySchemeForm } from "../components/ProductNearExpirySchemeForm";
import {
  CashDiscountSchemeForm,
  FestiveDiscountSchemeForm,
  PaymentDiscountSchemeForm,
  TurnoverDiscountSchemeForm,
} from "../components/StandardSchemeForms";
import { SchemeTypeSelect } from "../components/SchemeTypeSelect";
import {
  DEFAULT_PRODUCT_DISCOUNT_FORM,
  getProductDiscountCodePreview,
  productDiscountFormToRecord,
  validateProductDiscountForm,
  type ProductDiscountForm,
} from "../product-discount-scheme";
import {
  DEFAULT_PRODUCT_NEAR_EXPIRY_FORM,
  getNearExpiryCodePreview,
  loadConsolidatedSchemeRecords,
  productNearExpiryFormToRecord,
  validateProductNearExpiryForm,
  type ProductNearExpiryForm,
} from "../product-near-expiry-scheme";
import {
  DEFAULT_CASH_FORM,
  DEFAULT_FESTIVE_FORM,
  DEFAULT_PAYMENT_FORM,
  DEFAULT_TURNOVER_FORM,
  cashFormToRecord,
  festiveFormToRecord,
  getCashCodePreview,
  getFestiveCodePreview,
  getPaymentCodePreview,
  getTurnoverCodePreview,
  paymentFormToRecord,
  turnoverFormToRecord,
  validateCashForm,
  validateFestiveForm,
  validatePaymentForm,
  validateTurnoverForm,
  type CashSchemeForm,
  type FestiveSchemeForm,
  type PaymentSchemeForm,
  type TurnoverSchemeForm,
} from "../standard-schemes";
import { SCHEME_STORAGE_KEY, type SchemeType } from "../scheme-data";

type ToastState = { msg: string; type: "success" | "error" };

function Toast({ toast }: { toast: ToastState }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="w-4 h-4" />
      ) : (
        <XCircle className="w-4 h-4" />
      )}
      {toast.msg}
    </div>
  );
}

type StandardFormState = {
  festive: FestiveSchemeForm;
  cash: CashSchemeForm;
  turnover: TurnoverSchemeForm;
  payment: PaymentSchemeForm;
};

const DEFAULT_STANDARD_FORMS: StandardFormState = {
  festive: { ...DEFAULT_FESTIVE_FORM },
  cash: { ...DEFAULT_CASH_FORM },
  turnover: { ...DEFAULT_TURNOVER_FORM },
  payment: { ...DEFAULT_PAYMENT_FORM },
};

export default function SchemeAddPageClient() {
  const router = useRouter();
  const [selectedType, setSelectedType] = useState<SchemeType>("Product Discount Scheme");
  const [productDiscountForm, setProductDiscountForm] = useState<ProductDiscountForm>({
    ...DEFAULT_PRODUCT_DISCOUNT_FORM,
  });
  const [nearExpiryForm, setNearExpiryForm] = useState<ProductNearExpiryForm>({
    ...DEFAULT_PRODUCT_NEAR_EXPIRY_FORM,
  });
  const [standardForms, setStandardForms] = useState<StandardFormState>(DEFAULT_STANDARD_FORMS);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<ToastState | null>(null);

  const productDiscountCodePreview = useMemo(() => getProductDiscountCodePreview(), []);
  const nearExpiryCodePreview = useMemo(() => getNearExpiryCodePreview(), []);
  const festiveCodePreview = useMemo(() => getFestiveCodePreview(), []);
  const cashCodePreview = useMemo(() => getCashCodePreview(), []);
  const turnoverCodePreview = useMemo(() => getTurnoverCodePreview(), []);
  const paymentCodePreview = useMemo(() => getPaymentCodePreview(), []);

  const showToast = (next: ToastState) => {
    setToast(next);
    setTimeout(() => setToast(null), 3200);
  };

  const saveNewRecord = (newRecord: ReturnType<typeof productDiscountFormToRecord>) => {
    const list = loadConsolidatedSchemeRecords();
    saveMasterRecords(SCHEME_STORAGE_KEY, [...list, newRecord]);
    showToast({ msg: "Scheme saved as draft", type: "success" });
    setTimeout(() => router.push("/masters/scheme"), 900);
  };

  const handleSave = () => {
    const list = loadConsolidatedSchemeRecords();
    const startId = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;

    if (selectedType === "Product Discount Scheme") {
      const err = validateProductDiscountForm(productDiscountForm, "add", list);
      if (err) {
        setFormError(err);
        showToast({ msg: err, type: "error" });
        return;
      }
      saveNewRecord(productDiscountFormToRecord(productDiscountForm, list, startId));
      return;
    }

    if (selectedType === "Product Near Expiry Scheme") {
      const err = validateProductNearExpiryForm(nearExpiryForm, "add", list);
      if (err) {
        setFormError(err);
        showToast({ msg: err, type: "error" });
        return;
      }
      saveNewRecord(productNearExpiryFormToRecord(nearExpiryForm, list, startId));
      return;
    }

    if (selectedType === "Festive Discount Scheme") {
      const form = standardForms.festive;
      const err = validateFestiveForm(form);
      if (err) {
        setFormError(err);
        showToast({ msg: err, type: "error" });
        return;
      }
      saveNewRecord(festiveFormToRecord(form, list, startId));
      return;
    }

    if (selectedType === "Cash Discount Scheme") {
      const form = standardForms.cash;
      const err = validateCashForm(form);
      if (err) {
        setFormError(err);
        showToast({ msg: err, type: "error" });
        return;
      }
      saveNewRecord(cashFormToRecord(form, list, startId));
      return;
    }

    if (selectedType === "Turnover Discount Scheme") {
      const form = standardForms.turnover;
      const err = validateTurnoverForm(form);
      if (err) {
        setFormError(err);
        showToast({ msg: err, type: "error" });
        return;
      }
      saveNewRecord(turnoverFormToRecord(form, list, startId));
      return;
    }

    if (selectedType === "Payment Discount Scheme") {
      const form = standardForms.payment;
      const err = validatePaymentForm(form);
      if (err) {
        setFormError(err);
        showToast({ msg: err, type: "error" });
        return;
      }
      saveNewRecord(paymentFormToRecord(form, list, startId));
    }
  };

  const renderForm = () => {
    switch (selectedType) {
      case "Product Discount Scheme":
        return (
          <ProductDiscountSchemeForm
            form={productDiscountForm}
            onChange={(next) => {
              setProductDiscountForm(next);
              setFormError("");
            }}
            mode="add"
            codePreview={productDiscountCodePreview}
            error={formError}
          />
        );
      case "Product Near Expiry Scheme":
        return (
          <ProductNearExpirySchemeForm
            form={nearExpiryForm}
            onChange={(next) => {
              setNearExpiryForm(next);
              setFormError("");
            }}
            mode="add"
            codePreview={nearExpiryCodePreview}
            error={formError}
          />
        );
      case "Festive Discount Scheme":
        return (
          <FestiveDiscountSchemeForm
            form={standardForms.festive}
            onChange={(next) => {
              setStandardForms((s) => ({ ...s, festive: next }));
              setFormError("");
            }}
            mode="add"
            codePreview={festiveCodePreview}
            error={formError}
          />
        );
      case "Cash Discount Scheme":
        return (
          <CashDiscountSchemeForm
            form={standardForms.cash}
            onChange={(next) => {
              setStandardForms((s) => ({ ...s, cash: next }));
              setFormError("");
            }}
            mode="add"
            codePreview={cashCodePreview}
            error={formError}
          />
        );
      case "Turnover Discount Scheme":
        return (
          <TurnoverDiscountSchemeForm
            form={standardForms.turnover}
            onChange={(next) => {
              setStandardForms((s) => ({ ...s, turnover: next }));
              setFormError("");
            }}
            mode="add"
            codePreview={turnoverCodePreview}
            error={formError}
          />
        );
      case "Payment Discount Scheme":
        return (
          <PaymentDiscountSchemeForm
            form={standardForms.payment}
            onChange={(next) => {
              setStandardForms((s) => ({ ...s, payment: next }));
              setFormError("");
            }}
            mode="add"
            codePreview={paymentCodePreview}
            error={formError}
          />
        );
      default:
        return null;
    }
  };

  return (
    <FormContainer
      title="Create Scheme"
      description={`Masters → Scheme Management → ${selectedType}`}
      onBack={() => router.push("/masters/scheme")}
      noCard
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="h-9 text-xs font-semibold rounded-lg"
            onClick={() => router.push("/masters/scheme")}
          >
            Discard
          </Button>
          <Button
            type="button"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5 bg-brand-600 text-white hover:bg-brand-700"
            onClick={handleSave}
          >
            <Save className="w-4 h-4" /> Save
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SchemeTypeSelect value={selectedType} onChange={setSelectedType} />
        {renderForm()}
      </div>
      {toast && <Toast toast={toast} />}
    </FormContainer>
  );
}
