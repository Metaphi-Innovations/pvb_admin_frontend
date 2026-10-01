/**
 * GSTR-2A reconciliation — books (Purchase Invoices) vs portal upload / demo.
 */

import {
  loadPurchaseInvoices,
  getPurchaseInvoiceGstBreakup,
  type PurchaseInvoiceRecord,
} from "@/app/(app)/accounts/purchase-invoices/purchase-invoices-data";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { gstPeriodToDateRange } from "@/lib/accounts/gst-report-filters";
import { matchesMultiFilter } from "@/lib/accounts/report-multi-filter-utils";
import { roundMoney } from "@/lib/accounts/money-format";
import {
  GSTR2A_DEMO_BOOKS_DOCS,
  GSTR2A_DEMO_PERIOD,
  GSTR2A_DEMO_PORTAL_DOCS,
  GSTR2A_DEMO_UPLOAD_HISTORY,
} from "./gstr2a-demo-seed";
import {
  buildMatchKey,
  compareMatchedPair,
  computeDifference,
  computeGstDifference,
  computeTaxableDifference,
  totalGst,
} from "./gstr2a-match";
import {
  getActiveGstr2aUpload,
  listGstr2aUploadHistory,
  loadGstr2aOverrides,
} from "./gstr2a-portal-store";
import type {
  Gstr2aBooksDocument,
  Gstr2aFilters,
  Gstr2aPortalDocument,
  Gstr2aReconRow,
  Gstr2aReport,
  Gstr2aSummaryCounts,
  Gstr2aUploadRecord,
} from "./gstr2a-report-types";

const EXCLUDED = new Set(["cancelled", "canceled", "deleted", "archived"]);

function r(n: number): number {
  return roundMoney(n);
}

function isExcludedStatus(status: string | undefined | null): boolean {
  if (!status) return false;
  return EXCLUDED.has(status.trim().toLowerCase());
}

function includePurchaseInvoice(inv: PurchaseInvoiceRecord): boolean {
  return !isExcludedStatus(inv.workflow?.status);
}

function mapPurchaseToBooks(inv: PurchaseInvoiceRecord): Gstr2aBooksDocument {
  const breakup = getPurchaseInvoiceGstBreakup(inv);
  return {
    id: `pi-${inv.id}`,
    sourceId: inv.id,
    supplierName: inv.vendorName,
    supplierGstin: (inv.vendorGst || "").trim().toUpperCase(),
    docType: "purchase_invoice",
    invoiceNo: inv.vendorInvoiceNo?.trim() || inv.invoiceNo,
    invoiceDate: inv.invoiceDate,
    taxableAmount: r(breakup.taxableValue),
    cgst: r(breakup.cgst),
    sgst: r(breakup.sgst),
    igst: r(breakup.igst),
    branch: "Head Office",
    companyGstin: COMPANY_BILLING.gstNumber,
    ledger: "Purchase — Creditors",
  };
}

function periodDateRange(filters: Gstr2aFilters): { from: string; to: string } {
  if (filters.gstPeriod && filters.gstPeriod !== "all") {
    return gstPeriodToDateRange(filters.gstPeriod, {
      from: filters.dateFrom,
      to: filters.dateTo,
    });
  }
  return { from: filters.dateFrom, to: filters.dateTo };
}

function filterBooks(
  docs: Gstr2aBooksDocument[],
  filters: Gstr2aFilters,
): Gstr2aBooksDocument[] {
  const { from, to } = periodDateRange(filters);
  return docs.filter((d) => {
    if (d.invoiceDate < from || d.invoiceDate > to) return false;
    if (!matchesMultiFilter(filters.branch, d.branch)) return false;
    if (
      filters.gstRegistration !== "all" &&
      d.companyGstin !== filters.gstRegistration
    ) {
      return false;
    }
    return true;
  });
}

function filterPortal(
  docs: Gstr2aPortalDocument[],
  filters: Gstr2aFilters,
): Gstr2aPortalDocument[] {
  const { from, to } = periodDateRange(filters);
  return docs.filter((d) => d.invoiceDate >= from && d.invoiceDate <= to);
}

function collectLiveBooks(filters: Gstr2aFilters): Gstr2aBooksDocument[] {
  const mapped = loadPurchaseInvoices()
    .filter(includePurchaseInvoice)
    .map(mapPurchaseToBooks);
  return filterBooks(mapped, filters);
}

