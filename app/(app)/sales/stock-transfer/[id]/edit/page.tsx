"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import StockTransferForm from "../../components/StockTransferForm";
import {
  type StockTransferFormValues,
  validateStockTransferForm,
  buildTransferFromForm,
  getTransferById,
  loadTransfers,
  saveTransfers,
} from "../../stock-transfer-data";
import { loadProductCatalog, type ProductCatalogItem } from "@/app/(app)/sales/orders/orders-data";

export default function EditStockTransferPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [transferNumber, setTransferNumber] = useState("");
  const [form, setForm] = useState<StockTransferFormValues | null>(null);
  const [auditInfo, setAuditInfo] = useState<{
    createdBy: string;
    createdDate: string;
    updatedBy: string;
    updatedDate: string;
  } | null>(null);
  const [existingTransfer, setExistingTransfer] = useState<any>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  useEffect(() => {
    setProducts(loadProductCatalog());
    const transfer = getTransferById(id);
    if (!transfer) return;

    setExistingTransfer(transfer);
    setTransferNumber(transfer.transferNumber);
    setForm({
      transferDate: transfer.transferDate,
      deliveryDate: transfer.deliveryDate,
      sourceWarehouseId: transfer.sourceWarehouseId,
      targetWarehouseId: transfer.targetWarehouseId,
      status: transfer.status,
      lineItems: transfer.lineItems,
      additionalExpenses: transfer.additionalExpenses || [],
    });
    setAuditInfo({
      createdBy: transfer.createdBy,
      createdDate: transfer.createdDate,
      updatedBy: transfer.updatedBy,
      updatedDate: transfer.updatedDate,
    });
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = (asDraft: boolean) => {
    if (!form || !existingTransfer) return;

    const e = validateStockTransferForm(form);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    const updated = buildTransferFromForm(
      form,
      {
        id: existingTransfer.id,
        transferNumber: existingTransfer.transferNumber,
        createdBy: existingTransfer.createdBy,
        createdDate: existingTransfer.createdDate,
      },
      asDraft
    );

    if (!updated) {
      setToast({
        msg: "Invalid warehouse selection.",
        type: "error",
      });
      return;
    }

    const transfers = loadTransfers();
    saveTransfers(transfers.map((t) => (t.id === updated.id ? updated : t)));

    setToast({
      msg: asDraft
        ? "Stock transfer saved as draft."
        : "Stock transfer updated successfully.",
      type: "success",
    });
    setTimeout(() => router.push("/sales/stock-transfer"), 1000);
  };

  if (!form) {
    return (
      <FormContainer
        title="Edit Stock Transfer"
        description="Sales → Stock Transfer → Edit Transfer"
        onBack={() => router.push("/sales/stock-transfer")}
        onCancel={() => router.push("/sales/stock-transfer")}
        cancelLabel="Discard"
        noCard={true}
      >
        <p className="text-sm text-muted-foreground p-4">Loading transfer…</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title="Edit Stock Transfer"
      description="Sales → Stock Transfer → Edit Transfer"
      onBack={() => router.push("/sales/stock-transfer")}
      onCancel={() => router.push("/sales/stock-transfer")}
      cancelLabel="Discard"
      noCard={true}
      actions={
        <div className="flex items-center gap-2">
          {form.status === "draft" && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => handleSave(true)}
            >
              Save as Draft
            </Button>
          )}
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
          >
            <Save className="w-3.5 h-3.5" /> Save Changes
          </Button>
        </div>
      }
    >
      <StockTransferForm
        mode="edit"
        transferNumber={transferNumber}
        form={form}
        onChange={setForm}
        errors={errors}
        products={products}
        showStatus
        auditInfo={auditInfo ?? undefined}
      />

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
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
