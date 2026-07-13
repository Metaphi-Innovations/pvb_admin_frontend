import { demoDateAt } from "@/lib/accounts/demo-date-utils";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { COMPANY_BILLING } from "@/lib/procurement/config";
import { getActiveVendors } from "@/app/(app)/masters/vendors/vendor-data";
import {
  createInitialWorkflow,
  submitForApproval,
  approveCurrentStep,
} from "@/lib/accounts/accounts-maker-checker";
import type {
  DirectPurchaseLineItem,
  PurchaseInvoiceRecord,
  PurchaseNature,
} from "./purchase-invoices-data";
import { pruneStalePurchaseInvoiceDemos } from "./purchase-invoice-demo-constants";

const DEMO_ATTACHMENT = {
  id: "patt-demo-supplier-inv",
  documentName: "Supplier Invoice",
  fileName: "supplier-invoice-demo.pdf",
  fileType: "application/pdf",
  fileSize: 0,
  fileUrl: "patt-demo-supplier-inv",
  uploadedAt: demoDateAt(0),
};

type DirectDemoLineSpec = {
  description: string;
  ledgerName: string;
  hsnSac: string;
  quantity: number;
  uqc: string;
  rate: number;
  discount: number;
  taxableAmount: number;
  gstRate: number;
  cgst: number;
  sgst: number;
  igst: number;
  lineTotal: number;
};

type DirectDemoSpec = {
  id: number;
  invoiceNo: string;
  scenarioLabel: string;
  vendorId: number;
  vendorName: string;
  vendorInvoiceNo: string;
  invoiceDate: string;
  purchaseNature: PurchaseNature;
  placeOfSupply: string;
  lines: DirectDemoLineSpec[];
  amountPaid?: number;
  workflowStatus: "draft" | "posted";
};

function buildDemoLine(
  spec: DirectDemoSpec,
  lineSpec: DirectDemoLineSpec,
  lineIdx: number,
): DirectPurchaseLineItem {
  return {
    id: `dp-line-${spec.id}-${lineIdx}`,
    description: lineSpec.description,
    purchaseNature: spec.purchaseNature,
    expenseLedgerId: 10000 + spec.id + lineIdx,
    expenseLedgerName: lineSpec.ledgerName,
    hsnSac: lineSpec.hsnSac,
    quantity: lineSpec.quantity,
    uqc: lineSpec.uqc,
    rate: lineSpec.rate,
    grossAmount: lineSpec.taxableAmount + lineSpec.discount,
    discount: lineSpec.discount,
    taxableAmount: lineSpec.taxableAmount,
    gstRate: lineSpec.gstRate,
    cgst: lineSpec.cgst,
    sgst: lineSpec.sgst,
    igst: lineSpec.igst,
    itcClassification: "eligible",
    tdsApplicable: false,
    tdsSection: "",
    tdsRate: 0,
    tdsAmount: 0,
    tdsOverride: false,
    tdsOverrideReason: "",
    lineTotal: lineSpec.lineTotal,
    remarks: "",
  };
}

function buildWorkflow(status: DirectDemoSpec["workflowStatus"]) {
  const draft = createInitialWorkflow();
  if (status === "posted") {
    let wf = submitForApproval(draft, "Demo submitted");
    while (wf.status !== "posted") {
      wf = approveCurrentStep(wf, undefined, "Demo approved");
    }
    return wf;
  }
  return draft;
}

const DIRECT_DEMO_SPECS: DirectDemoSpec[] = [
  {
    id: 101,
    invoiceNo: "PUR-DP-001",
    scenarioLabel: "Direct Purchase — Fixed Asset",
    vendorId: 1,
    vendorName: "Dell India Pvt Ltd",
    vendorInvoiceNo: "DELL/2026/001",
    invoiceDate: "2026-07-10",
    purchaseNature: "fixed_asset",
    placeOfSupply: "Maharashtra",
    workflowStatus: "posted",
    amountPaid: 0,
    lines: [
      {
        description: "Laptop",
        ledgerName: "Computer Equipment",
        hsnSac: "8471",
        quantity: 2,
        uqc: "NOS",
        rate: 40000,
        discount: 0,
        taxableAmount: 80000,
        gstRate: 18,
        cgst: 7200,
        sgst: 7200,
        igst: 0,
        lineTotal: 94400,
      },
    ],
  },
  {
    id: 102,
    invoiceNo: "PUR-DP-002",
    scenarioLabel: "Direct Purchase — Service",
    vendorId: 2,
    vendorName: "Reliance Jio Infocomm Ltd",
    vendorInvoiceNo: "JIO/2026/458",
    invoiceDate: "2026-07-08",
    purchaseNature: "service",
    placeOfSupply: "Maharashtra",
    workflowStatus: "draft",
    amountPaid: 0,
    lines: [
      {
        description: "Internet Bill",
        ledgerName: "Internet Expense",
        hsnSac: "9984",
        quantity: 1,
        uqc: "SERVICE",
        rate: 5000,
        discount: 0,
        taxableAmount: 5000,
        gstRate: 18,
        cgst: 450,
        sgst: 450,
        igst: 0,
        lineTotal: 5900,
      },
    ],
  },
];

