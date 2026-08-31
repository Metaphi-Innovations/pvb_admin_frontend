"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormContainer } from "@/components/layout/FormContainer";
import { Field, TextField } from "@/components/ui/FormFields";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import { getErrorMessage } from "@/lib/masters/master-query-errors";
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
import {
  useSalesReturn,
  useSalesReturnDropdown,
  useSampleReturn,
  useSampleReturnDropdown,
} from "@/hooks/sales/use-return-documents";
import type {
  CreateGrnPayload,
  UpdateGrnPayload,
} from "@/services/grn.service";
import { StackedQtyCell } from "./components/StackedQtyCell";
import {
  GRN_QTY_INPUT_CLASSNAME,
  GRN_QTY_PLACEHOLDER,
  ProductSkuCell,
} from "./components/ProductSkuCell";
import {
  PartialGrnConfirmDialog,
  type PartialGrnProductRow,
} from "./components/PartialGrnConfirmDialog";
import { formatWeightStackPart, stackGrnLineQty, enrichGrnProductSnapshot } from "./grn-qty-stack";
import { showToast } from "@/lib/toast";

const GRN_NUMBER_PLACEHOLDER = "Auto-generated";
const READONLY_FIELD_CLASS = "h-9 text-xs bg-muted";
const READONLY_GRN_NO_CLASS =
  "h-9 text-xs font-mono font-bold bg-muted/30 placeholder:text-muted-foreground/50 placeholder:font-normal";
const DATE_READONLY_CLASS = "h-9 text-xs w-full bg-muted";

export type ReturnGrnSourceType = "SALES_RETURN" | "SAMPLE_RETURN";

interface LineInputState {
  sourceItemId: string;
  productId: string;
  sku: string;
  productName: string;
  unit: string;
  batchNo: string;
  mfgDate: string;
  expDate: string;
  maxQty: number;
  previousReceivedQty: number;
  /** Stored / API base quantity. */
  receivedQty: number;
  /** User-entered qty in quantityType units (cases or pieces). */
  displayQty: number;
  quantityType: GrnQuantityType;
  caseSize: number;
  batchLocked: boolean;
  productSnapshot: Record<string, unknown>;
}

