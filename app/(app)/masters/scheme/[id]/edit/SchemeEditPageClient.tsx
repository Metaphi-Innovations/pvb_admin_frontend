"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { CheckCircle2, Save, XCircle } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { saveMasterRecords } from "@/lib/masters/common";
import { ProductDiscountSchemeForm } from "../../components/ProductDiscountSchemeForm";
import { ProductNearExpirySchemeForm } from "../../components/ProductNearExpirySchemeForm";
import {
  CashDiscountSchemeForm,
  FestiveDiscountSchemeForm,
  PaymentDiscountSchemeForm,
  TurnoverDiscountSchemeForm,
} from "../../components/StandardSchemeForms";
import {
  productDiscountFormToRecord,
  productDiscountRecordToForm,
  validateProductDiscountForm,
  canEditProductDiscountScheme,
  type ProductDiscountForm,
} from "../../product-discount-scheme";
import {
  productNearExpiryFormToRecord,
  productNearExpiryRecordToForm,
  validateProductNearExpiryForm,
  loadConsolidatedSchemeRecords,
  canEditNearExpiryScheme,
  type ProductNearExpiryForm,
} from "../../product-near-expiry-scheme";
import {
  canEditStandardSchemeRecord,
  cashFormToRecord,
  cashRecordToForm,
  festiveFormToRecord,
  festiveRecordToForm,
  isCashRecord,
  isFestiveRecord,
  isPaymentRecord,
  isTurnoverRecord,
  paymentFormToRecord,
  paymentRecordToForm,
  turnoverFormToRecord,
  turnoverRecordToForm,
  validateCashForm,
  validateFestiveForm,
  validatePaymentForm,
  validateTurnoverForm,
  type CashSchemeForm,
  type FestiveSchemeForm,
  type PaymentSchemeForm,
  type TurnoverSchemeForm,
} from "../../standard-schemes";
import { SCHEME_STORAGE_KEY, type SchemeRecord } from "../../scheme-data";

