"use client";

import React, { useState, useMemo, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send, Upload, AlertCircle, Plus, Trash2, AlertTriangle } from "lucide-react";
import { useRouter } from "next/navigation";
import { GrnItem } from "../shared/types";
import { cn } from "@/lib/utils";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Field, TextField } from "@/components/ui/FormFields";
import { FormContainer } from "@/components/layout/FormContainer";
import { useGrnPreviewNumber, useCreateGrn } from "@/hooks/warehouse/use-grn";
import {
  usePurchaseOrder,
  usePurchaseOrderDropdown,
  usePurchaseOrderSupplierDropdown,
  usePurchaseOrderWarehouseDropdown,
} from "@/hooks/procurement/use-purchase-orders";
import type { POLineItem } from "@/app/(app)/procurement/purchase-orders/po-data";
import { round2 } from "@/lib/procurement/utils";
import type { CreateGrnPayload } from "@/services/grn.service";

interface ManualInvoiceRow {
  id: string;
  sourceItemId: string;
  productId: string;
  productName: string;
  productCode: string;
  unit: string;
  batchNumber: string;
  mfgDate: string;
  expDate: string;
  quantity: number;
  unitPrice: number;
  gstPct: number;
  gstAmount: number;
  totalAmount: number;
}

function createEmptyRow(): ManualInvoiceRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    sourceItemId: "",
    productId: "",
    productName: "",
    productCode: "",
    unit: "",
    batchNumber: "",
    mfgDate: "",
    expDate: "",
    quantity: 0,
    unitPrice: 0,
    gstPct: 0,
    gstAmount: 0,
    totalAmount: 0,
  };
}

function itemKey(sourceItemId: string) {
  return sourceItemId;
}

function getLineGstPct(line: POLineItem): number {
  return round2((line.cgstPct || 0) + (line.sgstPct || 0) + (line.igstPct || 0));
}

function getAlreadyReceivedBase(line: POLineItem): number {
  const conversion = line.conversionQty || 1;
  return round2((line.receivedQty ?? 0) * conversion);
}

function getShortClosedBase(line: POLineItem): number {
  const conversion = line.conversionQty || 1;
  return round2((line.shortClosedQty ?? 0) * conversion);
}

function getPendingBase(line: POLineItem): number {
  return Math.max(
    0,
    round2(line.orderedQty - getAlreadyReceivedBase(line) - getShortClosedBase(line)),
  );
}

function calcAmounts(qty: number, unitPrice: number, gstPct: number) {
  const taxable = round2(qty * unitPrice);
  const gstAmount = round2((taxable * gstPct) / 100);
  return {
    gstAmount,
    totalAmount: round2(taxable + gstAmount),
  };
}

interface ReceiptItem extends GrnItem {
  sourceItemId: string;
}

function buildItemsFromPoLines(po: { poNumber: string; lines: POLineItem[] }): ReceiptItem[] {
  return po.lines
    .filter((line) => getPendingBase(line) > 0 && line.purchaseOrderProductId)
    .map((line) => {
      const alreadyReceivedQty = getAlreadyReceivedBase(line);
      const pendingQty = getPendingBase(line);
      const unitPerPacking = line.conversionQty || 1;
      return {
        sourceItemId: line.purchaseOrderProductId as string,
        productId: String(line.productId || ""),
        productName: line.productName,
        productCode: line.productCode || line.sku,
        orderedQty: line.orderedQty,
        alreadyReceivedQty,
        pendingQty,
        receivedQty: 0,
        receivedCases: 0,
        receivedLooseQty: 0,
        unitPerPacking,
        unit: line.baseUnit || line.uom || "Unit",
        poNumber: po.poNumber,
      };
    });
}

function validateManualRow(row: ManualInvoiceRow): string | null {
  if (!row.sourceItemId || !row.productName) return "Product is required";
  if (!row.batchNumber.trim()) return "Batch No. is required";
  if (!row.mfgDate.trim()) return "MFG Date is required";
  if (!row.expDate.trim()) return "Expiry Date is required";
  if (row.quantity <= 0) return "Quantity must be greater than 0";
  if (row.mfgDate && row.expDate && row.expDate < row.mfgDate) {
    return "Expiry Date cannot be before MFG Date";
  }
  return null;
}