function emptyRow(
  partial: Partial<Gstr2aReconRow> & {
    id: string;
    status: Gstr2aReconRow["status"];
    systemStatus: Gstr2aReconRow["status"];
  },
): Gstr2aReconRow {
  return {
    supplierName: "",
    supplierGstin: "",
    docType: "purchase_invoice",
    booksInvoiceNo: "—",
    portalInvoiceNo: "—",
    booksInvoiceDate: "—",
    portalInvoiceDate: "—",
    booksTaxableAmount: 0,
    portalTaxableAmount: 0,
    booksGst: 0,
    portalGst: 0,
    booksCgst: 0,
    portalCgst: 0,
    booksSgst: 0,
    portalSgst: 0,
    booksIgst: 0,
    portalIgst: 0,
    taxableDifference: 0,
    gstDifference: 0,
    difference: 0,
    dateMismatch: false,
    remarks: "",
    booksSourceId: null,
    portalDocId: null,
    ledger: "—",
    ...partial,
  };
}

function enrichStatus(
  status: Gstr2aReconRow["status"],
  dateMismatch: boolean,
  taxableDiff: number,
  gstDiff: number,
  baseRemarks: string,
): { status: Gstr2aReconRow["status"]; remarks: string } {
  if (status === "matched") {
    return { status, remarks: "Ready for reconciliation" };
  }
  if (status === "duplicate") {
    return { status, remarks: "Duplicate invoice" };
  }
  if (status === "missing_in_gstr2a") {
    return { status, remarks: "Invoice not uploaded by supplier" };
  }
  if (status === "missing_in_books") {
    return { status, remarks: "Missing in books" };
  }
  // Multi-field mismatch → Needs Review
  const mismatchCount =
    (dateMismatch ? 1 : 0) +
    (Math.abs(taxableDiff) > 1 ? 1 : 0) +
    (Math.abs(gstDiff) > 1 ? 1 : 0);
  if (mismatchCount >= 2) {
    return { status: "needs_review", remarks: baseRemarks || "Needs Review" };
  }
  if (dateMismatch && Math.abs(taxableDiff) <= 1 && Math.abs(gstDiff) <= 1) {
    return { status: "partial_match", remarks: "Date mismatch" };
  }
  if (Math.abs(gstDiff) > 1 && Math.abs(taxableDiff) <= 1 && !dateMismatch) {
    return { status: "partial_match", remarks: "GST difference" };
  }
  if (Math.abs(taxableDiff) > 1) {
    return { status: "partial_match", remarks: "Amount mismatch" };
  }
  return { status, remarks: baseRemarks };
}

