"use client";

import React, { useEffect, useMemo, useState } from "react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Building,
  Layers,
  AlertCircle,
  CheckCircle2,
  X,
  Plus,
  Package,
  Check,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { PackingDoneService } from "@/services/packing-done.service";
import {
  PackedProduct,
  PackingDoneDraftChange,
  PackingDoneRemainingItem,
  PackingRecord,
} from "../../types";
import { PackingDoneEditLinesTable } from "../../components/PackingDoneEditLinesTable";
import { EditPackingDoneBatchDialog } from "../../components/EditPackingDoneBatchDialog";
import { loadPackingDoneSourceItems } from "../../lib/packing-done-remaining-items";
import {
  getPackingDocumentNo,
  getPackingDocumentNoLabel,
  getPackingPartyLabel,
  getPackingPartyValue,
  getPackingQtyLabel,
  getPackingWarehouseLabel,
  getPackingWarehouseValue,
  isPurchaseReturnDoc,
  isStockTransferDoc,
} from "../../lib/packing-document-labels";
import { resolvePackingReturnTo } from "../../lib/packing-list-nav";
import { showToast as showGlobalToast } from "@/lib/toast";

type PendingSwapOp = {
  kind: "swap";
  packingDoneProductId: string;
  available_inventory_id: string;
  quantity_type?: string;
  base_qty: number;
};

type PendingAddOp = {
  kind: "add";
  draftKey: string;
  source_item_id: string;
  available_inventory_id: string;
  base_qty: number;
  quantity_type?: string;
};

type PendingOp = PendingSwapOp | PendingAddOp;

