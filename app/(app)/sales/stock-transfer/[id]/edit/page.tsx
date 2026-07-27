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
} from "../../stock-transfer-data";
import { useProductsDropdown } from "@/hooks/sales/use-sales-orders";
import { useStockTransfer, useUpdateStockTransfer } from "@/hooks/sales/use-stock-transfers";
import type { ProductCatalogItem } from "@/app/(app)/sales/orders/orders-data";

export default function EditStockTransferPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [form, setForm] = useState<StockTransferFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const { data: transfer, isLoading, isError } = useStockTransfer(id);
  const updateMutation = useUpdateStockTransfer();
  const { data: productData } = useProductsDropdown();

  useEffect(() => {
    if (productData) {
      const mapped = productData.map((p: any) => ({
        id: p.product_id,
        code: p.product_code,
        name: p.product_name,
        uom: p.uom || "NOS",
        status: "active" as const,
        stock: Number(p.pack_size || 1000),
        sellingPrice: Number(p.mrp || 0),
        gstRate: String(p.gst_rate?.gstPercentage || 18),
        packSize: Number(p.unit_per_packing || 1),
      }));
      setProducts(mapped);
    }
  }, [productData]);

  useEffect(() => {
    if (transfer) {
      setForm({
        transferDate: transfer.transferDate,
        deliveryDate: transfer.deliveryDate,
        sourceWarehouseId: transfer.sourceWarehouseId as any,
        targetWarehouseId: transfer.targetWarehouseId as any,
        requestedBy: transfer.requestedBy || "",
        reasonPurpose: transfer.reasonPurpose || "",
        transportDetails: transfer.transportDetails || "",
        remarks: transfer.remarks || "",
        status: transfer.status,
        lineItems: transfer.lineItems,
        additionalExpenses: transfer.additionalExpenses || [],
      });
    }
  }, [transfer]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = async (asDraft: boolean) => {
    if (!form || !transfer) return;

    const e = validateStockTransferForm(form);
    if (!form.requestedBy) {
      e.requestedBy = "Requester is required";
    }
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    try {
      await updateMutation.mutateAsync({
        id,
        form,
        options: {
          transferNo: transfer.transferNumber,
          status: asDraft ? "draft" : "approved",
        },
      });

      setToast({
        msg: asDraft
          ? "Stock transfer saved as draft."
          : "Stock transfer updated and approved.",
        type: "success",
      });
      setTimeout(() => router.push("/sales/stock-transfer"), 1000);
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.message || err?.message || "Failed to update stock transfer.",
        type: "error",
      });
    }
  };

  if (isLoading || !form || !transfer) {
    return (
      <FormContainer
        title="Edit Stock Transfer"
        description="Sales → Stock Transfer → Edit Transfer"
        onBack={() => router.push("/sales/stock-transfer")}
        onCancel={() => router.push("/sales/stock-transfer")}
        cancelLabel="Discard"
        noCard={true}
      >
        <p className="text-sm text-muted-foreground p-4">
          {isError ? "Error loading stock transfer." : "Loading transfer…"}
        </p>
      </FormContainer>
    );
  }

  const auditInfo = {
    createdBy: transfer.createdBy,
    createdDate: transfer.createdDate,
    updatedBy: transfer.updatedBy,
    updatedDate: transfer.updatedDate,
  };

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
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={() => handleSave(true)}
            disabled={updateMutation.isPending}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
            disabled={updateMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" /> Save & Approve
          </Button>
        </div>
      }
    >
      <StockTransferForm
        mode="edit"
        transferNumber={transfer.transferNumber}
        form={form}
        onChange={setForm}
        errors={errors}
        products={products}
        showStatus={true}
        auditInfo={auditInfo}
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
