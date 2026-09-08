"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import {
  StackedQtyDisplay,
  type QtyStackMeta,
} from "@/app/(app)/sales/shared/StackedQtyDisplay";
import { ProductDropdownService } from "@/services/product-dropdown.service";
import {
  StockOverviewApi,
  type StockAdjustmentBatchOption,
} from "../services/stock-overview-api";

export type StockAdjustmentPrefill = {
  productId?: string;
  productName?: string;
  warehouseId?: string;
  inventoryDetailId?: string;
  batchNo?: string;
  expiryDate?: string | null;
  quantityType?: "CASE" | "PIECE" | string | null;
};

interface StockAdjustmentDialogProps {
  open: boolean;
  warehouseId?: string;
  warehouseOptions?: Array<{ label: string; value: string }>;
  prefill?: StockAdjustmentPrefill | null;
  onClose: () => void;
  onSuccess: () => void;
}

type Direction = "INWARD" | "OUTWARD";
type QtyMode = "CASE" | "PIECE";

function normalizeQtyType(raw: string | null | undefined): QtyMode {
  const t = String(raw || "").trim().toUpperCase();
  if (t === "CASE" || t === "CASES") return "CASE";
  return "PIECE";
}

function batchOptionValue(b: StockAdjustmentBatchOption): string {
  return b.inventory_detail_id;
}

function batchOptionLabel(b: StockAdjustmentBatchOption): string {
  const exp = b.expiry_date ? ` · Exp ${b.expiry_date}` : "";
  const cases = Number(b.available_cases || 0);
  const pieces = Number(b.available_piece_qty || 0);
  return `${b.batch_no}${exp} · Case ${cases} · Piece ${pieces}`;
}

