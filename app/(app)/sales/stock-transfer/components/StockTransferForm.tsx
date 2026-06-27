"use client";

import React, { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertCircle, Search } from "lucide-react";
import {
  loadWarehouses,
  type WarehouseMaster,
} from "@/app/(app)/masters/warehouse/warehouse-data";
import ProductLinesEditor from "@/app/(app)/sales/orders/components/ProductLinesEditor";
import AdditionalExpensesEditor from "@/app/(app)/sales/orders/components/AdditionalExpensesEditor";
import {
  type StockTransferFormValues,
  type TransferStatus,
} from "../stock-transfer-data";
import {
  type ProductCatalogItem,
  calculateOrderTotalsSummary,
} from "@/app/(app)/sales/orders/orders-data";

function SearchableDropdown<T extends { id: number }>({
  label,
  required,
  value,
  onChange,
  options,
  placeholder,
  error,
  getLabel,
}: {
  label: string;
  required?: boolean;
  value: number | null;
  onChange: (id: number) => void;
  options: T[];
  placeholder: string;
  error?: string;
  getLabel: (opt: T) => string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) =>
    getLabel(o).toLowerCase().includes(search.toLowerCase())
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
            <span
              className={
                selected
                  ? "text-foreground text-xs"
                  : "text-muted-foreground text-xs"
              }
            >
              {selected ? getLabel(selected) : placeholder}
            </span>
            <ChevronsUpDown className="flex-shrink-0 w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <div className="max-h-[220px] overflow-y-auto">
            {filtered.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  onChange(opt.id);
                  setOpen(false);
                  setSearch("");
                }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2.5 text-xs text-left transition-colors hover:bg-muted/60",
                  value === opt.id && "bg-brand-50",
                )}
              >
                <span className="flex-1 min-w-0">
                  <span className="block truncate">{getLabel(opt)}</span>
                </span>
                {value === opt.id && (
                  <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0 ml-auto" />
                )}
              </button>
            ))}
            {filtered.length === 0 && (
              <p className="px-3 py-3 text-xs text-center text-muted-foreground">
                No results found
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="flex items-center gap-1 text-[11px] text-red-500">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}

function SectionDivider({ title }: { title: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {title}
      </p>
    </div>
  );
}

function StatusSelect({
  value,
  onChange,
}: {
  value: TransferStatus;
  onChange: (s: TransferStatus) => void;
}) {
  const [open, setOpen] = useState(false);
  const options: { value: TransferStatus; label: string }[] = [
    { value: "draft", label: "Draft" },
    { value: "pending", label: "Pending Approval" },
    { value: "approved", label: "Approved" },
    { value: "rejected", label: "Rejected" },
    { value: "cancelled", label: "Cancelled" },
  ];
  const selected = options.find((o) => o.value === value);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="w-full h-8 px-2.5 text-xs text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30"
        >
          <span>{selected?.label ?? value}</span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1">
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-lg hover:bg-muted/60",
              value === opt.value && "bg-brand-50",
            )}
          >
            <span className="flex-1">{opt.label}</span>
            {value === opt.value && (
              <Check className="w-3.5 h-3.5 text-brand-600" />
            )}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface StockTransferFormProps {
  mode: "add" | "edit";
  transferNumber: string;
  form: StockTransferFormValues;
  onChange: (form: StockTransferFormValues) => void;
  errors: Record<string, string>;
  products: ProductCatalogItem[];
  showStatus?: boolean;
  auditInfo?: {
    createdBy: string;
    createdDate: string;
    updatedBy: string;
    updatedDate: string;
  };
}

