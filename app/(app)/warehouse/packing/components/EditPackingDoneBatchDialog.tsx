"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PackingListService } from "@/services/packing-list.service";
import { PackingDoneService } from "@/services/packing-done.service";
import { showToast } from "@/lib/toast";
import type {
  PackedProduct,
  PackingDoneDraftChange,
  PackingDoneRemainingItem,
  PackingRecord,
} from "../types";
import { cn } from "@/lib/utils";

type DialogMode = "swap" | "add";

interface InventoryBatchOption {
  available_inventory_id: string;
  batch_code: string;
  expiry_date: string | null;
  mfg_date: string | null;
  available_qty: number;
  isCurrent?: boolean;
}

interface EditPackingDoneBatchDialogProps {
  open: boolean;
  mode: DialogMode;
  packing: PackingRecord;
  product?: PackedProduct | null;
  /** Source items with order + remaining (Add filters remaining > 0). */
  remainingItems?: PackingDoneRemainingItem[];
  /** Full source-item meta (including 0 remaining) for Update order/remaining display. */
  sourceItems?: PackingDoneRemainingItem[];
  /**
   * When false, selection is returned via onDraftApply and not persisted.
   * Default true keeps immediate save (e.g. view page).
   */
  persist?: boolean;
  onClose: () => void;
  onSuccess?: (updated: PackingRecord) => void;
  onDraftApply?: (change: PackingDoneDraftChange) => void;
}

function formatDate(value?: string | null): string {
  if (!value) return "—";
  const raw = String(value).trim();
  if (!raw) return "—";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return raw;
  return parsed.toISOString().slice(0, 10);
}

function toDisplayQty(baseQty: number, packSize: number, quantityType?: string): number {
  const isCase = String(quantityType || "").toLowerCase() === "case";
  const size = Math.max(1, packSize || 1);
  return isCase ? Math.floor(baseQty / size) : baseQty;
}

function toBaseQty(displayQty: number, packSize: number, quantityType?: string): number {
  const isCase = String(quantityType || "").toLowerCase() === "case";
  const size = Math.max(1, packSize || 1);
  return isCase ? displayQty * size : displayQty;
}

