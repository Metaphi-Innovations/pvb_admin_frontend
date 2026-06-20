"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "../../components/AccountsUI";
import { loadAccountItems } from "@/lib/accounts/account-items-data";
import { formatMoney } from "@/lib/accounts/money-format";

export default function AccountItemsPageClient() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");

  const items = useMemo(() => loadAccountItems(), []);
  const categories = useMemo(
    () => Array.from(new Set(items.map((i) => i.category))),
    [items],
  );

  const rows = useMemo(() => {
    const q = search.toLowerCase();
    return items.filter((i) => {
      if (category !== "all" && i.category !== category) return false;
      if (!q) return true;
      return (
        i.itemName.toLowerCase().includes(q) ||
        i.sku.toLowerCase().includes(q) ||
        i.hsnCode.includes(q)
      );
    });
  }, [items, search, category]);

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Items")}
      title="Items"
      description="Stock items with HSN, GST, opening quantity and default sales/purchase ledgers."
      actions={
        <Button
          size="sm"
          className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1"
          onClick={() => router.push("/accounts/masters/items/new")}
        >
          <Plus className="w-3.5 h-3.5" /> Add Item
        </Button>
      }
      filters={
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              className="h-8 pl-8 text-xs"
              placeholder="Search item, SKU, HSN…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="h-8 text-xs border border-border rounded-lg px-2 bg-white"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      }
      layout="split"
    >
      <div className="overflow-auto flex-1">
        <table className="w-full text-xs min-w-[900px]">
          <thead className="bg-muted/20 border-b border-border/60 sticky top-0">
            <tr>
              {["Item", "SKU", "Category", "HSN", "GST", "Unit", "Opening Qty", "Opening Value", "Valuation", "Status"].map(
                (h) => (
                  <th
                    key={h}
                    className={`px-3 py-2.5 font-semibold uppercase tracking-wide text-muted-foreground ${
                      h.includes("Qty") || h.includes("Value") ? "text-right" : "text-left"
                    }`}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((item) => (
              <tr
                key={item.id}
                className="border-b border-border/30 hover:bg-brand-50/30 cursor-pointer"
                onClick={() => router.push(`/accounts/masters/items/${item.id}/edit`)}
              >
                <td className="px-3 py-2.5 font-medium">{item.itemName}</td>
                <td className="px-3 py-2.5 font-mono text-muted-foreground">{item.sku}</td>
                <td className="px-3 py-2.5">{item.category}</td>
                <td className="px-3 py-2.5 font-mono">{item.hsnCode}</td>
                <td className="px-3 py-2.5">{item.gstRate}</td>
                <td className="px-3 py-2.5">{item.unit}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{item.openingQty}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{formatMoney(item.openingValue)}</td>
                <td className="px-3 py-2.5 capitalize">{item.valuationMethod.replace("_", " ")}</td>
                <td className="px-3 py-2.5">
                  <StatusBadge status={item.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-10">
            No items found.{" "}
            <Link href="/accounts/masters/items/new" className="text-brand-600 hover:underline">
              Add first item
            </Link>
          </p>
        )}
      </div>
    </AccountsPageShell>
  );
}