export const PURCHASE_INVOICE_DIRECT_DEMO_LABELS: Record<number, string> = Object.fromEntries(
  DIRECT_DEMO_SPECS.map((s) => [s.id, s.scenarioLabel]),
);

export function buildDirectPurchaseDemoRecords(): PurchaseInvoiceRecord[] {
  const vendors = getActiveVendors();
  return DIRECT_DEMO_SPECS.map((spec) => {
    const vendor = vendors.find((v) => v.id === spec.vendorId);
    const branchGstin = COMPANY_BILLING.gstNumber;
    const directLines = spec.lines.map((l, i) => buildDemoLine(spec, l, i));
    const taxableAmount = directLines.reduce((s, l) => s + l.taxableAmount, 0);
    const cgst = directLines.reduce((s, l) => s + l.cgst, 0);
    const sgst = directLines.reduce((s, l) => s + l.sgst, 0);
    const igst = directLines.reduce((s, l) => s + l.igst, 0);
    const taxAmount = cgst + sgst + igst;
    const grandTotal = taxableAmount + taxAmount;
    const netPayable = grandTotal;
    const due = new Date(spec.invoiceDate);
    due.setDate(due.getDate() + 30);

    return {
      id: spec.id,
      invoiceNo: spec.invoiceNo,
      invoiceDate: spec.invoiceDate,
      vendorInvoiceNo: spec.vendorInvoiceNo,
      vendorId: spec.vendorId,
      vendorName: spec.vendorName || vendor?.vendorName || `Supplier ${spec.vendorId}`,
      vendorGst: vendor?.gstNumber ?? "",
      poId: null,
      poNumber: "",
      poDate: "",
      grnId: null,
      grnNo: "",
      source: "manual_entry",
      sourceType: "direct_purchase",
      purchaseNature: spec.purchaseNature,
      postingDate: spec.invoiceDate,
      placeOfSupply: spec.placeOfSupply,
      branchGstin,
      reverseChargeApplicable: false,
      gstApplicable: true,
      defaultItcClassification: "eligible",
      paymentTerms: vendor?.paymentTerms ?? "Net 30",
      creditDays: 30,
      dueDate: due.toISOString().slice(0, 10),
      currency: "INR",
      referenceNumber: "",
      narration: "",
      tdsApplicable: false,
      directLines,
      lineItems: directLines.map((dl) => ({
        id: dl.id,
        productId: null,
        productName: dl.description,
        description: dl.description,
        invoiceQty: dl.quantity,
        unit: dl.uqc,
        unitPrice: dl.rate,
        taxPct: dl.gstRate,
        lineAmount: dl.taxableAmount,
        taxAmount: dl.cgst + dl.sgst + dl.igst,
        debitedQty: 0,
        debitedAmount: 0,
        directLine: dl,
      })),
      additionalCharges: [],
      productAmount: taxableAmount,
      subtotal: taxableAmount,
      grossAmount: taxableAmount,
      discountTotal: 0,
      taxableAmount,
      taxAmount,
      cgstTotal: cgst,
      sgstTotal: sgst,
      igstTotal: igst,
      tdsDeduction: 0,
      roundingAdjustment: 0,
      grandTotal,
      netPayable,
      amountPaid: spec.amountPaid ?? 0,
      amountDebited: 0,
      balanceDebitAllowed: netPayable,
      debitStatus: "no_debit",
      poAdjustmentStatus: "open",
      remarks: "",
      attachment: DEMO_ATTACHMENT,
      workflow: buildWorkflow(spec.workflowStatus),
      activity: [
        {
          date: spec.invoiceDate,
          action: "Demo Direct Purchase Seeded",
          by: ACCOUNTS_CURRENT_USER,
          remarks: spec.scenarioLabel,
        },
      ],
      createdBy: ACCOUNTS_CURRENT_USER,
      updatedBy: ACCOUNTS_CURRENT_USER,
      createdAt: `${spec.invoiceDate}T10:00:00.000Z`,
      updatedAt: `${spec.invoiceDate}T10:00:00.000Z`,
    } satisfies PurchaseInvoiceRecord;
  });
}

export function mergeDirectPurchaseDemoScenarios(
  existing: PurchaseInvoiceRecord[],
): PurchaseInvoiceRecord[] {
  const pruned = pruneStalePurchaseInvoiceDemos(existing);
  const demos = buildDirectPurchaseDemoRecords();
  const existingIds = new Set(pruned.map((i) => i.id));
  const existingNos = new Set(pruned.map((i) => i.invoiceNo));
  const missing = demos.filter((d) => !existingIds.has(d.id) && !existingNos.has(d.invoiceNo));
  return [...pruned, ...missing];
}