function buildRows(
  books: Gstr2aBooksDocument[],
  portal: Gstr2aPortalDocument[],
): Gstr2aReconRow[] {
  const booksByKey = new Map<string, Gstr2aBooksDocument[]>();
  for (const b of books) {
    const key = buildMatchKey(b.supplierGstin, b.docType, b.invoiceNo);
    const list = booksByKey.get(key) ?? [];
    list.push(b);
    booksByKey.set(key, list);
  }

  const portalByKey = new Map<string, Gstr2aPortalDocument[]>();
  for (const p of portal) {
    const key = buildMatchKey(p.supplierGstin, p.docType, p.invoiceNo);
    const list = portalByKey.get(key) ?? [];
    list.push(p);
    portalByKey.set(key, list);
  }

  const keys = new Set([...booksByKey.keys(), ...portalByKey.keys()]);
  const rows: Gstr2aReconRow[] = [];

  for (const key of keys) {
    const bList = booksByKey.get(key) ?? [];
    const pList = portalByKey.get(key) ?? [];
    const isDup = pList.length > 1 || bList.length > 1;

    if (bList.length > 0 && pList.length > 0) {
      const b = bList[0];
      const p = pList[0];
      const cmp = compareMatchedPair(b, p);
      const rawStatus = isDup ? ("duplicate" as const) : cmp.status;
      const enriched = enrichStatus(
        rawStatus,
        cmp.dateMismatch,
        cmp.taxableDifference,
        cmp.gstDifference,
        isDup ? "Duplicate invoice" : cmp.remarks,
      );

      rows.push(
        emptyRow({
          id: `recon-${key}`,
          supplierName: b.supplierName || p.supplierName,
          supplierGstin: b.supplierGstin || p.supplierGstin,
          docType: b.docType,
          booksInvoiceNo: b.invoiceNo,
          portalInvoiceNo: p.invoiceNo,
          booksInvoiceDate: b.invoiceDate,
          portalInvoiceDate: p.invoiceDate,
          booksTaxableAmount: b.taxableAmount,
          portalTaxableAmount: p.taxableAmount,
          booksGst: totalGst(b),
          portalGst: totalGst(p),
          booksCgst: b.cgst,
          portalCgst: p.cgst,
          booksSgst: b.sgst,
          portalSgst: p.sgst,
          booksIgst: b.igst,
          portalIgst: p.igst,
          taxableDifference: cmp.taxableDifference,
          gstDifference: cmp.gstDifference,
          difference: computeDifference(b, p),
          dateMismatch: cmp.dateMismatch,
          status: enriched.status,
          systemStatus: enriched.status,
          remarks: enriched.remarks,
          booksSourceId: b.sourceId,
          portalDocId: p.id,
          ledger: b.ledger || "Purchase",
          isDemo: b.isDemo || p.isDemo,
        }),
      );
      continue;
    }

    if (bList.length > 0) {
      const b = bList[0];
      const enriched = enrichStatus("missing_in_gstr2a", false, 0, 0, "");
      rows.push(
        emptyRow({
          id: `recon-${key}`,
          supplierName: b.supplierName,
          supplierGstin: b.supplierGstin,
          docType: b.docType,
          booksInvoiceNo: b.invoiceNo,
          booksInvoiceDate: b.invoiceDate,
          booksTaxableAmount: b.taxableAmount,
          booksGst: totalGst(b),
          booksCgst: b.cgst,
          booksSgst: b.sgst,
          booksIgst: b.igst,
          taxableDifference: computeTaxableDifference(b, null),
          gstDifference: computeGstDifference(b, null),
          difference: computeDifference(b, null),
          status: enriched.status,
          systemStatus: enriched.status,
          remarks: enriched.remarks,
          booksSourceId: b.sourceId,
          ledger: b.ledger || "Purchase",
          isDemo: b.isDemo,
        }),
      );
      continue;
    }

    if (pList.length > 0) {
      const p = pList[0];
      const rawStatus = pList.length > 1 ? ("duplicate" as const) : ("missing_in_books" as const);
      const enriched = enrichStatus(rawStatus, false, 0, 0, "");
      rows.push(
        emptyRow({
          id: `recon-${key}`,
          supplierName: p.supplierName,
          supplierGstin: p.supplierGstin,
          docType: p.docType,
          portalInvoiceNo: p.invoiceNo,
          portalInvoiceDate: p.invoiceDate,
          portalTaxableAmount: p.taxableAmount,
          portalGst: totalGst(p),
          portalCgst: p.cgst,
          portalSgst: p.sgst,
          portalIgst: p.igst,
          taxableDifference: computeTaxableDifference(null, p),
          gstDifference: computeGstDifference(null, p),
          difference: computeDifference(null, p),
          status: enriched.status,
          systemStatus: enriched.status,
          remarks: enriched.remarks,
          portalDocId: p.id,
          isDemo: p.isDemo,
        }),
      );
    }
  }

  return rows.sort(
    (a, b) =>
      a.supplierName.localeCompare(b.supplierName) ||
      a.booksInvoiceNo.localeCompare(b.booksInvoiceNo) ||
      a.portalInvoiceNo.localeCompare(b.portalInvoiceNo),
  );
}

export function summarizeGstr2aRows(rows: Gstr2aReconRow[]): Gstr2aSummaryCounts {
  const counts: Gstr2aSummaryCounts = {
    total: rows.length,
    matched: 0,
    partialMatch: 0,
    missingInGstr2a: 0,
    missingInBooks: 0,
    duplicate: 0,
    needsReview: 0,
  };
  for (const row of rows) {
    switch (row.status) {
      case "matched":
        counts.matched += 1;
        break;
      case "partial_match":
        counts.partialMatch += 1;
        break;
      case "missing_in_gstr2a":
        counts.missingInGstr2a += 1;
        break;
      case "missing_in_books":
        counts.missingInBooks += 1;
        break;
      case "duplicate":
        counts.duplicate += 1;
        break;
      case "needs_review":
        counts.needsReview += 1;
        break;
    }
  }
  return counts;
}

function summarize(rows: Gstr2aReconRow[]): Gstr2aSummaryCounts {
  return summarizeGstr2aRows(rows);
}

function applyOverrides(rows: Gstr2aReconRow[]): Gstr2aReconRow[] {
  const overrides = loadGstr2aOverrides();
  const byId = new Map(overrides.map((o) => [o.rowId, o]));
  return rows.map((row) => {
    const o = byId.get(row.id);
    if (!o) return row;
    const stamp = `${o.markedBy} · ${o.markedAt.slice(0, 16).replace("T", " ")}`;
    const remarks = o.remark
      ? `${o.remark} (manual · ${stamp})`
      : o.status === "matched"
        ? `Manually marked as Matched by ${stamp}`
        : o.status === "needs_review"
          ? `Marked for Review by ${stamp}`
          : row.remarks;
    return {
      ...row,
      status: o.status ?? row.status,
      remarks,
    };
  });
}

