"use client";

import React, { useMemo, useRef } from "react";
import { AlertCircle, Download, Eye, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { cn } from "@/lib/utils";
import {
  CURRENT_USER,
  DEPARTMENT_OPTIONS,
  // PR_PRIORITY_OPTIONS, // Priority UI removed — restore with Priority dropdown if needed
} from "@/lib/procurement/config";
import {
  calcPackingToBaseQty,
  enrichProductFromDropdown,
  type PackagingUom,
} from "@/lib/procurement/procurement-line-utils";
import {
  enrichPRLineItem,
  type PRAttachment,
  type PRLineItem,
  type PurchaseRequest,
} from "../pr-data";
import type { PRPriority } from "@/lib/procurement/config";
import { ProductItemDetailsSection } from "@/components/procurement/ProductItemDetailsSection";
import { useProductDropdown } from "@/hooks/masters/use-products";
import { useWarehouseDropdown } from "@/hooks/masters/use-warehouses";
import type { ProductDropdownItem } from "@/services/product-dropdown.service";
import {
  downloadPrAttachment,
  resolvePrAttachmentUrl,
} from "@/services/purchase-request.service";
import {
  type PRFormErrors,
  type PRFormFieldKey,
} from "./pr-form-validation";

/** Same state list as Purchase Order form. */
const INDIAN_STATES = [
  "Maharashtra",
  "Gujarat",
  "Karnataka",
  "Tamil Nadu",
  "Delhi",
  "Telangana",
  "Uttar Pradesh",
  "West Bengal",
  "Rajasthan",
  "Madhya Pradesh",
  "Punjab",
  "Haryana",
  "Bihar",
  "Kerala",
  "Andhra Pradesh",
];

export interface PRFormValues {
  prDate: string;
  requestedById: string;
  requestedBy: string;
  department: string;
  priority: PRPriority;
  state: string;
  warehouseId: string | null;
  warehouseName: string;
  requiredByDate: string;
  purpose: string;
  remarks: string;
  lines: PRLineItem[];
  attachmentFiles: File[];
  existingAttachments: Array<PRAttachment & { url?: string }>;
}

export function prToFormValues(pr: PurchaseRequest): PRFormValues {
  return {
    prDate: pr.prDate,
    requestedById: "",
    requestedBy: pr.requestedBy,
    department: pr.department,
    priority: pr.priority,
    state: pr.state,
    warehouseId: pr.warehouseId != null ? String(pr.warehouseId) : null,
    warehouseName: pr.warehouseName,
    requiredByDate: pr.requiredByDate,
    purpose: pr.purpose,
    remarks: pr.remarks,
    lines: pr.lines.map((l) => enrichPRLineItem({ ...l })),
    attachmentFiles: [],
    existingAttachments: [...pr.attachments],
  };
}

export function emptyPRLine(): PRLineItem {
  return {
    uid: `line-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    productId: 0,
    productCode: "",
    productName: "",
    description: "",
    sku: "",
    baseUnit: "Unit",
    packagingUnit: "Box",
    conversionQty: 1,
    requestUom: "Unit",
    requestedQty: 1,
    totalQtyBase: 1,
    segment: "",
    category: "",
    hsnCode: "",
    mrp: 0,
    ratePerSku: 0,
    uom: "Unit",
    remarks: "",
  };
}

export const DEFAULT_PR_FORM: PRFormValues = {
  prDate: new Date().toISOString().slice(0, 10),
  requestedById: "",
  requestedBy: CURRENT_USER,
  department: "procurement",
  priority: "medium",
  state: "Maharashtra",
  warehouseId: null,
  warehouseName: "",
  requiredByDate: "",
  purpose: "",
  remarks: "",
  lines: [],
  attachmentFiles: [],
  existingAttachments: [],
};

export function defaultPRForm(opts?: {
  requestedById?: string;
  requestedBy?: string;
}): PRFormValues {
  return {
    ...DEFAULT_PR_FORM,
    requestedById: opts?.requestedById ?? "",
    requestedBy: opts?.requestedBy ?? CURRENT_USER,
  };
}

function SectionHead({
  label,
  sub,
  required,
}: {
  label: string;
  sub?: string;
  required?: boolean;
}) {
  return (
    <div className="mb-1.5 pb-1.5 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-muted-foreground">{sub}</p>
      )}
    </div>
  );
}

function FieldLabel({
  children,
  required,
  htmlFor,
}: {
  children: React.ReactNode;
  required?: boolean;
  htmlFor?: string;
}) {
  return (
    <Label htmlFor={htmlFor} className="text-xs font-medium">
      {children}
      {required && <span className="text-red-500 ml-0.5">*</span>}
    </Label>
  );
}

function FieldError({ id, msg }: { id: string; msg?: string }) {
  return (
    <p
      id={id}
      role={msg ? "alert" : undefined}
      className="mt-1 min-h-[16px] flex items-start gap-1 text-[11px] leading-4 text-red-500"
    >
      {msg ? (
        <>
          <AlertCircle className="mt-0.5 h-3 w-3 flex-shrink-0" aria-hidden />
          <span>{msg}</span>
        </>
      ) : null}
    </p>
  );
}

const inputCls = "h-8 rounded-lg text-xs";
const readOnlyCls = cn(inputCls, "bg-muted/30 text-foreground");
const errorInputCls = "border-red-400 focus-visible:ring-red-300";

function ReadOnlyField({ value }: { value: string }) {
  return <Input value={value || "—"} readOnly className={readOnlyCls} />;
}

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

function packagingUnitToRequestUom(packagingUnit: string): PackagingUom {
  const norm = packagingUnit.toLowerCase();
  if (norm.includes("case")) return "Case";
  if (norm.includes("box")) return "Box";
  if (norm.includes("carton")) return "Carton";
  return "Unit";
}

function lineFromProduct(
  productId: string,
  packingQty: number,
  remarks: string,
  dbProducts?: ProductDropdownItem[],
): PRLineItem | null {
  const info = enrichProductFromDropdown(productId, dbProducts);
  if (!info) return null;
  const requestedQty = packingQty;
  const requestUom = packagingUnitToRequestUom(info.packagingUnit);
  return {
    ...emptyPRLine(),
    productId: info.productId,
    productCode: info.productCode,
    productName: info.productName,
    description: info.description,
    sku: info.sku,
    baseUnit: info.baseUnit,
    packagingUnit: info.packagingUnit,
    conversionQty: info.conversionQty,
    requestUom,
    requestedQty,
    totalQtyBase: calcPackingToBaseQty(requestedQty, info.conversionQty),
    segment: info.segment,
    category: info.category,
    hsnCode: info.hsnCode,
    mrp: info.mrp,
    ratePerSku: info.ratePerSku,
    uom: requestUom,
    remarks,
    packSize: info.packSize,
    netWeightPerPack: info.netWeightPerPack,
    weightUom: info.weightUom,
  };
}

export function PurchaseRequestForm({
  form,
  onChange,
  readOnly,
  prNumber = "",
  errors = {},
  onClearError,
  onFieldBlur,
}: {
  form: PRFormValues;
  onChange: (f: PRFormValues) => void;
  readOnly?: boolean;
  prNumber?: string;
  errors?: PRFormErrors;
  onClearError?: (key: string) => void;
  onFieldBlur?: (field: PRFormFieldKey) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const { data: dbProducts } = useProductDropdown();
  const { data: dbWarehouses } = useWarehouseDropdown(form.state || undefined);

  const productOptions = useMemo(
    () =>
      (dbProducts ?? []).map((p) => ({
        value: p.product_id,
        label: `${p.product_name} (${p.sku || p.product_code || p.product_id})`,
      })),
    [dbProducts],
  );

  const stateOptions = useMemo(
    () => INDIAN_STATES.map((s) => ({ value: s, label: s })),
    [],
  );

  const warehouseOptions = useMemo(
    () =>
      (dbWarehouses ?? []).map((w) => ({
        value: String(w.warehouse_id),
        label: w.warehouse_name,
      })),
    [dbWarehouses],
  );

  const clearErr = (key: string) => onClearError?.(key);

  const set = <K extends keyof PRFormValues>(k: K, v: PRFormValues[K]) => {
    onChange({ ...form, [k]: v });
    if (
      k === "prDate" ||
      k === "department" ||
      k === "priority" ||
      k === "requiredByDate" ||
      k === "state" ||
      k === "warehouseId"
    ) {
      clearErr(k);
    }
    if (k === "lines") clearErr("lines");
  };

  const onStateChange = (state: string) => {
    onChange({
      ...form,
      state,
      warehouseId: null,
      warehouseName: "",
    });
    clearErr("state");
    clearErr("warehouseId");
  };

  const onWarehouseChange = (val: string) => {
    const wh =
      (dbWarehouses || []).find((w) => String(w.warehouse_id) === val) ?? null;
    onChange({
      ...form,
      warehouseId: wh ? String(wh.warehouse_id) : null,
      warehouseName: wh?.warehouse_name || "",
      state: wh?.state || form.state || "",
    });
    clearErr("warehouseId");
    if (wh?.state) clearErr("state");
  };

  const blurField = (field: PRFormFieldKey) => onFieldBlur?.(field);

  const onAddItem = (productIds: string[], qty: number, remarks: string) => {
    let nextLines = [...form.lines];
    for (const productId of Array.from(new Set(productIds))) {
      const line = lineFromProduct(productId, qty, remarks, dbProducts);
      if (!line) continue;
      const idx = nextLines.findIndex(
        (l) => String(l.productId) === String(productId),
      );
      if (idx >= 0) {
        const existing = nextLines[idx];
        const nextPackingQty = existing.requestedQty + qty;
        nextLines[idx] = {
          ...existing,
          requestedQty: nextPackingQty,
          totalQtyBase: calcPackingToBaseQty(
            nextPackingQty,
            existing.conversionQty,
          ),
          remarks: remarks || existing.remarks,
        };
      } else {
        nextLines.push({ ...line, uid: emptyPRLine().uid });
      }
    }
    onChange({ ...form, lines: nextLines });
    clearErr("lines");
  };

  const onRemoveItem = (uid: string) => {
    onChange({ ...form, lines: form.lines.filter((l) => l.uid !== uid) });
    clearErr("lines");
    clearErr(`lineQty:${uid}`);
  };

  const onUpdateItem = (uid: string, patch: Partial<PRLineItem>) => {
    onChange({
      ...form,
      lines: form.lines.map((l) => {
        if (l.uid !== uid) return l;
        const next = { ...l, ...patch };
        next.totalQtyBase = calcPackingToBaseQty(
          next.requestedQty,
          next.conversionQty,
        );
        next.uom = next.requestUom;
        return next;
      }),
    });
    if (patch.requestedQty !== undefined) clearErr(`lineQty:${uid}`);
    clearErr("lines");
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    onChange({
      ...form,
      attachmentFiles: [...form.attachmentFiles, file],
    });
    e.target.value = "";
  };

  const departmentLabel =
    DEPARTMENT_OPTIONS.find((d) => d.value === form.department)?.label ??
    form.department;
  // Priority UI removed — restore with Priority dropdown if needed
  // const priorityLabel =
  //   PR_PRIORITY_OPTIONS.find((p) => p.value === form.priority)?.label ??
  //   form.priority;

  const hasAttachments =
    form.existingAttachments.length > 0 || form.attachmentFiles.length > 0;

  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white p-4 shadow-sm",
        readOnly && "w-full",
      )}
    >
      <div className="space-y-3">
        <div>
          <SectionHead
            label="Request Details"
            sub="Core purchase request information and required timeline."
          />
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-4">
            <div className="space-y-1">
              <FieldLabel>PR No.</FieldLabel>
              <Input
                value={prNumber || "Auto-generated"}
                readOnly
                className={cn(
                  inputCls,
                  "bg-muted/30 font-mono text-muted-foreground",
                )}
              />
              <FieldError id="pr-err-prNo" />
            </div>
            <div className="space-y-1">
              <FieldLabel required htmlFor="pr-prDate">
                PR Date
              </FieldLabel>
              {readOnly ? (
                <ReadOnlyField value={formatDisplayDate(form.prDate)} />
              ) : (
                <Input
                  id="pr-prDate"
                  type="date"
                  data-pr-field="prDate"
                  value={form.prDate}
                  onChange={(e) => set("prDate", e.target.value)}
                  onBlur={() => blurField("prDate")}
                  aria-invalid={Boolean(errors.prDate)}
                  aria-describedby="pr-err-prDate"
                  className={cn(inputCls, errors.prDate && errorInputCls)}
                />
              )}
              <FieldError id="pr-err-prDate" msg={errors.prDate} />
            </div>
            <div className="space-y-1">
              <FieldLabel>Requested By</FieldLabel>
              <Input
                value={form.requestedBy}
                readOnly
                className={cn(inputCls, "bg-muted/30 text-muted-foreground")}
              />
              <FieldError id="pr-err-requestedBy" />
            </div>
            <div className="space-y-1">
              <FieldLabel required>Department</FieldLabel>
              {readOnly ? (
                <ReadOnlyField value={departmentLabel} />
              ) : (
                <AutocompleteSelect
                  options={DEPARTMENT_OPTIONS.map((d) => ({
                    value: d.value,
                    label: d.label,
                  }))}
                  value={form.department}
                  onChange={(v) => set("department", String(v))}
                  onBlur={() => blurField("department")}
                  placeholder="Select department"
                  error={Boolean(errors.department)}
                  aria-invalid={Boolean(errors.department)}
                  aria-describedby="pr-err-department"
                  data-pr-field="department"
                  className={cn(inputCls, errors.department && errorInputCls)}
                />
              )}
              <FieldError id="pr-err-department" msg={errors.department} />
            </div>
            {/* Priority dropdown removed from UI — backend field retained.
            <div className="space-y-1">
              <FieldLabel required>Priority</FieldLabel>
              {readOnly ? (
                <ReadOnlyField value={priorityLabel} />
              ) : (
                <AutocompleteSelect
                  options={PR_PRIORITY_OPTIONS.map((p) => ({
                    value: p.value,
                    label: p.label,
                  }))}
                  value={form.priority}
                  onChange={(v) => set("priority", v as PRPriority)}
                  onBlur={() => blurField("priority")}
                  placeholder="Select priority"
                  error={Boolean(errors.priority)}
                  aria-invalid={Boolean(errors.priority)}
                  aria-describedby="pr-err-priority"
                  data-pr-field="priority"
                  className={cn(inputCls, errors.priority && errorInputCls)}
                />
              )}
              <FieldError id="pr-err-priority" msg={errors.priority} />
            </div>
            */}
            <div className="space-y-1" data-pr-field="state">
              <FieldLabel required>State</FieldLabel>
              {readOnly ? (
                <ReadOnlyField value={form.state} />
              ) : (
                <AutocompleteSelect
                  options={stateOptions}
                  value={form.state}
                  onChange={(v) => onStateChange(String(v))}
                  onBlur={() => blurField("state")}
                  placeholder="Select state"
                  error={Boolean(errors.state)}
                  aria-invalid={Boolean(errors.state)}
                  aria-describedby="pr-err-state"
                  className={cn(inputCls, errors.state && errorInputCls)}
                />
              )}
              <FieldError id="pr-err-state" msg={errors.state} />
            </div>
            <div className="space-y-1" data-pr-field="warehouseId">
              <FieldLabel required>Warehouse</FieldLabel>
              {readOnly ? (
                <ReadOnlyField value={form.warehouseName} />
              ) : (
                <AutocompleteSelect
                  options={warehouseOptions}
                  value={form.warehouseId ? String(form.warehouseId) : ""}
                  onChange={(v) => onWarehouseChange(String(v))}
                  onBlur={() => blurField("warehouseId")}
                  placeholder="Select warehouse"
                  error={Boolean(errors.warehouseId)}
                  aria-invalid={Boolean(errors.warehouseId)}
                  aria-describedby="pr-err-warehouseId"
                  className={cn(inputCls, errors.warehouseId && errorInputCls)}
                />
              )}
              <FieldError id="pr-err-warehouseId" msg={errors.warehouseId} />
            </div>
            <div className="space-y-1">
              <FieldLabel required htmlFor="pr-requiredByDate">
                Required By Date
              </FieldLabel>
              {readOnly ? (
                <ReadOnlyField value={formatDisplayDate(form.requiredByDate)} />
              ) : (
                <Input
                  id="pr-requiredByDate"
                  type="date"
                  data-pr-field="requiredByDate"
                  value={form.requiredByDate}
                  onChange={(e) => set("requiredByDate", e.target.value)}
                  onBlur={() => blurField("requiredByDate")}
                  aria-invalid={Boolean(errors.requiredByDate)}
                  aria-describedby="pr-err-requiredByDate"
                  className={cn(inputCls, errors.requiredByDate && errorInputCls)}
                />
              )}
              <FieldError id="pr-err-requiredByDate" msg={errors.requiredByDate} />
            </div>
          </div>
          <div className="mt-2 space-y-1">
            <Label className="text-xs font-medium">Purpose / Justification</Label>
            <Textarea
              rows={2}
              readOnly={readOnly}
              value={form.purpose}
              onChange={(e) => set("purpose", e.target.value)}
              placeholder="Business justification for this purchase request..."
              className={cn(
                "min-h-[60px] rounded-lg text-xs",
                readOnly && "bg-muted/30 resize-none",
              )}
            />
          </div>
        </div>

        <div data-pr-field="lines">
          <ProductItemDetailsSection
            mode="purchase_request"
            products={productOptions}
            items={form.lines}
            onAddItem={onAddItem}
            onRemoveItem={onRemoveItem}
            onUpdateItem={onUpdateItem}
            readOnly={readOnly}
            title="Product Details"
            description="Qty in Case is entered; Qty in Unit and Qty in Kg/Ltr are auto-calculated from product master."
            addButtonLabel="Add Product"
            sectionRequired
          />
          <FieldError
            id="pr-err-lines"
            msg={
              errors.lines ||
              Object.entries(errors).find(([k]) => k.startsWith("lineQty:"))?.[1]
            }
          />
        </div>

        <div className="border-t border-border/60 pt-3">
          <SectionHead
            label="Remarks & Attachments"
            sub={
              readOnly
                ? undefined
                : "Additional notes and supporting documents."
            }
          />
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <div>
              {!readOnly && (
                <p className="mb-1.5 text-xs font-medium text-foreground">
                  Remarks
                </p>
              )}
              <Textarea
                rows={4}
                readOnly={readOnly}
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Optional remarks..."
                className={cn(
                  "min-h-[90px] rounded-lg text-xs",
                  readOnly && "bg-muted/30 resize-none",
                )}
              />
            </div>
            <div className="rounded-xl border border-border bg-muted/10 p-2.5">
              {!readOnly && (
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-medium text-foreground">
                    Attachments
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-8 gap-1.5 rounded-lg text-[11px] font-semibold"
                    onClick={() => fileRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" /> Add File
                  </Button>
                </div>
              )}
              {readOnly && (
                <p className="mb-2 text-xs font-medium text-foreground">
                  Attachments
                </p>
              )}
              {!readOnly && (
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  onChange={onFilePick}
                />
              )}
              {!hasAttachments ? (
                <p className="rounded-lg border border-dashed border-border px-3 py-3 text-center text-xs text-muted-foreground">
                  No attachments
                </p>
              ) : (
                <ul className="space-y-1.5">
                  {form.existingAttachments.map((a) => {
                    const resolvedUrl = resolvePrAttachmentUrl(a.url);
                    return (
                    <li
                      key={a.uid}
                      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {a.name}
                      </span>
                      <span className="text-muted-foreground">{a.size}</span>
                      {resolvedUrl ? (
                        <a
                          href={resolvedUrl}
                          target="_blank"
                          rel="noreferrer"
                          title="View"
                          className="text-muted-foreground hover:text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </a>
                      ) : (
                        <Eye className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      {resolvedUrl ? (
                        <button
                          type="button"
                          title="Download"
                          className="text-muted-foreground hover:text-foreground"
                          onClick={() => {
                            void downloadPrAttachment(resolvedUrl, a.name).catch(
                              () => {
                                window.open(
                                  resolvedUrl,
                                  "_blank",
                                  "noopener,noreferrer",
                                );
                              },
                            );
                          }}
                        >
                          <Download className="h-3.5 w-3.5" />
                        </button>
                      ) : (
                        <Download className="h-3.5 w-3.5 text-muted-foreground/40" />
                      )}
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...form,
                              existingAttachments:
                                form.existingAttachments.filter(
                                  (x) => x.uid !== a.uid,
                                ),
                            })
                          }
                          className="text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                    );
                  })}
                  {form.attachmentFiles.map((file, index) => (
                    <li
                      key={`new-${file.name}-${index}`}
                      className="flex items-center gap-2 rounded-lg border border-border px-2.5 py-2 text-xs"
                    >
                      <span className="min-w-0 flex-1 truncate text-foreground">
                        {file.name}
                      </span>
                      <span className="text-muted-foreground">
                        {`${Math.max(1, Math.round(file.size / 1024))} KB`}
                      </span>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...form,
                              attachmentFiles: form.attachmentFiles.filter(
                                (_, i) => i !== index,
                              ),
                            })
                          }
                          className="text-red-600"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
