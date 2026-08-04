import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import type { PRFormValues } from "@/app/(app)/procurement/purchase-requests/components/PurchaseRequestForm";
import type { PRAttachment, PRLineItem } from "@/app/(app)/procurement/purchase-requests/pr-data";
import type { PRPriority } from "@/lib/procurement/config";
import {
  mapBackendPoStatusToFrontend,
  mapBackendStatusToFrontend,
  mapFrontendStatusToBackend,
  type PRListStatus,
  type PRPoStatus,
} from "@/lib/procurement/pr-status";
import { calcPackingToBaseQty } from "@/lib/procurement/procurement-line-utils";

function asString(value: unknown): string {
  return typeof value === "string" ? value : value == null ? "" : String(value);
}

function asNumber(value: unknown): number {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

function asDateOnly(value: unknown): string {
  const raw = asString(value);
  if (!raw) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10);
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return "";
  return parsed.toISOString().slice(0, 10);
}

function toUuidOrNull(value: unknown): string | null {
  const raw = asString(value).trim();
  if (!raw) return null;
  const uuidRe =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRe.test(raw) ? raw : null;
}

function userDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  const full = `${first} ${last}`.trim();
  if (full) return full;
  return asString(record.username).trim();
}

function mapAttachments(raw: unknown): PRAttachment[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((row, index) => {
    const item = (row ?? {}) as Record<string, unknown>;
    const name = asString(item.file_name ?? item.name);
    const url = asString(item.file_url ?? item.url);
    return {
      uid: asString(item.uid) || `att-${index}-${name || "file"}`,
      name: name || "Attachment",
      size: asString(item.size) || "",
      uploadedAt: asDateOnly(item.uploaded_at ?? item.uploadedAt),
      uploadedBy: asString(item.uploaded_by ?? item.uploadedBy),
      url,
    } as PRAttachment & { url?: string };
  });
}

/** Prefer same-origin `/uploads/...` so Next rewrites proxy to the backend. */
export function resolvePrAttachmentUrl(path?: string | null): string {
  const raw = asString(path).trim();
  if (!raw) return "";
  if (raw.startsWith("data:") || raw.startsWith("blob:")) return raw;

  if (/^https?:\/\//i.test(raw)) {
    try {
      const parsed = new URL(raw);
      if (parsed.pathname.startsWith("/uploads/")) {
        return `${parsed.pathname}${parsed.search}`;
      }
      return raw;
    } catch {
      return raw;
    }
  }

  const normalized = raw.startsWith("/") ? raw : `/${raw}`;
  if (normalized.startsWith("/uploads/")) return normalized;
  if (normalized.includes("/uploads/")) {
    return normalized.slice(normalized.indexOf("/uploads/"));
  }
  return `/uploads/${normalized.replace(/^\//, "")}`;
}

export async function downloadPrAttachment(
  url: string,
  fileName?: string,
): Promise<void> {
  const resolved = resolvePrAttachmentUrl(url);
  if (!resolved) throw new Error("Attachment URL is missing.");

  let blob: Blob | null = null;
  try {
    const response = await fetch(resolved, { credentials: "same-origin" });
    if (response.ok) blob = await response.blob();
  } catch {
    blob = null;
  }

  if (!blob && resolved.startsWith("/uploads/")) {
    const apiBase = (
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api"
    ).trim();
    const origin = apiBase.replace(/\/api\/?$/, "").replace(/\/+$/, "");
    const fallback = await fetch(`${origin}${resolved}`, {
      credentials: "include",
    });
    if (!fallback.ok) throw new Error("Failed to download attachment.");
    blob = await fallback.blob();
  }

  if (!blob) throw new Error("Failed to download attachment.");

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = objectUrl;
  link.download = (fileName || "attachment").trim() || "attachment";
  link.rel = "noopener";
  link.style.display = "none";
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
}

