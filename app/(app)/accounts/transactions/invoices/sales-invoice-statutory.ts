/**
 * Sales Invoice listing — E-Invoice / E-Way Bill display status.
 * Listing-only; does not change invoice generation or posting.
 */

import type { InvoiceRecord } from "@/app/(app)/accounts/invoices/invoices-data";

type InvoiceKind = "sales_order" | "stock_transfer" | "sample_order" | "service";

export type ListingEInvoiceStatus =
  | "Generated"
  | "Not Generated"
  | "Not Applicable"
  | "Failed"
  | "Cancelled";

export type ListingEWayStatus =
  | "Generated"
  | "Not Generated"
  | "Not Applicable"
  | "Expired"
  | "Cancelled"
  | "Failed";

export const LISTING_EINVOICE_STATUS_OPTIONS: ListingEInvoiceStatus[] = [
  "Generated",
  "Not Generated",
  "Not Applicable",
  "Failed",
  "Cancelled",
];

export const LISTING_EWAY_STATUS_OPTIONS: ListingEWayStatus[] = [
  "Generated",
  "Not Generated",
  "Not Applicable",
  "Expired",
  "Cancelled",
  "Failed",
];

export interface SalesInvoiceEInvoiceDetails {
  status: ListingEInvoiceStatus;
  eInvoiceNo: string;
  irn: string;
  acknowledgementNo: string;
  acknowledgementDate: string;
  generatedAt: string;
  qrCodeAvailable: boolean;
  /** NIC SignedQRCode / data URL — used to render QR in the listing popup. */
  signedQrCode?: string;
  cancelledAt: string;
  cancelledReason: string;
}

export interface SalesInvoiceEWayDetails {
  status: ListingEWayStatus;
  eWayBillNo: string;
  generatedAt: string;
  expiryAt: string;
  vehicleNo: string;
  transporterName: string;
  transportMode: string;
  /** PeriOne / NIC EWB QR payload when returned. */
  ewayBillQrCode?: string;
  qrCodeAvailable: boolean;
  cancelledAt: string;
  cancelledReason: string;
}

function mapStoredEInvoice(
  raw: InvoiceRecord["eInvoiceStatus"] | undefined,
): ListingEInvoiceStatus {
  switch (raw) {
    case "generated":
      return "Generated";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "not_applicable":
      return "Not Applicable";
    case "not_generated":
    case "stale":
    default:
      return "Not Generated";
  }
}

function mapStoredEWay(
  raw: InvoiceRecord["ewayBillStatus"] | undefined,
): ListingEWayStatus {
  switch (raw) {
    case "generated":
    case "manual":
      return "Generated";
    case "expired":
      return "Expired";
    case "failed":
      return "Failed";
    case "cancelled":
      return "Cancelled";
    case "not_applicable":
      return "Not Applicable";
    case "not_generated":
    case "stale":
    default:
      return "Not Generated";
  }
}

/** Listing display status — kind rules override stored values where required. */
export function resolveListingEInvoiceStatus(
  inv: InvoiceRecord,
  kind: InvoiceKind,
): ListingEInvoiceStatus {
  if (kind === "sample_order") return "Not Applicable";
  const mapped = mapStoredEInvoice(inv.eInvoiceStatus);
  if (mapped === "Not Generated" && inv.irn?.trim()) return "Generated";
  return mapped;
}

export function resolveListingEWayStatus(
  inv: InvoiceRecord,
  kind: InvoiceKind,
): ListingEWayStatus {
  if (kind === "sample_order" || kind === "service") return "Not Applicable";
  const mapped = mapStoredEWay(inv.ewayBillStatus);
  if (mapped === "Not Generated" && inv.ewayBillNo?.trim()) return "Generated";
  return mapped;
}

export function buildEInvoiceDetails(
  inv: InvoiceRecord,
  status: ListingEInvoiceStatus,
): SalesInvoiceEInvoiceDetails {
  const ackNo = inv.acknowledgementNo?.trim() || inv.eInvoiceNo?.trim() || "";
  const ackDate = inv.acknowledgementDate?.trim() || "";
  const irn = inv.irn?.trim() || "";
  const signedQr = inv.signedQrCode?.trim() || "";

  return {
    status,
    eInvoiceNo: ackNo || "—",
    irn: irn || "—",
    acknowledgementNo: ackNo || "—",
    acknowledgementDate: ackDate || "—",
    generatedAt:
      inv.eInvoiceGeneratedAt?.trim() ||
      ackDate ||
      inv.updatedAt?.trim() ||
      "—",
    qrCodeAvailable: Boolean(inv.qrCodeAvailable || signedQr || irn),
    signedQrCode: signedQr || undefined,
    cancelledAt: inv.eInvoiceCancelledAt?.trim() || "—",
    cancelledReason: inv.eInvoiceCancelledReason?.trim() || "—",
  };
}

export function buildEWayDetails(
  inv: InvoiceRecord,
  status: ListingEWayStatus,
): SalesInvoiceEWayDetails {
  const ewayQr = inv.ewayBillQrCode?.trim() || "";
  return {
    status,
    eWayBillNo: inv.ewayBillNo?.trim() || "—",
    generatedAt: inv.ewayBillGeneratedAt?.trim() || inv.updatedAt?.trim() || "—",
    expiryAt: inv.ewayBillExpiryDate?.trim() || "—",
    vehicleNo: inv.vehicleNo?.trim() || "—",
    transporterName: inv.transporterName?.trim() || "—",
    transportMode: inv.transportMode?.trim() || "—",
    ewayBillQrCode: ewayQr || undefined,
    qrCodeAvailable: Boolean(ewayQr),
    cancelledAt: inv.ewayBillCancelledAt?.trim() || "—",
    cancelledReason: inv.ewayBillCancelledReason?.trim() || "—",
  };
}