function newDraftKey() {
  return `draft-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function applyBatchToProduct(
  product: PackedProduct,
  batch: PackingDoneDraftChange extends { batch: infer B } ? B : never,
  baseQty: number,
): PackedProduct {
  const packSize = Math.max(1, Number(product.packSize || 1));
  const packedDisplay =
    String(product.quantity_type || "").toLowerCase() === "case"
      ? Math.floor(baseQty / packSize)
      : baseQty;

  return {
    ...product,
    batchNumber: batch.batchNumber,
    expDate: batch.expiryDate,
    mfgDate: batch.mfgDate,
    availableInventoryId: batch.availableInventoryId,
    packedBaseQty: baseQty,
    orderBaseQty: baseQty,
    packedQty: packedDisplay,
    ordered_cases: packedDisplay,
    batchAllocations: [
      {
        batchNumber: batch.batchNumber,
        allocatedQty: packedDisplay,
        expiryDate: batch.expiryDate || "—",
      },
    ],
  };
}

export default function EditPackingDonePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [packing, setPacking] = useState<PackingRecord | null>(null);
  const [draftProducts, setDraftProducts] = useState<PackedProduct[]>([]);
  const [baselineSourceItems, setBaselineSourceItems] = useState<PackingDoneRemainingItem[]>([]);
  const [pendingOps, setPendingOps] = useState<PendingOp[]>([]);
  const [batchDialogMode, setBatchDialogMode] = useState<"swap" | "add" | null>(null);
  const [batchDialogProduct, setBatchDialogProduct] = useState<PackedProduct | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "error" | "success" } | null>(
    null,
  );

  const showToast = (message: string, type: "error" | "success" = "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const getBackPath = () =>
    resolvePackingReturnTo(
      searchParams,
      packing?.sourceDocumentType,
      "packing-done",
    );

  const hasUnsavedChanges = pendingOps.length > 0;

  /** Adjust remaining for staged add / qty-change swaps so UI max stays correct. */
  const sourceItems = useMemo(() => {
    const reservedBySource = new Map<string, number>();
    for (const op of pendingOps) {
      if (op.kind === "add") {
        reservedBySource.set(
          op.source_item_id,
          (reservedBySource.get(op.source_item_id) || 0) + op.base_qty,
        );
        continue;
      }
      const baseline = packing?.products.find(
        (p) => p.packingDoneProductId === op.packingDoneProductId,
      );
      if (!baseline?.sourceItemId) continue;
      const delta = op.base_qty - Number(baseline.packedBaseQty || 0);
      // Positive delta consumes free remaining; negative frees it.
      reservedBySource.set(
        baseline.sourceItemId,
        (reservedBySource.get(baseline.sourceItemId) || 0) + delta,
      );
    }
    return baselineSourceItems.map((item) => {
      const reserved = reservedBySource.get(item.sourceItemId) || 0;
      return {
        ...item,
        remainingBaseQty: Math.max(0, item.remainingBaseQty - reserved),
      };
    });
  }, [baselineSourceItems, pendingOps, packing?.products]);

  const remainingItems = useMemo(
    () => sourceItems.filter((item) => item.remainingBaseQty > 1e-9),
    [sourceItems],
  );

  const reload = async (active = true) => {
    const pd = await PackingDoneService.getById(params.id);
    if (!active) return pd;
    setPacking(pd);
    setDraftProducts(pd.products || []);
    setPendingOps([]);
    if (pd.canEditBatches) {
      try {
        const items = await loadPackingDoneSourceItems(pd);
        if (active) setBaselineSourceItems(items);
      } catch (err) {
        console.error("Failed to load source SO items:", err);
        if (active) setBaselineSourceItems([]);
      }
    } else {
      setBaselineSourceItems([]);
    }
    return pd;
  };

  useEffect(() => {
    let active = true;
    async function loadRecord() {
      setLoading(true);
      try {
        await reload(active);
      } catch (err) {
        console.error("API loading failed:", err);
        showToast("Failed to load packing done details.", "error");
        setTimeout(() => {
          if (active) {
            router.push(resolvePackingReturnTo(searchParams, undefined, "packing-done"));
          }
        }, 2000);
      } finally {
        if (active) setLoading(false);
      }
    }
    loadRecord();
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.id]);

  const handleDraftApply = (change: PackingDoneDraftChange) => {
    if (change.mode === "swap") {
      setDraftProducts((prev) =>
        prev.map((row) => {
          const matchPersisted =
            change.packingDoneProductId &&
            row.packingDoneProductId === change.packingDoneProductId;
          const matchDraft = change.draftKey && row.draftKey === change.draftKey;
          if (!matchPersisted && !matchDraft) return row;
          return applyBatchToProduct(row, change.batch, change.baseQty);
        }),
      );

      setPendingOps((prev) => {
        // Updating an unsaved add row — mutate that add op's batch + qty.
        if (change.draftKey) {
          return prev.map((op) =>
            op.kind === "add" && op.draftKey === change.draftKey
              ? {
                  ...op,
                  available_inventory_id: change.batch.availableInventoryId,
                  base_qty: change.baseQty,
                }
              : op,
          );
        }

        const packingDoneProductId = change.packingDoneProductId!;
        const withoutOld = prev.filter(
          (op) =>
            !(op.kind === "swap" && op.packingDoneProductId === packingDoneProductId),
        );
        return [
          ...withoutOld,
          {
            kind: "swap" as const,
            packingDoneProductId,
            available_inventory_id: change.batch.availableInventoryId,
            quantity_type: change.quantityType,
            base_qty: change.baseQty,
          },
        ];
      });

      showToast("Batch/qty update staged. Click Save to apply.", "success");
      return;
    }

    const draftKey = newDraftKey();
    const item = change.remainingItem;
    const packSize = Math.max(1, Number(item.packSize || 1));
    const isCase = String(item.quantityType || "").toLowerCase() === "case";
    const packedDisplay = isCase
      ? Math.floor(change.baseQty / packSize)
      : change.baseQty;

    const newRow: PackedProduct = {
      product: item.productName,
      sku: item.sku || item.productCode || "",
      productCode: item.productCode || item.sku,
      productId: item.productId,
      ordered_cases: packedDisplay,
      packedQty: packedDisplay,
      orderBaseQty: change.baseQty,
      packedBaseQty: change.baseQty,
      packSize,
      batchNumber: change.batch.batchNumber,
      expDate: change.batch.expiryDate,
      mfgDate: change.batch.mfgDate,
      quantity_type: item.quantityType,
      sourceItemId: item.sourceItemId,
      availableInventoryId: change.batch.availableInventoryId,
      draftKey,
      isDraft: true,
      batchAllocations: [
        {
          batchNumber: change.batch.batchNumber,
          allocatedQty: packedDisplay,
          expiryDate: change.batch.expiryDate || "—",
        },
      ],
    };

    setDraftProducts((prev) => [...prev, newRow]);
    setPendingOps((prev) => [
      ...prev,
      {
        kind: "add",
        draftKey,
        source_item_id: change.sourceItemId,
        available_inventory_id: change.batch.availableInventoryId,
        base_qty: change.baseQty,
        quantity_type: change.quantityType,
      },
    ]);
    showToast("Item staged. Click Save to apply.", "success");
  };

  const handleSaveAll = async () => {
    if (!packing || pendingOps.length === 0) {
      showToast("No changes to save.", "error");
      return;
    }

    setSaving(true);
    try {
      for (const op of pendingOps) {
        if (op.kind === "swap") {
          await PackingDoneService.swapBatch(packing.id, {
            packing_done_product_id: op.packingDoneProductId,
            available_inventory_id: op.available_inventory_id,
            quantity_type: op.quantity_type,
            base_qty: op.base_qty,
          });
        } else {
          await PackingDoneService.addBatch(packing.id, {
            source_item_id: op.source_item_id,
            available_inventory_id: op.available_inventory_id,
            base_qty: op.base_qty,
            quantity_type: op.quantity_type,
          });
        }
      }

      showGlobalToast("Packing done changes saved successfully.", "success");
      router.push(getBackPath());
    } catch (err: any) {
      console.error("Failed to save packing done batch edits:", err);
      showToast(
        err?.response?.data?.message ||
          err?.message ||
          "Failed to save changes. Some updates may have been applied — reload and review.",
        "error",
      );
      try {
        await reload(true);
      } catch {
        /* ignore reload error */
      }
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <FormContainer title="Edit Packing Done" onBack={() => router.push(getBackPath())}>
        <div className="max-w-[800px] mx-auto text-center py-24 space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600 mx-auto" />
          <p className="text-xs text-muted-foreground">Loading packing details...</p>
        </div>
      </FormContainer>
    );
  }

  if (!packing) {
    return (
      <FormContainer title="Edit Packing Done" onBack={() => router.push(getBackPath())}>
        <div className="max-w-[800px] mx-auto text-center py-12 space-y-4">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto" />
          <h1 className="text-base font-bold text-foreground">Packing Done Not Found</h1>
          <p className="text-xs text-muted-foreground">
            The packing done record you requested does not exist.
          </p>
          <Button variant="outline" size="sm" onClick={() => router.push(getBackPath())}>
            Go Back
          </Button>
        </div>
      </FormContainer>
    );
  }

  const isPurchaseReturn = isPurchaseReturnDoc(packing);
  const canEdit = Boolean(packing.canEditBatches) && !isPurchaseReturn;
  const qtyLabel = getPackingQtyLabel(packing.sourceDocumentType);

  return (
    <>
      {toast && (
        <div
          className={`fixed top-4 right-4 z-[9999] p-4 rounded-lg shadow-lg flex items-center gap-3 border animate-in slide-in-from-top-2 fade-in duration-300 ${
            toast.type === "error"
              ? "bg-red-50 border-red-200 text-red-800"
              : "bg-emerald-50 border-emerald-200 text-emerald-800"
          }`}
        >
          {toast.type === "error" ? (
            <AlertCircle className="w-5 h-5 flex-shrink-0" />
          ) : (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          )}
          <p className="text-sm font-semibold">{toast.message}</p>
          <button
            onClick={() => setToast(null)}
            className="opacity-70 hover:opacity-100 flex-shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      <FormContainer
        title="Edit Packing Done"
        description={`Correct batches for ${packing.packingNo}`}
        onBack={() => router.push(getBackPath())}
        onCancel={() => router.push(getBackPath())}
        cancelLabel="Back"
        actions={
          canEdit ? (
            <Button
              size="sm"
              className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white gap-1.5"
              disabled={!hasUnsavedChanges || saving}
              onClick={handleSaveAll}
            >
              <Check className="w-3.5 h-3.5" />
              {saving ? "Saving…" : "Save"}
            </Button>
          ) : undefined
        }
        noCard={false}
      >
        <div className="space-y-6">
          <div className="space-y-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider border-b pb-2 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-brand-600" />
              Packing Header Details
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Packing Done No
                </p>
                <Input
                  value={packing.packingNo}
                  disabled
                  className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
                />
              </div>
              {!isStockTransferDoc(packing) && (
                <div>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                    {getPackingDocumentNoLabel(packing.sourceDocumentType)}
                  </p>
                  <Input
                    value={getPackingDocumentNo(packing)}
                    disabled
                    className="h-8 text-xs bg-slate-50 font-mono font-bold mt-1.5"
                  />
                </div>
              )}
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {getPackingWarehouseLabel(packing.sourceDocumentType)}
                </p>
                <div className="flex items-center gap-1.5 h-8 border border-input px-3 rounded-md bg-slate-50 text-xs text-muted-foreground font-medium mt-1.5">
                  <Building className="w-3.5 h-3.5 text-muted-foreground/60" />
                  {getPackingWarehouseValue(packing)}
                </div>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  {getPackingPartyLabel(packing.sourceDocumentType)}
                </p>
                <Input
                  value={getPackingPartyValue(packing)}
                  disabled
                  className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
                />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                  Packing Date
                </p>
                <Input
                  value={packing.packingDate || "—"}
                  disabled
                  className="h-8 text-xs bg-slate-50 font-medium mt-1.5"
                />
              </div>
            </div>

            {!canEdit && (
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                Batch edit is available only while Packing Done is Available for Dispatch and
                not yet used in Dispatch.
              </p>
            )}
            {canEdit && hasUnsavedChanges && (
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
                You have unsaved changes ({pendingOps.length}). Click{" "}
                <span className="font-semibold">Save</span> to update packing done and packing
                list.
              </p>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 border-b pb-2">
              <h2 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                <Package className="w-4 h-4 text-brand-600" />
                Packed Lines
              </h2>
              {canEdit ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-[11px] gap-1"
                  disabled={remainingItems.length === 0 || saving}
                  onClick={() => {
                    setBatchDialogProduct(null);
                    setBatchDialogMode("add");
                  }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Item / Batch
                </Button>
              ) : null}
            </div>
            <PackingDoneEditLinesTable
              products={draftProducts}
              qtyLabel={qtyLabel}
              onUpdateBatch={(product) => {
                if (!canEdit) {
                  showToast("This packing done cannot be batch-edited.", "error");
                  return;
                }
                setBatchDialogProduct(product);
                setBatchDialogMode("swap");
              }}
            />
          </div>
        </div>
      </FormContainer>

      {batchDialogMode && packing && canEdit ? (
        <EditPackingDoneBatchDialog
          open={Boolean(batchDialogMode)}
          mode={batchDialogMode}
          packing={packing}
          product={batchDialogProduct}
          remainingItems={remainingItems}
          sourceItems={sourceItems}
          persist={false}
          onClose={() => {
            setBatchDialogMode(null);
            setBatchDialogProduct(null);
          }}
          onDraftApply={(change) => {
            handleDraftApply(change);
            setBatchDialogMode(null);
            setBatchDialogProduct(null);
          }}
        />
      ) : null}
    </>
  );
}