function resolvePortalDocs(filters: Gstr2aFilters): {
  portal: Gstr2aPortalDocument[];
  activeUploadId: string | null;
} {
  const gstin =
    filters.gstRegistration !== "all"
      ? filters.gstRegistration
      : COMPANY_BILLING.gstNumber;
  const period = filters.gstPeriod !== "all" ? filters.gstPeriod : GSTR2A_DEMO_PERIOD;
  const active = getActiveGstr2aUpload(gstin, period);
  if (active) {
    return { portal: filterPortal(active.documents, filters), activeUploadId: active.id };
  }
  return {
    portal: filterPortal(GSTR2A_DEMO_PORTAL_DOCS, {
      ...filters,
      gstPeriod: filters.gstPeriod === "all" ? GSTR2A_DEMO_PERIOD : filters.gstPeriod,
      dateFrom:
        filters.gstPeriod === "all"
          ? "2026-06-01"
          : periodDateRange(filters).from,
      dateTo:
        filters.gstPeriod === "all" ? "2026-06-30" : periodDateRange(filters).to,
    }),
    activeUploadId: null,
  };
}

function resolveUploadHistory(
  filters: Gstr2aFilters,
  hasRealUpload: boolean,
): Gstr2aUploadRecord[] {
  if (hasRealUpload) {
    return listGstr2aUploadHistory(
      filters.gstRegistration !== "all" ? filters.gstRegistration : undefined,
      filters.gstPeriod !== "all" ? filters.gstPeriod : undefined,
    );
  }
  return GSTR2A_DEMO_UPLOAD_HISTORY;
}

export function buildGstr2aReport(filters: Gstr2aFilters): Gstr2aReport {
  const gstin =
    filters.gstRegistration !== "all"
      ? filters.gstRegistration
      : COMPANY_BILLING.gstNumber;
  const period = filters.gstPeriod !== "all" ? filters.gstPeriod : GSTR2A_DEMO_PERIOD;
  const hasUpload = !!getActiveGstr2aUpload(gstin, period);

  if (!hasUpload) {
    const demoBooks = filterBooks(GSTR2A_DEMO_BOOKS_DOCS, {
      ...filters,
      gstPeriod: GSTR2A_DEMO_PERIOD,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    const demoPortal = filterPortal(GSTR2A_DEMO_PORTAL_DOCS, {
      ...filters,
      gstPeriod: GSTR2A_DEMO_PERIOD,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    const rows = applyOverrides(buildRows(demoBooks, demoPortal)).map((row) => {
      // Diversify demo remarks for client walkthroughs
      if (row.portalInvoiceNo === "ICP-JUNE-214") {
        return { ...row, remarks: "GSTIN mismatch" };
      }
      if (row.status === "missing_in_books" && row.remarks === "Missing in books") {
        return { ...row, remarks: "Present in GSTR-2A — missing in books" };
      }
      return row;
    });
    return {
      rows,
      summary: summarize(rows),
      uploads: resolveUploadHistory(filters, false),
      activeUpload: GSTR2A_DEMO_UPLOAD_HISTORY.find((u) => u.isActive) ?? null,
      hasData: rows.length > 0,
    };
  }

  const liveBooks = collectLiveBooks(filters);
  const { portal } = resolvePortalDocs(filters);
  let books = liveBooks;
  if (books.length === 0) {
    books = filterBooks(GSTR2A_DEMO_BOOKS_DOCS, {
      ...filters,
      gstPeriod: period,
      dateFrom: periodDateRange(filters).from,
      dateTo: periodDateRange(filters).to,
    });
  }

  const rows = applyOverrides(buildRows(books, portal));
  return {
    rows,
    summary: summarize(rows),
    uploads: resolveUploadHistory(filters, true),
    activeUpload: getActiveGstr2aUpload(gstin, period),
    hasData: rows.length > 0,
  };
}

export function findPortalDocById(
  filters: Gstr2aFilters,
  portalDocId: string,
): Gstr2aPortalDocument | null {
  const { portal } = resolvePortalDocs(filters);
  const demo = GSTR2A_DEMO_PORTAL_DOCS.find((d) => d.id === portalDocId);
  return portal.find((d) => d.id === portalDocId) ?? demo ?? null;
}

export function findBooksDocByRow(
  filters: Gstr2aFilters,
  row: Gstr2aReconRow,
): Gstr2aBooksDocument | null {
  if (row.booksSourceId != null) {
    const inv = loadPurchaseInvoices().find((p) => p.id === row.booksSourceId);
    if (inv) return mapPurchaseToBooks(inv);
  }
  return (
    GSTR2A_DEMO_BOOKS_DOCS.find(
      (d) =>
        d.invoiceNo === row.booksInvoiceNo &&
        d.supplierGstin === row.supplierGstin &&
        d.docType === row.docType,
    ) ?? null
  );
}
