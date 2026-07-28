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
  return mapStoredEInvoice(inv.eInvoiceStatus);
}

export function resolveListingEWayStatus(
  inv: InvoiceRecord,
  kind: InvoiceKind,
): ListingEWayStatus {
  if (kind === "sample_order" || kind === "service") return "Not Applicable";
  return mapStoredEWay(inv.ewayBillStatus);
}

export function buildEInvoiceDetails(
  inv: InvoiceRecord,
  status: ListingEInvoiceStatus,
): SalesInvoiceEInvoiceDetails {
  return {
    status,
    eInvoiceNo: inv.eInvoiceNo?.trim() || "—",
    irn: inv.irn?.trim() || "—",
    acknowledgementNo: inv.acknowledgementNo?.trim() || "—",
    acknowledgementDate: inv.acknowledgementDate?.trim() || "—",
    generatedAt: inv.eInvoiceGeneratedAt?.trim() || inv.updatedAt?.trim() || "—",
    qrCodeAvailable: Boolean(inv.qrCodeAvailable),
    cancelledAt: inv.eInvoiceCancelledAt?.trim() || "—",
    cancelledReason: inv.eInvoiceCancelledReason?.trim() || "—",
  };
}

export function buildEWayDetails(
  inv: InvoiceRecord,
  status: ListingEWayStatus,
): SalesInvoiceEWayDetails {
  return {
    status,
    eWayBillNo: inv.ewayBillNo?.trim() || "—",
    generatedAt: inv.ewayBillGeneratedAt?.trim() || inv.updatedAt?.trim() || "—",
    expiryAt: inv.ewayBillExpiryDate?.trim() || "—",
    vehicleNo: inv.vehicleNo?.trim() || "—",
    transporterName: inv.transporterName?.trim() || "—",
    transportMode: inv.transportMode?.trim() || "—",
    cancelledAt: inv.ewayBillCancelledAt?.trim() || "—",
    cancelledReason: inv.ewayBillCancelledReason?.trim() || "—",
  };
}
