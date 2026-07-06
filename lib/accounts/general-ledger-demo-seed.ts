import { demoDateAt } from "@/lib/accounts/demo-date-utils";
/**
 * General Ledger demo seed — posted transactions across key ledgers
 * (customers, suppliers, bank, sales, purchase, GST, expense) for listing + detail demo.
 */

import {
  createVoucher,
  loadVouchers,
  saveVouchers,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import {
  loadChartOfAccounts,
  saveChartOfAccounts,
  type ChartOfAccount,
} from "@/app/(app)/accounts/data";
import { ensureDayBookDemoOnPageLoad } from "@/lib/accounts/day-book-demo-seed";
import { scheduleDeferredDemoSeed } from "@/lib/accounts/deferred-demo-seed";
import { resolveLedgerIdByName } from "@/lib/accounts/general-ledger-data";

export const GENERAL_LEDGER_DEMO_SEED_VERSION = "multi-ledger-v2";
const VERSION_KEY = "ds_general_ledger_demo_seed_version";
const DEMO_PREFIX = "GL-DEMO-";

function findLedger(namePart: string): ChartOfAccount | null {
  return (
    loadChartOfAccounts().find(
      (r) =>
        r.nodeLevel === "ledger" &&
        r.accountName.toLowerCase().includes(namePart.toLowerCase()),
    ) ?? null
  );
}

function setVoucherNumber(voucherId: number, voucherNumber: string): void {
  const list = loadVouchers();
  const idx = list.findIndex((v) => v.id === voucherId);
  if (idx >= 0) {
    list[idx] = { ...list[idx], voucherNumber };
    saveVouchers(list);
  }
}

function countPostedLinesForLedger(ledgerId: number): number {
  return loadVouchers()
    .filter((v) => v.status === "posted" || v.status === "approved")
    .reduce((count, v) => count + v.lines.filter((l) => l.ledgerId === ledgerId).length, 0);
}

type DemoSpec = {
  type: "sales" | "purchase" | "journal" | "receipt" | "payment" | "credit_note" | "debit_note" | "contra";
  date: string;
  no: string;
  narration: string;
  primaryDebit: number;
  primaryCredit: number;
  contraName: string;
  contraId: number;
  contraDebit: number;
  contraCredit: number;
};

function seedVouchersForLedger(primary: ChartOfAccount, specs: DemoSpec[]): void {
  const existing = new Set(loadVouchers().map((v) => v.voucherNumber));

  for (const spec of specs) {
    if (existing.has(spec.no)) continue;

    const lines = [
      {
        id: 1,
        ledgerId: primary.id,
        ledgerName: primary.accountName,
        debit: spec.primaryDebit,
        credit: spec.primaryCredit,
        remarks: spec.narration,
      },
      {
        id: 2,
        ledgerId: spec.contraId,
        ledgerName: spec.contraName,
        debit: spec.contraDebit,
        credit: spec.contraCredit,
        remarks: spec.contraName,
      },
    ];

    const v = createVoucher(spec.type === "contra" ? "journal" : spec.type, {
      date: spec.date,
      referenceNo: spec.no,
      narration: spec.narration,
      status: "posted",
      lines,
    });
    setVoucherNumber(v.id, spec.no);
  }
}

function abcAgroSpecs(bank: ChartOfAccount, sales: ChartOfAccount, purchase: ChartOfAccount, vendor: ChartOfAccount | null): DemoSpec[] {
  const specs: DemoSpec[] = [
    { type: "sales", date: demoDateAt(0), no: `${DEMO_PREFIX}SI-01`, narration: "Sales invoice — urea dispatch", primaryDebit: 20000, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 20000 },
    { type: "receipt", date: demoDateAt(1), no: `${DEMO_PREFIX}RV-01`, narration: "NEFT receipt — partial settlement", primaryDebit: 0, primaryCredit: 15000, contraName: bank.accountName, contraId: bank.id, contraDebit: 15000, contraCredit: 0 },
    { type: "credit_note", date: demoDateAt(2), no: `${DEMO_PREFIX}CN-01`, narration: "Credit note — sales return", primaryDebit: 0, primaryCredit: 5000, contraName: sales.accountName, contraId: sales.id, contraDebit: 5000, contraCredit: 0 },
    { type: "sales", date: demoDateAt(3), no: `${DEMO_PREFIX}SI-02`, narration: "Sales invoice — DAP bulk order", primaryDebit: 35400, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 35400 },
    { type: "receipt", date: demoDateAt(4), no: `${DEMO_PREFIX}RV-02`, narration: "Cheque receipt against SI-02", primaryDebit: 0, primaryCredit: 25000, contraName: bank.accountName, contraId: bank.id, contraDebit: 25000, contraCredit: 0 },
    { type: "journal", date: demoDateAt(5), no: `${DEMO_PREFIX}JV-01`, narration: "Debit note adjustment journal", primaryDebit: 3200, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 3200 },
    { type: "sales", date: demoDateAt(6), no: `${DEMO_PREFIX}SI-03`, narration: "Sales invoice — pesticide combo", primaryDebit: 18750, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 18750 },
    { type: "payment", date: demoDateAt(7), no: `${DEMO_PREFIX}PV-01`, narration: "Advance adjusted against purchase", primaryDebit: 8500, primaryCredit: 0, contraName: bank.accountName, contraId: bank.id, contraDebit: 0, contraCredit: 8500 },
    { type: "receipt", date: demoDateAt(8), no: `${DEMO_PREFIX}RV-03`, narration: "UPI collection — field counter", primaryDebit: 0, primaryCredit: 12000, contraName: bank.accountName, contraId: bank.id, contraDebit: 12000, contraCredit: 0 },
    { type: "credit_note", date: demoDateAt(9), no: `${DEMO_PREFIX}CN-02`, narration: "Credit note — rate difference", primaryDebit: 0, primaryCredit: 2750, contraName: sales.accountName, contraId: sales.id, contraDebit: 2750, contraCredit: 0 },
    { type: "sales", date: demoDateAt(10), no: `${DEMO_PREFIX}SI-04`, narration: "Sales invoice — NPK seasonal pack", primaryDebit: 42500, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 42500 },
    { type: "receipt", date: demoDateAt(11), no: `${DEMO_PREFIX}RV-04`, narration: "RTGS receipt — against SI-04", primaryDebit: 0, primaryCredit: 30000, contraName: bank.accountName, contraId: bank.id, contraDebit: 30000, contraCredit: 0 },
    { type: "journal", date: demoDateAt(12), no: `${DEMO_PREFIX}JV-02`, narration: "Interest on delayed payment", primaryDebit: 1500, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 1500 },
    { type: "sales", date: demoDateAt(13), no: `${DEMO_PREFIX}SI-05`, narration: "Sales invoice — seed distribution", primaryDebit: 23600, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 23600 },
    { type: "credit_note", date: demoDateAt(14), no: `${DEMO_PREFIX}CN-03`, narration: "Credit note — damaged bags", primaryDebit: 0, primaryCredit: 4200, contraName: sales.accountName, contraId: sales.id, contraDebit: 4200, contraCredit: 0 },
    { type: "receipt", date: demoDateAt(15), no: `${DEMO_PREFIX}RV-05`, narration: "Cash deposit — collection drive", primaryDebit: 0, primaryCredit: 18000, contraName: bank.accountName, contraId: bank.id, contraDebit: 18000, contraCredit: 0 },
    { type: "payment", date: demoDateAt(16), no: `${DEMO_PREFIX}PV-02`, narration: "Security deposit refund offset", primaryDebit: 6000, primaryCredit: 0, contraName: bank.accountName, contraId: bank.id, contraDebit: 0, contraCredit: 6000 },
    { type: "sales", date: demoDateAt(17), no: `${DEMO_PREFIX}SI-06`, narration: "Sales invoice — micronutrient kit", primaryDebit: 15800, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 15800 },
    { type: "journal", date: demoDateAt(18), no: `${DEMO_PREFIX}JV-03`, narration: "Round-off adjustment", primaryDebit: 0, primaryCredit: 50, contraName: sales.accountName, contraId: sales.id, contraDebit: 50, contraCredit: 0 },
    { type: "receipt", date: demoDateAt(19), no: `${DEMO_PREFIX}RV-06`, narration: "Final settlement — May outstanding", primaryDebit: 0, primaryCredit: 22000, contraName: bank.accountName, contraId: bank.id, contraDebit: 22000, contraCredit: 0 },
    { type: "sales", date: demoDateAt(20), no: `${DEMO_PREFIX}SI-07`, narration: "Sales invoice — kharif pre-booking", primaryDebit: 52000, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 52000 },
    { type: "receipt", date: demoDateAt(21), no: `${DEMO_PREFIX}RV-07`, narration: "Advance receipt — kharif booking", primaryDebit: 0, primaryCredit: 25000, contraName: bank.accountName, contraId: bank.id, contraDebit: 25000, contraCredit: 0 },
    { type: "credit_note", date: demoDateAt(22), no: `${DEMO_PREFIX}CN-04`, narration: "Credit note — scheme discount", primaryDebit: 0, primaryCredit: 3500, contraName: sales.accountName, contraId: sales.id, contraDebit: 3500, contraCredit: 0 },
    { type: "sales", date: demoDateAt(23), no: `${DEMO_PREFIX}SI-08`, narration: "Sales invoice — herbicide stock", primaryDebit: 28900, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 28900 },
  ];

  if (purchase && vendor) {
    specs.push({
      type: "purchase",
      date: demoDateAt(24),
      no: `${DEMO_PREFIX}PI-01`,
      narration: "Purchase invoice — advance adjustment",
      primaryDebit: 11800,
      primaryCredit: 0,
      contraName: purchase.accountName,
      contraId: purchase.id,
      contraDebit: 0,
      contraCredit: 11800,
    });
    specs.push({
      type: "debit_note",
      date: demoDateAt(25),
      no: `${DEMO_PREFIX}DN-01`,
      narration: "Debit note — vendor rate correction",
      primaryDebit: 5900,
      primaryCredit: 0,
      contraName: vendor.accountName,
      contraId: vendor.id,
      contraDebit: 0,
      contraCredit: 5900,
    });
  }

  return specs;
}

function seedSecondaryLedgers(
  bank: ChartOfAccount,
  sales: ChartOfAccount,
  purchase: ChartOfAccount,
): void {
  const targets: Array<{ key: string; specs: (ledger: ChartOfAccount) => DemoSpec[] }> = [
    {
      key: "Reliance",
      specs: (customer) => [
        { type: "sales", date: demoDateAt(2), no: `${DEMO_PREFIX}SI-RAL-01`, narration: "Sales invoice — Reliance Agri", primaryDebit: 97650, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 97650 },
        { type: "receipt", date: demoDateAt(5), no: `${DEMO_PREFIX}RV-RAL-01`, narration: "Receipt — Reliance Agri", primaryDebit: 0, primaryCredit: 50000, contraName: bank.accountName, contraId: bank.id, contraDebit: 50000, contraCredit: 0 },
        { type: "credit_note", date: demoDateAt(8), no: `${DEMO_PREFIX}CN-RAL-01`, narration: "Credit note — Reliance rate diff", primaryDebit: 0, primaryCredit: 2650, contraName: sales.accountName, contraId: sales.id, contraDebit: 2650, contraCredit: 0 },
      ],
    },
    {
      key: "Rallis",
      specs: (vendor) => [
        { type: "purchase", date: demoDateAt(3), no: `${DEMO_PREFIX}PI-RAL-01`, narration: "Purchase bill — Rallis India Ltd", primaryDebit: 0, primaryCredit: 118000, contraName: purchase.accountName, contraId: purchase.id, contraDebit: 118000, contraCredit: 0 },
        { type: "payment", date: demoDateAt(6), no: `${DEMO_PREFIX}PV-RAL-01`, narration: "Payment — Rallis India Ltd", primaryDebit: 75000, primaryCredit: 0, contraName: bank.accountName, contraId: bank.id, contraDebit: 0, contraCredit: 75000 },
        { type: "debit_note", date: demoDateAt(10), no: `${DEMO_PREFIX}DN-RAL-01`, narration: "Debit note — Rallis rate correction", primaryDebit: 8500, primaryCredit: 0, contraName: purchase.accountName, contraId: purchase.id, contraDebit: 0, contraCredit: 8500 },
      ],
    },
    {
      key: "HDFC Current",
      specs: (hdfc) => [
        { type: "receipt", date: demoDateAt(1), no: `${DEMO_PREFIX}RV-HDFC-01`, narration: "NEFT collection — HDFC Bank", primaryDebit: 185000, primaryCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 185000 },
        { type: "payment", date: demoDateAt(4), no: `${DEMO_PREFIX}PV-HDFC-01`, narration: "Vendor payment through HDFC Bank", primaryDebit: 0, primaryCredit: 95000, contraName: purchase.accountName, contraId: purchase.id, contraDebit: 95000, contraCredit: 0 },
        { type: "contra", date: demoDateAt(7), no: `${DEMO_PREFIX}CV-HDFC-01`, narration: "Contra — cash deposit to HDFC", primaryDebit: 45000, primaryCredit: 0, contraName: findLedger("Branch Counter Cash")?.accountName ?? sales.accountName, contraId: findLedger("Branch Counter Cash")?.id ?? sales.id, contraDebit: 0, contraCredit: 45000 },
      ],
    },
    {
      key: "Fertilizer Sales",
      specs: (salesLedger) => [
        { type: "sales", date: demoDateAt(0), no: `${DEMO_PREFIX}SI-SA-01`, narration: "Sales account — fertilizer dispatch", primaryDebit: 0, primaryCredit: 85000, contraName: findLedger("ABC Agro")?.accountName ?? bank.accountName, contraId: findLedger("ABC Agro")?.id ?? bank.id, contraDebit: 85000, contraCredit: 0 },
        { type: "sales", date: demoDateAt(9), no: `${DEMO_PREFIX}SI-SA-02`, narration: "Sales account — seasonal pack", primaryDebit: 0, primaryCredit: 62400, contraName: findLedger("Reliance")?.accountName ?? bank.accountName, contraId: findLedger("Reliance")?.id ?? bank.id, contraDebit: 62400, contraCredit: 0 },
      ],
    },
    {
      key: "Fertilizer Purchase",
      specs: (purchaseLedger) => [
        { type: "purchase", date: demoDateAt(2), no: `${DEMO_PREFIX}PI-PA-01`, narration: "Purchase account — raw material", primaryDebit: 145000, primaryCredit: 0, contraName: findLedger("Rallis")?.accountName ?? bank.accountName, contraId: findLedger("Rallis")?.id ?? bank.id, contraDebit: 0, contraCredit: 145000 },
        { type: "purchase", date: demoDateAt(11), no: `${DEMO_PREFIX}PI-PA-02`, narration: "Purchase account — inventory refill", primaryDebit: 78000, primaryCredit: 0, contraName: findLedger("GreenField")?.accountName ?? bank.accountName, contraId: findLedger("GreenField")?.id ?? bank.id, contraDebit: 0, contraCredit: 78000 },
      ],
    },
    {
      key: "Output CGST",
      specs: (gst) => [
        { type: "sales", date: demoDateAt(3), no: `${DEMO_PREFIX}JV-OCGST-01`, narration: "Output CGST on sales invoice", primaryDebit: 0, primaryCredit: 7650, contraName: sales.accountName, contraId: sales.id, contraDebit: 7650, contraCredit: 0 },
        { type: "journal", date: demoDateAt(12), no: `${DEMO_PREFIX}JV-OCGST-02`, narration: "Output CGST adjustment", primaryDebit: 0, primaryCredit: 1200, contraName: sales.accountName, contraId: sales.id, contraDebit: 1200, contraCredit: 0 },
      ],
    },
    {
      key: "Output SGST",
      specs: (gst) => [
        { type: "sales", date: demoDateAt(3), no: `${DEMO_PREFIX}JV-OSGST-01`, narration: "Output SGST on sales invoice", primaryDebit: 0, primaryCredit: 7650, contraName: sales.accountName, contraId: sales.id, contraDebit: 7650, contraCredit: 0 },
        { type: "journal", date: demoDateAt(12), no: `${DEMO_PREFIX}JV-OSGST-02`, narration: "Output SGST adjustment", primaryDebit: 0, primaryCredit: 1200, contraName: sales.accountName, contraId: sales.id, contraDebit: 1200, contraCredit: 0 },
      ],
    },
    {
      key: "GST Input Credit (CGST)",
      specs: (gst) => [
        { type: "purchase", date: demoDateAt(4), no: `${DEMO_PREFIX}JV-ICGST-01`, narration: "Input CGST on purchase bill", primaryDebit: 9000, primaryCredit: 0, contraName: purchase.accountName, contraId: purchase.id, contraDebit: 0, contraCredit: 9000 },
        { type: "journal", date: demoDateAt(14), no: `${DEMO_PREFIX}JV-ICGST-02`, narration: "Input CGST credit adjustment", primaryDebit: 2400, primaryCredit: 0, contraName: purchase.accountName, contraId: purchase.id, contraDebit: 0, contraCredit: 2400 },
      ],
    },
    {
      key: "Transport - Fertilizer Inward",
      specs: (freight) => [
        { type: "purchase", date: demoDateAt(5), no: `${DEMO_PREFIX}JV-FRT-01`, narration: "Freight expense — fertilizer inward", primaryDebit: 12500, primaryCredit: 0, contraName: purchase.accountName, contraId: purchase.id, contraDebit: 0, contraCredit: 12500 },
        { type: "payment", date: demoDateAt(13), no: `${DEMO_PREFIX}PV-FRT-01`, narration: "Freight payment — transporter", primaryDebit: 0, primaryCredit: 6800, contraName: bank.accountName, contraId: bank.id, contraDebit: 6800, contraCredit: 0 },
      ],
    },
  ];

  for (const target of targets) {
    const ledger = findLedger(target.key);
    if (!ledger) continue;
    if (countPostedLinesForLedger(ledger.id) >= 2) continue;
    seedVouchersForLedger(ledger, target.specs(ledger));
  }
}

function setAbcOpeningBalance(ledger: ChartOfAccount): void {
  const records = loadChartOfAccounts();
  const idx = records.findIndex((r) => r.id === ledger.id);
  if (idx < 0) return;
  records[idx] = {
    ...records[idx],
    openingBalance: 50000,
    balanceType: "Debit",
  };
  saveChartOfAccounts(records);
}

export function seedGeneralLedgerDemoData(force = false): void {
  if (typeof window === "undefined") return;

  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === GENERAL_LEDGER_DEMO_SEED_VERSION) return;

  ensureDayBookDemoOnPageLoad();

  const abcId = resolveLedgerIdByName("ABC Agro Distributor");
  if (!abcId) return;

  const abc = loadChartOfAccounts().find((r) => r.id === abcId);
  if (!abc) return;

  const bank = findLedger("HDFC Current") ?? findLedger("HDFC");
  const sales = findLedger("Fertilizer Sales") ?? findLedger("Sales");
  const purchase = findLedger("Fertilizer Purchase") ?? findLedger("Purchase");
  const vendor = findLedger("GreenField") ?? findLedger("Bharat Seeds");

  if (!bank || !sales) return;

  setAbcOpeningBalance(abc);

  if (countPostedLinesForLedger(abcId) < 20) {
    seedVouchersForLedger(abc, abcAgroSpecs(bank, sales, purchase!, vendor));
  }

  seedSecondaryLedgers(bank, sales, purchase!);

  localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_DEMO_SEED_VERSION);
}

export function ensureGeneralLedgerDemoOnPageLoad(): void {
  if (typeof window !== "undefined" && localStorage.getItem(VERSION_KEY) === GENERAL_LEDGER_DEMO_SEED_VERSION) {
    return;
  }
  seedGeneralLedgerDemoData();
}

export function scheduleGeneralLedgerDemoOnPageLoad(): void {
  scheduleDeferredDemoSeed("general-ledger-demo", ensureGeneralLedgerDemoOnPageLoad);
}
