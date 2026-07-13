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
  receivedQty: number;
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
  const [hydratedEdit, setHydratedEdit] = useState(false);

  const {
    data: previewNumber,
    isLoading: previewLoading,
    isError: previewError,
    error: previewLoadError,
  } = useGrnPreviewNumber(!isEdit);

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
  } = useSalesReturnDropdown(undefined, isSales && !isEdit);

  const {
    data: sampleDropdown = [],
    isLoading: sampleDropdownLoading,
    isError: sampleDropdownError,
    error: sampleDropdownLoadError,
  } = useSampleReturnDropdown(undefined, !isSales && !isEdit);

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
    if (!isEdit && previewNumber) {
      setGrnNo(previewNumber);
    }
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
          receivedQty: item.receivedQty,
          caseSize: item.unitPerPacking || 1,
          batchLocked: Boolean(batch?.batchNumber || item.batchNumber),
          productSnapshot: {
            product_id: item.productId,
            product_code: item.productCode,
            product_name: item.productName,
            base_unit: item.unit || "Unit",
          },
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
      activeReturn.items.map((item) => ({
        sourceItemId: item.id,
        productId: item.productId,
        sku: item.sku || item.productCode,
        productName: item.productName,
        unit: item.unit || "Unit",
        batchNo: item.batchNumber || "",
        mfgDate: item.mfgDate || "",
        expDate: item.expDate || "",
        maxQty: item.returnedBaseQty,
        previousReceivedQty: 0,
        receivedQty: item.returnedBaseQty,
        caseSize: item.unitPerPacking > 0 ? item.unitPerPacking : 1,
        batchLocked: Boolean(item.batchNumber),
        productSnapshot: item.productSnapshot,
      })),
    );
    setFieldErrors((prev) => ({ ...prev, selectedReturnId: undefined, lines: undefined }));
  }, [isEdit, activeReturn, selectedReturnId]);

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
    setFieldErrors((prev) => {
      if (!prev.lines?.[index]) return prev;
      const nextLines = { ...prev.lines };
      delete nextLines[index];
      return { ...prev, lines: nextLines };
    });
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
    }

    const lineErrors: Record<number, string> = {};
    let hasPositiveReceive = false;

    lines.forEach((line, idx) => {
      if (line.receivedQty > 0) hasPositiveReceive = true;
      if (line.receivedQty < 0) {
        lineErrors[idx] = "Received quantity cannot be negative.";
        return;
      }
      if (line.receivedQty > line.maxQty) {
        lineErrors[idx] = `Received qty exceeds returned qty (${line.maxQty}).`;
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
    if (!activeReturn && !isEdit) {
      setFormError(`Unable to load ${returnLabel.toLowerCase()} details.`);
      return;
    }

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
      productSnapshot: {
        ...line.productSnapshot,
        product_id: line.productId,
        product_code: line.sku,
        product_name: line.productName,
        base_unit: line.unit,
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
        router.push(`${basePath}/${grnId}`);
      } else {
        const payload: CreateGrnPayload = {
          grnNumber: grnNo || null,
          source_id: selectedReturnId,
          source_type: sourceType,
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
      setFormError(
        getErrorMessage(
          err,
          isEdit ? "Failed to update GRN." : "Failed to create GRN.",
        ),
      );
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
          onClick={handleSave}
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
          description={`Select ${returnLabel.toLowerCase()} first. Destination warehouse populates automatically.`}
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

            <Field
              label="Warehouse Destination (Read-only)"
              required
              error={fieldErrors.warehouseId}
            >
              <Input
                value={warehouseName || (returnDetailLoading ? "Loading…" : "")}
                readOnly
                placeholder="Auto-populated from return…"
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

          {(activeReturn?.customerName || existingGrn?.customerName) && (
            <p className="text-[11px] text-muted-foreground">
              Customer:{" "}
              <span className="font-medium text-foreground">
                {activeReturn?.customerName || existingGrn?.customerName}
              </span>
            </p>
          )}
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
            description="Enter received quantities. Batch details are required for each received line."
          >
            <div className="border border-border rounded-xl overflow-hidden bg-white shadow-xs">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-[1100px]">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground min-w-[200px]">
                        Product & SKU
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">
                        Batch No.
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">
                        MFG Date
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground w-36">
                        Expiry Date
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-24">
                        Case Size
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-24">
                        Returned
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-28">
                        Received Qty (Pcs)
                      </th>
                      <th className="p-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground text-center w-36">
                        Case Breakdown
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {lines.map((line, idx) => {
                      const caseSize = line.caseSize > 0 ? line.caseSize : 1;
                      const cases = Math.floor(line.receivedQty / caseSize);
                      const loose = line.receivedQty % caseSize;
                      const breakdownText =
                        cases > 0
                          ? `${cases} Case${cases > 1 ? "s" : ""} + ${loose} Loose`
                          : `${loose} Loose`;
                      const lineError = fieldErrors.lines?.[idx];

                      return (
                        <tr key={line.sourceItemId || idx} className="hover:bg-muted/10 align-top">
                          <td className="p-3">
                            <p className="text-xs font-semibold text-foreground">
                              {line.productName}
                            </p>
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
                                  "h-8 text-xs font-mono",
                                  lineError?.includes("Batch") && "border-red-500",
                                )}
                              />
                            )}
                          </td>
                          <td className="p-3">
                            {line.batchLocked && line.mfgDate ? (
                              <span className="text-xs text-muted-foreground">{line.mfgDate}</span>
                            ) : (
                              <Input
                                type="date"
                                value={line.mfgDate}
                                onChange={(e) =>
                                  updateLineField(idx, "mfgDate", e.target.value)
                                }
                                className={cn(
                                  "h-8 text-xs",
                                  lineError?.includes("MFG") && "border-red-500",
                                )}
                              />
                            )}
                          </td>
                          <td className="p-3">
                            {line.batchLocked && line.expDate ? (
                              <span className="text-xs text-muted-foreground">{line.expDate}</span>
                            ) : (
                              <Input
                                type="date"
                                value={line.expDate}
                                onChange={(e) =>
                                  updateLineField(idx, "expDate", e.target.value)
                                }
                                className={cn(
                                  "h-8 text-xs",
                                  lineError?.includes("Expiry") && "border-red-500",
                                )}
                              />
                            )}
                          </td>
                          <td className="p-3 text-center text-xs font-medium text-muted-foreground tabular-nums">
                            {caseSize}
                          </td>
                          <td className="p-3 text-center text-xs font-medium tabular-nums">
                            {line.maxQty}
                          </td>
                          <td className="p-3">
                            <div className="flex justify-center">
                              <Input
                                type="number"
                                min={0}
                                max={line.maxQty}
                                value={line.receivedQty || ""}
                                onChange={(e) =>
                                  updateLineField(
                                    idx,
                                    "receivedQty",
                                    Math.max(0, Number(e.target.value) || 0),
                                  )
                                }
                                className={cn(
                                  "h-8 text-center text-xs font-medium w-20 focus:ring-brand-500",
                                  line.receivedQty > line.maxQty &&
                                    "border-red-500 text-red-600 focus:ring-red-500",
                                )}
                              />
                            </div>
                            {line.receivedQty > line.maxQty && (
                              <span className="block text-[8px] text-red-500 font-semibold text-center mt-1">
                                Exceeds Return
                              </span>
                            )}
                          </td>
                          <td className="p-3">
                            <span className="text-[10px] font-semibold text-brand-700 bg-brand-50/50 border border-brand-100/80 px-2.5 py-1 rounded-lg block text-center min-w-[100px] leading-tight">
                              {breakdownText}
                            </span>
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
    </FormContainer>
  );
}