export function EditPackingDoneBatchDialog({
  open,
  mode,
  packing,
  product,
  remainingItems = [],
  sourceItems = [],
  persist = true,
  onClose,
  onSuccess,
  onDraftApply,
}: EditPackingDoneBatchDialogProps) {
  const [selectedSourceItemId, setSelectedSourceItemId] = useState("");
  const [selectedInventoryId, setSelectedInventoryId] = useState("");
  const [qtyDisplay, setQtyDisplay] = useState("");
  const [batches, setBatches] = useState<InventoryBatchOption[]>([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [saving, setSaving] = useState(false);

  const addCandidates = useMemo(
    () => remainingItems.filter((item) => item.remainingBaseQty > 1e-9),
    [remainingItems],
  );

  const selectedRemaining = useMemo(
    () => addCandidates.find((item) => item.sourceItemId === selectedSourceItemId) || null,
    [addCandidates, selectedSourceItemId],
  );

  const swapSourceMeta = useMemo(() => {
    if (mode !== "swap" || !product) return null;
    const pool = [...sourceItems, ...remainingItems];
    if (product.sourceItemId) {
      const bySource = pool.find((item) => item.sourceItemId === product.sourceItemId);
      if (bySource) return bySource;
    }
    if (product.productId) {
      const byProduct = pool.find((item) => item.productId === product.productId);
      if (byProduct) return byProduct;
    }
    return null;
  }, [mode, product, sourceItems, remainingItems]);

  const activeProductMeta = useMemo(() => {
    if (mode === "swap" && product) {
      const currentBase = Number(product.packedBaseQty || 0);
      // SO qty not yet on any packing list.
      const soRemaining = Number(swapSourceMeta?.remainingBaseQty || 0);
      // Full SO ordered qty (fallback to PL allocation / current).
      const soOrder = Number(
        swapSourceMeta?.orderBaseQty || product.orderBaseQty || currentBase,
      );
      // Qty already reserved on this packing-list line (may be > packed if partially packed).
      const plOrder = Number(product.orderBaseQty || currentBase);
      const plPending = Math.max(0, Number(product.pendingBaseQty || 0));
      // Headroom on this PL line beyond what this PD row already packed.
      const plHeadroom = Math.max(0, plOrder - currentBase, plPending);
      // Max = current + SO free + PL pending/headroom, never above SO order.
      const maxBaseQty = Math.min(
        soOrder > 0 ? soOrder : Number.POSITIVE_INFINITY,
        Math.max(currentBase + soRemaining, currentBase + plHeadroom, plOrder),
      );
      // "Remaining" shown to user = how much they can still add on top of current.
      const remainingEditable = Math.max(0, maxBaseQty - currentBase);
      return {
        productId: product.productId,
        productName: product.product,
        sku: product.sku || product.productCode || "",
        packSize: Math.max(1, Number(product.packSize || 1)),
        quantityType: product.quantity_type,
        currentBaseQty: currentBase,
        orderBaseQty: soOrder,
        remainingBaseQty: remainingEditable,
        maxBaseQty,
      };
    }
    if (selectedRemaining) {
      return {
        productId: selectedRemaining.productId,
        productName: selectedRemaining.productName,
        sku: selectedRemaining.sku || selectedRemaining.productCode || "",
        packSize: Math.max(1, Number(selectedRemaining.packSize || 1)),
        quantityType: selectedRemaining.quantityType,
        currentBaseQty: 0,
        orderBaseQty: selectedRemaining.orderBaseQty,
        remainingBaseQty: selectedRemaining.remainingBaseQty,
        maxBaseQty: selectedRemaining.remainingBaseQty,
      };
    }
    return null;
  }, [mode, product, selectedRemaining, swapSourceMeta]);

  const packSize = activeProductMeta?.packSize || 1;
  const quantityType = activeProductMeta?.quantityType;
  const isCaseQty = String(quantityType || "").toLowerCase() === "case";
  const qtyLabel = isCaseQty ? "Cases" : "Units";

  const orderDisplay = activeProductMeta
    ? toDisplayQty(activeProductMeta.orderBaseQty, packSize, quantityType)
    : 0;
  const remainingDisplay = activeProductMeta
    ? toDisplayQty(activeProductMeta.remainingBaseQty, packSize, quantityType)
    : 0;
  const maxDisplay = activeProductMeta
    ? toDisplayQty(activeProductMeta.maxBaseQty, packSize, quantityType)
    : 0;
  const currentDisplay = activeProductMeta
    ? toDisplayQty(activeProductMeta.currentBaseQty, packSize, quantityType)
    : 0;

  useEffect(() => {
    if (!open) return;
    setSelectedInventoryId(product?.availableInventoryId || "");
    if (mode === "add") {
      setSelectedSourceItemId(addCandidates[0]?.sourceItemId || "");
      setQtyDisplay("");
    } else {
      setSelectedSourceItemId(product?.sourceItemId || "");
      setQtyDisplay(currentDisplay > 0 ? String(currentDisplay) : "");
    }
  }, [open, mode, product, addCandidates, currentDisplay]);

  useEffect(() => {
    let active = true;
    async function loadBatches() {
      if (!open || !activeProductMeta?.productId || !packing.warehouseId) {
        setBatches([]);
        return;
      }
      setLoadingBatches(true);
      try {
        const rows = await PackingListService.getBatches(
          activeProductMeta.productId,
          packing.warehouseId,
          activeProductMeta.quantityType,
        );
        if (!active) return;
        const mapped: InventoryBatchOption[] = (rows || [])
          .map((row: any) => ({
            available_inventory_id: String(row.available_inventory_id || ""),
            batch_code: String(row.batch_code || row.batch_no || ""),
            expiry_date: row.expiry_date ? String(row.expiry_date).slice(0, 10) : null,
            mfg_date: row.mfg_date || row.manufacture_date
              ? String(row.mfg_date || row.manufacture_date).slice(0, 10)
              : null,
            available_qty: Number(row.available_qty || 0),
            isCurrent: false,
          }))
          .filter((row) => row.available_inventory_id && row.available_qty > 0);

        // Always include the currently selected batch so user sees what they are changing from.
        if (
          mode === "swap" &&
          product?.availableInventoryId &&
          !mapped.some((row) => row.available_inventory_id === product.availableInventoryId)
        ) {
          mapped.unshift({
            available_inventory_id: product.availableInventoryId,
            batch_code: product.batchNumber || "Current",
            expiry_date: product.expDate || null,
            mfg_date: product.mfgDate || null,
            available_qty: Number(product.packedBaseQty || 0),
            isCurrent: true,
          });
        } else if (mode === "swap" && product?.availableInventoryId) {
          mapped.forEach((row) => {
            if (row.available_inventory_id === product.availableInventoryId) {
              row.isCurrent = true;
            }
          });
        }

        setBatches(mapped);
        if (!selectedInventoryId) {
          const preferred =
            (mode === "swap" && product?.availableInventoryId) ||
            (mapped.length === 1 ? mapped[0].available_inventory_id : "");
          if (preferred) setSelectedInventoryId(preferred);
        }
      } catch (err: any) {
        if (!active) return;
        setBatches([]);
        showToast(
          err?.response?.data?.message || err?.message || "Failed to load batches.",
          "error",
        );
      } finally {
        if (active) setLoadingBatches(false);
      }
    }
    loadBatches();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    open,
    mode,
    activeProductMeta?.productId,
    activeProductMeta?.quantityType,
    packing.warehouseId,
    product?.availableInventoryId,
  ]);

  const buildDraftBatch = (batch: InventoryBatchOption) => ({
    availableInventoryId: batch.available_inventory_id,
    batchNumber: batch.batch_code,
    expiryDate: batch.expiry_date || undefined,
    mfgDate: batch.mfg_date || undefined,
  });

  const parseEnteredBaseQty = (): number | null => {
    const entered = Number(qtyDisplay);
    if (!(entered > 0)) return null;
    return toBaseQty(entered, packSize, quantityType);
  };

  const handleConfirm = async () => {
    if (!selectedInventoryId) {
      showToast("Select a batch to continue.", "error");
      return;
    }
    const selectedBatch = batches.find((b) => b.available_inventory_id === selectedInventoryId);
    if (!selectedBatch) {
      showToast("Selected batch is no longer available.", "error");
      return;
    }

    const enteredDisplay = Number(qtyDisplay);
    if (!(enteredDisplay > 0)) {
      showToast(`Enter a valid ${qtyLabel.toLowerCase()} quantity.`, "error");
      return;
    }
    if (enteredDisplay > maxDisplay + 1e-9) {
      showToast(
        `Cannot exceed max ${qtyLabel.toLowerCase()} (${maxDisplay}). Order ${orderDisplay}, remaining free ${remainingDisplay}.`,
        "error",
      );
      return;
    }

    const baseQty = parseEnteredBaseQty();
    if (baseQty == null || !(baseQty > 0)) {
      showToast(`Enter a valid ${qtyLabel.toLowerCase()} quantity.`, "error");
      return;
    }

    if (!persist) {
      if (mode === "swap") {
        if (!product?.packingDoneProductId && !product?.draftKey) {
          showToast("Missing packing line reference.", "error");
          return;
        }
        const unchangedBatch =
          product.availableInventoryId &&
          product.availableInventoryId === selectedInventoryId;
        const unchangedQty = Math.abs(baseQty - Number(product.packedBaseQty || 0)) <= 1e-9;
        if (unchangedBatch && unchangedQty) {
          showToast("No change detected. Update batch or quantity.", "error");
          return;
        }
        onDraftApply?.({
          mode: "swap",
          packingDoneProductId: product.packingDoneProductId,
          draftKey: product.draftKey,
          quantityType: product.quantity_type,
          baseQty,
          batch: buildDraftBatch(selectedBatch),
        });
      } else {
        if (!selectedSourceItemId || !selectedRemaining) {
          showToast("Select a sales-order item to add.", "error");
          return;
        }
        onDraftApply?.({
          mode: "add",
          sourceItemId: selectedSourceItemId,
          baseQty,
          quantityType: activeProductMeta?.quantityType,
          remainingItem: selectedRemaining,
          batch: buildDraftBatch(selectedBatch),
        });
      }
      onClose();
      return;
    }

    setSaving(true);
    try {
      if (mode === "swap") {
        if (!product?.packingDoneProductId) {
          showToast("Missing packing done product id.", "error");
          return;
        }
        await PackingDoneService.swapBatch(packing.id, {
          packing_done_product_id: product.packingDoneProductId,
          available_inventory_id: selectedInventoryId,
          quantity_type: product.quantity_type,
          base_qty: baseQty,
        });
        showToast("Batch/qty updated on packing done and packing list.", "success");
      } else {
        if (!selectedSourceItemId) {
          showToast("Select a sales-order item to add.", "error");
          return;
        }
        await PackingDoneService.addBatch(packing.id, {
          source_item_id: selectedSourceItemId,
          available_inventory_id: selectedInventoryId,
          base_qty: baseQty,
          quantity_type: activeProductMeta?.quantityType,
        });
        showToast("Item / batch added to packing done and packing list.", "success");
      }

      const updated = await PackingDoneService.getById(packing.id);
      onSuccess?.(updated);
      onClose();
    } catch (err: any) {
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          (mode === "swap" ? "Failed to update batch." : "Failed to add batch."),
        "error",
      );
    } finally {
      setSaving(false);
    }
  };

  const confirmLabel = !persist
    ? mode === "swap"
      ? "Apply Update"
      : "Apply Add"
    : mode === "swap"
      ? "Update Batch"
      : "Add Batch";

  return (
    <Dialog open={open} onOpenChange={(next) => (!next ? onClose() : undefined)}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-base">
            {mode === "swap" ? "Update Batch / Qty" : "Add Remaining Item / Batch"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 text-xs">
          {!persist ? (
            <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Staged only. Click <span className="font-semibold">Save</span> on the page to update
              packing done, packing list, and inventory.
            </p>
          ) : null}

          {mode === "swap" && product ? (
            <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 space-y-1">
              <p className="font-semibold text-foreground">{product.product}</p>
              <p className="text-muted-foreground">
                Current batch:{" "}
                <span className="font-mono font-semibold text-brand-700">
                  {product.batchNumber || "—"}
                </span>
              </p>
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Order Qty
                  </p>
                  <p className="font-semibold">
                    {orderDisplay} {qtyLabel.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Remaining Free
                  </p>
                  <p className="font-semibold">
                    {remainingDisplay} {qtyLabel.toLowerCase()}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                    Max Allowed
                  </p>
                  <p className="font-semibold text-brand-700">
                    {maxDisplay} {qtyLabel.toLowerCase()}
                  </p>
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                Remaining = how much you can still add on this line. Max = current packed +
                remaining (includes SO free qty and any unpacked qty already on this packing
                list). Cannot exceed order qty or qty already used on another packing list.
              </p>
            </div>
          ) : null}

          {mode === "add" ? (
            <div className="space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Remaining Sales / Source Item
              </label>
              {addCandidates.length === 0 ? (
                <p className="text-muted-foreground">
                  No remaining sales-order qty available to add.
                </p>
              ) : (
                <Select
                  value={selectedSourceItemId || undefined}
                  onValueChange={(value) => {
                    setSelectedSourceItemId(value);
                    setSelectedInventoryId("");
                    setQtyDisplay("");
                  }}
                >
                  <SelectTrigger className="h-auto min-h-9 w-full items-start py-2 text-xs [&>span]:line-clamp-none [&>span]:flex-1">
                    <SelectValue placeholder="Select remaining item…">
                      {selectedRemaining ? (
                        <span className="flex w-full min-w-0 flex-col items-start gap-0.5 text-left">
                          <span className="font-semibold text-foreground">
                            {selectedRemaining.productName}
                            <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-foreground">
                              ({selectedRemaining.sku || selectedRemaining.productCode || "—"})
                            </span>
                          </span>
                          <span className="text-[10px] font-normal text-muted-foreground">
                            Order{" "}
                            {toDisplayQty(
                              selectedRemaining.orderBaseQty,
                              Math.max(1, selectedRemaining.packSize || 1),
                              selectedRemaining.quantityType,
                            )}{" "}
                            · Remaining{" "}
                            <span className="font-semibold text-amber-800">
                              {toDisplayQty(
                                selectedRemaining.remainingBaseQty,
                                Math.max(1, selectedRemaining.packSize || 1),
                                selectedRemaining.quantityType,
                              )}
                            </span>
                          </span>
                        </span>
                      ) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent className="text-xs" position="popper">
                    {addCandidates.map((line) => {
                      const rem = toDisplayQty(
                        line.remainingBaseQty,
                        Math.max(1, line.packSize || 1),
                        line.quantityType,
                      );
                      const ordered = toDisplayQty(
                        line.orderBaseQty,
                        Math.max(1, line.packSize || 1),
                        line.quantityType,
                      );
                      return (
                        <SelectItem
                          key={line.sourceItemId}
                          value={line.sourceItemId}
                          className="items-start py-2.5"
                        >
                          <span className="flex flex-col gap-0.5">
                            <span className="font-semibold leading-tight">
                              {line.productName}
                              <span className="ml-1.5 font-mono text-[10px] font-normal text-muted-foreground">
                                ({line.sku || line.productCode || "—"})
                              </span>
                            </span>
                            <span className="text-[10px] font-normal text-muted-foreground">
                              Order {ordered} · Remaining {rem}
                            </span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              )}
              {activeProductMeta ? (
                <div className="grid grid-cols-2 gap-2 rounded-md border border-border bg-muted/10 px-3 py-2">
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                      Order Qty
                    </p>
                    <p className="font-semibold">
                      {orderDisplay} {qtyLabel.toLowerCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">
                      Remaining Free
                    </p>
                    <p className="font-semibold">
                      {remainingDisplay} {qtyLabel.toLowerCase()}
                    </p>
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available Batches
            </label>
            {loadingBatches ? (
              <p className="text-muted-foreground py-4">Loading batches…</p>
            ) : batches.length === 0 ? (
              <p className="text-muted-foreground py-4">
                No available batches found for this product in the warehouse.
              </p>
            ) : (
              <div className="max-h-64 overflow-auto rounded-lg border border-border">
                <table className="w-full text-left">
                  <thead>
                    <tr className="border-b border-border bg-muted/40">
                      <th className="px-3 py-2 w-8" />
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Batch
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Mfg
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                        Expiry
                      </th>
                      <th className="px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-right">
                        Available
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {batches.map((batch) => {
                      const selected = selectedInventoryId === batch.available_inventory_id;
                      const availableDisplay = isCaseQty
                        ? Math.floor(batch.available_qty / packSize)
                        : batch.available_qty;
                      return (
                        <tr
                          key={batch.available_inventory_id}
                          className={cn(
                            "border-b border-border/60 cursor-pointer hover:bg-muted/20",
                            selected && "bg-brand-50/60",
                            batch.isCurrent && "bg-amber-50/50",
                          )}
                          onClick={() => {
                            setSelectedInventoryId(batch.available_inventory_id);
                            if (!qtyDisplay && currentDisplay > 0 && mode === "swap") {
                              setQtyDisplay(String(currentDisplay));
                            }
                          }}
                        >
                          <td className="px-3 py-2">
                            <input
                              type="radio"
                              name="packing-done-batch"
                              checked={selected}
                              onChange={() => {
                                setSelectedInventoryId(batch.available_inventory_id);
                                if (!qtyDisplay && currentDisplay > 0 && mode === "swap") {
                                  setQtyDisplay(String(currentDisplay));
                                }
                              }}
                            />
                          </td>
                          <td className="px-3 py-2 font-mono font-semibold text-brand-700">
                            {batch.batch_code || "—"}
                            {batch.isCurrent ? (
                              <span className="ml-2 text-[10px] font-semibold text-amber-700 bg-amber-100 border border-amber-200 rounded px-1.5 py-0.5">
                                Current
                              </span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(batch.mfg_date)}
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {formatDate(batch.expiry_date)}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {batch.isCurrent && availableDisplay <= 0
                              ? `${currentDisplay} (on this line)`
                              : `${availableDisplay} ${qtyLabel.toLowerCase()}`}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {selectedInventoryId ? (
            <div className="rounded-lg border border-brand-200 bg-brand-50/40 px-3 py-3 space-y-2">
              <label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {mode === "swap" ? "Enter Packing Qty" : "Enter Add Qty"} ({qtyLabel}) — max{" "}
                {maxDisplay}
              </label>
              <Input
                type="number"
                min={1}
                max={maxDisplay || undefined}
                step={1}
                className="h-9 text-xs bg-white"
                value={qtyDisplay}
                onChange={(e) => setQtyDisplay(e.target.value)}
                placeholder={`Enter ${qtyLabel.toLowerCase()} for selected batch`}
                autoFocus
              />
              <p className="text-[11px] text-muted-foreground">
                Selected batch will use this qty. Order {orderDisplay} · Remaining{" "}
                {remainingDisplay} · Max {maxDisplay}.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-muted-foreground">
              Select a batch above to enter quantity.
            </p>
          )}
        </div>

        <DialogFooter className="gap-2 pt-2">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={
              saving ||
              loadingBatches ||
              !selectedInventoryId ||
              (mode === "add" && addCandidates.length === 0)
            }
          >
            {saving ? "Saving…" : confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