function mapLine(raw: Record<string, unknown>, index: number): PRLineItem {
  const product =
    raw.product && typeof raw.product === "object" && !Array.isArray(raw.product)
      ? (raw.product as Record<string, unknown>)
      : {};
  const snapshot =
    raw.product_snapshot &&
    typeof raw.product_snapshot === "object" &&
    !Array.isArray(raw.product_snapshot)
      ? (raw.product_snapshot as Record<string, unknown>)
      : {};

  const productId =
    toUuidOrNull(raw.product_id) ??
    toUuidOrNull(product.product_id) ??
    asString(raw.product_id);
  const conversionQty =
    asNumber(product.unit_per_packing) ||
    asNumber(snapshot.unit_per_packing) ||
    1;
  const requestedQty = asNumber(raw.requested_qty) || 1;
  const baseQty =
    asNumber(raw.base_requested_qty) ||
    calcPackingToBaseQty(requestedQty, conversionQty);

  const productHsn =
    product.hsn && typeof product.hsn === "object" && !Array.isArray(product.hsn)
      ? (product.hsn as Record<string, unknown>)
      : {};
  const snapshotHsn =
    snapshot.hsn && typeof snapshot.hsn === "object" && !Array.isArray(snapshot.hsn)
      ? (snapshot.hsn as Record<string, unknown>)
      : {};

  const hsnCode = asString(
    productHsn.hsnCode ??
      productHsn.hsn_code ??
      product.hsn_code ??
      product.hsnCode ??
      snapshotHsn.hsnCode ??
      snapshotHsn.hsn_code ??
      snapshot.hsn_code ??
      snapshot.hsnCode,
  );

  const ratePerSku =
    asNumber(product.cost_price) || asNumber(snapshot.cost_price) || 0;

  return {
    uid: asString(raw.id) || `line-${index}`,
    productId: productId || 0,
    productCode: asString(
      product.product_code ?? snapshot.product_code ?? product.sku ?? snapshot.sku,
    ),
    productName: asString(
      product.product_name ?? snapshot.product_name,
    ),
    description: asString(product.scientific_name ?? snapshot.scientific_name),
    sku: asString(product.sku ?? snapshot.sku),
    baseUnit: asString(product.unit ?? snapshot.unit) || "Unit",
    packagingUnit:
      asString(product.packing_unit ?? snapshot.packing_unit) || "Box",
    conversionQty,
    requestUom: "Unit",
    requestedQty,
    totalQtyBase: baseQty,
    segment: "",
    category: "",
    hsnCode,
    mrp: asNumber(product.mrp) || asNumber(snapshot.mrp) || 0,
    ratePerSku,
    uom: "Unit",
    remarks: asString(raw.remarks),
  };
}