interface FieldErrors {
  selectedReturnId?: string;
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
          <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">
            {title}
          </h2>
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

interface ReturnGrnCreateProps {
  sourceType: ReturnGrnSourceType;
  mode?: "create" | "edit";
  grnId?: string;
}

export function ReturnGrnCreate({
  sourceType,
  mode = "create",
  grnId,
}: ReturnGrnCreateProps) {
  const router = useRouter();
  const isEdit = mode === "edit";
  const isSales = sourceType === "SALES_RETURN";
  const basePath = isSales
    ? "/warehouse/grn/sales-return"
    : "/warehouse/grn/sample-return";
  const returnLabel = isSales ? "Sales Return" : "Sample Return";

  const [grnNo, setGrnNo] = useState("");
  const [grnDate, setGrnDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [warehouseId, setWarehouseId] = useState("");
  const [warehouseName, setWarehouseName] = useState("");
  const [selectedReturnId, setSelectedReturnId] = useState("");
  const [remarks, setRemarks] = useState("");
  const [lines, setLines] = useState<LineInputState[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [partialConfirmOpen, setPartialConfirmOpen] = useState(false);
  const [partialProducts, setPartialProducts] = useState<PartialGrnProductRow[]>([]);
  const [hydratedEdit, setHydratedEdit] = useState(false);

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

  const {
    data: salesDropdown = [],
    isLoading: salesDropdownLoading,
    isError: salesDropdownError,
    error: salesDropdownLoadError,
  } = useSalesReturnDropdown(
    ["sales_returned", "partially_received"],
    isSales && !isEdit,
  );

  const {
    data: sampleDropdown = [],
    isLoading: sampleDropdownLoading,
    isError: sampleDropdownError,
    error: sampleDropdownLoadError,
  } = useSampleReturnDropdown(
    ["DRAFT", "SUBMITTED", "APPROVED", "sample_returned", "PARTIALLY_RECEIVED"],
    !isSales && !isEdit,
  );

  const {
    data: salesReturnDetail,
    isLoading: salesDetailLoading,
    isError: salesDetailError,
    error: salesDetailLoadError,
  } = useSalesReturn(selectedReturnId, isSales && Boolean(selectedReturnId));

  const {
    data: sampleReturnDetail,
    isLoading: sampleDetailLoading,
    isError: sampleDetailError,
    error: sampleDetailLoadError,
  } = useSampleReturn(selectedReturnId, !isSales && Boolean(selectedReturnId));

  const createGrnMutation = useCreateGrn();
  const updateGrnMutation = useUpdateGrn();

  const dropdownOptions = isSales ? salesDropdown : sampleDropdown;
  const dropdownLoading = isSales ? salesDropdownLoading : sampleDropdownLoading;
  const dropdownError = isSales ? salesDropdownError : sampleDropdownError;
  const dropdownLoadError = isSales ? salesDropdownLoadError : sampleDropdownLoadError;

  const activeReturn = isSales ? salesReturnDetail : sampleReturnDetail;
  const returnDetailLoading = isSales ? salesDetailLoading : sampleDetailLoading;
  const returnDetailError = isSales ? salesDetailError : sampleDetailError;
  const returnDetailLoadError = isSales ? salesDetailLoadError : sampleDetailLoadError;

  useEffect(() => {
    if (isEdit) return;
    setGrnNo(previewNumber || "");
  }, [isEdit, previewNumber]);

  useEffect(() => {
    if (!isEdit || !existingGrn || hydratedEdit) return;
    if (existingGrn.status === "qc_completed") return;

    setGrnNo(existingGrn.grnNo || "");
    setGrnDate(existingGrn.grnDate || new Date().toISOString().slice(0, 10));
    setWarehouseId(existingGrn.warehouseUuid || "");
    setWarehouseName(existingGrn.warehouse || "");
    setSelectedReturnId(existingGrn.sourceId || "");
    setRemarks(existingGrn.receiptRemarks || "");

    const matchedBatches = existingGrn.batches;
    setLines(
      existingGrn.items.map((item) => {
        const batch =
          matchedBatches.find(
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
          sourceItemId: item.sourceItemId || "",
          productId: item.productId,
          sku: item.productCode || "",
          productName: item.productName,
          unit: item.unit || "Unit",
          batchNo: batch?.batchNumber || item.batchNumber || "",
          mfgDate: batch?.mfgDate || item.mfgDate || "",
          expDate: batch?.expDate || item.expDate || "",
          maxQty: item.orderedQty || item.receivedQty,
          previousReceivedQty: item.alreadyReceivedQty || 0,
          receivedQty,
          displayQty,
          quantityType,
          caseSize,
          batchLocked: Boolean(batch?.batchNumber || item.batchNumber),
          productSnapshot: enrichGrnProductSnapshot(
            {
              product_id: item.productId,
              product_code: item.productCode,
              product_name: item.productName,
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
  }, [isEdit, existingGrn, hydratedEdit]);

  useEffect(() => {
    if (isEdit || !activeReturn) {
      if (!isEdit && !selectedReturnId) {
        setWarehouseId("");
        setWarehouseName("");
        setLines([]);
      }
      return;
    }

    setWarehouseId(activeReturn.warehouseId || "");
    setWarehouseName(activeReturn.warehouseName || "");

    if (!activeReturn.items.length) {
      setLines([]);
      return;
    }

    setLines(
      activeReturn.items
        .map((item): LineInputState | null => {
          const caseSize = item.unitPerPacking > 0 ? item.unitPerPacking : 1;
          const quantityType = resolveGrnQuantityType(item.quantityType);
          const previousReceivedQty = Math.max(0, round2(item.receivedBaseQty || 0));
          const maxQty = Math.max(0, round2(item.returnedBaseQty));
          const remaining = Math.max(0, round2(maxQty - previousReceivedQty));
          if (remaining <= 0) return null;
          const receivedQty = remaining;
          const displayQty = round2(
            fromBaseQuantity({
              baseQty: receivedQty,
              quantityType,
              packingSize: caseSize,
            }),
          );
          return {
            sourceItemId: item.id,
            productId: item.productId,
            sku: item.sku || item.productCode,
            productName: item.productName,
            unit: item.unit || "Unit",
            batchNo: item.batchNumber || "",
            mfgDate: item.mfgDate || "",
            expDate: item.expDate || "",
            maxQty,
            previousReceivedQty,
            receivedQty,
            displayQty,
            quantityType,
            caseSize,
            batchLocked: Boolean(item.batchNumber),
            productSnapshot: enrichGrnProductSnapshot(item.productSnapshot, {
              unitPerPacking: caseSize,
              unit: item.unit || "Unit",
            }),
          };
        })
        .filter((line): line is LineInputState => line != null),
    );
    setFieldErrors((prev) => ({ ...prev, selectedReturnId: undefined, lines: undefined }));
  }, [isEdit, activeReturn, selectedReturnId]);

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
    if (!selectedReturnId) {
      next.selectedReturnId = `${returnLabel} is required.`;
    }
    if (!warehouseId) {
      next.warehouseId = "Warehouse is required. Select a return with a valid warehouse.";
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
    if (!activeReturn && !isEdit) {
      setFormError(`Unable to load ${returnLabel.toLowerCase()} details.`);
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

    const returnNumber =
      activeReturn?.returnNumber ||
      (isSales ? existingGrn?.salesReturnNo : existingGrn?.sampleReturnNo) ||
      "RETURN";
    const invoiceNumber = returnNumber;
    const invoiceDate = grnDate;
    const receivedLines = lines.filter((line) => line.receivedQty > 0);

    const payloadItems = receivedLines.map((line) => ({
      source_item_id: line.sourceItemId,
      ordered_base_qty: line.maxQty,
      previous_received_base_qty: line.previousReceivedQty,
      current_received_base_qty: line.receivedQty,
      pending_base_qty: Math.max(0, round2(line.maxQty - line.previousReceivedQty - line.receivedQty)),
      quantity_type: line.quantityType,
      productSnapshot: {
        ...line.productSnapshot,
        product_id: line.productId,
        product_code: line.sku,
        product_name: line.productName,
        base_unit: line.unit,
        unit_per_packing: line.caseSize || 1,
      },
      batches: [
        {
          batchNumber: line.batchNo.trim(),
          invoiceNumber,
          manufactureDate: line.mfgDate || null,
          expiryDate: line.expDate || null,
          quantity_base_qty: line.receivedQty,
          rate: null,
          gst: null,
          gstAmount: null,
        },
      ],
    }));

    try {
      setIsSubmitting(true);
      setFormError(null);

      if (isEdit && grnId) {
        const updatePayload: UpdateGrnPayload = {
          supplierId: null,
          warehouseId,
          grnDate,
          remarks: remarks.trim() || null,
          items: payloadItems,
          invoices: [{ invoiceNumber, invoiceDate }],
        };
        await updateGrnMutation.mutateAsync({ id: grnId, input: updatePayload });
        setPartialConfirmOpen(false);
        setPartialProducts([]);
        showToast("GRN updated successfully.", "success");
        router.push(`${basePath}/${grnId}`);
      } else {
        const payload: CreateGrnPayload = {
          source_id: selectedReturnId,
          source_type: sourceType,
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
          // Fall through to the original error if preview refresh fails.
        }
      }

      setFormError(message);
      showToast(message, "error");
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectOptions = useMemo(() => {
    const options = dropdownOptions.map((row) => ({
      value: row.id,
      label: row.returnNumber,
      sublabel: `${row.customerName || "—"}${row.itemCount ? ` — ${row.itemCount} item(s)` : ""}`,
    }));

    if (
      selectedReturnId &&
      !options.some((o) => o.value === selectedReturnId)
    ) {
      const label =
        (isSales ? existingGrn?.salesReturnNo : existingGrn?.sampleReturnNo) ||
        activeReturn?.returnNumber ||
        selectedReturnId;
      options.unshift({
        value: selectedReturnId,
        label,
        sublabel: existingGrn?.customerName || activeReturn?.customerName || "",
      });
    }
    return options;
  }, [
    dropdownOptions,
    selectedReturnId,
    isSales,
    existingGrn,
    activeReturn,
  ]);

  const isBusy =
    isSubmitting || createGrnMutation.isPending || updateGrnMutation.isPending;
  const backHref = isEdit && grnId ? `${basePath}/${grnId}` : basePath;

  if (isEdit && grnLoading) {
    return (
      <FormContainer
        title={`Edit ${returnLabel} GRN`}
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
        title={`Edit ${returnLabel} GRN`}
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
        title={`Edit ${returnLabel} GRN`}
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

  return (
    <FormContainer
      title={isEdit ? `Edit ${returnLabel} GRN` : `Create ${returnLabel} GRN`}
      description={
        isEdit
          ? `Update receipt quantities and batch details for this ${returnLabel.toLowerCase()} GRN.`
          : `Record receipt of returned stock from ${returnLabel.toLowerCase()} documents.`
      }
      onBack={() => router.push(backHref)}
      onCancel={() => router.push(backHref)}
      actions={
        <Button
          className="h-9 text-xs font-semibold bg-brand-600 hover:bg-brand-700 text-white rounded-lg gap-1.5"
          onClick={() => {
            void handleSave();
          }}
          disabled={isBusy || returnDetailLoading}
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
        {(formError ||
          previewError ||
          dropdownError ||
          returnDetailError) && (
          <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            {formError ||
              getErrorMessage(previewLoadError, "Failed to load GRN number.") ||
              getErrorMessage(dropdownLoadError, `Failed to load ${returnLabel.toLowerCase()} list.`) ||
              getErrorMessage(
                returnDetailLoadError,
                `Failed to load ${returnLabel.toLowerCase()} details.`,
              )}
          </div>
        )}

        <SectionCard
          title="General Information"
          description={`Select ${returnLabel.toLowerCase()} first. Destination warehouse and customer populate automatically.`}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            <TextField
              label="GRN Number"
              value={previewLoading && !isEdit && !grnNo ? "" : grnNo}
              placeholder={GRN_NUMBER_PLACEHOLDER}
              readOnly
              className={READONLY_GRN_NO_CLASS}
            />

            <Field label={`Select ${returnLabel}`} required error={fieldErrors.selectedReturnId}>
              <AutocompleteSelect
                options={selectOptions}
                value={selectedReturnId}
                onChange={(val) => {
                  setSelectedReturnId(val as string);
                  setFieldErrors((prev) => ({ ...prev, selectedReturnId: undefined }));
                }}
                placeholder={dropdownLoading ? "Loading…" : `Select ${returnLabel.toLowerCase()}…`}
                searchPlaceholder={`Search ${returnLabel.toLowerCase()}…`}
                disabled={isEdit || dropdownLoading}
                className="h-9 text-xs py-1.5 px-3 rounded-lg border-border focus:ring-1 focus:ring-brand-500 bg-white shadow-none focus:outline-none"
              />
            </Field>

            <TextField
              label="Customer"
              value={
                activeReturn?.customerName ||
                existingGrn?.customerName ||
                (selectedReturnId && returnDetailLoading ? "Loading…" : "")
              }
              placeholder="—"
              readOnly
              className={READONLY_FIELD_CLASS}
            />

            <TextField
              label="Warehouse Destination"
              value={warehouseName || (returnDetailLoading ? "Loading…" : "")}
              placeholder="Auto-populated from return…"
              readOnly
              className={READONLY_FIELD_CLASS}
              error={fieldErrors.warehouseId}
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

        {selectedReturnId && returnDetailLoading && !isEdit && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
            <Loader2 className="w-4 h-4 animate-spin" />
            Loading return items…
          </div>
        )}

        {selectedReturnId && !returnDetailLoading && lines.length === 0 && !returnDetailError && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
            This return has no products to receive.
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
                        Returned
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
                      const returnedStack = stackGrnLineQty(line.maxQty, stackOpts);
                      const prevStack = stackGrnLineQty(line.previousReceivedQty, stackOpts);
                      const remainingStack = stackGrnLineQty(
                        Math.max(0, line.maxQty - line.previousReceivedQty),
                        stackOpts,
                      );
                      const receivedStack = stackGrnLineQty(line.receivedQty, stackOpts);
                      const lineError = fieldErrors.lines?.[idx];

                      return (
                        <tr key={line.sourceItemId || idx} className="border-b border-border/50 align-top">
                          <td className="px-3 py-2">
                            <ProductSkuCell name={line.productName} sku={line.sku} />
                            {lineError && (
                              <p className="text-[10px] text-red-600 mt-1">{lineError}</p>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {line.batchLocked ? (
                              <span className="inline-block text-[10px] font-mono font-semibold bg-brand-50 text-brand-700 px-2 py-0.5 rounded border border-brand-100">
                                {line.batchNo || "—"}
                              </span>
                            ) : (
                              <Input
                                value={line.batchNo}
                                onChange={(e) =>
                                  updateLineField(idx, "batchNo", e.target.value)
                                }
                                placeholder="Batch no."
                                className={cn(
                                  "h-9 text-xs font-mono",
                                  lineError?.includes("Batch") && "border-red-500",
                                )}
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
                            <StackedQtyCell stack={returnedStack} empty={!(line.maxQty > 0)} />
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
                            {line.receivedQty > 0 ? formatStackNum(receivedStack.unitQty) : "0"}
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
          description="Add any relevant notes or details about the return receipt."
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
