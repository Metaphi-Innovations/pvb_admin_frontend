"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fromBaseQuantity,
  formatQtyStackInline,
  formatStackNum,
  resolveGrnQuantityType,
  toBaseQuantity,
  type GrnQuantityType,
} from "@/lib/warehouse/grn-quantity";
import {
  exceedsMaxLineQty,
  maxLineQtyMessage,
} from "@/lib/quantity-limits";
import {
  useCreateGrn,
  useGrn,
  useGrnPreviewNumber,
  useUpdateGrn,
} from "@/hooks/warehouse/use-grn";
import { useWarehousesDropdown } from "@/hooks/masters";
import { getDispatchById } from "@/app/(app)/warehouse/dispatch/services";
import { StockTransferService } from "@/services/stock-transfer.service";
import type { CreateGrnPayload, UpdateGrnPayload } from "@/services/grn.service";
import { StackedQtyCell } from "../shared/components/StackedQtyCell";
import {
  GRN_QTY_INPUT_CLASSNAME,
  GRN_QTY_PLACEHOLDER,
  ProductSkuCell,
} from "../shared/components/ProductSkuCell";
import {
  PartialGrnConfirmDialog,
  type PartialGrnProductRow,
} from "../shared/components/PartialGrnConfirmDialog";
import { formatWeightStackPart, stackGrnLineQty, enrichGrnProductSnapshot } from "../shared/grn-qty-stack";
import { showToast } from "@/lib/toast";
import { cn } from "@/lib/utils";
import {
  buildStockTransferLinesFromDispatch,
  getCustomerSnapshot,
  matchesDestinationWarehouse,
  type StockTransferLineFromDispatch,
} from "./stock-transfer-grn-utils";
import { FormContainer } from "@/components/layout/FormContainer";
import { TextField } from "@/components/ui/FormFields";
import { getErrorMessage } from "@/lib/masters/master-query-errors";

const GRN_NUMBER_PLACEHOLDER = "Auto-generated";
const READONLY_FIELD_CLASS = "h-9 text-xs bg-muted";
const READONLY_GRN_NO_CLASS =
  "h-9 text-xs font-mono font-bold bg-muted/30 placeholder:text-muted-foreground/50 placeholder:font-normal";
const DATE_READONLY_CLASS = "h-9 text-xs w-full bg-muted";

interface LineInputState extends StockTransferLineFromDispatch {
  previousReceivedQty: number;
  /** Stored / API base quantity. */
  receivedQty: number;
  /** User-entered qty in quantityType units (cases or pieces). */
  displayQty: number;
  quantityType: GrnQuantityType;
  batchLocked: boolean;
}

interface FieldErrors {
  warehouseId?: string;
  grnDate?: string;
  lines?: Record<number, string>;
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
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
      </div>
      {children}
    </div>
  );
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseGstPct(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const raw = String(value ?? "").replace("%", "").trim();
  if (!raw) return 0;
  const n = Number(raw);
  return Number.isFinite(n) ? n : 0;
}

function calcGstAmount(qty: number, unitPrice: number, gstPct: number): number {
  return round2((qty * unitPrice * gstPct) / 100);
}

interface StockTransferCreateProps {
  dispatchId?: string;
  mode?: "create" | "edit";
  grnId?: string;
}

