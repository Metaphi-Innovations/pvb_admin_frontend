"use client";

import { AccountsWorkbenchPage } from "@/components/accounts/AccountsWorkbenchPage";

export default function StockValuationReportPage() {
  return (
    <AccountsWorkbenchPage
      section="Reports"
      title="Stock Valuation"
      description="Inventory valuation from stock-in-hand ledgers and warehouse integration."
      columns={[
        { key: "product", label: "Product / SKU" },
        { key: "qty", label: "Qty", align: "right" },
        { key: "rate", label: "Rate", align: "right", money: true },
        { key: "value", label: "Value", align: "right", money: true },
      ]}
      rows={[]}
      emptyMessage="Stock valuation syncs from warehouse inventory and COA Inventory ledgers."
    />
  );
}