export interface PurchaseRequestDetail {
  id: string;
  prNumber: string;
  prDate: string;
  requestedById: string;
  requestedBy: string;
  requiredByDate: string;
  priority: string;
  remarks: string;
  status: PRListStatus;
  poStatus: PRPoStatus;
  currentApproverId: string;
  currentApprover: string;
  lines: PRLineItem[];
  existingAttachments: Array<PRAttachment & { url?: string }>;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

function assertSuccess(body: Record<string, unknown>, fallback: string): void {
  if (body.success === false) {
    throw new Error(asString(body.message) || fallback);
  }
}

export function mapDetail(raw: Record<string, unknown>): PurchaseRequestDetail {
  const items = Array.isArray(raw.items) ? raw.items : [];
  return {
    id: asString(raw.id),
    prNumber: asString(raw.pr_number),
    prDate: asDateOnly(raw.pr_date),
    requestedById: asString(raw.requested_by_id),
    requestedBy: userDisplayName(raw.requested_by),
    requiredByDate: asDateOnly(raw.required_by_date),
    priority: asString(raw.priority) || "medium",
    remarks: asString(raw.remarks),
    status: mapBackendStatusToFrontend(raw.status),
    poStatus: mapBackendPoStatusToFrontend(raw.po_status),
    currentApproverId: asString(raw.current_approver_id),
    currentApprover: userDisplayName(raw.current_approver),
    lines: items.map((row, i) =>
      mapLine((row ?? {}) as Record<string, unknown>, i),
    ),
    existingAttachments: mapAttachments(raw.attachement),
    createdBy: userDisplayName(raw.created_by_user),
    createdAt: asString(raw.created_at),
    updatedAt: asString(raw.updated_at),
  };
}

export function detailToFormValues(
  detail: PurchaseRequestDetail,
): PRFormValues {
  return {
    prDate: detail.prDate || new Date().toISOString().slice(0, 10),
    requestedById: detail.requestedById,
    requestedBy: detail.requestedBy,
    department: "procurement",
    priority: (detail.priority as PRPriority) || "medium",
    state: "Maharashtra",
    warehouseId: null,
    warehouseName: "",
    requiredByDate: detail.requiredByDate,
    purpose: "",
    remarks: detail.remarks,
    lines: detail.lines,
    attachmentFiles: [],
    existingAttachments: detail.existingAttachments,
  };
}

function buildRemarks(form: PRFormValues): string | null {
  const parts: string[] = [];
  if (form.purpose?.trim()) parts.push(`Purpose: ${form.purpose.trim()}`);
  if (form.department?.trim()) {
    parts.push(`Department: ${form.department.trim()}`);
  }
  if (form.remarks?.trim()) parts.push(form.remarks.trim());
  return parts.length ? parts.join("\n") : null;
}

function buildWriteBody(
  form: PRFormValues,
  options: { status: PRListStatus; state?: string },
): Record<string, unknown> {
  const backendStatus =
    mapFrontendStatusToBackend(options.status) ?? "Draft";

  return {
    status: backendStatus,
    requested_by_id: toUuidOrNull(form.requestedById),
    pr_date: form.prDate || null,
    required_by_date: form.requiredByDate || null,
    priority: form.priority || null,
    remarks: buildRemarks(form),
    state: (options.state || form.state || "Maharashtra").trim(),
    items: form.lines
      .filter((l) => l.productId && String(l.productId) !== "0")
      .map((line) => ({
        product_id: toUuidOrNull(line.productId),
        requested_qty: Number(line.requestedQty) || null,
        remarks: line.remarks || null,
      })),
    attachement: (form.existingAttachments ?? [])
      .filter((a) => a.url)
      .map((a) => ({
        file_name: a.name,
        file_url: a.url,
      })),
  };
}

function appendFormData(
  body: Record<string, unknown>,
  files: File[] = [],
): FormData {
  const formData = new FormData();
  for (const [key, value] of Object.entries(body)) {
    if (value === undefined) continue;
    if (value === null) {
      formData.append(key, "");
      continue;
    }
    if (typeof value === "object") {
      formData.append(key, JSON.stringify(value));
      continue;
    }
    formData.append(key, String(value));
  }
  files.forEach((file, index) => {
    formData.append(`attachments[${index}]`, file);
  });
  return formData;
}

export const PurchaseRequestService = {
  async getPreviewNumber(
    state?: string | null,
    signal?: AbortSignal,
  ): Promise<string> {
    const resolvedState = state?.trim() || "Maharashtra";
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.PREVIEW_NUMBER,
      {
        signal,
        params: { state: resolvedState },
        headers: { "Cache-Control": "no-cache" },
      },
    );
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object") return "";
    return asString((data as Record<string, unknown>).previewNumber);
  },

  async getById(
    id: string,
    signal?: AbortSignal,
  ): Promise<PurchaseRequestDetail> {
    const response = await axiosInstance.get(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.DETAILS(id),
      { signal },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to load purchase request.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async create(
    form: PRFormValues,
    options: { status: PRListStatus; files?: File[] },
  ): Promise<PurchaseRequestDetail> {
    const body = buildWriteBody(form, {
      status: options.status,
      state: form.state,
    });
    const formData = appendFormData(
      body,
      options.files ?? form.attachmentFiles ?? [],
    );
    const response = await axiosInstance.post(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.CREATE,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to create purchase request.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async update(
    id: string,
    form: PRFormValues,
    options: { status: PRListStatus; files?: File[] },
  ): Promise<PurchaseRequestDetail> {
    const body = buildWriteBody(form, {
      status: options.status,
      state: form.state,
    });
    const formData = appendFormData(
      body,
      options.files ?? form.attachmentFiles ?? [],
    );
    const response = await axiosInstance.put(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.UPDATE(id),
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to update purchase request.");
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapDetail(data as Record<string, unknown>);
  },

  async delete(id: string): Promise<void> {
    const response = await axiosInstance.delete(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.DELETE(id),
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to delete purchase request.");
  },

  async approveReject(
    id: string,
    action: "approve" | "reject",
    remarks?: string,
  ): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.PROCUREMENT.PURCHASE_REQUEST.APPROVE_REJECT(id),
      {
        status: action === "approve" ? "Approved" : "Rejected",
        remarks: remarks?.trim() || null,
      },
    );
    const payload = response.data as Record<string, unknown>;
    assertSuccess(payload, "Failed to update approval status.");
  },
};