export function StockAdjustmentDialog({
  open,
  warehouseId: warehouseIdProp,
  warehouseOptions = [],
  prefill,
  onClose,
  onSuccess,
}: StockAdjustmentDialogProps) {
  const [direction, setDirection] = useState<Direction>("OUTWARD");
  const [warehouseId, setWarehouseId] = useState("");
  const [productId, setProductId] = useState("");
  const [productOptions, setProductOptions] = useState<
    Array<{ label: string; value: string; sublabel?: string }>
  >([]);
  const [batches, setBatches] = useState<StockAdjustmentBatchOption[]>([]);
  const [batchKey, setBatchKey] = useState("");
  const [qtyMode, setQtyMode] = useState<QtyMode>("CASE");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("");
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBatch = useMemo(
    () => batches.find((b) => batchOptionValue(b) === batchKey) || null,
    [batches, batchKey],
  );

  const pack = Math.max(1, Number(selectedBatch?.unit_per_packing) || 1);
  const maxCases = Number(selectedBatch?.available_cases || 0);
  const maxPieceUnits = Number(selectedBatch?.available_piece_qty || 0);
  const caseMode = qtyMode === "CASE";
  const maxForMode = caseMode ? maxCases : maxPieceUnits;

  const qtyMeta: QtyStackMeta | undefined = selectedBatch
    ? {
        unitsPerPacking: pack,
        quantityType: caseMode ? "Case" : "Piece",
        uom: selectedBatch.unit,
        unitPackSize:
          selectedBatch.pack_size != null && Number(selectedBatch.pack_size) > 0
            ? Number(selectedBatch.pack_size)
            : null,
        netWeight:
          selectedBatch.net_weight != null && Number(selectedBatch.net_weight) > 0
            ? Number(selectedBatch.net_weight)
            : null,
      }
    : undefined;

  useEffect(() => {
    if (!open) return;
    setError(null);
    setReason("");
    setQty("");
    setSubmitting(false);
    setDirection("OUTWARD");
    setWarehouseId(prefill?.warehouseId || warehouseIdProp || "");
    setProductId(prefill?.productId || "");
    setBatchKey(prefill?.inventoryDetailId || "");
    setBatches([]);
    setQtyMode(
      prefill?.quantityType ? normalizeQtyType(prefill.quantityType) : "CASE",
    );
  }, [open, prefill, warehouseIdProp]);

  useEffect(() => {
    if (!open) return;
    let mounted = true;
    setLoadingProducts(true);
    ProductDropdownService.dropdown()
      .then((items) => {
        if (!mounted) return;
        setProductOptions(
          items.map((p) => ({
            value: p.product_id,
            label: p.product_name,
            sublabel: [p.sku, p.product_code].filter(Boolean).join(" · ") || undefined,
          })),
        );
      })
      .catch(() => {
        if (!mounted) return;
        setProductOptions([]);
      })
      .finally(() => {
        if (mounted) setLoadingProducts(false);
      });
    return () => {
      mounted = false;
    };
  }, [open]);

  useEffect(() => {
    if (!open || !productId || !warehouseId) {
      setBatches([]);
      return;
    }
    let mounted = true;
    setLoadingBatches(true);
    setError(null);
    StockOverviewApi.listAdjustmentBatches({
      product_id: productId,
      warehouse_id: warehouseId,
    })
      .then((rows) => {
        if (!mounted) return;
        setBatches(rows);
        setBatchKey((prev) => {
          if (prev && rows.some((r) => batchOptionValue(r) === prev)) return prev;
          if (prefill?.batchNo) {
            const match = rows.find(
              (r) =>
                r.batch_no === prefill.batchNo &&
                (prefill.expiryDate == null ||
                  prefill.expiryDate === "" ||
                  r.expiry_date === prefill.expiryDate),
            );
            if (match) return batchOptionValue(match);
          }
          return rows[0] ? batchOptionValue(rows[0]) : "";
        });
      })
      .catch((err) => {
        if (!mounted) return;
        setBatches([]);
        setBatchKey("");
        setError(
          StockOverviewApi.getErrorMessage(err, "Failed to load batches for this product."),
        );
      })
      .finally(() => {
        if (mounted) setLoadingBatches(false);
      });
    return () => {
      mounted = false;
    };
  }, [open, productId, warehouseId, prefill?.batchNo, prefill?.expiryDate]);

  const qtyNum = Number(qty);

  const qtyValid = useMemo(() => {
    if (!selectedBatch) return false;
    if (caseMode) {
      if (!Number.isInteger(qtyNum) || qtyNum <= 0) return false;
      if (direction === "OUTWARD" && qtyNum > maxCases) return false;
      return true;
    }
    if (!Number.isFinite(qtyNum) || qtyNum <= 0) return false;
    if (direction === "OUTWARD" && qtyNum > maxPieceUnits + 1e-9) return false;
    return true;
  }, [selectedBatch, caseMode, qtyNum, direction, maxCases, maxPieceUnits]);

  const previewBaseQty = caseMode
    ? qtyValid
      ? qtyNum * pack
      : 0
    : qtyValid
      ? qtyNum
      : 0;

  const canSubmit =
    !!warehouseId &&
    !!productId &&
    !!selectedBatch &&
    qtyValid &&
    !submitting &&
    !loadingBatches;

  const handleSubmit = async () => {
    if (!canSubmit || !selectedBatch) return;
    setSubmitting(true);
    setError(null);
    try {
      await StockOverviewApi.createStockAdjustment({
        direction,
        product_id: productId,
        warehouse_id: warehouseId,
        inventory_detail_id: selectedBatch.inventory_detail_id,
        batch_no: selectedBatch.batch_no,
        expiry_date: selectedBatch.expiry_date,
        quantity_type: qtyMode,
        ...(caseMode ? { cases: qtyNum } : { qty: qtyNum }),
        reason: reason.trim() || undefined,
      });
      onSuccess();
      onClose();
    } catch (err) {
      setError(
        StockOverviewApi.getErrorMessage(err, "Failed to complete stock adjustment."),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const warehouseLocked = Boolean(warehouseIdProp);
  const productLocked = Boolean(prefill?.productId);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && !submitting && onClose()}>
      <DialogContent className="max-w-lg w-[calc(100vw-2rem)] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg bg-brand-50 border border-brand-200 flex items-center justify-center">
              <Scale className="w-4 h-4 text-brand-600" />
            </div>
            Stock Adjustment
          </DialogTitle>
          <DialogDescription className="text-xs pt-1">
            Inventory-only correction. Inward allows Case or Piece. Outward moves only the
            selected quantity type from available stock.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-1 max-h-[70vh] overflow-y-auto overflow-x-hidden pr-1 min-w-0">
          <div className="space-y-1.5">
            <Label className="text-xs">Direction</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setDirection("INWARD");
                  setQty("");
                }}
                className={`flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                  direction === "INWARD"
                    ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <ArrowDownToLine className="w-3.5 h-3.5" />
                Inward
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={() => {
                  setDirection("OUTWARD");
                  setQty("");
                }}
                className={`flex items-center justify-center gap-1.5 h-9 rounded-lg border text-xs font-semibold transition-colors ${
                  direction === "OUTWARD"
                    ? "border-rose-300 bg-rose-50 text-rose-800"
                    : "border-border bg-white text-muted-foreground hover:bg-muted/40"
                }`}
              >
                <ArrowUpFromLine className="w-3.5 h-3.5" />
                Outward
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Warehouse</Label>
            <AutocompleteSelect
              options={warehouseOptions}
              value={warehouseId}
              onChange={(v) => {
                setWarehouseId(v);
                setBatchKey("");
                setBatches([]);
              }}
              placeholder="Select warehouse..."
              searchPlaceholder="Search warehouse..."
              disabled={submitting || warehouseLocked || warehouseOptions.length === 0}
              className="h-8 text-xs rounded-lg border-border bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Product</Label>
            <AutocompleteSelect
              options={productOptions}
              value={productId}
              onChange={(v) => {
                setProductId(v);
                setBatchKey("");
                setBatches([]);
                setQty("");
              }}
              placeholder={loadingProducts ? "Loading products..." : "Select product..."}
              searchPlaceholder="Search product..."
              disabled={submitting || productLocked || loadingProducts}
              className="h-8 text-xs rounded-lg border-border bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Batch</Label>
            <AutocompleteSelect
              options={batches.map((b) => ({
                value: batchOptionValue(b),
                label: b.batch_no,
                sublabel: batchOptionLabel(b).replace(`${b.batch_no}`, "").replace(/^ · /, ""),
              }))}
              value={batchKey}
              onChange={(v) => {
                setBatchKey(v);
                setQty("");
              }}
              placeholder={
                !productId || !warehouseId
                  ? "Select product & warehouse first"
                  : loadingBatches
                    ? "Loading batches..."
                    : batches.length
                      ? "Select batch..."
                      : "No batches found"
              }
              searchPlaceholder="Search batch..."
              disabled={
                submitting ||
                loadingBatches ||
                !productId ||
                !warehouseId ||
                batches.length === 0
              }
              className="h-8 text-xs rounded-lg border-border bg-white"
            />
          </div>

          {selectedBatch ? (
            <div className="rounded-md border border-border bg-muted/30 px-3 py-2.5 space-y-1.5 text-[11px] text-muted-foreground">
              {selectedBatch.expiry_date ? (
                <p>
                  Expiry:{" "}
                  <span className="font-semibold text-foreground">
                    {selectedBatch.expiry_date}
                  </span>
                </p>
              ) : null}
              <p>
                Available — Case:{" "}
                <span className="font-semibold text-foreground">{maxCases}</span>
                {" · "}
                Piece:{" "}
                <span className="font-semibold text-foreground">
                  {maxPieceUnits.toLocaleString("en-IN")}
                </span>
              </p>
            </div>
          ) : null}

          {/* Quantity type dropdown + qty side by side */}
          <div className="space-y-1.5 min-w-0">
            <Label className="text-xs">Quantity</Label>
            <div className="flex items-center gap-2 min-w-0 w-full">
              <Select
                value={qtyMode}
                onValueChange={(v) => {
                  setQtyMode(v as QtyMode);
                  setQty("");
                }}
                disabled={submitting}
              >
                <SelectTrigger className="h-8 w-[110px] shrink-0 text-xs">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASE" className="text-xs">
                    Case
                  </SelectItem>
                  <SelectItem value="PIECE" className="text-xs">
                    Piece
                  </SelectItem>
                </SelectContent>
              </Select>
              <Input
                id="stock-adj-qty"
                type="number"
                min={0}
                step={caseMode ? 1 : "any"}
                max={direction === "OUTWARD" ? maxForMode : undefined}
                value={qty}
                disabled={submitting || !selectedBatch}
                onChange={(e) => setQty(e.target.value)}
                className="h-8 min-w-0 flex-1 text-xs"
                placeholder={
                  caseMode
                    ? direction === "OUTWARD"
                      ? `Max ${maxCases}`
                      : "Enter cases"
                    : direction === "OUTWARD"
                      ? `Max ${maxPieceUnits}`
                      : "Enter qty"
                }
              />
            </div>
            <p className="text-[10px] text-muted-foreground break-words">
              {direction === "INWARD"
                ? "Inward: choose Case or Piece freely."
                : caseMode
                  ? "Outward: only case inventory will be moved."
                  : "Outward: only piece inventory will be moved."}
            </p>
            {qtyValid && qtyMeta ? (
              <div className="rounded border border-border/60 bg-muted/20 px-2.5 py-1.5">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold mb-0.5">
                  {direction === "INWARD" ? "Inwarding" : "Outwarding"}
                </p>
                <StackedQtyDisplay
                  baseQty={previewBaseQty}
                  meta={qtyMeta}
                  layout="inline"
                  emptyLabel="—"
                />
              </div>
            ) : null}
            {direction === "OUTWARD" && selectedBatch && maxForMode <= 0 ? (
              <p className="text-[11px] text-rose-600">
                No {caseMode ? "case" : "piece"} inventory available to outward for this
                batch.
              </p>
            ) : null}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="stock-adj-reason" className="text-xs">
              Reason <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Textarea
              id="stock-adj-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              disabled={submitting}
              rows={2}
              className="text-xs resize-none"
              placeholder="e.g. Physical batch differs from system / count variance"
              maxLength={500}
            />
          </div>

          {error ? (
            <p className="text-[11px] text-rose-600 bg-rose-50 border border-rose-100 rounded-md px-2.5 py-2">
              {error}
            </p>
          ) : null}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={submitting}
            onClick={onClose}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className={
              direction === "INWARD"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                : "bg-rose-600 hover:bg-rose-700 text-white"
            }
          >
            {submitting
              ? "Saving..."
              : direction === "INWARD"
                ? "Confirm Inward"
                : "Confirm Outward"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
