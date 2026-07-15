"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FormContainer } from "@/components/layout/FormContainer";
import { Field, TextField } from "@/components/ui/FormFields";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
import {
  fromBaseQuantity,
  GRN_QUANTITY_TYPE_OPTIONS,
  resolveGrnQuantityType,
  toBaseQuantity,
  type GrnQuantityType,
} from "@/lib/warehouse/grn-quantity";
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
import {
  buildStockTransferLinesFromDispatch,
  getCustomerSnapshot,
  matchesDestinationWarehouse,
  type StockTransferLineFromDispatch,
} from "./stock-transfer-grn-utils";

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
  const [hydratedEdit, setHydratedEdit] = useState(false);
  const [detailLoading, setDetailLoading] = useState(!isEdit);
  const [detailError, setDetailError] = useState<string | null>(null);

  const {
    data: previewNumber,
    isLoading: previewLoading,
    isError: previewError,
    error: previewLoadError,
    refetch: refetchPreviewNumber,
  } = useGrnPreviewNumber(!isEdit);

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
    if (!isEdit && previewNumber) {
      setGrnNo(previewNumber);
    }
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
        if (sourceId) {
          try {
            const transfer = await StockTransferService.getById(sourceId);
            transferNo = transfer.transferNumber;
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
          builtLines.map((line) => {
            const caseSize = line.caseSize > 0 ? line.caseSize : 1;
            const quantityType = resolveGrnQuantityType(line.quantityType);
            const receivedQty = line.maxQty;
            const displayQty = round2(
              fromBaseQuantity({
                baseQty: receivedQty,
                quantityType,
                packingSize: caseSize,
              }),
            );
            return {
              ...line,
              caseSize,
              previousReceivedQty: 0,
              receivedQty,
              displayQty,
              quantityType,
              batchLocked: Boolean(line.batchNo),
              productSnapshot: {
                ...line.productSnapshot,
                unit_per_packing: caseSize,
              },
            };
          }),
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

    setGrnNo(existingGrn.grnNo || "");
    setGrnDate(existingGrn.grnDate || new Date().toISOString().slice(0, 10));
    setWarehouseId(existingGrn.warehouseUuid || "");
    setWarehouseName(existingGrn.warehouse || existingGrn.toWarehouse || "");
    setFromWarehouseName(existingGrn.fromWarehouse || "");
    setStockTransferId(existingGrn.sourceId || "");
    setStockTransferNo(existingGrn.stockTransferNo || existingGrn.grnNo || "");
    setRemarks(existingGrn.receiptRemarks || "");

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
        return {
          sourceItemId: item.sourceItemId || item.productId,
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
          batchLocked: Boolean(batch?.batchNumber),
          productSnapshot: {
            product_id: item.productId,
            product_name: item.productName,
            product_code: item.productCode,
            base_unit: item.unit || "Unit",
            unit_per_packing: caseSize,
          },
        };
      }),
    );
    setHydratedEdit(true);
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

  const handleQuantityTypeChange = (index: number, nextType: GrnQuantityType) => {
    setLines((prev) => {
      const copy = [...prev];
      const line = copy[index];
      const packingSize = line.caseSize > 0 ? line.caseSize : 1;
      const displayQty = round2(
        fromBaseQuantity({
          baseQty: line.receivedQty,
          quantityType: nextType,
          packingSize,
        }),
      );
      copy[index] = { ...line, quantityType: nextType, displayQty };
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
      if (line.receivedQty > line.maxQty) {
        lineErrors[idx] = `Received qty exceeds dispatched qty (${line.maxQty} base).`;
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

  const handleSave = async () => {
    if (!validate()) return;
    if (!isEdit && !stockTransferId) {
      setFormError("Stock transfer source id is missing on this dispatch.");
      return;
    }

    const invoiceNumber = stockTransferNo || dispatchNumber || grnNo || "ST-RECEIPT";
    const invoiceDate = grnDate;

    const payloadItems = lines
      .filter((line) => line.receivedQty > 0)
      .map((line) => {
        const current = round2(line.receivedQty);
        const previous = round2(line.previousReceivedQty);
        const ordered = round2(line.maxQty);
        const caseSize = line.caseSize > 0 ? line.caseSize : 1;
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
              rate: null,
              gst: null,
              gstAmount: null,
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
        router.push(`${basePath}/${grnId}`);
      } else {
        const payload: CreateGrnPayload = {
          grnNumber: grnNo || null,
          source_id: stockTransferId,
          source_type: "STOCK_TRANSFER",
          supplierId: null,
          warehouseId,
          grnDate,
          remarks: remarks.trim() || null,
          items: payloadItems,
          invoices: [{ invoiceNumber, invoiceDate }],
        };
        await createGrnMutation.mutateAsync(payload);
        router.push(basePath);
      }
    } catch (err) {
      const message = getErrorMessage(
        err,
        isEdit ? "Failed to update GRN." : "Failed to create GRN.",
      );

      if (!isEdit && /grn number .+ already exists/i.test(message)) {
        try {
          const { data: nextNumber } = await refetchPreviewNumber();
          if (nextNumber) {
            setGrnNo(nextNumber);
            setFormError(
              `${message} A new GRN number (${nextNumber}) has been loaded. Please submit again.`,
            );
            return;
          }
        } catch {
          // Fall through
        }
      }

      setFormError(message);
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
          onClick={handleSave}
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
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <TextField
                label="GRN Number"
                value={previewLoading && !isEdit ? "Loading…" : grnNo}
                readOnly
                className="h-9 text-xs font-mono font-bold bg-muted/30"
              />
            </div>

            <TextField
              label="Stock Transfer No."
              value={stockTransferNo || (detailLoading ? "Loading…" : "")}
              readOnly
              className="h-9 text-xs font-mono bg-muted/30"
            />

            <Field
              label="Destination Warehouse"
              required
              error={fieldErrors.warehouseId}
            >
              <Input
                value={warehouseName || (detailLoading ? "Loading…" : "")}
                readOnly
                placeholder="Auto-populated from packing snapshot…"
                className="h-9 text-xs bg-muted/30"
              />
            </Field>

            <TextField
              label="GRN Date"
              type="date"
              required
              error={fieldErrors.grnDate}
              value={grnDate}
              onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                setGrnDate(e.target.value);
                setFieldErrors((prev) => ({ ...prev, grnDate: undefined }));
              }}
              className="h-9 text-xs bg-white"
            />
          </div>

          {(fromWarehouseName || dispatchNumber) && (
            <p className="text-[11px] text-muted-foreground">
              {fromWarehouseName && (
                <>
                  From:{" "}
                  <span className="font-medium text-foreground">{fromWarehouseName}</span>
                </>
              )}
              {fromWarehouseName && dispatchNumber && " · "}
              {dispatchNumber && (
                <>
                  Dispatch:{" "}
                  <span className="font-medium text-foreground font-mono">{dispatchNumber}</span>
                </>
              )}
            </p>
          )}
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
            description="Choose Case or Piece per product. Enter quantity in that unit; values convert to base quantity using packing size before save."
          >
            <div className="border border-border rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1280px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[180px]">
                        Product & SKU
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-32">
                        Batch No.
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-32">
                        MFG Date
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-32">
                        Expiry Date
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-20">
                        Case Size
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-24">
                        Dispatched
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-[120px] min-w-[120px]">
                        Quantity Type
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-[110px] min-w-[110px]">
                        Quantity
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-[110px] min-w-[110px]">
                        Total Base Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {lines.map((line, idx) => {
                      const caseSize = line.caseSize > 0 ? line.caseSize : 1;
                      const displayDispatched = round2(
                        fromBaseQuantity({
                          baseQty: line.maxQty,
                          quantityType: line.quantityType,
                          packingSize: caseSize,
                        }),
                      );
                      const lineError = fieldErrors.lines?.[idx];
                      const exceeds = line.receivedQty > line.maxQty;

                      return (
                        <tr key={`${line.sourceItemId}-${idx}`} className="hover:bg-muted/10 align-top">
                          <td className="p-3">
                            <p className="text-xs font-semibold text-foreground">{line.productName}</p>
                            <p className="text-[10px] font-mono text-muted-foreground mt-0.5">
                              {line.sku}
                            </p>
                            {lineError && (
                              <p className="text-[10px] text-red-600 mt-1">{lineError}</p>
                            )}
                          </td>
                          <td className="p-3">
                            {line.batchLocked ? (
                              <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                                {line.batchNo}
                              </span>
                            ) : (
                              <Input
                                value={line.batchNo}
                                onChange={(e) => updateLineField(idx, "batchNo", e.target.value)}
                                className="h-8 text-xs font-mono w-28"
                              />
                            )}
                          </td>
                          <td className="p-3">
                            <Input
                              type="date"
                              value={line.mfgDate}
                              onChange={(e) => updateLineField(idx, "mfgDate", e.target.value)}
                              className="h-8 text-xs w-32"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              type="date"
                              value={line.expDate}
                              onChange={(e) => updateLineField(idx, "expDate", e.target.value)}
                              className="h-8 text-xs w-32"
                            />
                          </td>
                          <td className="p-3 text-center text-xs font-medium text-muted-foreground tabular-nums">
                            {caseSize}
                          </td>
                          <td className="p-3 text-center text-xs font-medium tabular-nums">
                            {displayDispatched}
                          </td>
                          <td className="p-3 align-middle w-[120px] min-w-[120px]">
                            <Select
                              value={line.quantityType}
                              onValueChange={(val) =>
                                handleQuantityTypeChange(idx, val as GrnQuantityType)
                              }
                            >
                              <SelectTrigger className="h-8 w-full text-xs rounded-lg">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {GRN_QUANTITY_TYPE_OPTIONS.map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value} className="text-xs">
                                    {opt.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                min={0}
                                step="any"
                                value={line.displayQty === 0 ? "" : line.displayQty}
                                placeholder={line.quantityType === "CASE" ? "Cases" : "Pcs"}
                                onChange={(e) => handleDisplayQtyChange(idx, e.target.value)}
                                className={cn(
                                  "h-8 text-center text-xs font-medium w-24 focus:ring-brand-500",
                                  exceeds && "border-red-500 text-red-600 focus:ring-red-500",
                                )}
                              />
                            </div>
                          </td>
                          <td className="p-3">
                            <Input
                              type="number"
                              readOnly
                              value={line.receivedQty === 0 ? "" : line.receivedQty}
                              placeholder="0"
                              className={cn(
                                "h-8 w-full text-xs text-center tabular-nums font-semibold rounded-lg bg-muted focus-visible:ring-0",
                                exceeds && "border-red-400",
                              )}
                            />
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
    </FormContainer>
  );
}