export default function SchemeEditPageClient() {
  const router = useRouter();
  const params = useParams();
  const schemeId = Number(params.id);

  const [record, setRecord] = useState<SchemeRecord | null>(null);
  const [productDiscountForm, setProductDiscountForm] = useState<ProductDiscountForm | null>(null);
  const [nearExpiryForm, setNearExpiryForm] = useState<ProductNearExpiryForm | null>(null);
  const [festiveForm, setFestiveForm] = useState<FestiveSchemeForm | null>(null);
  const [cashForm, setCashForm] = useState<CashSchemeForm | null>(null);
  const [turnoverForm, setTurnoverForm] = useState<TurnoverSchemeForm | null>(null);
  const [paymentForm, setPaymentForm] = useState<PaymentSchemeForm | null>(null);
  const [formError, setFormError] = useState("");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const isProductDiscount = record?.schemeType === "Product Discount Scheme";
  const isNearExpiry = record?.schemeType === "Product Near Expiry Scheme";
  const isFestive = record ? isFestiveRecord(record) : false;
  const isCash = record ? isCashRecord(record) : false;
  const isTurnover = record ? isTurnoverRecord(record) : false;
  const isPayment = record ? isPaymentRecord(record) : false;

  useEffect(() => {
    const list = loadConsolidatedSchemeRecords();
    const found = list.find((r) => r.id === schemeId);
    if (!found) {
      router.replace("/masters/scheme");
      return;
    }

    const canEdit =
      found.schemeType === "Product Discount Scheme"
        ? canEditProductDiscountScheme(found)
        : found.schemeType === "Product Near Expiry Scheme"
          ? canEditNearExpiryScheme(found)
          : canEditStandardSchemeRecord(found);

    if (!canEdit) {
      setToast({ msg: "This scheme cannot be edited after approval", type: "error" });
      setTimeout(() => router.replace("/masters/scheme"), 1200);
      return;
    }

    setRecord(found);
    if (found.schemeType === "Product Discount Scheme") {
      setProductDiscountForm(productDiscountRecordToForm(found));
    } else if (found.schemeType === "Product Near Expiry Scheme") {
      setNearExpiryForm(productNearExpiryRecordToForm(found));
    } else if (isFestiveRecord(found)) {
      setFestiveForm(festiveRecordToForm(found));
    } else if (isCashRecord(found)) {
      setCashForm(cashRecordToForm(found));
    } else if (isTurnoverRecord(found)) {
      setTurnoverForm(turnoverRecordToForm(found));
    } else if (isPaymentRecord(found)) {
      setPaymentForm(paymentRecordToForm(found));
    }
  }, [schemeId, router]);

  const handleSave = () => {
    if (!record) return;

    const persist = (updatedRecord: SchemeRecord) => {
      const list = loadConsolidatedSchemeRecords();
      const updated = list.map((r) => (r.id === record.id ? updatedRecord : r));
      saveMasterRecords(SCHEME_STORAGE_KEY, updated);
      setToast({ msg: "Scheme updated", type: "success" });
      setTimeout(() => router.push("/masters/scheme"), 900);
    };

    if (isProductDiscount && productDiscountForm) {
      const list = loadConsolidatedSchemeRecords();
      const err = validateProductDiscountForm(productDiscountForm, "edit", list, record.id);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      persist(productDiscountFormToRecord(productDiscountForm, list, record.id, record));
      return;
    }

    if (isNearExpiry && nearExpiryForm) {
      const list = loadConsolidatedSchemeRecords();
      const err = validateProductNearExpiryForm(nearExpiryForm, "edit", list, record.id);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      persist(productNearExpiryFormToRecord(nearExpiryForm, list, record.id, record));
      return;
    }

    const list = loadConsolidatedSchemeRecords();

    if (isFestive && festiveForm) {
      const err = validateFestiveForm(festiveForm);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      persist(festiveFormToRecord(festiveForm, list, record.id, record));
      return;
    }

    if (isCash && cashForm) {
      const err = validateCashForm(cashForm);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      persist(cashFormToRecord(cashForm, list, record.id, record));
      return;
    }

    if (isTurnover && turnoverForm) {
      const err = validateTurnoverForm(turnoverForm);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      persist(turnoverFormToRecord(turnoverForm, list, record.id, record));
      return;
    }

    if (isPayment && paymentForm) {
      const err = validatePaymentForm(paymentForm);
      if (err) {
        setFormError(err);
        setToast({ msg: err, type: "error" });
        setTimeout(() => setToast(null), 3200);
        return;
      }
      persist(paymentFormToRecord(paymentForm, list, record.id, record));
    }
  };

  const isLoading =
    !record ||
    (isProductDiscount
      ? !productDiscountForm
      : isNearExpiry
        ? !nearExpiryForm
        : isFestive
          ? !festiveForm
          : isCash
            ? !cashForm
            : isTurnover
              ? !turnoverForm
              : isPayment
                ? !paymentForm
                : true);

  if (isLoading) {
    return (
      <FormContainer title="Edit Scheme" description="Loading...">
        <p className="text-xs text-muted-foreground">Loading scheme...</p>
      </FormContainer>
    );
  }

  const title = isProductDiscount
    ? "Edit Product Discount Scheme"
    : isNearExpiry
      ? "Edit Product Near Expiry Scheme"
      : isFestive
        ? "Edit Festive Discount Scheme"
        : isCash
          ? "Edit Cash Discount Scheme"
          : isTurnover
            ? "Edit Turnover Discount Scheme"
            : isPayment
              ? "Edit Payment Discount Scheme"
              : "Edit Scheme";

  const useNoCard = isProductDiscount || isNearExpiry || isFestive || isCash || isTurnover || isPayment;

  return (
    <FormContainer
      title={title}
      description={`Masters → Scheme → ${record.schemeName}`}
      onBack={() => router.push("/masters/scheme")}
      noCard={useNoCard}
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
      {isProductDiscount && productDiscountForm ? (
        <ProductDiscountSchemeForm
          form={productDiscountForm}
          onChange={(next) => {
            setProductDiscountForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : isNearExpiry && nearExpiryForm ? (
        <ProductNearExpirySchemeForm
          form={nearExpiryForm}
          onChange={(next) => {
            setNearExpiryForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : isFestive && festiveForm ? (
        <FestiveDiscountSchemeForm
          form={festiveForm}
          onChange={(next) => {
            setFestiveForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : isCash && cashForm ? (
        <CashDiscountSchemeForm
          form={cashForm}
          onChange={(next) => {
            setCashForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : isTurnover && turnoverForm ? (
        <TurnoverDiscountSchemeForm
          form={turnoverForm}
          onChange={(next) => {
            setTurnoverForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : isPayment && paymentForm ? (
        <PaymentDiscountSchemeForm
          form={paymentForm}
          onChange={(next) => {
            setPaymentForm(next);
            setFormError("");
          }}
          mode="edit"
          schemeCode={record.schemeCode}
          error={formError}
        />
      ) : null}

      {toast && (
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
      )}
    </FormContainer>
  );
}
