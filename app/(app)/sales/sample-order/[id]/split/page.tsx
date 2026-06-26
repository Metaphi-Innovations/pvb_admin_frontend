"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Split, CheckCircle2, XCircle } from "lucide-react";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import SalesOrderForm, {
  type SalesOrderFormValues,
  validateSplitOrderForm,
} from "../../components/SalesOrderForm";
import {
  type SalesOrder,
  type ProductCatalogItem,
  getOrderById,
  hydrateOrderLineItems,
  loadProductCatalog,
  createEmptyLineItem,
  splitSalesOrderFromForm,
  canSplitOrder,
  generateOrderNumber,
  loadOrders,
  getCustomersForTransactionDropdown,
  getSalesmenForOrders,
} from "../../orders-data";

export default function SplitSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [originalOrder, setOriginalOrder] = useState<SalesOrder | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmen, setSalesmen] = useState<Employee[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [orderNumber, setOrderNumber] = useState("");
  const [form, setForm] = useState<SalesOrderFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => {
    setCustomers(getCustomersForTransactionDropdown());
    setSalesmen(getSalesmenForOrders());
    setProducts(loadProductCatalog());
    setOrderNumber(generateOrderNumber(loadOrders()));

    const loaded = getOrderById(id);
    if (!loaded) return;

    if (!canSplitOrder(loaded)) {
      setToast({ msg: "This order cannot be split.", type: "error" });
      setTimeout(() => router.push(`/sales/sample-order/${id}`), 1200);
      return;
    }

    const hydrated = hydrateOrderLineItems(loaded);
    setOriginalOrder(hydrated);
    setForm({
      orderDate: hydrated.orderDate,
      customerId: hydrated.customerId,
      salesManId: hydrated.salesManId,
      deliveryDate: hydrated.deliveryDate,
      status: hydrated.status === "draft" ? "draft" : "confirmed",
      lineItems: [createEmptyLineItem()],
      additionalExpenses: [],
      warehouseId: hydrated.warehouseId ?? null,
      warehouseName: hydrated.warehouseName ?? "",
    });
  }, [id, router]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const handleSave = (asDraft: boolean) => {
    if (!form || !originalOrder) return;

    const e = validateSplitOrderForm(form, originalOrder);
    setErrors(e);
    if (Object.keys(e).length > 0) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    const result = splitSalesOrderFromForm(originalOrder.id, form, orderNumber, asDraft);
    if ("error" in result) {
      setToast({ msg: result.error, type: "error" });
      return;
    }

    setToast({
      msg: asDraft
        ? "Split order saved as draft."
        : result.newOrder.requiresApproval
          ? "Split order submitted for approval."
          : `Split order ${result.newOrder.soNumber} created successfully.`,
      type: "success",
    });
    setTimeout(() => router.push("/sales/sample-order"), 1000);
  };

  if (!form || !originalOrder) {
    return (
      <AppLayout>
        <p className="text-sm text-muted-foreground p-4">Loading order…</p>
      </AppLayout>
    );
  }

  return (
    <AppLayout noPadding>
      <div className="flex flex-col h-full">
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-2.5 flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push(`/sales/sample-order`)}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <h2 className="flex-1 text-sm font-semibold text-foreground">Split Sample Order</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(`/sales/sample-order/${id}`)}
          >
            Cancel
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => handleSave(true)}
          >
            Save as Draft
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
          >
            <Split className="w-3.5 h-3.5" /> Create Split Order
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 bg-muted/10">
          <SalesOrderForm
            mode="split"
            orderNumber={orderNumber}
            form={form}
            onChange={setForm}
            errors={errors}
            customers={customers}
            salesmen={salesmen}
            products={products}
            originalOrder={originalOrder}
          />
        </div>
      </div>

      {toast && (
        <div
          className={cn(
            "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
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


