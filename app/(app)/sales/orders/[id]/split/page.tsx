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
  hydrateOrderLineItems,
  canSplitOrder,
  setDynamicProducts,
} from "../../orders-data";
import { setDynamicPricingRecords } from "@/app/(app)/masters/pricing/pricing-data";
import { validateSalesOrderCreditLimit } from "@/lib/sales/sales-order-credit";
import type { CustomerCreditSummary } from "@/lib/sales/customer-credit-limit";
import CreditLimitExceededDialog from "../../components/CreditLimitExceededDialog";
import {
  useSalesOrder,
  useSplitSalesOrder,
  useCustomersDropdown,
  useSalesmenDropdown,
  useProductsDropdown,
  useProductPricingDropdown,
  useNextSoNumber,
} from "@/hooks/sales/use-sales-orders";

export default function SplitSalesOrderPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [originalOrder, setOriginalOrder] = useState<SalesOrder | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmen, setSalesmen] = useState<Employee[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [form, setForm] = useState<SalesOrderFormValues | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [creditDialog, setCreditDialog] = useState<CustomerCreditSummary | null>(null);

  const { data: nextOrderNumber } = useNextSoNumber();
  const { data: loadedOrder, isLoading: loadingOrder } = useSalesOrder(id);
  const { data: customerData } = useCustomersDropdown();
  const { data: salesmanData } = useSalesmenDropdown();
  const { data: productData } = useProductsDropdown();
  const { data: pricingData } = useProductPricingDropdown();

  const splitMutation = useSplitSalesOrder();

  const orderNumber = nextOrderNumber || "SO-2026-0001";

  // Map dropdown data
  useEffect(() => {
    if (customerData) {
      const mapped = customerData.map((c: any) => ({
        id: c.customer_id,
        customerCode: c.customer_code,
        customerName: c.customer_name,
        customerType: c.customer_type?.customer_type_name || "",
        status: c.is_active ? "active" : "inactive",
        mobile: c.mobile_no || "",
        email: c.email || "",
        gstApplicable: c.gst_applicable,
        gstin: c.gstin_no || "",
        registeredLegalName: c.registered_legal_name || "",
        registeredAddress: c.registered_gst_address || "",
        pan: c.pan_no || "",
        paymentType: c.payment_type || "Credit",
        creditLimit: Number(c.credit_limit || 0),
        creditDays: Number(c.credit_days || 0),
        branches: [],
      }));
      setCustomers(mapped as any);
    }
  }, [customerData]);

  useEffect(() => {
    if (salesmanData) {
      const mapped = salesmanData.map((s: any) => ({
        id: s.user_id,
        employeeId: s.employee_id || s.username || "",
        employeeCode: s.employee_id || s.username || "",
        firstName: s.first_name || "",
        lastName: s.last_name || "",
        fullName: `${s.first_name || ""} ${s.last_name || ""}`.trim() || s.username || "",
        email: s.email || "",
        role: s.role?.role_name || s.role_type || "",
      }));
      setSalesmen(mapped as any);
    }
  }, [salesmanData]);

  useEffect(() => {
    if (productData) {
      const mapped = productData.map((p: any) => ({
        id: p.product_id,
        code: p.product_code,
        name: p.product_name,
        sku: p.sku || "",
        stock: Number(p.pack_size || 1000), // fallback stock
        sellingPrice: Number(p.mrp || 0),
        gstRate: String(p.gst_rate?.gstPercentage || 18),
        category: p.category?.categoryName || "",
        segment: p.segment?.segment_name || "",
        packSize: Number(p.unit_per_packing || 1),
      }));
      setProducts(mapped as any);
      setDynamicProducts(mapped as any);
    } else {
      setDynamicProducts(null);
    }
  }, [productData]);

  useEffect(() => {
    if (pricingData) {
      const mapped = pricingData.map((pr: any) => ({
        id: pr.id,
        productId: pr.product_id,
        state: pr.state_name,
        customerType: pr.customer_type?.customer_type_name || "",
        status: pr.is_active ? "active" : "inactive",
        dealerPrice: Number(pr.dealer_price || 0),
        costPrice: Number(pr.cost_price || 0),
      }));
      setDynamicPricingRecords(mapped as any);
    } else {
      setDynamicPricingRecords(null);
    }
  }, [pricingData]);

  // Load and hydrate original order
  useEffect(() => {
    if (!loadedOrder) return;

    const hydrated = hydrateOrderLineItems(loadedOrder);
    setOriginalOrder(hydrated);

    setForm({
      orderDate: hydrated.orderDate,
      customerId: hydrated.customerId,
      salesManId: hydrated.salesManId,
      deliveryDate: hydrated.deliveryDate,
      status: hydrated.status === "draft" ? "draft" : "confirmed",
      lineItems: hydrated.lineItems.map((item) => ({
        ...item,
        id: `line-split-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        splitSourceLineId: item.id,
        maxSplitQty: item.quantity,
      })),
      additionalExpenses: [],
      warehouseId: hydrated.warehouseId ?? null,
      warehouseName: hydrated.warehouseName ?? "",
      remarks: "",
    });
  }, [loadedOrder]);

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

    const customer = customers.find((c) => c.id === form.customerId);
    const creditCheck = validateSalesOrderCreditLimit({ form, customer });
    if (creditCheck.exceeded && creditCheck.summary) {
      setCreditDialog(creditCheck.summary);
      return;
    }

    splitMutation.mutate(
      {
        id: originalOrder.id,
        form,
        options: {
          status: asDraft ? "draft" : form.status || "confirmed",
          reason: form.remarks || "Quantity split",
        },
      },
      {
        onSuccess: () => {
          setToast({
            msg: "Split order created successfully.",
            type: "success",
          });
          setTimeout(() => router.push("/sales/orders"), 1000);
        },
        onError: (err: any) => {
          setToast({
            msg: err.response?.data?.message || "Failed to split sales order.",
            type: "error",
          });
        },
      }
    );
  };

  if (loadingOrder || !form || !originalOrder) {
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
            onClick={() => router.push(`/sales/orders`)}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <h2 className="flex-1 text-sm font-semibold text-foreground">Split Sales Order</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(`/sales/orders`)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => handleSave(false)}
            disabled={splitMutation.isPending}
          >
            <Split className="w-3.5 h-3.5" /> {splitMutation.isPending ? "Splitting..." : "Create Split Order"}
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

      {creditDialog && (
        <CreditLimitExceededDialog
          open
          onClose={() => setCreditDialog(null)}
          summary={creditDialog}
        />
      )}
    </AppLayout>
  );
}