export default function StockTransferForm({
  mode,
  transferNumber,
  form,
  onChange,
  errors,
  products,
  showStatus = false,
  auditInfo,
}: StockTransferFormProps) {
  const warehouses = useMemo(() => {
    return loadWarehouses().filter((w) => w.status === "active");
  }, []);

  const set = <K extends keyof StockTransferFormValues>(
    key: K,
    val: StockTransferFormValues[K],
  ) => onChange({ ...form, [key]: val });

  const totalsSummary = useMemo(
    () => calculateOrderTotalsSummary(form.lineItems, form.additionalExpenses || []),
    [form.lineItems, form.additionalExpenses]
  );

  const formatRupee = (n: number) =>
    `₹${n.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  return (
    <div className="p-4 space-y-4 bg-white border shadow-sm rounded-xl border-border">
      <SectionDivider title="Transfer Details" />
      
      <div className="grid grid-cols-1 gap-3 md:grid-cols-4 lg:grid-cols-6">
        <div className="space-y-1 col-span-1">
          <Label className="text-xs font-medium">Transfer Number</Label>
          <div className="h-8 px-2.5 border border-border rounded-lg bg-muted/30 flex items-center">
            <span className="font-mono text-xs font-semibold text-brand-700">
              {transferNumber}
            </span>
          </div>
        </div>

        <div className="space-y-1 col-span-1">
          <Label className="text-xs font-medium">
            Transfer Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={form.transferDate}
            onChange={(e) => set("transferDate", e.target.value)}
            className={cn(
              "h-8 text-xs rounded-lg",
              errors.transferDate && "border-red-400",
            )}
          />
          {errors.transferDate && (
            <p className="text-[11px] text-red-500">{errors.transferDate}</p>
          )}
        </div>

        <div className="space-y-1 col-span-1">
          <Label className="text-xs font-medium">
            Delivery Date <span className="text-red-500">*</span>
          </Label>
          <Input
            type="date"
            value={form.deliveryDate}
            min={form.transferDate}
            onChange={(e) => set("deliveryDate", e.target.value)}
            className={cn(
              "h-8 text-xs rounded-lg",
              errors.deliveryDate && "border-red-400",
            )}
          />
          {errors.deliveryDate && (
            <p className="text-[11px] text-red-500">{errors.deliveryDate}</p>
          )}
        </div>

        <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
          <SearchableDropdown<WarehouseMaster>
            label="Source Warehouse"
            required
            value={form.sourceWarehouseId}
            onChange={(id) => set("sourceWarehouseId", id)}
            options={warehouses}
            placeholder="Select source warehouse…"
            error={errors.sourceWarehouseId}
            getLabel={(w) => `${w.warehouseCode} — ${w.warehouseName}`}
          />
        </div>

        <div className="space-y-1 col-span-1 md:col-span-2 lg:col-span-1">
          <SearchableDropdown<WarehouseMaster>
            label="Target Warehouse"
            required
            value={form.targetWarehouseId}
            onChange={(id) => set("targetWarehouseId", id)}
            options={warehouses}
            placeholder="Select target warehouse…"
            error={errors.targetWarehouseId}
            getLabel={(w) => `${w.warehouseCode} — ${w.warehouseName}`}
          />
        </div>

        {showStatus && mode === "edit" ? (
          <div className="space-y-1 col-span-1">
            <Label className="text-xs font-medium">Transfer Status</Label>
            <StatusSelect
              value={form.status}
              onChange={(s) => set("status", s)}
            />
          </div>
        ) : null}
      </div>


      <SectionDivider title="Products" />
      
      <ProductLinesEditor
        lines={form.lineItems}
        products={products}
        onChange={(lines) => set("lineItems", lines)}
        error={errors.lineItems}
      />

      <AdditionalExpensesEditor
        expenses={form.additionalExpenses || []}
        onChange={(expenses) => set("additionalExpenses", expenses)}
      />

      <SectionDivider title="Total Summary" />
      <div className="flex justify-end">
        <div className="w-full max-w-md overflow-hidden border rounded-lg border-border bg-muted/20">
          <div className="divide-y divide-border/60">
            {[
              {
                label: "Product Subtotal:",
                value: formatRupee(totalsSummary.productSubtotal),
              },
              {
                label: "Product Discount Total:",
                value: formatRupee(totalsSummary.productDiscountTotal),
              },
              {
                label: "Additional Expenses Total:",
                value: formatRupee(totalsSummary.additionalExpensesTotal),
              },
              {
                label: "Taxable Amount:",
                value: formatRupee(totalsSummary.taxableAmount),
              },
              {
                label: "GST Amount:",
                value: formatRupee(totalsSummary.gstAmount),
              },
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-center justify-between gap-6 px-3 py-2 text-xs"
              >
                <span className="text-muted-foreground">{row.label}</span>
                <span className="font-medium text-foreground tabular-nums">
                  {row.value}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between gap-6 px-3 py-2.5 bg-brand-50/50">
              <span className="text-xs font-semibold text-foreground">
                Grand Total:
              </span>
              <span className="text-sm font-bold text-brand-700 tabular-nums">
                {formatRupee(totalsSummary.grandTotal)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {mode === "edit" && auditInfo && (
        <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-[11px] mt-4">
          <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">
            Record Info
          </p>
          <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
            <div>
              <span className="text-muted-foreground">Created By</span>
              <p className="font-medium">{auditInfo.createdBy}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Created Date</span>
              <p className="font-medium">{auditInfo.createdDate}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Updated By</span>
              <p className="font-medium">{auditInfo.updatedBy}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Updated Date</span>
              <p className="font-medium">{auditInfo.updatedDate}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
