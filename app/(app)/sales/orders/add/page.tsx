"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  ArrowLeft, Save, Check, ChevronsUpDown, AlertCircle, Search,
  Info, CheckCircle2, XCircle,
} from "lucide-react";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import type { Employee } from "@/app/(app)/user-management/employee/employee-data";
import ProductLinesEditor from "../components/ProductLinesEditor";
import CustomerInfoDialog from "../components/CustomerInfoDialog";
import {
  type SalesOrder,
  type SalesOrderLineItem,
  type ProductCatalogItem,
  ORDER_APPROVAL_THRESHOLD,
  calculateOrderTotalsSummary,
  resolveSubmitStatus,
  orderRequiresApproval,
  loadOrders,
  saveOrders,
  nextOrderId,
  generateOrderNumber,
  todayStr,
  getCustomersForTransactionDropdown,
  getSalesmenForOrders,
  loadProductCatalog,
  createEmptyLineItem,
} from "../orders-data";

// ── Searchable single-select (Add User pattern) ─────────────────────────────
function SearchableDropdown<T extends { id: number }>({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  getLabel,
  renderOption,
}: {
  label: string;
  required?: boolean;
  value: number | null;
  onChange: (id: number) => void;
  options: T[];
  placeholder: string;
  error?: string;
  getLabel: (opt: T) => string;
  renderOption?: (opt: T) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find(o => o.id === value);
  const filtered = options.filter(o =>
    getLabel(o).toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-1">
      {label ? (
        <Label className="text-xs font-medium">
          {label} {required && <span className="text-red-500">*</span>}
        </Label>
      ) : null}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "w-full h-8 px-2.5 text-xs text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
              error ? "border-red-400" : "border-border",
            )}
          >
            <span className={selected ? "text-foreground text-xs" : "text-muted-foreground text-xs"}>
              {selected ? getLabel(selected) : placeholder}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="h-8 text-xs pl-8"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.map(opt => (
              <button
                key={opt.id}
                type="button"
                onClick={() => { onChange(opt.id); setOpen(false); setSearch(""); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors hover:bg-muted/60",
                  value === opt.id && "bg-brand-50",
                )}
              >
                {renderOption ? renderOption(opt) : (
                  <span className="flex-1">{getLabel(opt)}</span>
                )}
                {value === opt.id && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 ml-auto" />}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-muted-foreground text-center">No results found</p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
    </div>
  );
}

export default function AddSalesOrderPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [salesmen, setSalesmen] = useState<Employee[]>([]);
  const [products, setProducts] = useState<ProductCatalogItem[]>([]);
  const [orderNumber, setOrderNumber] = useState("SO-2024-011");
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const [form, setForm] = useState({
    orderDate: todayStr(),
    customerId: null as number | null,
    salesManId: null as number | null,
    deliveryDate: "",
    lineItems: [createEmptyLineItem()] as SalesOrderLineItem[],
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);

  useEffect(() => {
    setCustomers(getCustomersForTransactionDropdown());
    setSalesmen(getSalesmenForOrders());
    setProducts(loadProductCatalog());
    const orders = loadOrders();
    setOrderNumber(generateOrderNumber(orders));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(t);
  }, [toast]);

  const set = (key: keyof typeof form, val: unknown) =>
    setForm(prev => ({ ...prev, [key]: val }));

  const totalsSummary = useMemo(
    () => calculateOrderTotalsSummary(form.lineItems),
    [form.lineItems],
  );

  const totalAmount = totalsSummary.grandTotal;

  const needsApproval = orderRequiresApproval(totalAmount);

  const selectedCustomer = useMemo(
    () => customers.find(c => c.id === form.customerId) ?? null,
    [customers, form.customerId],
  );

  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.customerId) e.customerId = "Customer is required";
    if (!form.salesManId) e.salesManId = "Salesman is required";
    if (!form.orderDate) e.orderDate = "Order date is required";
    if (!form.deliveryDate) e.deliveryDate = "Delivery date is required";
    if (form.lineItems.length === 0) e.lineItems = "Add at least one product";
    else {
      const invalid = form.lineItems.some(l => !l.productId || l.quantity <= 0);
      if (invalid) e.lineItems = "Each line must have a product and quantity greater than zero";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = (asDraft: boolean) => {
    if (!validate()) {
      setToast({ msg: "Please fix the errors before saving.", type: "error" });
      return;
    }

    const customer = customers.find(c => c.id === form.customerId);
    const salesman = salesmen.find(s => s.id === form.salesManId);
    if (!customer || !salesman) {
      setToast({ msg: "Invalid customer or salesman selection.", type: "error" });
      return;
    }

    const orders = loadOrders();
    const today = todayStr();
    const finalStatus = resolveSubmitStatus(totalAmount, "confirmed", asDraft);
    const requiresApproval = orderRequiresApproval(totalAmount) && !asDraft;

    const newOrder: SalesOrder = {
      id: nextOrderId(orders),
      soNumber: orderNumber,
      customerId: customer.id,
      customerName: customer.customerName,
      customerCode: customer.customerCode,
      territory: customer.territoryName || "—",
      salesManId: salesman.id,
      salesManName: salesman.fullName,
      orderDate: form.orderDate,
      deliveryDate: form.deliveryDate,
      status: finalStatus,
      lineItems: form.lineItems,
      totalAmount,
      requiresApproval,
      items: form.lineItems.length,
      createdBy: "Admin",
      createdDate: today,
      updatedBy: "Admin",
      updatedDate: today,
    };

    saveOrders([...orders, newOrder]);
    setToast({
      msg: asDraft
        ? "Sales order saved as draft."
        : requiresApproval
          ? "Sales order submitted for approval."
          : "Sales order created successfully.",
      type: "success",
    });
    setTimeout(() => router.push("/sales/orders"), 1000);
  };

  return (
    <AppLayout noPadding>
      <div className="flex flex-col h-full">
        {/* Sticky header — Add User pattern */}
        <div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-2.5 flex items-center gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => router.push("/sales/orders")}
            className="w-7 h-7 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <h2 className="flex-1 text-sm font-semibold text-foreground">Add Sales Order</h2>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push("/sales/orders")}
          >
            Discard
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
            <Save className="w-3.5 h-3.5" /> Submit Order
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 bg-muted/10">
          <div className="bg-white rounded-xl border border-border shadow-sm p-4 space-y-4">
            <SectionDivider title="Order" />
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Order Number</Label>
                <div className="h-8 px-2.5 border border-border rounded-lg bg-muted/30 flex items-center">
                  <span className="font-mono text-xs font-semibold text-brand-700">{orderNumber}</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Order Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.orderDate}
                  onChange={e => set("orderDate", e.target.value)}
                  className={cn("h-8 text-xs rounded-lg", errors.orderDate && "border-red-400")}
                />
                {errors.orderDate && (
                  <p className="text-[11px] text-red-500">{errors.orderDate}</p>
                )}
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="flex items-center gap-1.5">
                  <Label className="text-xs font-medium">
                    Customer <span className="text-red-500">*</span>
                  </Label>
                  {selectedCustomer && (
                    <button
                      type="button"
                      onClick={() => setCustomerInfoOpen(true)}
                      className="w-5 h-5 rounded-full bg-brand-600 hover:bg-brand-700 flex items-center justify-center transition-colors shadow-sm"
                      title="View customer details"
                    >
                      <Info className="w-3 h-3 text-white" />
                    </button>
                  )}
                </div>
                <SearchableDropdown<Customer>
                  label=""
                  required
                  value={form.customerId}
                  onChange={id => {
                    set("customerId", id);
                    const c = customers.find(x => x.id === id);
                    if (c?.salesManId) set("salesManId", c.salesManId);
                  }}
                  options={customers}
                  placeholder="Select customer…"
                  error={errors.customerId}
                  getLabel={c => `${c.customerCode} — ${c.customerName}`}
                />
              </div>

              <div className="space-y-1 md:col-span-2">
                <SearchableDropdown<Employee>
                  label="Salesman"
                  required
                  value={form.salesManId}
                  onChange={id => set("salesManId", id)}
                  options={salesmen}
                  placeholder="Select salesman…"
                  error={errors.salesManId}
                  getLabel={s => `${s.employeeId} — ${s.fullName}`}
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium">
                  Delivery Date <span className="text-red-500">*</span>
                </Label>
                <Input
                  type="date"
                  value={form.deliveryDate}
                  min={form.orderDate}
                  onChange={e => set("deliveryDate", e.target.value)}
                  className={cn("h-8 text-xs rounded-lg", errors.deliveryDate && "border-red-400")}
                />
                {errors.deliveryDate && (
                  <p className="text-[11px] text-red-500">{errors.deliveryDate}</p>
                )}
              </div>
            </div>

            {needsApproval && (
              <p className="text-[11px] text-amber-700 flex items-center gap-1">
                <Info className="w-3 h-3 flex-shrink-0" />
                Total &gt; ₹{ORDER_APPROVAL_THRESHOLD.toLocaleString("en-IN")} — submits as Pending Approval.
              </p>
            )}

            <SectionDivider title="Products" />
            <ProductLinesEditor
              lines={form.lineItems}
              products={products}
              onChange={lines => set("lineItems", lines)}
              error={errors.lineItems}
            />

            <SectionDivider title="Total Summary" />
            <div className="flex justify-end">
              <div className="w-full max-w-sm border border-border rounded-lg bg-muted/20 overflow-hidden">
                <div className="divide-y divide-border/60">
                  {[
                    { label: "Subtotal (Before Discount):", value: formatRupee(totalsSummary.subtotalBeforeDiscount) },
                    { label: "Total Item Discounts:", value: formatRupee(totalsSummary.totalItemDiscounts) },
                    { label: "Net Total:", value: formatRupee(totalsSummary.netTotal) },
                    { label: "Total GST Value:", value: formatRupee(totalsSummary.totalGst) },
                  ].map(row => (
                    <div
                      key={row.label}
                      className="flex items-center justify-between gap-6 px-3 py-2 text-xs"
                    >
                      <span className="text-muted-foreground">{row.label}</span>
                      <span className="font-medium text-foreground tabular-nums">{row.value}</span>
                    </div>
                  ))}
                  <div className="flex items-center justify-between gap-6 px-3 py-2.5 bg-brand-50/50">
                    <span className="text-xs font-semibold text-foreground">Grand Total Amount:</span>
                    <span className="text-sm font-bold text-brand-700 tabular-nums">
                      {formatRupee(totalsSummary.grandTotal)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <CustomerInfoDialog
        customer={selectedCustomer}
        open={customerInfoOpen}
        onOpenChange={setCustomerInfoOpen}
      />

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
