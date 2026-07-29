/**
 * GSTR-2B demo — exactly 6 scenarios for Phase 1 reconciliation.
 */

import { COMPANY_BILLING } from "@/lib/procurement/config";
import type {
  Gstr2bBooksDocument,
  Gstr2bPortalDocument,
  Gstr2bUploadRecord,
} from "./gstr2b-report-types";

const GSTIN = COMPANY_BILLING.gstNumber;
const BRANCH = "Head Office";

function portal(
  d: Omit<Gstr2bPortalDocument, "isDemo">,
): Gstr2bPortalDocument {
  return { ...d, isDemo: true };
}

function books(
  d: Omit<Gstr2bBooksDocument, "isDemo" | "branch" | "companyGstin">,
): Gstr2bBooksDocument {
  return { ...d, branch: BRANCH, companyGstin: GSTIN, isDemo: true };
}

/** Portal-side documents (GSTR-2B JSON equivalent). */
export const GSTR2B_DEMO_PORTAL_DOCS: Gstr2bPortalDocument[] = [
  // 1. ITC Available
  portal({
    id: "demo2b-p-01",
    supplierName: "Maharashtra Fertilizer Traders",
    supplierGstin: "27AABCM8888H1Z8",
    docType: "purchase_invoice",
    invoiceNo: "MFT/2026/0210",
    invoiceDate: "2026-06-05",
    taxableAmount: 200_000,
    cgst: 18_000,
    sgst: 18_000,
    igst: 0,
    itcAvailable: true,
  }),
  // 2. ITC Not Available
  portal({
    id: "demo2b-p-02",
    supplierName: "Green Valley Agro Inputs",
    supplierGstin: "27AABCG1111A1Z1",
    docType: "purchase_invoice",
    invoiceNo: "GVA-INV-0920",
    invoiceDate: "2026-06-12",
    taxableAmount: 75_000,
    cgst: 6_750,
    sgst: 6_750,
    igst: 0,
    itcAvailable: false,
  }),
  // 3. Partial Match (portal amounts differ)
  portal({
    id: "demo2b-p-03",
    supplierName: "Nashik Seeds & Chemicals",
    supplierGstin: "27AABCN5555N1Z5",
    docType: "purchase_invoice",
    invoiceNo: "NSC/JUN/088",
    invoiceDate: "2026-06-10",
    taxableAmount: 98_500,
    cgst: 8_865,
    sgst: 8_865,
    igst: 0,
    itcAvailable: true,
  }),
  // 5. Missing in Books
  portal({
    id: "demo2b-p-05",
    supplierName: "Western Crop Care Pvt Ltd",
    supplierGstin: "24AABCW7777W1Z7",
    docType: "purchase_invoice",
    invoiceNo: "WCC/26/601",
    invoiceDate: "2026-06-18",
    taxableAmount: 42_000,
    cgst: 0,
    sgst: 0,
    igst: 7_560,
    itcAvailable: true,
  }),
  // 6. Supplier Credit Note (ITC Available)
  portal({
    id: "demo2b-p-06",
    supplierName: "Maharashtra Fertilizer Traders",
    supplierGstin: "27AABCM8888H1Z8",
    docType: "credit_note",
    invoiceNo: "CN-MFT-0051",
    invoiceDate: "2026-06-22",
    taxableAmount: 15_000,
    cgst: 1_350,
    sgst: 1_350,
    igst: 0,
    itcAvailable: true,
  }),
];

/** Books-side documents for demo. */
export const GSTR2B_DEMO_BOOKS_DOCS: Gstr2bBooksDocument[] = [
  // 1. ITC Available
  books({
    id: "demo2b-b-01",
    sourceId: null,
    supplierName: "Maharashtra Fertilizer Traders",
    supplierGstin: "27AABCM8888H1Z8",
    docType: "purchase_invoice",
    invoiceNo: "MFT/2026/0210",
    invoiceDate: "2026-06-05",
    taxableAmount: 200_000,
    cgst: 18_000,
    sgst: 18_000,
    igst: 0,
    ledger: "Purchase — Fertilizers",
  }),
  // 2. ITC Not Available (amounts match portal)
  books({
    id: "demo2b-b-02",
    sourceId: null,
    supplierName: "Green Valley Agro Inputs",
    supplierGstin: "27AABCG1111A1Z1",
    docType: "purchase_invoice",
    invoiceNo: "GVA-INV-0920",
    invoiceDate: "2026-06-12",
    taxableAmount: 75_000,
    cgst: 6_750,
    sgst: 6_750,
    igst: 0,
    ledger: "Purchase — Agro Inputs",
  }),
  // 3. Partial — books taxable lower
  books({
    id: "demo2b-b-03",
    sourceId: null,
    supplierName: "Nashik Seeds & Chemicals",
    supplierGstin: "27AABCN5555N1Z5",
    docType: "purchase_invoice",
    invoiceNo: "NSC/JUN/088",
    invoiceDate: "2026-06-10",
    taxableAmount: 95_000,
    cgst: 8_550,
    sgst: 8_550,
    igst: 0,
    ledger: "Purchase — Seeds",
  }),
  // 4. Missing in GSTR-2B
  books({
    id: "demo2b-b-04",
    sourceId: null,
    supplierName: "Delhi Agri Inputs Pvt Ltd",
    supplierGstin: "07AABCD1010J1Z0",
    docType: "purchase_invoice",
    invoiceNo: "DAI/HO/402",
    invoiceDate: "2026-06-15",
    taxableAmount: 56_200,
    cgst: 0,
    sgst: 0,
    igst: 10_116,
    ledger: "Purchase — Interstate",
  }),
  // 6. Credit Note books
  books({
    id: "demo2b-b-06",
    sourceId: null,
    supplierName: "Maharashtra Fertilizer Traders",
    supplierGstin: "27AABCM8888H1Z8",
    docType: "credit_note",
    invoiceNo: "CN-MFT-0051",
    invoiceDate: "2026-06-22",
    taxableAmount: 15_000,
    cgst: 1_350,
    sgst: 1_350,
    igst: 0,
    ledger: "Purchase Returns",
  }),
];

export const GSTR2B_DEMO_PERIOD = "2026-06";

export const GSTR2B_DEMO_UPLOAD_HISTORY: Gstr2bUploadRecord[] = [
  {
    id: "demo2b-up-v2",
    gstin: GSTIN,
    returnPeriod: GSTR2B_DEMO_PERIOD,
    fileName: "GSTR2B_27AABCD1234E1Z5_062026.json",
    uploadedAt: "2026-07-09T10:40:00.000Z",
    uploadedBy: "Accounts Officer",
    recordCount: 5,
    version: 2,
    isActive: true,
    documents: GSTR2B_DEMO_PORTAL_DOCS,
  },
  {
    id: "demo2b-up-v1",
    gstin: GSTIN,
    returnPeriod: GSTR2B_DEMO_PERIOD,
    fileName: "GSTR2B_27AABCD1234E1Z5_062026_draft.json",
    uploadedAt: "2026-07-03T08:20:00.000Z",
    uploadedBy: "Admin",
    recordCount: 4,
    version: 1,
    isActive: false,
    documents: [],
  },
];
