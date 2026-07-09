"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Save, CheckCircle2, XCircle } from "lucide-react";
import StockTransferForm from "../components/StockTransferForm";
import {
  type StockTransferFormValues,
  validateStockTransferForm,
  todayStr,
} from "../stock-transfer-data";
import { useProductsDropdown } from "@/hooks/sales/use-sales-orders";
import { useNextStockTransferNumber, useCreateStockTransfer } from "@/hooks/sales/use-stock-transfers";
import type { ProductCatalogItem } from "@/app/(app)/sales/orders/orders-data";

export default function AddStockTransferPage() {
  const router = useRouter();
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [toast, setToast] = useState<{
    msg: string;
    type: "success" | "error";
  } | null>(null);

  const [form, setForm] = useState<StockTransferFormValues>({
    transferDate: todayStr(),
    deliveryDate: "",
    sourceWarehouseId: null,
    targetWarehouseId: null,
    requestedBy: "",
    reasonPurpose: "",
    transportDetails: "",
    remarks: "",
    status: "pending_approval",
    lineItems: [],
    additionalExpenses: [],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: nextNumber, isLoading: loadingNo } = useNextStockTransferNumber();
  const createMutation = useCreateStockTransfer();
  const { data: productData } = useProductsDropdown();

  const transferNumber = nextNumber || "Loading...";

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
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = async (asDraft: boolean) => {
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
      await createMutation.mutateAsync({
        form,
        options: {
          transferNo: transferNumber,
          status: asDraft ? "draft" : "approved",
        },
      });

      setToast({
        msg: asDraft
          ? "Stock transfer saved as draft."
          : "Stock transfer created and approved.",
        type: "success",
      });
      setTimeout(() => router.push("/sales/stock-transfer"), 1000);
    } catch (err: any) {
      setToast({
        msg: err?.response?.data?.message || err?.message || "Failed to save stock transfer.",
        type: "error",
      });
    }
  };

  return (
    <FormContainer
      title="Add Stock Transfer"
      description="Sales → Stock Transfer → New Transfer"
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
            disabled={createMutation.isPending}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
            disabled={createMutation.isPending}
          >
            <Save className="w-3.5 h-3.5" /> Submit for Approval
          </Button>
        </div>
      }
    >
      <StockTransferForm
        mode="add"
        transferNumber={transferNumber}
        form={form}
        onChange={setForm}
        errors={errors}
        products={products}
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
