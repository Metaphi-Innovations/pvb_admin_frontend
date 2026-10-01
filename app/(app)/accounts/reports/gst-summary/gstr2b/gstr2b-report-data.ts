/**
 * GSTR-2B reconciliation — books (Purchase Invoices) vs portal upload / demo.
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
  GSTR2B_DEMO_BOOKS_DOCS,
  GSTR2B_DEMO_PERIOD,
  GSTR2B_DEMO_PORTAL_DOCS,
  GSTR2B_DEMO_UPLOAD_HISTORY,
} from "./gstr2b-demo-seed";
import {
  buildMatchKey,
  compareMatchedPair,
  computeDifference,
  computeGstDifference,
  computeTaxableDifference,
  totalGst,
} from "./gstr2b-match";
import {
  getActiveGstr2bUpload,
  listGstr2bUploadHistory,
  loadGstr2bOverrides,
} from "./gstr2b-portal-store";
import type {
  Gstr2bBooksDocument,
  Gstr2bFilters,
  Gstr2bPortalDocument,
  Gstr2bReconRow,
  Gstr2bReport,
  Gstr2bSummaryCounts,
  Gstr2bUploadRecord,
} from "./gstr2b-report-types";

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

function mapPurchaseToBooks(inv: PurchaseInvoiceRecord): Gstr2bBooksDocument {
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

function periodDateRange(filters: Gstr2bFilters): { from: string; to: string } {
  if (filters.gstPeriod && filters.gstPeriod !== "all") {
    return gstPeriodToDateRange(filters.gstPeriod, {
      from: filters.dateFrom,
      to: filters.dateTo,
    });
  }
  return { from: filters.dateFrom, to: filters.dateTo };
}

function filterBooks(
  docs: Gstr2bBooksDocument[],
  filters: Gstr2bFilters,
): Gstr2bBooksDocument[] {
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
  docs: Gstr2bPortalDocument[],
  filters: Gstr2bFilters,
): Gstr2bPortalDocument[] {
  const { from, to } = periodDateRange(filters);
  return docs.filter((d) => d.invoiceDate >= from && d.invoiceDate <= to);
}

function collectLiveBooks(filters: Gstr2bFilters): Gstr2bBooksDocument[] {
  return filterBooks(
    loadPurchaseInvoices().filter(includePurchaseInvoice).map(mapPurchaseToBooks),
    filters,
  );
}

function emptyRow(
  partial: Partial<Gstr2bReconRow> & {
    id: string;
    status: Gstr2bReconRow["status"];
    systemStatus: Gstr2bReconRow["status"];
  },
): Gstr2bReconRow {
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
    itcAvailable: null,
    ...partial,
  };
}

function buildRows(
  books: Gstr2bBooksDocument[],
  portal: Gstr2bPortalDocument[],
): Gstr2bReconRow[] {
  const booksByKey = new Map<string, Gstr2bBooksDocument[]>();
  for (const b of books) {
    const key = buildMatchKey(b.supplierGstin, b.docType, b.invoiceNo);
    const list = booksByKey.get(key) ?? [];
    list.push(b);
    booksByKey.set(key, list);
  }

  const portalByKey = new Map<string, Gstr2bPortalDocument[]>();
  for (const p of portal) {
    const key = buildMatchKey(p.supplierGstin, p.docType, p.invoiceNo);
    const list = portalByKey.get(key) ?? [];
    list.push(p);
    portalByKey.set(key, list);
  }

  const keys = new Set([...booksByKey.keys(), ...portalByKey.keys()]);
  const rows: Gstr2bReconRow[] = [];

  for (const key of keys) {
    const bList = booksByKey.get(key) ?? [];
    const pList = portalByKey.get(key) ?? [];

    if (bList.length > 0 && pList.length > 0) {
      const b = bList[0];
      const p = pList[0];
      const cmp = compareMatchedPair(b, p);

      rows.push(
        emptyRow({
          id: `recon2b-${key}`,
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
          status: cmp.status,
          systemStatus: cmp.status,
          remarks: cmp.remarks,
          booksSourceId: b.sourceId,
          portalDocId: p.id,
          ledger: b.ledger || "Purchase",
          itcAvailable: p.itcAvailable,
          isDemo: b.isDemo || p.isDemo,
        }),
      );
      continue;
    }

    if (bList.length > 0) {
      const b = bList[0];
      rows.push(
        emptyRow({
          id: `recon2b-${key}`,
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
          status: "missing_in_gstr2b",
          systemStatus: "missing_in_gstr2b",
          remarks: "Present in books — not found in GSTR-2B",
          booksSourceId: b.sourceId,
          ledger: b.ledger || "Purchase",
          isDemo: b.isDemo,
        }),
      );
      continue;
    }

    if (pList.length > 0) {
      const p = pList[0];
      rows.push(
        emptyRow({
          id: `recon2b-${key}`,
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
          status: "missing_in_books",
          systemStatus: "missing_in_books",
          remarks: "Present in GSTR-2B — not found in books",
          portalDocId: p.id,
          itcAvailable: p.itcAvailable,
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

export function summarizeGstr2bRows(rows: Gstr2bReconRow[]): Gstr2bSummaryCounts {
  const counts: Gstr2bSummaryCounts = {
    total: rows.length,
    itcAvailable: 0,
    itcNotAvailable: 0,
    partialMatch: 0,
    missingInGstr2b: 0,
    missingInBooks: 0,
    needsReview: 0,
  };
  for (const row of rows) {
    switch (row.status) {
      case "itc_available":
        counts.itcAvailable += 1;
        break;
      case "itc_not_available":
        counts.itcNotAvailable += 1;
        break;
      case "partial_match":
        counts.partialMatch += 1;
        break;
      case "missing_in_gstr2b":
        counts.missingInGstr2b += 1;
        break;
      case "missing_in_books":
        counts.missingInBooks += 1;
        break;
      case "needs_review":
        counts.needsReview += 1;
        break;
    }
  }
  return counts;
}

function applyOverrides(rows: Gstr2bReconRow[]): Gstr2bReconRow[] {
  const overrides = loadGstr2bOverrides();
  const byId = new Map(overrides.map((o) => [o.rowId, o]));
  return rows.map((row) => {
    const o = byId.get(row.id);
    if (!o) return row;
    const stamp = `${o.markedBy} · ${o.markedAt.slice(0, 16).replace("T", " ")}`;
    const remarks = o.remark
      ? `${o.remark} (manual · ${stamp})`
      : o.status === "itc_available"
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

function resolvePortalDocs(filters: Gstr2bFilters): {
  portal: Gstr2bPortalDocument[];
  activeUploadId: string | null;
} {
  const gstin =
    filters.gstRegistration !== "all"
      ? filters.gstRegistration
      : COMPANY_BILLING.gstNumber;
  const period = filters.gstPeriod !== "all" ? filters.gstPeriod : GSTR2B_DEMO_PERIOD;
  const active = getActiveGstr2bUpload(gstin, period);
  if (active) {
    return { portal: filterPortal(active.documents, filters), activeUploadId: active.id };
  }
  return {
    portal: filterPortal(GSTR2B_DEMO_PORTAL_DOCS, {
      ...filters,
      gstPeriod: filters.gstPeriod === "all" ? GSTR2B_DEMO_PERIOD : filters.gstPeriod,
      dateFrom: filters.gstPeriod === "all" ? "2026-06-01" : periodDateRange(filters).from,
      dateTo: filters.gstPeriod === "all" ? "2026-06-30" : periodDateRange(filters).to,
    }),
    activeUploadId: null,
  };
}

function resolveUploadHistory(
  filters: Gstr2bFilters,
  hasRealUpload: boolean,
): Gstr2bUploadRecord[] {
  if (hasRealUpload) {
    return listGstr2bUploadHistory(
      filters.gstRegistration !== "all" ? filters.gstRegistration : undefined,
      filters.gstPeriod !== "all" ? filters.gstPeriod : undefined,
    );
  }
  return GSTR2B_DEMO_UPLOAD_HISTORY;
}

export function buildGstr2bReport(filters: Gstr2bFilters): Gstr2bReport {
  const gstin =
    filters.gstRegistration !== "all"
      ? filters.gstRegistration
      : COMPANY_BILLING.gstNumber;
  const period = filters.gstPeriod !== "all" ? filters.gstPeriod : GSTR2B_DEMO_PERIOD;
  const hasUpload = !!getActiveGstr2bUpload(gstin, period);

  if (!hasUpload) {
    const demoBooks = filterBooks(GSTR2B_DEMO_BOOKS_DOCS, {
      ...filters,
      gstPeriod: GSTR2B_DEMO_PERIOD,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    const demoPortal = filterPortal(GSTR2B_DEMO_PORTAL_DOCS, {
      ...filters,
      gstPeriod: GSTR2B_DEMO_PERIOD,
      dateFrom: "2026-06-01",
      dateTo: "2026-06-30",
    });
    const rows = applyOverrides(buildRows(demoBooks, demoPortal));
    return {
      rows,
      summary: summarizeGstr2bRows(rows),
      uploads: resolveUploadHistory(filters, false),
      activeUpload: GSTR2B_DEMO_UPLOAD_HISTORY.find((u) => u.isActive) ?? null,
      hasData: rows.length > 0,
    };
  }

  let books = collectLiveBooks(filters);
  const { portal } = resolvePortalDocs(filters);
  if (books.length === 0) {
    books = filterBooks(GSTR2B_DEMO_BOOKS_DOCS, {
      ...filters,
      gstPeriod: period,
      dateFrom: periodDateRange(filters).from,
      dateTo: periodDateRange(filters).to,
    });
  }

  const rows = applyOverrides(buildRows(books, portal));
  return {
    rows,
    summary: summarizeGstr2bRows(rows),
    uploads: resolveUploadHistory(filters, true),
    activeUpload: getActiveGstr2bUpload(gstin, period),
    hasData: rows.length > 0,
  };
}

export function findPortalDocById(
  filters: Gstr2bFilters,
  portalDocId: string,
): Gstr2bPortalDocument | null {
  const { portal } = resolvePortalDocs(filters);
  const demo = GSTR2B_DEMO_PORTAL_DOCS.find((d) => d.id === portalDocId);
  return portal.find((d) => d.id === portalDocId) ?? demo ?? null;
}

export function findBooksDocByRow(
  filters: Gstr2bFilters,
  row: Gstr2bReconRow,
): Gstr2bBooksDocument | null {
  if (row.booksSourceId != null) {
    const inv = loadPurchaseInvoices().find((p) => p.id === row.booksSourceId);
    if (inv) return mapPurchaseToBooks(inv);
  }
  return (
    GSTR2B_DEMO_BOOKS_DOCS.find(
      (d) =>
        d.invoiceNo === row.booksInvoiceNo &&
        d.supplierGstin === row.supplierGstin &&
        d.docType === row.docType,
    ) ?? null
  );
}