function SectionCard({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/5 p-4 space-y-3 shadow-sm">
      <div className="flex items-start justify-between gap-3 pb-2 border-b border-border">
        <div>
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">{title}</h2>
          {description && (
            <p className="text-[11px] text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  );
}

export function PurchaseCreate() {
  const router = useRouter();

  const [grnNo, setGrnNo] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [selectedPoId, setSelectedPoId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [grnDate, setGrnDate] = useState(new Date().toISOString().split("T")[0]);
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split("T")[0]);
  const [items, setItems] = useState<ReceiptItem[]>([]);
  const [manualRows, setManualRows] = useState<ManualInvoiceRow[]>([createEmptyRow()]);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
  const [itemWarnings, setItemWarnings] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { data: previewNumber } = useGrnPreviewNumber(true);
  const { data: supplierOptions = [], isLoading: suppliersLoading } =
    usePurchaseOrderSupplierDropdown(true);
  const { data: poOptions = [], isLoading: posLoading } = usePurchaseOrderDropdown(
    { supplier_id: supplierId || undefined },
    Boolean(supplierId),
  );
  const { data: warehouseOptions = [] } = usePurchaseOrderWarehouseDropdown(
    supplierId || undefined,
    Boolean(supplierId),
  );
  const {
    data: selectedPo,
    isLoading: poDetailsLoading,
    isError: poDetailsError,
  } = usePurchaseOrder(selectedPoId || undefined);
  const createGrnMutation = useCreateGrn();

  useEffect(() => {
    if (previewNumber) setGrnNo(previewNumber);
  }, [previewNumber]);

  const poLines = useMemo(() => {
    if (!selectedPo?.lines) return [] as POLineItem[];
    return selectedPo.lines.filter((line) => getPendingBase(line) > 0);
  }, [selectedPo]);

  useEffect(() => {
    if (!selectedPo) {
      setItems([]);
      return;
    }
    setItems(buildItemsFromPoLines(selectedPo));
  }, [selectedPo]);

  const productOptions = useMemo(
    () =>
      poLines.map((line) => ({
        value: line.purchaseOrderProductId || line.uid,
        label: line.productName,
        sublabel: line.productCode || line.sku || undefined,
      })),
    [poLines],
  );

  const warehouseSelectOptions = useMemo(() => {
    const fromPo =
      selectedPo?.warehouseId && selectedPo.warehouseName
        ? [
            {
              value: String(selectedPo.warehouseId),
              label: selectedPo.warehouseName,
            },
          ]
        : [];
    const fromApi = warehouseOptions.map((w) => ({
      value: w.value,
      label: w.label,
    }));
    const merged = [...fromPo];
    for (const opt of fromApi) {
      if (!merged.some((m) => m.value === opt.value)) merged.push(opt);
    }
    return merged;
  }, [selectedPo, warehouseOptions]);

  useEffect(() => {
    if (selectedPo?.warehouseId) {
      setWarehouseId(String(selectedPo.warehouseId));
    }
  }, [selectedPo?.warehouseId]);

  const getReceivedQtyForProduct = useCallback(
    (sourceItemId: string) => {
      const item = items.find((it) => it.sourceItemId === sourceItemId);
      return item?.receivedQty ?? 0;
    },
    [items],
  );

  /** Remaining received qty available to allocate across invoice batch rows. */
  const getRemainingInvoiceQty = useCallback(
    (sourceItemId: string, excludeRowId?: string) => {
      const received = getReceivedQtyForProduct(sourceItemId);
      const used = manualRows
        .filter((row) => row.sourceItemId === sourceItemId && row.id !== excludeRowId)
        .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      return round2(Math.max(0, received - used));
    },
    [getReceivedQtyForProduct, manualRows],
  );

  const getRemainingPoQty = useCallback(
    (sourceItemId: string) => {
      const item = items.find((it) => it.sourceItemId === sourceItemId);
      return item?.pendingQty ?? 0;
    },
    [items],
  );

  /** Keep invoice qty in sync with Order Items Summary received qty. */
  const syncInvoiceQtyFromReceived = useCallback(
    (sourceItemId: string, receivedQty: number, currentRows?: ManualInvoiceRow[]) => {
      const rows = currentRows ?? manualRows;
      const productRows = rows.filter((row) => row.sourceItemId === sourceItemId);
      if (productRows.length === 0) return rows;

      return rows.map((row) => {
        if (row.sourceItemId !== sourceItemId) return row;

        let nextQty = row.quantity;
        if (productRows.length === 1) {
          nextQty = receivedQty;
        } else if (row.id === productRows[0].id) {
          const othersSum = productRows
            .slice(1)
            .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
          nextQty = Math.max(0, round2(receivedQty - othersSum));
        }

        const amounts = calcAmounts(nextQty, row.unitPrice, row.gstPct);
        return { ...row, quantity: nextQty, ...amounts };
      });
    },
    [manualRows],
  );

  const resetDependentOnSupplier = () => {
    setSelectedPoId("");
    setWarehouseId("");
    setItems([]);
    setManualRows([createEmptyRow()]);
    setInvoiceNumber("");
    setItemErrors({});
    setItemWarnings({});
    setFormError(null);
  };

  const resetDependentOnPo = () => {
    setWarehouseId("");
    setItems([]);
    setManualRows([createEmptyRow()]);
    setInvoiceNumber("");
    setItemErrors({});
    setItemWarnings({});
    setFormError(null);
  };

  const handleSupplierChange = (value: string) => {
    setSupplierId(value);
    resetDependentOnSupplier();
  };

  const handlePoChange = (value: string) => {
    setSelectedPoId(value);
    resetDependentOnPo();
  };

  const handleItemQtyChange = (
    sourceItemId: string,
    field: "cases" | "loose",
    val: string,
  ) => {
    const qty = Math.max(0, parseInt(val, 10) || 0);
    const key = itemKey(sourceItemId);

    setItems((prev) => {
      const next = prev.map((it) => {
        if (it.sourceItemId !== sourceItemId) return it;
        const newCases = field === "cases" ? qty : it.receivedCases || 0;
        const newLoose = field === "loose" ? qty : it.receivedLooseQty || 0;
        const unitPerPacking = it.unitPerPacking || 1;
        const totalReceived = newCases * unitPerPacking + newLoose;
        return {
          ...it,
          receivedCases: newCases,
          receivedLooseQty: newLoose,
          receivedQty: totalReceived,
        };
      });

      const target = next.find((it) => it.sourceItemId === sourceItemId);
      if (target) {
        const pending = target.pendingQty ?? 0;
        setItemWarnings((w) => {
          const copy = { ...w };
          if (target.receivedQty > pending) {
            copy[key] =
              `Current received (${target.receivedQty}) exceeds pending qty (${pending}).`;
          } else {
            delete copy[key];
          }
          return copy;
        });
        setItemErrors((e) => {
          const copy = { ...e };
          if (target.receivedQty < 0) copy[key] = "Quantity cannot be negative";
          else delete copy[key];
          return copy;
        });

        setManualRows((rows) =>
          syncInvoiceQtyFromReceived(sourceItemId, target.receivedQty, rows),
        );
      }

      return next;
    });
    setFormError(null);
  };

  const applyProductToRow = (
    row: ManualInvoiceRow,
    sourceItemId: string,
    allRows: ManualInvoiceRow[],
  ): ManualInvoiceRow => {
    const line = poLines.find((l) => (l.purchaseOrderProductId || l.uid) === sourceItemId);
    if (!line) {
      return {
        ...row,
        sourceItemId: "",
        productId: "",
        productName: "",
        productCode: "",
        unit: "",
        unitPrice: 0,
        gstPct: 0,
        gstAmount: 0,
        totalAmount: 0,
        quantity: 0,
      };
    }

    const gstPct = getLineGstPct(line);
    const received = getReceivedQtyForProduct(line.purchaseOrderProductId || line.uid);
    const usedByOthers = allRows
      .filter((r) => r.sourceItemId === (line.purchaseOrderProductId || line.uid) && r.id !== row.id)
      .reduce((sum, r) => sum + (Number(r.quantity) || 0), 0);
    const autofillQty = Math.max(0, round2(received - usedByOthers));
    const amounts = calcAmounts(autofillQty, line.unitPrice, gstPct);

    return {
      ...row,
      sourceItemId: line.purchaseOrderProductId || line.uid,
      productId: String(line.productId || ""),
      productName: line.productName,
      productCode: line.productCode || line.sku,
      unit: line.baseUnit || line.uom || "Unit",
      unitPrice: line.unitPrice,
      gstPct,
      quantity: autofillQty,
      ...amounts,
    };
  };

  const updateRow = (rowId: string, patch: Partial<ManualInvoiceRow>) => {
    setManualRows((prev) =>
      prev.map((row) => {
        if (row.id !== rowId) return row;
        let next = { ...row, ...patch };
        if (patch.sourceItemId !== undefined) {
          next = applyProductToRow(next, patch.sourceItemId, prev);
        }
        if (
          patch.quantity !== undefined ||
          patch.unitPrice !== undefined ||
          patch.gstPct !== undefined
        ) {
          const amounts = calcAmounts(next.quantity, next.unitPrice, next.gstPct);
          next = { ...next, ...amounts };
        }
        return next;
      }),
    );
    setFormError(null);
  };

  const addRow = () => {
    setManualRows((prev) => [...prev, createEmptyRow()]);
  };

  const removeRow = (rowId: string) => {
    setManualRows((prev) => {
      if (prev.length <= 1) return [createEmptyRow()];
      return prev.filter((row) => row.id !== rowId);
    });
  };

  const handleSubmit = async () => {
    setFormError(null);

    if (!supplierId) {
      setFormError("Please select a supplier.");
      return;
    }
    if (!selectedPoId) {
      setFormError("Please select a Purchase Order.");
      return;
    }
    if (!warehouseId) {
      setFormError("Please select a warehouse.");
      return;
    }
    if (!invoiceNumber.trim()) {
      setFormError("Invoice Number is required.");
      return;
    }
    if (!invoiceDate) {
      setFormError("Invoice Date is required.");
      return;
    }

    const receivedItems = items.filter((it) => it.receivedQty > 0);
    if (receivedItems.length === 0) {
      setFormError("Enter at least one current received quantity (Cases / Loose Qty) greater than 0.");
      return;
    }

    for (const it of receivedItems) {
      const pending = it.pendingQty ?? 0;
      if (it.receivedQty > pending) {
        setFormError(
          `Received qty for ${it.productName} (${it.receivedQty}) exceeds pending qty (${pending}).`,
        );
        return;
      }
    }

    const filledRows = manualRows.filter(
      (row) =>
        row.sourceItemId ||
        row.batchNumber.trim() ||
        row.mfgDate ||
        row.expDate ||
        row.quantity > 0,
    );

    if (filledRows.length === 0) {
      setFormError("Add at least one invoice line with product and batch details.");
      return;
    }

    for (const row of filledRows) {
      const err = validateManualRow(row);
      if (err) {
        setFormError(err);
        return;
      }
    }

    const rowErrors: Record<string, string> = {};
    for (const row of filledRows) {
      const remainingForRow = getRemainingInvoiceQty(row.sourceItemId, row.id);
      if (round2(row.quantity) > round2(remainingForRow)) {
        rowErrors[row.id] =
          `Quantity exceeds remaining received qty (${remainingForRow}).`;
      }
    }

    for (const it of receivedItems) {
      const batchSum = filledRows
        .filter((row) => row.sourceItemId === it.sourceItemId)
        .reduce((sum, row) => sum + (Number(row.quantity) || 0), 0);
      if (round2(batchSum) !== round2(it.receivedQty)) {
        setFormError(
          `Batch invoice qty for ${it.productName} (${batchSum}) must equal current received qty (${it.receivedQty}).`,
        );
        return;
      }
    }

    if (Object.keys(rowErrors).length > 0) {
      setItemErrors(rowErrors);
      setFormError("Fix invalid quantities in Manual Invoice Entry before saving.");
      return;
    }
    setItemErrors({});

    const payloadItems = receivedItems.map((it) => {
      const line = poLines.find((l) => l.purchaseOrderProductId === it.sourceItemId);
      if (!line || !line.purchaseOrderProductId) {
        throw new Error("Invalid purchase order product selection.");
      }
      const ordered = line.orderedQty;
      const previous = getAlreadyReceivedBase(line);
      const pending = getPendingBase(line);
      const batches = filledRows
        .filter((row) => row.sourceItemId === it.sourceItemId)
        .map((row) => ({
          batchNumber: row.batchNumber.trim(),
          invoiceNumber: invoiceNumber.trim(),
          manufactureDate: row.mfgDate || null,
          expiryDate: row.expDate || null,
          quantity_base_qty: row.quantity,
          rate: row.unitPrice,
          gst: row.gstPct,
        }));

      return {
        source_item_id: line.purchaseOrderProductId,
        ordered_base_qty: ordered,
        previous_received_base_qty: previous,
        current_received_base_qty: it.receivedQty,
        pending_base_qty: Math.max(0, round2(pending - it.receivedQty)),
        productSnapshot: {
          product_id: String(line.productId || ""),
          product_code: line.productCode || line.sku,
          product_name: line.productName,
          base_unit: line.baseUnit || line.uom,
          packing_unit: line.packagingUnit,
          gst_percent: getLineGstPct(line),
        },
        batches,
      };
    });

    const payload: CreateGrnPayload = {
      grnNumber: grnNo || null,
      source_id: selectedPoId,
      source_type: "PURCHASE_ORDER",
      supplierId,
      warehouseId,
      grnDate,
      items: payloadItems,
      invoices: [
        {
          invoiceNumber: invoiceNumber.trim(),
          invoiceDate,
        },
      ],
    };

    try {
      setIsSubmitting(true);
      await createGrnMutation.mutateAsync(payload);
      router.push("/warehouse/grn/purchase");
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to create GRN.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const supplierLabel =
    supplierOptions.find((s) => s.value === supplierId)?.label || "";

  return (
    <FormContainer
      title="Generate GRN"
      description="Capture physical goods receipt and batch details against a single purchase order. OCR will be integrated later."
      onBack={() => router.push("/warehouse/grn/purchase")}
      onCancel={() => router.push("/warehouse/grn/purchase")}
      actions={
        <Button
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
          onClick={handleSubmit}
          disabled={isSubmitting || createGrnMutation.isPending}
        >
          <Send className="w-3.5 h-3.5" />
          {isSubmitting || createGrnMutation.isPending ? "Submitting…" : "Submit GRN"}
        </Button>
      }
    >
      {formError && (
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {formError}
        </div>
      )}

      <SectionCard
        title="Supplier & PO Selection"
        description="Select supplier first, then choose one approved purchase order with pending quantities."
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          <TextField
            label="GRN Number"
            value={grnNo}
            readOnly
            className="h-9 text-xs font-mono font-bold bg-muted/30"
          />

          <Field label="Supplier" required>
            <AutocompleteSelect
              options={supplierOptions.map((s) => ({ value: s.value, label: s.label }))}
              value={supplierId}
              onChange={handleSupplierChange}
              placeholder={suppliersLoading ? "Loading suppliers…" : "Select supplier…"}
              searchPlaceholder="Search vendor…"
              disabled={suppliersLoading}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field
            label="Select Purchase Order"
            required
            hint={
              supplierId && !posLoading && poOptions.length === 0
                ? "No purchase orders found for this supplier."
                : undefined
            }
          >
            <AutocompleteSelect
              options={poOptions.map((po) => ({
                value: po.purchase_order_id,
                label: po.po_no,
              }))}
              value={selectedPoId}
              onChange={handlePoChange}
              placeholder={
                !supplierId
                  ? "Select supplier first…"
                  : posLoading
                    ? "Loading POs…"
                    : "Select PO…"
              }
              searchPlaceholder="Search PO…"
              disabled={!supplierId || posLoading}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <Field label="Warehouse Destination" required>
            <AutocompleteSelect
              options={warehouseSelectOptions}
              value={warehouseId}
              onChange={setWarehouseId}
              placeholder={
                !supplierId ? "Select supplier first…" : "Select warehouse…"
              }
              searchPlaceholder="Search warehouse…"
              disabled={!supplierId}
              className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
            />
          </Field>

          <TextField
            label="GRN Date"
            type="date"
            value={grnDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setGrnDate(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Order Items Summary"
        description="Enter Cases and Loose Qty to set current received. Invoice Qty in Manual Entry autofills from this total."
      >
        {!selectedPoId ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a supplier and a purchase order to view order items.
          </p>
        ) : poDetailsLoading ? (
          <p className="text-xs text-muted-foreground text-center py-4">Loading purchase order details…</p>
        ) : poDetailsError ? (
          <p className="text-xs text-red-600 text-center py-4">Failed to load purchase order details.</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            No pending quantities remain on this purchase order.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">PO No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Product Name</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">SKU / Code</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Ordered</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Prev. Received</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Pending</th>
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[128px] min-w-[128px]">
                      Cases
                    </th>
                    {/* <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[128px] min-w-[128px]">
                      Loose Qty
                    </th> */}
                    <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[128px] min-w-[128px]">
                      Total Base Qty
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const key = itemKey(it.sourceItemId);
                    const err = itemErrors[key];
                    const warn = itemWarnings[key];
                    return (
                      <tr key={`${key}-${idx}`} className="border-b border-border/50">
                        <td className="px-3 py-2 text-xs font-mono font-semibold text-brand-700 align-middle">{it.poNumber}</td>
                        <td className="px-3 py-2 text-xs font-semibold text-foreground align-middle">{it.productName}</td>
                        <td className="px-3 py-2 text-xs font-mono text-muted-foreground align-middle">{it.productCode || "—"}</td>
                        <td className="px-3 py-2 text-xs text-center font-medium align-middle tabular-nums">{it.orderedQty}</td>
                        <td className="px-3 py-2 text-xs text-center text-muted-foreground align-middle tabular-nums">{it.alreadyReceivedQty ?? 0}</td>
                        <td className="px-3 py-2 text-xs text-center font-medium text-amber-700 align-middle tabular-nums">{it.pendingQty ?? 0}</td>
                        <td className="px-3 py-2 align-middle w-[128px] min-w-[128px]">
                          <Input
                            type="number"
                            min={0}
                            value={it.receivedCases === 0 ? "" : it.receivedCases}
                            placeholder="0"
                            onChange={(e) =>
                              handleItemQtyChange(it.sourceItemId, "cases", e.target.value)
                            }
                            className={cn(
                              "h-9 w-full text-xs text-center tabular-nums font-semibold rounded-lg",
                              "bg-white focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400 border-border text-brand-700",
                            )}
                          />
                        </td>
                        {/* <td className="px-3 py-2 align-middle w-[128px] min-w-[128px]">
                          <Input
                            type="number"
                            min={0}
                            value={it.receivedLooseQty === 0 ? "" : it.receivedLooseQty}
                            placeholder="0"
                            onChange={(e) =>
                              handleItemQtyChange(it.sourceItemId, "loose", e.target.value)
                            }
                            className={cn(
                              "h-9 w-full text-xs text-center tabular-nums font-semibold rounded-lg",
                              "bg-white focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400 border-border text-brand-700",
                            )}
                          />
                        </td> */}
                        <td className="px-3 py-2 align-middle w-[128px] min-w-[128px]">
                          <div className="space-y-1">
                            <Input
                              type="number"
                              readOnly
                              value={it.receivedQty === 0 ? "" : it.receivedQty}
                              placeholder="0"
                              className={cn(
                                "h-9 w-full text-xs text-center tabular-nums font-semibold rounded-lg",
                                "bg-muted focus-visible:ring-0",
                                !err && !warn && "border-border text-brand-700",
                                err && "border-red-400 text-foreground",
                                warn && !err && "border-amber-400 text-foreground",
                              )}
                            />
                            {err && (
                              <p className="text-[10px] text-red-500 leading-tight flex items-start gap-0.5">
                                <AlertCircle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>{err}</span>
                              </p>
                            )}
                            {warn && !err && (
                              <p className="text-[10px] text-amber-700 leading-tight flex items-start gap-0.5">
                                <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                                <span>{warn}</span>
                              </p>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Upload Invoice(s)"
        description="OCR will be integrated later. Use Manual Invoice Entry below to capture invoice and batch details."
      >
        <div className="flex flex-wrap items-center gap-2">
          <label
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-3 border border-border rounded-lg bg-muted/40 text-xs font-medium text-muted-foreground cursor-not-allowed opacity-70",
            )}
            aria-disabled="true"
            title="OCR will be integrated later"
          >
            <Upload className="w-3.5 h-3.5 text-muted-foreground" />
            Add invoice file(s)
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" multiple className="hidden" disabled />
          </label>
        </div>
        <p className="text-[11px] text-muted-foreground">
          OCR upload and processing are temporarily disabled. Invoice details can be entered manually below.
        </p>
      </SectionCard>

      <SectionCard
        title="Manual Invoice Entry"
        description="Enter invoice header and one or more batch rows. Product options are limited to the selected purchase order. Future OCR will populate these same fields."
        action={
          <Button
            type="button"
            variant="outline"
            className="h-8 text-xs gap-1.5"
            onClick={addRow}
            disabled={!selectedPoId || poLines.length === 0}
          >
            <Plus className="w-3.5 h-3.5" /> Add Batch Row
          </Button>
        }
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <TextField
            label="Invoice Number"
            required
            value={invoiceNumber}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvoiceNumber(e.target.value)}
            placeholder="Enter invoice number"
            className="h-9 text-xs"
            disabled={!selectedPoId}
          />
          <TextField
            label="Invoice Date"
            required
            type="date"
            value={invoiceDate}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInvoiceDate(e.target.value)}
            className="h-9 text-xs"
            disabled={!selectedPoId}
          />
          <div className="flex items-end">
            <p className="text-[11px] text-muted-foreground pb-2">
              Supplier: <span className="font-medium text-foreground">{supplierLabel || "—"}</span>
            </p>
          </div>
        </div>

        {!selectedPoId ? (
          <p className="text-xs text-muted-foreground text-center py-4">
            Select a purchase order to add invoice batch rows.
          </p>
        ) : (
          <div className="border border-border rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1100px]">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground min-w-[160px]">Product</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-24">SKU</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">Batch No.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">MFG Date</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-28">Expiry Date</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Invoice Qty</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-20">Unit</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">Price</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-20">GST %</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-24">GST Amt</th>
                    <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">Total</th>
                    <th className="px-2 py-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {manualRows.map((row) => {
                    const remainingInvoice = row.sourceItemId
                      ? getRemainingInvoiceQty(row.sourceItemId, row.id)
                      : undefined;
                    const remainingPo = row.sourceItemId
                      ? getRemainingPoQty(row.sourceItemId)
                      : undefined;
                    const received = row.sourceItemId
                      ? getReceivedQtyForProduct(row.sourceItemId)
                      : undefined;
                    const err = itemErrors[row.id];
                    return (
                      <tr key={row.id} className="border-b border-border/50 align-top">
                        <td className="px-3 py-2">
                          <AutocompleteSelect
                            options={productOptions}
                            value={row.sourceItemId}
                            onChange={(val: string) => updateRow(row.id, { sourceItemId: val })}
                            placeholder="Select product…"
                            searchPlaceholder="Search product…"
                            disabled={productOptions.length === 0}
                            className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
                          />
                          {row.sourceItemId && (
                            <p className="text-[10px] text-amber-700 mt-1">
                              Received: {received ?? 0} · Left to allocate: {remainingInvoice ?? 0}
                              {remainingPo != null ? ` · PO pending: ${remainingPo}` : ""}
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            readOnly
                            value={row.productCode}
                            placeholder="—"
                            className="h-9 text-xs font-mono bg-muted"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            value={row.batchNumber}
                            onChange={(e) => updateRow(row.id, { batchNumber: e.target.value })}
                            placeholder="Batch no."
                            className="h-9 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={row.mfgDate}
                            onChange={(e) => updateRow(row.id, { mfgDate: e.target.value })}
                            className="h-9 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="date"
                            value={row.expDate}
                            onChange={(e) => updateRow(row.id, { expDate: e.target.value })}
                            className="h-9 text-xs"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            type="number"
                            min={0}
                            value={row.quantity === 0 ? "" : row.quantity}
                            onChange={(e) =>
                              updateRow(row.id, {
                                quantity: Math.max(0, parseFloat(e.target.value) || 0),
                              })
                            }
                            placeholder="0"
                            className={cn(
                              "h-9 text-xs text-center tabular-nums",
                              err && "border-red-400",
                            )}
                          />
                          {err && (
                            <p className="text-[10px] text-red-500 mt-1 flex items-start gap-0.5">
                              <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-px" />
                              <span>{err}</span>
                            </p>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            readOnly
                            value={row.unit}
                            placeholder="—"
                            className="h-9 text-xs text-center bg-muted"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            readOnly
                            value={row.unitPrice ? row.unitPrice : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums bg-muted"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            readOnly
                            value={row.gstPct ? row.gstPct : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums bg-muted"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            readOnly
                            value={row.gstAmount ? row.gstAmount : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums bg-muted"
                          />
                        </td>
                        <td className="px-3 py-2">
                          <Input
                            readOnly
                            value={row.totalAmount ? row.totalAmount : ""}
                            placeholder="—"
                            className="h-9 text-xs text-center tabular-nums font-semibold bg-muted"
                          />
                        </td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => removeRow(row.id)}
                            className="p-1.5 rounded-md text-muted-foreground hover:text-red-600 hover:bg-red-50 transition-colors"
                            aria-label="Remove row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </SectionCard>
    </FormContainer>
  );
}
