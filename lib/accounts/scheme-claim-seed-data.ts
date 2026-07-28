/**
 * Phase 1 demo seed payloads for generic Pending Scheme Claims.
 * ERP-calculated values only — Accounts does not recalculate.
 */

import type {
  SchemeCalculationType,
  SchemeClaimExcludedRecord,
  SchemeClaimIncludedRecord,
  SchemeClaimRuleApplied,
} from "@/lib/accounts/scheme-claim-types";
import type {
  SchemeEntitlement,
  SchemeEntitlementInvoiceBreakdown,
} from "@/lib/accounts/scheme-entitlement-demo";

function qtyLine(
  invoiceId: number,
  invoiceNo: string,
  invoiceDate: string,
  lineIdx: number,
  qty: number,
  rate: number,
  eligible: boolean,
  reason = "",
): SchemeClaimIncludedRecord {
  const taxable = qty * rate;
  const benefit = eligible ? Math.round(taxable * 0.05 * 100) / 100 : 0;
  return {
    invoiceId,
    invoiceNumber: invoiceNo,
    invoiceDate,
    invoiceLineId: `${invoiceId}-L${lineIdx}`,
    productId: 100 + lineIdx,
    productName: `Hybrid Seed Pack ${lineIdx}`,
    sku: `SKU-MON-${String(lineIdx).padStart(3, "0")}`,
    invoicedQuantity: qty,
    eligibleQuantity: eligible ? qty : 0,
    uom: "PCS",
    rate,
    taxableValue: taxable,
    appliedRate: eligible ? "5%" : undefined,
    calculatedBenefit: benefit,
    eligibilityStatus: eligible ? "Eligible" : "Excluded",
    eligibilityReason: reason || undefined,
  };
}

