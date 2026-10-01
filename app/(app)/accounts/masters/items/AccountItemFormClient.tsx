"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { AccountsFormLayout } from "../../expenses/components/AccountsFormLayout";
import {
  getAccountItemById,
  loadAccountItems,
  nextAccountItemId,
  saveAccountItems,
  VALUATION_METHOD_OPTIONS,
  type AccountItem,
  type ValuationMethod,
} from "@/lib/accounts/account-items-data";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-lg border border-border/60 p-4 space-y-3">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h2>
      {children}
    </div>
  );
}

export default function AccountItemFormClient({ itemId }: { itemId?: number }) {
  const router = useRouter();
  const isEdit = itemId != null;
  const [form, setForm] = useState<Partial<AccountItem>>({
    itemName: "",
    sku: "",
    category: "",
    hsnCode: "",
    gstRate: "5%",
    unit: "BAG",
    openingQty: 0,
    openingRate: 0,
    openingValue: 0,
    valuationMethod: "weighted_average",
    defaultSalesLedger: "Sales Ledger",
    defaultPurchaseLedger: "Purchase Ledger",
    status: "active",
  });

  useEffect(() => {
    if (!isEdit || itemId == null) return;
    const item = getAccountItemById(itemId);
    if (!item) {
      router.replace("/accounts/masters/items");
      return;
    }
    setForm(item);
  }, [isEdit, itemId, router]);

  const set = <K extends keyof AccountItem>(k: K, v: AccountItem[K]) =>
    setForm((prev) => ({ ...prev, [k]: v }));

  const save = (draft: boolean) => {
    const list = loadAccountItems();
    const openingValue = (form.openingQty ?? 0) * (form.openingRate ?? 0);
    const payload: AccountItem = {
      itemName: form.itemName ?? "",
      sku: form.sku ?? "",
      category: form.category ?? "",
      hsnCode: form.hsnCode ?? "",
      gstRate: form.gstRate ?? "5%",
      unit: form.unit ?? "BAG",
      openingQty: form.openingQty ?? 0,
      openingRate: form.openingRate ?? 0,
      openingValue,
      valuationMethod: form.valuationMethod ?? "weighted_average",
      defaultSalesLedger: form.defaultSalesLedger ?? "Sales Ledger",
      defaultPurchaseLedger: form.defaultPurchaseLedger ?? "Purchase Ledger",
      status: draft ? (form.status ?? "active") : "active",
      id: isEdit && itemId != null ? itemId : nextAccountItemId(list),
    };
    if (isEdit && itemId != null) {
      saveAccountItems(list.map((i) => (i.id === itemId ? payload : i)));
    } else {
      saveAccountItems([...list, payload]);
    }
    router.push("/accounts/masters/items");
  };

  return (
    <AccountsFormLayout
      title={isEdit ? "Edit Item" : "Add Item"}
      breadcrumb={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Items", href: "/accounts/masters/items" },
      ]}
      code={form.sku}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => router.push("/accounts/masters/items")}>
            Cancel
          </Button>
          <Button size="sm" className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white" onClick={() => save(false)}>
            Save Item
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pb-8">
        <Section title="Item Details">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Item Name *</Label>
              <Input className="h-9 text-sm font-medium" value={form.itemName ?? ""} onChange={(e) => set("itemName", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">SKU / Item Code</Label>
              <Input className="h-9 text-sm font-medium font-mono" value={form.sku ?? ""} onChange={(e) => set("sku", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input className="h-9 text-sm font-medium" value={form.category ?? ""} onChange={(e) => set("category", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">HSN Code</Label>
              <Input className="h-9 text-sm font-medium font-mono" value={form.hsnCode ?? ""} onChange={(e) => set("hsnCode", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">GST Rate</Label>
              <Input className="h-9 text-sm font-medium" value={form.gstRate ?? ""} onChange={(e) => set("gstRate", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Unit</Label>
              <Input className="h-9 text-sm font-medium" value={form.unit ?? ""} onChange={(e) => set("unit", e.target.value)} />
            </div>
          </div>
        </Section>
        <Section title="Opening & Valuation">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Opening Quantity</Label>
              <Input type="number" className="h-9 text-sm font-medium" value={form.openingQty ?? 0} onChange={(e) => set("openingQty", Number(e.target.value))} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Opening Rate</Label>
              <AccountsMoneyInput className="h-9 text-sm font-medium" value={form.openingRate ?? 0} onChange={(v) => set("openingRate", v)} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Valuation Method</Label>
              <select
                className="h-8 w-full text-xs border border-border rounded-lg px-2 bg-white"
                value={form.valuationMethod}
                onChange={(e) => set("valuationMethod", e.target.value as ValuationMethod)}
              >
                {VALUATION_METHOD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Sales Ledger</Label>
              <Input className="h-9 text-sm font-medium" value={form.defaultSalesLedger ?? ""} onChange={(e) => set("defaultSalesLedger", e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Default Purchase Ledger</Label>
              <Input className="h-9 text-sm font-medium" value={form.defaultPurchaseLedger ?? ""} onChange={(e) => set("defaultPurchaseLedger", e.target.value)} />
            </div>
          </div>
        </Section>
      </div>
    </AccountsFormLayout>
  );
}