export function StockTransferCreate({
  dispatchId,
  mode = "create",
  grnId,
}: StockTransferCreateProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const basePath = "/warehouse/grn/stock-transfer";

  const [grnNo, setGrnNo] = useState("");
  const [grnDate, setGrnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [fromWarehouseName, setFromWarehouseName] = useState("");
  const [stockTransferId, setStockTransferId] = useState("");
  const [stockTransferNo, setStockTransferNo] = useState("");
  const [dispatchNumber, setDispatchNumber] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<LineInputState[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partialConfirmOpen, setPartialConfirmOpen] = useState(false);
  const [partialProducts, setPartialProducts] = useState<PartialGrnProductRow[]>([]);
  const [hydratedEdit, setHydratedEdit] = useState(false);
  const [detailLoading, setDetailLoading] = useState(!isEdit);
  const [detailError, setDetailError] = useState<string | null>(null);

  const {
    data: previewNumber,
    isLoading: previewLoading,
    isError: previewError,
    error: previewLoadError,
    refetch: refetchPreviewNumber,
  } = useGrnPreviewNumber(!isEdit, warehouseId);

  const {
    data: existingGrn,
    isLoading: grnLoading,
    isError: grnError,
    error: grnLoadError,
  } = useGrn(grnId, isEdit);

  const { data: warehouses = [] } = useWarehousesDropdown();

  const createGrnMutation = useCreateGrn();
  const updateGrnMutation = useUpdateGrn();

  useEffect(() => {
    if (isEdit) return;
    setGrnNo(previewNumber || "");
  }, [isEdit, previewNumber]);

  useEffect(() => {
    if (isEdit || !dispatchId) return;
    let active = true;

    async function loadDispatch() {
      setDetailLoading(true);
      setDetailError(null);
      try {
        const dispatch = await getDispatchById(dispatchId!);
        if (!active) return;
        if (!dispatch) {
          setDetailError("Dispatch not found.");
          return;
        }

        const snapshot = getCustomerSnapshot(dispatch.packing_done);
        const toName = String(snapshot.to_warehouse || "");
        const fromName = String(snapshot.from_warehouse || "");
        const matchedWarehouse = warehouses.find(
          (wh) =>
            wh.warehouseName &&
            matchesDestinationWarehouse(snapshot, wh.warehouseName),
        );

        const sourceId = String(dispatch.source_id || "");
        let transferNo = "";
        const receivedBySourceItem = new Map<string, number>();
        const transferQtyBySourceItem = new Map<string, number>();
        const priceBySourceItem = new Map<string, { unitPrice: number; gstPct: number }>();
        if (sourceId) {
          try {
            const transfer = await StockTransferService.getById(sourceId);
            transferNo = transfer.transferNumber;
            for (const line of transfer.lineItems || []) {
              if (!line.id) continue;
              receivedBySourceItem.set(String(line.id), Number(line.receivedQty || 0));
              transferQtyBySourceItem.set(String(line.id), Number(line.quantity || 0));
              priceBySourceItem.set(String(line.id), {
                unitPrice: Number(line.unitPrice || 0),
                gstPct: parseGstPct(line.gstRate),
              });
            }
          } catch {
            transferNo = dispatch.dispatch_number || sourceId;
          }
        }

        const { lines: builtLines } = await buildStockTransferLinesFromDispatch(dispatch);
        if (!active) return;

        setStockTransferId(sourceId);
        setStockTransferNo(transferNo || dispatch.dispatch_number || "");
        setDispatchNumber(dispatch.dispatch_number || "");
        setFromWarehouseName(fromName);
        setWarehouseName(toName || matchedWarehouse?.warehouseName || "");
        setWarehouseId(matchedWarehouse?.warehouse_id || "");
        setLines(
          builtLines
            .map((line): LineInputState | null => {
              const caseSize = line.caseSize > 0 ? line.caseSize : 1;
              const quantityType = resolveGrnQuantityType(line.quantityType);
              const previousReceivedQty = Math.max(
                0,
                round2(receivedBySourceItem.get(line.sourceItemId) || 0),
              );
              const orderedQty = Math.max(
                0,
                round2(
                  transferQtyBySourceItem.get(line.sourceItemId) || line.maxQty,
                ),
              );
              const remaining = Math.max(0, round2(orderedQty - previousReceivedQty));
              if (remaining <= 0) return null;
              const receivedQty = remaining;
              const displayQty = round2(
                fromBaseQuantity({
                  baseQty: receivedQty,
                  quantityType,
                  packingSize: caseSize,
                }),
              );
              const pricing = priceBySourceItem.get(line.sourceItemId);
              return {
                ...line,
                maxQty: orderedQty,
                caseSize,
                unitPrice: pricing?.unitPrice || line.unitPrice || 0,
                gstPct: pricing?.gstPct || line.gstPct || 0,
                previousReceivedQty,
                receivedQty,
                displayQty,
                quantityType,
                batchLocked: Boolean(line.batchNo),
                productSnapshot: enrichGrnProductSnapshot(line.productSnapshot, {
                  unitPerPacking: caseSize,
                  unit: line.unit,
                }),
              };
            })
            .filter((line): line is LineInputState => line != null),
        );
      } catch (err) {
        if (!active) return;
        setDetailError(
          err instanceof Error ? err.message : "Failed to load dispatch for GRN creation.",
        );
      } finally {
        if (active) setDetailLoading(false);
      }
    }

    void loadDispatch();
    return () => {
      active = false;
    };
  }, [isEdit, dispatchId, warehouses]);

  useEffect(() => {
    if (!isEdit || !existingGrn || hydratedEdit) return;
    if (existingGrn.status === "qc_completed") return;

    let active = true;

    const hydrate = async () => {
      setGrnNo(existingGrn.grnNo || "");
      setGrnDate(existingGrn.grnDate || new Date().toISOString().slice(0, 10));
      setWarehouseId(existingGrn.warehouseUuid || "");
      setWarehouseName(existingGrn.warehouse || existingGrn.toWarehouse || "");
      setFromWarehouseName(existingGrn.fromWarehouse || "");
      setStockTransferId(existingGrn.sourceId || "");
      setStockTransferNo(existingGrn.stockTransferNo || existingGrn.grnNo || "");
      setRemarks(existingGrn.receiptRemarks || "");

      const priceBySourceItem = new Map<string, { unitPrice: number; gstPct: number }>();
      if (existingGrn.sourceId) {
        try {
          const transfer = await StockTransferService.getById(existingGrn.sourceId);
          for (const line of transfer.lineItems || []) {
            if (!line.id) continue;
            priceBySourceItem.set(String(line.id), {
              unitPrice: Number(line.unitPrice || 0),
              gstPct: parseGstPct(line.gstRate),
            });
          }
        } catch {
          // Keep batch pricing if transfer lookup fails.
        }
      }
      if (!active) return;

      setLines(
        existingGrn.items.map((item) => {
          const batch =
            existingGrn.batches.find(
              (b) =>
                (item.sourceItemId && b.productId === item.sourceItemId) ||
                b.productId === item.productId ||
                b.productCode === item.productCode,
            );
          const caseSize =
            item.unitPerPacking != null && item.unitPerPacking > 0
              ? item.unitPerPacking
              : 1;
          const quantityType = resolveGrnQuantityType(item.quantityType);
          const receivedQty = item.receivedQty;
          const displayQty = round2(
            fromBaseQuantity({
              baseQty: receivedQty,
              quantityType,
              packingSize: caseSize,
            }),
          );
          const sourceItemId = item.sourceItemId || item.productId;
          const pricing = priceBySourceItem.get(sourceItemId);
          return {
            sourceItemId,
            productId: item.productId,
            sku: item.productCode || "",
            productName: item.productName,
            unit: item.unit || "Unit",
            batchNo: batch?.batchNumber || "",
            mfgDate: batch?.mfgDate || "",
            expDate: batch?.expDate || "",
            maxQty: item.orderedQty || item.receivedQty || 0,
            previousReceivedQty: item.alreadyReceivedQty || 0,
            receivedQty,
            displayQty,
            quantityType,
            caseSize,
            unitPrice: batch?.unitPrice || pricing?.unitPrice || 0,
            gstPct: batch?.gstPct || pricing?.gstPct || 0,
            batchLocked: Boolean(batch?.batchNumber),
            productSnapshot: enrichGrnProductSnapshot(
              {
                product_id: item.productId,
                product_name: item.productName,
                product_code: item.productCode,
                base_unit: item.unit || "Unit",
                unit_per_packing: caseSize,
              },
              {
                unitPerPacking: caseSize,
                unit: item.unit || "Unit",
                netWeightPerPack: item.netWeightPerPack,
                packSize: item.packSize,
              },
            ),
          };
        }),
      );
      setHydratedEdit(true);
    };

    void hydrate();
    return () => {
      active = false;
    };
  }, [isEdit, existingGrn, hydratedEdit]);

  const clearLineError = (index: number) => {
    setFieldErrors((prev) => {
      if (!prev.lines?.[index]) return prev;
      const nextLines = { ...prev.lines };
      delete nextLines[index];
      return { ...prev, lines: nextLines };
    });
  };

  const updateLineField = <K extends keyof LineInputState>(
    index: number,
    field: K,
    val: LineInputState[K],
  ) => {
    setLines((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: val };
      return copy;
    });
    clearLineError(index);
  };

  const handleDisplayQtyChange = (index: number, raw: string) => {
    setLines((prev) => {
      const copy = [...prev];
      const line = copy[index];
      const packingSize = line.caseSize > 0 ? line.caseSize : 1;
      const displayQty = Math.max(0, parseFloat(raw) || 0);
      let receivedQty = displayQty;
      try {
        receivedQty = toBaseQuantity({
          quantity: displayQty,
          quantityType: line.quantityType,
          packingSize,
        });
      } catch {
        receivedQty = displayQty;
      }
      copy[index] = {
        ...line,
        displayQty,
        receivedQty: round2(receivedQty),
      };
      return copy;
    });
    clearLineError(index);
  };

  const validate = (): boolean => {
    const next: FieldErrors = {};
    if (!warehouseId) {
      next.warehouseId =
        "Destination warehouse could not be resolved. Ensure PackingDone.to_warehouse matches a warehouse master.";
    }
    if (!grnDate) {
      next.grnDate = "GRN date is required.";
    } else if (grnDate > new Date().toISOString().split("T")[0]) {
      next.grnDate = "GRN date cannot be in the future.";
    }

    const lineErrors: Record<number, string> = {};
    let hasPositiveReceive = false;

    lines.forEach((line, idx) => {
      if (line.receivedQty > 0) hasPositiveReceive = true;
      if (line.receivedQty < 0 || line.displayQty < 0) {
        lineErrors[idx] = "Received quantity cannot be negative.";
        return;
      }
      if (line.quantityType === "CASE" && !(line.caseSize > 0)) {
        lineErrors[idx] = "Packing size is required when quantity type is Case.";
        return;
      }
      if (line.receivedQty > line.maxQty - line.previousReceivedQty) {
        lineErrors[idx] = `Received qty exceeds remaining qty (${Math.max(0, round2(line.maxQty - line.previousReceivedQty))} base).`;
        return;
      }
      if (line.receivedQty > 0 && exceedsMaxLineQty(line.displayQty)) {
        lineErrors[idx] = maxLineQtyMessage("Received quantity");
        return;
      }
      if (line.receivedQty > 0) {
        if (!line.batchNo.trim()) {
          lineErrors[idx] = "Batch number is required.";
          return;
        }
        if (!line.mfgDate.trim()) {
          lineErrors[idx] = "MFG date is required.";
          return;
        }
        if (!line.expDate.trim()) {
          lineErrors[idx] = "Expiry date is required.";
          return;
        }
        if (line.mfgDate && line.expDate && line.expDate < line.mfgDate) {
          lineErrors[idx] = "Expiry date must be on or after MFG date.";
        }
      }
    });

    if (!hasPositiveReceive) {
      setFormError("Enter received quantity for at least one product.");
    } else {
      setFormError(null);
    }

    if (Object.keys(lineErrors).length > 0) {
      next.lines = lineErrors;
    }

    setFieldErrors(next);
    return Object.keys(next).length === 0 && hasPositiveReceive;
  };

  const handleSave = async (options?: { skipPartialWarning?: boolean }) => {
    if (!validate()) return;
    if (!isEdit && !stockTransferId) {
      setFormError("Stock transfer source id is missing on this dispatch.");
      return;
    }

    // Warning only: product-wise partial GRN when GRN qty < remaining applicable qty.
    if (!options?.skipPartialWarning) {
      const partialRows: PartialGrnProductRow[] = [];
      for (const line of lines) {
        const applicableBase = round2(
          Math.max(0, line.maxQty - line.previousReceivedQty),
        );
        const grnBase = round2(line.receivedQty || 0);
        if (!(applicableBase > 0) || !(grnBase < applicableBase)) continue;
        const pendingBase = round2(Math.max(0, applicableBase - grnBase));
        const stackOpts = {
          packingSize: line.caseSize > 0 ? line.caseSize : 1,
          unit: line.unit,
          productSnapshot: line.productSnapshot,
        };
        partialRows.push({
          productName: line.productName,
          productCode: line.sku || undefined,
          orderedQtyLabel: formatQtyStackInline(stackGrnLineQty(applicableBase, stackOpts)),
          grnQtyLabel: formatQtyStackInline(stackGrnLineQty(grnBase, stackOpts)),
          pendingQtyLabel: formatQtyStackInline(stackGrnLineQty(pendingBase, stackOpts)),
        });
      }
      if (partialRows.length > 0) {
        setPartialProducts(partialRows);
        setPartialConfirmOpen(true);
        return;
      }
    }

    setPartialConfirmOpen(false);
    setPartialProducts([]);

    const invoiceNumber = stockTransferNo || dispatchNumber || grnNo || "ST-RECEIPT";
    const invoiceDate = grnDate;

    const payloadItems = lines
      .filter((line) => line.receivedQty > 0)
      .map((line) => {
        const current = round2(line.receivedQty);
        const previous = round2(line.previousReceivedQty);
        const ordered = round2(line.maxQty);
        const caseSize = line.caseSize > 0 ? line.caseSize : 1;
        const rate = round2(line.unitPrice || 0);
        const gst = round2(line.gstPct || 0);
        return {
          source_item_id: line.sourceItemId,
          ordered_base_qty: ordered,
          previous_received_base_qty: previous,
          current_received_base_qty: current,
          pending_base_qty: Math.max(0, round2(ordered - previous - current)),
          quantity_type: line.quantityType,
          remarks: null,
          productSnapshot: {
            ...line.productSnapshot,
            unit_per_packing: caseSize,
          },
          batches: [
            {
              batchNumber: line.batchNo.trim(),
              invoiceNumber,
              manufactureDate: line.mfgDate || null,
              expiryDate: line.expDate || null,
              quantity_base_qty: current,
              rate,
              gst,
              gstAmount: calcGstAmount(current, rate, gst),
              remarks: null,
            },
          ],
        };
      });

    setIsSubmitting(true);
    setFormError(null);
    try {
      if (isEdit && grnId) {
        const payload: UpdateGrnPayload = {
          warehouseId,
          grnDate,
          remarks: remarks.trim() || null,
          items: payloadItems,
          invoices: [{ invoiceNumber, invoiceDate }],
        };
        await updateGrnMutation.mutateAsync({ id: grnId, input: payload });
        setPartialConfirmOpen(false);
        setPartialProducts([]);
        showToast("GRN updated successfully.", "success");
        router.push(`${basePath}/${grnId}`);
      } else {
        const payload: CreateGrnPayload = {
          source_id: stockTransferId,
          source_type: "STOCK_TRANSFER",
          supplierId: null,
          warehouseId,
          grnDate,
          remarks: remarks.trim() || null,
          items: payloadItems,
          invoices: [{ invoiceNumber, invoiceDate }],
        };
        await createGrnMutation.mutateAsync({ input: payload });
        setPartialConfirmOpen(false);
        setPartialProducts([]);
        showToast("GRN created successfully.", "success");
        router.push(basePath);
      }
    } catch (err) {
      const message = getErrorMessage(
        err,
        isEdit ? "Failed to update GRN. Please try again." : "Failed to create GRN. Please try again.",
      );

      if (!isEdit && /grn number .+ already exists/i.test(message)) {
        try {
          const { data: nextNumber } = await refetchPreviewNumber();
          if (nextNumber) {
            setGrnNo(nextNumber);
            const refreshedMsg = `${message} A new GRN number (${nextNumber}) has been loaded. Please submit again.`;
            setFormError(refreshedMsg);
            showToast(refreshedMsg, "error");
            return;
          }
        } catch {
          // Fall through
        }
      }

      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isBusy =
    isSubmitting || createGrnMutation.isPending || updateGrnMutation.isPending;
  const backHref = isEdit && grnId ? `${basePath}/${grnId}` : basePath;

  if (isEdit && grnLoading) {
    return (
      <FormContainer
        title="Edit Stock Transfer GRN"
        description="Loading GRN details…"
        onBack={() => router.push(basePath)}
        onCancel={() => router.push(basePath)}
      >
        <div className="flex items-center justify-center gap-2 py-10 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          Loading GRN…
        </div>
      </FormContainer>
    );
  }

  if (isEdit && (grnError || !existingGrn)) {
    return (
      <FormContainer
        title="Edit Stock Transfer GRN"
        description="Unable to load GRN for editing."
        onBack={() => router.push(basePath)}
        onCancel={() => router.push(basePath)}
      >
        <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          {grnLoadError instanceof Error
            ? grnLoadError.message
            : "GRN not found or could not be loaded."}
        </div>
      </FormContainer>
    );
  }

  if (isEdit && existingGrn?.status === "qc_completed") {
    return (
      <FormContainer
        title="Edit Stock Transfer GRN"
        description="This GRN can no longer be edited."
        onBack={() => router.push(backHref)}
        onCancel={() => router.push(backHref)}
      >
        <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          QC is completed for this GRN. Editing is disabled.
        </div>
      </FormContainer>
    );
  }

  if (!isEdit && !dispatchId) {
    return (
      <FormContainer
        title="Create Stock Transfer GRN"
        description="Dispatch is required to create a stock transfer GRN."
        onBack={() => router.push(basePath)}
      >
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-xs text-red-700 flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-red-500" />
          <span>Missing dispatchId. Open Create GRN from a pending dispatch.</span>
        </div>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title={isEdit ? "Edit Stock Transfer GRN" : "Create Stock Transfer GRN"}
      description={
        isEdit
          ? "Update receipt quantities and batch details for this stock transfer GRN."
          : "Record receipt of transferred stock. Details are populated from the dispatch / packing record."
      }
      onBack={() => router.push(backHref)}
      onCancel={() => router.push(backHref)}
      actions={
        <Button
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
          onClick={() => {
            void handleSave();
          }}
          disabled={isBusy || detailLoading}
        >
          {isBusy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Send className="w-3.5 h-3.5" />
          )}
          {isEdit ? "Update GRN" : "Complete Receipt"}
        </Button>
      }
    >
      <div className="space-y-6">
        {(formError || previewError || detailError) && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {formError ||
              detailError ||
              getErrorMessage(previewLoadError, "Failed to load GRN number.")}
          </div>
        )}

        <SectionCard
          title="General Information"
          description="Destination warehouse is taken from PackingDone.customer_snapshot.to_warehouse."
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
            <TextField
              label="GRN Number"
              value={previewLoading && !isEdit && !grnNo ? "" : grnNo}
              placeholder={GRN_NUMBER_PLACEHOLDER}
              readOnly
              className={READONLY_GRN_NO_CLASS}
            />

            <TextField
              label="Stock Transfer No."
              value={stockTransferNo || (detailLoading ? "Loading…" : "")}
              placeholder="—"
              readOnly
              className={READONLY_FIELD_CLASS}
            />

            <TextField
              label="Dispatch No."
              value={dispatchNumber || (detailLoading ? "Loading…" : "")}
              placeholder="—"
              readOnly
              className={READONLY_FIELD_CLASS}
            />

            <TextField
              label="Destination Warehouse"
              value={warehouseName || (detailLoading ? "Loading…" : "")}
              placeholder="Auto-populated from packing snapshot…"
              readOnly
              className={READONLY_FIELD_CLASS}
              error={fieldErrors.warehouseId}
            />

            <TextField
              label="From Warehouse"
              value={fromWarehouseName || (detailLoading ? "Loading…" : "")}
              placeholder="—"
              readOnly
              className={READONLY_FIELD_CLASS}
            />

            <TextField
              label="GRN Date"
              type="date"
              required
              error={
                fieldErrors.grnDate ||
                (grnDate > new Date().toISOString().split("T")[0]
                  ? "GRN date cannot be in the future."
                  : undefined)
              }
              value={grnDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                const val = e.target.value;
                setGrnDate(val);
                const err =
                  val > new Date().toISOString().split("T")[0]
                    ? "GRN date cannot be in the future."
                    : undefined;
                setFieldErrors((prev) => ({ ...prev, grnDate: err }));
              }}
              className="h-9 text-xs"
              max={new Date().toISOString().split("T")[0]}
            />
          </div>
        </SectionCard>

        {detailLoading && !isEdit && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading dispatch items…
          </div>
        )}

        {!detailLoading && lines.length === 0 && !detailError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            This dispatch has no products to receive.
          </div>
        )}

        {lines.length > 0 && (
          <SectionCard
            title="Items to Receive"
            description="Qty in Case is entered; Qty in Unit and Qty in Kg/Ltr are auto-calculated from product packing size. MFG and Expiry dates are taken from the selected batch."
          >
            <div className="border border-border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[1280px]">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground min-w-[180px]">
                        Product
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">
                        Batch No.
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">
                        MFG Date
                      </th>
                      <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground w-32">
                        Expiry Date
                      </th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                        Dispatched
                      </th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                        Prev. Received
                      </th>
                      <th className="px-3 py-2 text-center text-[11px] font-semibold text-muted-foreground w-28">
                        Remaining
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[120px] min-w-[120px]">
                        Qty in Case
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[100px] min-w-[100px]">
                        Qty in Unit
                      </th>
                      <th className="px-3 py-2.5 text-center text-xs font-semibold text-muted-foreground w-[110px] min-w-[110px]">
                        Qty in Kg/Ltr
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {lines.map((line, idx) => {
                      const caseSize = line.caseSize > 0 ? line.caseSize : 1;
                      const stackOpts = {
                        packingSize: caseSize,
                        unit: line.unit,
                        productSnapshot: line.productSnapshot,
                      };
                      const dispatchedStack = stackGrnLineQty(line.maxQty, stackOpts);
                      const prevStack = stackGrnLineQty(line.previousReceivedQty, stackOpts);
                      const remainingStack = stackGrnLineQty(
                        Math.max(0, line.maxQty - line.previousReceivedQty),
                        stackOpts,
                      );
                      const receivedStack = stackGrnLineQty(line.receivedQty, stackOpts);
                      const lineError = fieldErrors.lines?.[idx];

                      return (
                        <tr key={`${line.sourceItemId}-${idx}`} className="border-b border-border/50 align-top">
                          <td className="px-3 py-2">
                            <ProductSkuCell name={line.productName} sku={line.sku} />
                            {lineError && (
                              <p className="text-[10px] text-red-600 mt-1">{lineError}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {line.batchLocked ? (
                              <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                                {line.batchNo}
                              </span>
                            ) : (
                              <Input
                                value={line.batchNo}
                                onChange={(e) => updateLineField(idx, "batchNo", e.target.value)}
                                className="h-9 text-xs font-mono w-28"
                              />
                            )}
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={line.mfgDate}
                              readOnly
                              className={DATE_READONLY_CLASS}
                            />
                          </td>
                          <td className="px-3 py-2">
                            <Input
                              type="date"
                              value={line.expDate}
                              readOnly
                              className={DATE_READONLY_CLASS}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <StackedQtyCell stack={dispatchedStack} empty={!(line.maxQty > 0)} />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <StackedQtyCell
                              stack={prevStack}
                              empty={!(line.previousReceivedQty > 0)}
                            />
                          </td>
                          <td className="px-3 py-2 align-middle">
                            <StackedQtyCell
                              stack={remainingStack}
                              empty={!(line.maxQty - line.previousReceivedQty > 0)}
                              className="[&_p:first-child]:text-amber-700"
                            />
                          </td>
                          <td className="px-3 py-2 w-[120px] min-w-[120px]">
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={line.displayQty === 0 ? "" : line.displayQty}
                                onChange={(e) => handleDisplayQtyChange(idx, e.target.value)}
                                placeholder={GRN_QTY_PLACEHOLDER}
                                className={cn(
                                  GRN_QTY_INPUT_CLASSNAME,
                                  "w-28",
                                  lineError?.includes("qty") && "border-red-500",
                                )}
                              />
                            </div>
                          </td>
                          <td className="px-3 py-2 text-center text-xs font-semibold tabular-nums align-middle">
                            {line.receivedQty > 0 ? formatStackNum(receivedStack.unitQty) : "—"}
                          </td>
                          <td className="px-3 py-2 text-center text-xs font-semibold tabular-nums align-middle">
                            {formatWeightStackPart(receivedStack)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionCard>
        )}

        <SectionCard
          title="Receipt Remarks"
          description="Add any relevant notes about the stock transfer receipt."
        >
          <textarea
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            placeholder="Type any remarks here..."
            className="w-full min-h-[80px] p-3 text-xs border border-border rounded-lg bg-background focus:ring-1 focus:ring-brand-500 focus:border-brand-500 focus:outline-none"
          />
        </SectionCard>
      </div>

      <PartialGrnConfirmDialog
        open={partialConfirmOpen}
        products={partialProducts}
        submitting={isBusy}
        onCancel={() => {
          setPartialConfirmOpen(false);
          setPartialProducts([]);
        }}
        onContinue={() => {
          void handleSave({ skipPartialWarning: true });
        }}
      />
    </FormContainer>
  );
}