function buildQuantityMonsoonSeed(
  eligibleDate: string,
  createdAt: string,
): SchemeEntitlement {
  const invoices: { id: number; no: string; date: string }[] = Array.from(
    { length: 10 },
    (_, i) => ({
      id: 301 + i,
      no: `PVB/SO/25-26/03${String(i + 1).padStart(2, "0")}`,
      date: `2025-0${6 + Math.floor(i / 3)}-${String(10 + i).padStart(2, "0")}`,
    }),
  );

  const includedRecords: SchemeClaimIncludedRecord[] = invoices.flatMap((inv, i) =>
    qtyLine(inv.id, inv.no, inv.date, 1, 100, 850, true),
  );

  const invoiceBreakdown: SchemeEntitlementInvoiceBreakdown[] = invoices.map((inv) => ({
    invoiceId: inv.id,
    invoiceNo: inv.no,
    invoiceDate: inv.date,
    taxableValue: 85000,
    appliedSchemeId: "SCH-MON-001",
    appliedSchemeName: "Monsoon Product Offer",
    includedInCalculation: true,
    exclusionReason: "",
  }));

  const ruleApplied: SchemeClaimRuleApplied = {
    targetQuantity: 1000,
    achievedQuantity: 1000,
    eligibleQuantity: 1000,
    uom: "PCS",
    appliedRate: "5%",
    calculationBasis: "Quantity achievement across eligible invoices (ERP)",
    displaySummary: "1,000 PCS achieved against 1,000 PCS target — 5% benefit",
  };

  const eligibleBase = 850000;
  const benefit = 42500;

  return {
    id: "ent-quantity-monsoon-abc-001",
    claimNumber: "CLM-QTY-MON-2025-001",
    schemeId: "SCH-MON-001",
    schemeCode: "SCH-MON-QTY-1K",
    schemeName: "Monsoon Offer",
    schemeType: "Festive Discount",
    calculationType: "QUANTITY_BASED" as SchemeCalculationType,
    customerId: 1,
    customerCode: "CUST-ABC-001",
    customerName: "ABC Agro Distributor",
    customerType: "Distributor",
    state: "Maharashtra",
    periodStart: "2025-06-01",
    periodEnd: "2025-09-30",
    periodReference: "Monsoon FY 2025-26",
    settlementPeriodStart: "2025-10-01",
    settlementPeriodEnd: "2025-10-31",
    calculationBasis: "Quantity achievement across eligible invoices (ERP)",
    discountType: "Percentage",
    discountRate: 5,
    appliedSlab: "1,000 PCS target",
    grossEligibleAmount: eligibleBase,
    salesReturnAdjustment: 0,
    cancelledInvoiceAdjustment: 0,
    excludedSchemeAmount: 0,
    otherExclusionAmount: 0,
    eligibleBaseAmount: eligibleBase,
    calculatedBenefit: benefit,
    creditNoteAmount: benefit,
    gstTreatment: "Non-GST — quantity scheme benefit",
    mappedLedgerId: null,
    mappedLedgerCode: "LED-QTY-DISC",
    mappedLedgerName: "Dealer Meet Expense",
    status: "Pending Review",
    eligibleDate,
    ruleApplied,
    includedRecords,
    excludedRecords: [],
    invoiceBreakdown,
    supportingReferences: [
      { label: "Target Quantity", value: "1,000 PCS" },
      { label: "Achieved Quantity", value: "1,000 PCS" },
      { label: "Contributing Invoices", value: "10" },
      { label: "Applied Benefit", value: "5%" },
    ],
    actionLog: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function buildTurnoverSeed(eligibleDate: string, createdAt: string): SchemeEntitlement {
  const eligibleBase = 7000000;
  const benefit = 140000;
  const ruleApplied: SchemeClaimRuleApplied = {
    eligibleTurnover: eligibleBase,
    excludedTurnover: 800000,
    appliedSlab: "₹50,00,000 – ₹1,00,00,000",
    appliedRate: "2%",
    exclusionReason: "Monsoon Offer turnover excluded per scheme configuration",
    calculationBasis: "Net eligible turnover (exclusions applied by ERP)",
    displaySummary: "₹70,00,000 eligible turnover · Slab ₹50L–₹1Cr · 2%",
  };

  const includedRecords: SchemeClaimIncludedRecord[] = [
    {
      invoiceId: 201,
      invoiceNumber: "PVB/SO/25-26/0001",
      invoiceDate: "2025-06-15",
      taxableValue: 3500000,
      eligibilityStatus: "Eligible",
    },
    {
      invoiceId: 202,
      invoiceNumber: "PVB/SO/25-26/0042",
      invoiceDate: "2025-09-10",
      taxableValue: 3500000,
      eligibilityStatus: "Eligible",
    },
  ];

  const excludedRecords: SchemeClaimExcludedRecord[] = [
    {
      invoiceId: 101,
      invoiceNumber: "PVB/SO/25-26/0101",
      exclusionReason:
        "Transactions under Monsoon Offer are excluded from Annual Turnover Scheme",
    },
    {
      invoiceId: 203,
      invoiceNumber: "CN-SR-25-26-008",
      exclusionReason: "Sales return adjustment — deducted from gross turnover",
    },
  ];

  return {
    id: "ent-turnover-abc-2025",
    claimNumber: "CLM-TO-ABC-2025-001",
    schemeId: "SCH-TO-001",
    schemeCode: "SCH-TO-ANNUAL-2",
    schemeName: "Annual Turnover Discount",
    schemeType: "Turnover Discount",
    calculationType: "TURNOVER_BASED",
    customerId: 1,
    customerCode: "CUST-ABC-001",
    customerName: "ABC Agro Distributor",
    customerType: "Distributor",
    state: "Maharashtra",
    periodStart: "2025-04-01",
    periodEnd: "2026-03-31",
    periodReference: "FY 2025-26",
    settlementPeriodStart: "2026-04-01",
    settlementPeriodEnd: "2026-04-30",
    calculationBasis: "Net eligible turnover (exclusions applied by ERP)",
    discountType: "Percentage",
    discountRate: 2,
    appliedSlab: "₹50,00,000 – ₹1,00,00,000",
    grossEligibleAmount: 7800000,
    salesReturnAdjustment: 500000,
    cancelledInvoiceAdjustment: 0,
    excludedSchemeAmount: 300000,
    otherExclusionAmount: 0,
    eligibleBaseAmount: eligibleBase,
    calculatedBenefit: benefit,
    creditNoteAmount: benefit,
    gstTreatment: "Non-GST — scheme discount credit (benefit exclusive of GST)",
    mappedLedgerId: null,
    mappedLedgerCode: "LED-TO-DISC",
    mappedLedgerName: "Dealer Meet Expense",
    status: "Pending Review",
    eligibleDate,
    ruleApplied,
    includedRecords,
    excludedRecords,
    invoiceBreakdown: [
      {
        invoiceId: 201,
        invoiceNo: "PVB/SO/25-26/0001",
        invoiceDate: "2025-06-15",
        taxableValue: 3500000,
        appliedSchemeId: null,
        appliedSchemeName: null,
        includedInCalculation: true,
        exclusionReason: "",
      },
      {
        invoiceId: 202,
        invoiceNo: "PVB/SO/25-26/0042",
        invoiceDate: "2025-09-10",
        taxableValue: 3500000,
        appliedSchemeId: null,
        appliedSchemeName: null,
        includedInCalculation: true,
        exclusionReason: "",
      },
      {
        invoiceId: 101,
        invoiceNo: "PVB/SO/25-26/0101",
        invoiceDate: "2025-07-20",
        taxableValue: 300000,
        appliedSchemeId: "SCH-MON-001",
        appliedSchemeName: "Monsoon Product Offer",
        includedInCalculation: false,
        exclusionReason:
          "Transactions under Monsoon Offer are excluded from Annual Turnover Scheme",
      },
      {
        invoiceId: 203,
        invoiceNo: "CN-SR-25-26-008",
        invoiceDate: "2025-11-02",
        taxableValue: 500000,
        appliedSchemeId: null,
        appliedSchemeName: "Sales Return",
        includedInCalculation: false,
        exclusionReason: "Sales return adjustment — deducted from gross turnover",
      },
    ],
    supportingReferences: [
      { label: "Scheme Period", value: "01 Apr 2025 – 31 Mar 2026" },
      { label: "Included Invoices", value: "2" },
      { label: "Excluded Invoices", value: "1 (Monsoon Offer)" },
      { label: "Sales Returns", value: "₹5,00,000" },
      { label: "Net Eligible Turnover", value: "₹70,00,000" },
    ],
    actionLog: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function buildNearExpirySeed(eligibleDate: string, createdAt: string): SchemeEntitlement {
  const invoiceId = 105;
  const invoiceNo = "PVB/SO/25-26/0105";
  const invoiceDate = "2025-12-01";

  const products = [
    "Hybrid Maize Seed",
    "Hybrid Paddy Seed",
    "Hybrid Cotton Seed",
    "Hybrid Soybean Seed",
    "Hybrid Wheat Seed",
    "Hybrid Bajra Seed",
    "Hybrid Jowar Seed",
    "Hybrid Mustard Seed",
    "Hybrid Sunflower Seed",
    "Hybrid Tomato Seed",
  ];

  const includedRecords: SchemeClaimIncludedRecord[] = products.map((name, i) => {
    const lineNum = i + 1;
    const eligible = lineNum <= 5;
    const qty = 50;
    const rate = eligible ? 500 : 400;
    const taxable = qty * rate;
    const benefit = eligible ? Math.round(taxable * 0.08 * 100) / 100 : 0;
    const expiryDate =
      eligible ? "2026-04-30" : "2027-06-30";
    return {
      invoiceId,
      invoiceNumber: invoiceNo,
      invoiceDate,
      invoiceLineId: `${invoiceId}-L${lineNum}`,
      productId: 200 + lineNum,
      productName: name,
      sku: `SKU-NE-${String(lineNum).padStart(3, "0")}`,
      batchNumber: eligible ? `BATCH-NE-882${lineNum}` : `BATCH-FR-${lineNum}`,
      mfgDate: "2025-06-01",
      expiryDate,
      dispatchDate: "2025-12-02",
      invoicedQuantity: qty,
      eligibleQuantity: eligible ? qty : 0,
      uom: "BAG",
      rate,
      taxableValue: taxable,
      appliedRate: eligible ? "8%" : undefined,
      calculatedBenefit: benefit,
      eligibilityStatus: eligible ? "Eligible" : "Excluded",
      eligibilityReason: eligible
        ? "Batch within configured expiry window"
        : "Batch not within expiry window",
    };
  });

  const eligibleLines = includedRecords.filter((l) => l.eligibilityStatus === "Eligible");
  const eligibleBase = eligibleLines.reduce((s, l) => s + l.taxableValue, 0);
  const benefit = eligibleLines.reduce((s, l) => s + (l.calculatedBenefit ?? 0), 0);

  const excludedRecords: SchemeClaimExcludedRecord[] = includedRecords
    .filter((l) => l.eligibilityStatus === "Excluded")
    .map((l) => ({
      invoiceNumber: invoiceNo,
      productName: l.productName,
      batchNumber: l.batchNumber,
      quantity: l.invoicedQuantity,
      uom: l.uom,
      exclusionReason: l.eligibilityReason ?? "Batch not within expiry window",
    }));

  const ruleApplied: SchemeClaimRuleApplied = {
    configuredExpiryWindowDays: 90,
    eligibleLineCount: 5,
    eligibleTaxableValue: eligibleBase,
    appliedRate: "8%",
    referenceDate: "2025-12-01",
    calculationBasis: "Invoice line × ERP expiry slab benefit",
    displaySummary: "5 of 10 invoice lines near-expiry eligible",
  };

  return {
    id: "ent-near-expiry-abc-001",
    claimNumber: "CLM-NE-ABC-2025-001",
    schemeId: "SCH-NE-014",
    schemeCode: "SCH-NE-SLAB-90",
    schemeName: "Near Expiry Shelf-Life Discount",
    schemeType: "Near Expiry Discount",
    calculationType: "NEAR_EXPIRY",
    customerId: 1,
    customerCode: "CUST-ABC-001",
    customerName: "ABC Agro Distributor",
    customerType: "Distributor",
    state: "Maharashtra",
    periodStart: "2025-10-01",
    periodEnd: "2026-03-31",
    periodReference: "H2 FY 2025-26",
    settlementPeriodStart: "2026-04-01",
    settlementPeriodEnd: "2026-04-15",
    calculationBasis: "Invoice line × ERP expiry slab benefit",
    discountType: "Percentage",
    discountRate: 8,
    grossEligibleAmount: 225000,
    salesReturnAdjustment: 0,
    cancelledInvoiceAdjustment: 0,
    excludedSchemeAmount: 0,
    otherExclusionAmount: 100000,
    eligibleBaseAmount: eligibleBase,
    calculatedBenefit: benefit,
    creditNoteAmount: benefit,
    gstTreatment: "Non-GST — near-expiry slab benefit",
    mappedLedgerId: null,
    mappedLedgerCode: "LED-NE-DISC",
    mappedLedgerName: "Farmer Awareness Campaign",
    status: "Pending Review",
    eligibleDate,
    ruleApplied,
    includedRecords,
    excludedRecords,
    invoiceBreakdown: [
      {
        invoiceId,
        invoiceNo,
        invoiceDate,
        taxableValue: eligibleBase,
        appliedSchemeId: "SCH-NE-014",
        appliedSchemeName: "Near Expiry Shelf-Life Discount",
        includedInCalculation: true,
        exclusionReason: "",
      },
    ],
    supportingReferences: [
      { label: "Invoice", value: invoiceNo },
      { label: "Total Lines", value: "10" },
      { label: "Eligible Lines", value: "5" },
      { label: "Configured Expiry Window", value: "90 days" },
      { label: "Reference Date", value: "2025-12-01" },
    ],
    actionLog: [],
    createdAt,
    updatedAt: createdAt,
  };
}

function buildCashDiscountSeed(eligibleDate: string, createdAt: string): SchemeEntitlement {
  const invoiceDate = "2026-01-05";
  const dueDate = "2026-01-20";
  const receiptDate = "2026-01-15";
  const eligibleBase = 177000;
  const benefit = 3540;

  const ruleApplied: SchemeClaimRuleApplied = {
    requiredPaymentDays: 15,
    invoiceDate,
    dueDate,
    receiptDate,
    receiptNumber: "RV-2026-0142",
    actualPaymentDays: 10,
    eligiblePaidAmount: eligibleBase,
    appliedRate: "2%",
    paymentStatus: "Full",
    calculationBasis: "Receipt within early-payment window (ERP)",
    displaySummary: "Paid on Day 10 · Term 15 days · Full payment · 2%",
  };

  const includedRecords: SchemeClaimIncludedRecord[] = [
    {
      invoiceId: 102,
      invoiceNumber: "PVB/SO/25-26/0102",
      invoiceDate,
      invoiceLineId: "102-L1",
      productId: 501,
      productName: "Urea 50kg",
      sku: "SKU-UREA-50",
      invoicedQuantity: 100,
      eligibleQuantity: 100,
      uom: "BAG",
      rate: 1770,
      taxableValue: eligibleBase,
      appliedRate: "2%",
      calculatedBenefit: benefit,
      eligibilityStatus: "Eligible",
    },
  ];

  return {
    id: "ent-cash-disc-abc-001",
    claimNumber: "CLM-CD-ABC-2026-001",
    schemeId: "SCH-CD-005",
    schemeCode: "SCH-CD-EARLY-2",
    schemeName: "Early Payment Cash Discount",
    schemeType: "Cash Discount",
    calculationType: "PAYMENT_BASED",
    customerId: 1,
    customerCode: "CUST-ABC-001",
    customerName: "ABC Agro Distributor",
    customerType: "Distributor",
    state: "Maharashtra",
    periodStart: "2025-04-01",
    periodEnd: "2026-03-31",
    periodReference: "FY 2025-26",
    settlementPeriodStart: "2026-01-01",
    settlementPeriodEnd: "2026-03-31",
    calculationBasis: "Receipt within early-payment window (ERP)",
    discountType: "Percentage",
    discountRate: 2,
    grossEligibleAmount: eligibleBase,
    salesReturnAdjustment: 0,
    cancelledInvoiceAdjustment: 0,
    excludedSchemeAmount: 0,
    otherExclusionAmount: 0,
    eligibleBaseAmount: eligibleBase,
    calculatedBenefit: benefit,
    creditNoteAmount: benefit,
    gstTreatment: "Non-GST — early payment cash discount",
    mappedLedgerId: null,
    mappedLedgerCode: "LED-CD-DISC",
    mappedLedgerName: "Transport - Distributor Deliveries",
    status: "Pending Review",
    eligibleDate,
    ruleApplied,
    includedRecords,
    excludedRecords: [],
    invoiceBreakdown: [
      {
        invoiceId: 102,
        invoiceNo: "PVB/SO/25-26/0102",
        invoiceDate,
        taxableValue: eligibleBase,
        appliedSchemeId: null,
        appliedSchemeName: null,
        includedInCalculation: true,
        exclusionReason: "",
      },
    ],
    supportingReferences: [
      { label: "Invoice", value: "PVB/SO/25-26/0102" },
      { label: "Receipt Voucher", value: "RV-2026-0142" },
      { label: "Receipt Date", value: receiptDate },
      { label: "Due Date", value: dueDate },
      { label: "Payment Terms", value: "15 days" },
      { label: "Actual Payment Days", value: "10" },
      { label: "Amount Settled", value: "₹1,77,000" },
    ],
    actionLog: [],
    createdAt,
    updatedAt: createdAt,
  };
}

/** Approved claim for duplicate-prevention testing — no CN linked yet. */
function buildApprovedForDuplicateTest(
  eligibleDate: string,
  createdAt: string,
): SchemeEntitlement {
  const cash = buildCashDiscountSeed(eligibleDate, createdAt);
  return {
    ...cash,
    id: "ent-cash-disc-approved-dup-test",
    claimNumber: "CLM-CD-DUP-TEST-001",
    schemeCode: "SCH-CD-DUP-TEST",
    status: "Approved",
    actionLog: [
      {
        action: "approve",
        reason: "Approved for duplicate prevention test",
        actor: "Accounts Admin",
        at: createdAt,
      },
    ],
  };
}

export function buildPhase1SeedEntitlements(): SchemeEntitlement[] {
  const eligibleDate = new Date().toISOString().slice(0, 10);
  const createdAt = new Date().toISOString();
  return [
    buildQuantityMonsoonSeed(eligibleDate, createdAt),
    buildTurnoverSeed(eligibleDate, createdAt),
    buildNearExpirySeed(eligibleDate, createdAt),
    buildCashDiscountSeed(eligibleDate, createdAt),
    buildApprovedForDuplicateTest(eligibleDate, createdAt),
  ];
}
