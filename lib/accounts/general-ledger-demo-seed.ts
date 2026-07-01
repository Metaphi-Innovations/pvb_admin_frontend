/**
 * General Ledger demo seed — ABC Agro Distributor with ₹50,000 Dr opening
 * and 20+ posted transactions across all voucher types for running-balance demo.
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
import { resolveLedgerIdByName } from "@/lib/accounts/general-ledger-data";

export const GENERAL_LEDGER_DEMO_SEED_VERSION = "2026-gl-abc-demo-v1";
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

function seedGlDemoVouchers(abc: ChartOfAccount): void {
  const bank = findLedger("HDFC") ?? findLedger("Bank");
  const sales = findLedger("Fertilizer Sales") ?? findLedger("Sales");
  const purchase = findLedger("Fertilizer Purchase") ?? findLedger("Purchase");
  const vendor = findLedger("GreenField") ?? findLedger("Bharat Seeds");

  if (!bank || !sales) return;

  type DemoSpec = {
    type: "sales" | "purchase" | "journal" | "receipt" | "payment" | "credit_note" | "debit_note";
    date: string;
    no: string;
    narration: string;
    abcDebit: number;
    abcCredit: number;
    contraName: string;
    contraId: number;
    contraDebit: number;
    contraCredit: number;
  };

  const specs: DemoSpec[] = [
    { type: "sales", date: "2026-04-05", no: `${DEMO_PREFIX}SI-01`, narration: "Sales invoice — urea dispatch", abcDebit: 20000, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 20000 },
    { type: "receipt", date: "2026-04-08", no: `${DEMO_PREFIX}RV-01`, narration: "NEFT receipt — partial settlement", abcDebit: 0, abcCredit: 15000, contraName: bank.accountName, contraId: bank.id, contraDebit: 15000, contraCredit: 0 },
    { type: "credit_note", date: "2026-04-12", no: `${DEMO_PREFIX}CN-01`, narration: "Credit note — sales return", abcDebit: 0, abcCredit: 5000, contraName: sales.accountName, contraId: sales.id, contraDebit: 5000, contraCredit: 0 },
    { type: "sales", date: "2026-04-15", no: `${DEMO_PREFIX}SI-02`, narration: "Sales invoice — DAP bulk order", abcDebit: 35400, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 35400 },
    { type: "receipt", date: "2026-04-18", no: `${DEMO_PREFIX}RV-02`, narration: "Cheque receipt against SI-02", abcDebit: 0, abcCredit: 25000, contraName: bank.accountName, contraId: bank.id, contraDebit: 25000, contraCredit: 0 },
    { type: "journal", date: "2026-04-20", no: `${DEMO_PREFIX}JV-01`, narration: "Debit note adjustment journal", abcDebit: 3200, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 3200 },
    { type: "sales", date: "2026-04-22", no: `${DEMO_PREFIX}SI-03`, narration: "Sales invoice — pesticide combo", abcDebit: 18750, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 18750 },
    { type: "payment", date: "2026-04-25", no: `${DEMO_PREFIX}PV-01`, narration: "Advance adjusted against purchase", abcDebit: 8500, abcCredit: 0, contraName: bank.accountName, contraId: bank.id, contraDebit: 0, contraCredit: 8500 },
    { type: "receipt", date: "2026-04-28", no: `${DEMO_PREFIX}RV-03`, narration: "UPI collection — field counter", abcDebit: 0, abcCredit: 12000, contraName: bank.accountName, contraId: bank.id, contraDebit: 12000, contraCredit: 0 },
    { type: "credit_note", date: "2026-05-02", no: `${DEMO_PREFIX}CN-02`, narration: "Credit note — rate difference", abcDebit: 0, abcCredit: 2750, contraName: sales.accountName, contraId: sales.id, contraDebit: 2750, contraCredit: 0 },
    { type: "sales", date: "2026-05-05", no: `${DEMO_PREFIX}SI-04`, narration: "Sales invoice — NPK seasonal pack", abcDebit: 42500, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 42500 },
    { type: "receipt", date: "2026-05-08", no: `${DEMO_PREFIX}RV-04`, narration: "RTGS receipt — against SI-04", abcDebit: 0, abcCredit: 30000, contraName: bank.accountName, contraId: bank.id, contraDebit: 30000, contraCredit: 0 },
    { type: "journal", date: "2026-05-10", no: `${DEMO_PREFIX}JV-02`, narration: "Interest on delayed payment", abcDebit: 1500, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 1500 },
    { type: "sales", date: "2026-05-12", no: `${DEMO_PREFIX}SI-05`, narration: "Sales invoice — seed distribution", abcDebit: 23600, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 23600 },
    { type: "credit_note", date: "2026-05-15", no: `${DEMO_PREFIX}CN-03`, narration: "Credit note — damaged bags", abcDebit: 0, abcCredit: 4200, contraName: sales.accountName, contraId: sales.id, contraDebit: 4200, contraCredit: 0 },
    { type: "receipt", date: "2026-05-18", no: `${DEMO_PREFIX}RV-05`, narration: "Cash deposit — collection drive", abcDebit: 0, abcCredit: 18000, contraName: bank.accountName, contraId: bank.id, contraDebit: 18000, contraCredit: 0 },
    { type: "payment", date: "2026-05-20", no: `${DEMO_PREFIX}PV-02`, narration: "Security deposit refund offset", abcDebit: 6000, abcCredit: 0, contraName: bank.accountName, contraId: bank.id, contraDebit: 0, contraCredit: 6000 },
    { type: "sales", date: "2026-05-22", no: `${DEMO_PREFIX}SI-06`, narration: "Sales invoice — micronutrient kit", abcDebit: 15800, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 15800 },
    { type: "journal", date: "2026-05-25", no: `${DEMO_PREFIX}JV-03`, narration: "Round-off adjustment", abcDebit: 0, abcCredit: 50, contraName: sales.accountName, contraId: sales.id, contraDebit: 50, contraCredit: 0 },
    { type: "receipt", date: "2026-05-28", no: `${DEMO_PREFIX}RV-06`, narration: "Final settlement — May outstanding", abcDebit: 0, abcCredit: 22000, contraName: bank.accountName, contraId: bank.id, contraDebit: 22000, contraCredit: 0 },
    { type: "sales", date: "2026-06-01", no: `${DEMO_PREFIX}SI-07`, narration: "Sales invoice — kharif pre-booking", abcDebit: 52000, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 52000 },
    { type: "receipt", date: "2026-06-04", no: `${DEMO_PREFIX}RV-07`, narration: "Advance receipt — kharif booking", abcDebit: 0, abcCredit: 25000, contraName: bank.accountName, contraId: bank.id, contraDebit: 25000, contraCredit: 0 },
    { type: "credit_note", date: "2026-06-08", no: `${DEMO_PREFIX}CN-04`, narration: "Credit note — scheme discount", abcDebit: 0, abcCredit: 3500, contraName: sales.accountName, contraId: sales.id, contraDebit: 3500, contraCredit: 0 },
    { type: "sales", date: "2026-06-12", no: `${DEMO_PREFIX}SI-08`, narration: "Sales invoice — herbicide stock", abcDebit: 28900, abcCredit: 0, contraName: sales.accountName, contraId: sales.id, contraDebit: 0, contraCredit: 28900 },
  ];

  if (purchase && vendor) {
    specs.push({
      type: "purchase",
      date: "2026-06-15",
      no: `${DEMO_PREFIX}PI-01`,
      narration: "Purchase invoice — advance adjustment",
      abcDebit: 11800,
      abcCredit: 0,
      contraName: purchase.accountName,
      contraId: purchase.id,
      contraDebit: 0,
      contraCredit: 11800,
    });
    specs.push({
      type: "debit_note",
      date: "2026-06-18",
      no: `${DEMO_PREFIX}DN-01`,
      narration: "Debit note — vendor rate correction",
      abcDebit: 5900,
      abcCredit: 0,
      contraName: vendor.accountName,
      contraId: vendor.id,
      contraDebit: 0,
      contraCredit: 5900,
    });
  }

  const existing = new Set(loadVouchers().map((v) => v.voucherNumber));

  for (const spec of specs) {
    if (existing.has(spec.no)) continue;

    const lines = [
      {
        id: 1,
        ledgerId: abc.id,
        ledgerName: abc.accountName,
        debit: spec.abcDebit,
        credit: spec.abcCredit,
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

    const v = createVoucher(spec.type, {
      date: spec.date,
      referenceNo: spec.no,
      narration: spec.narration,
      status: "posted",
      lines,
    });
    setVoucherNumber(v.id, spec.no);
  }
}

export function seedGeneralLedgerDemoData(force = false): void {
  if (typeof window === "undefined") return;

  ensureDayBookDemoOnPageLoad();

  const stored = localStorage.getItem(VERSION_KEY);
  if (!force && stored === GENERAL_LEDGER_DEMO_SEED_VERSION) return;

  const abcId = resolveLedgerIdByName("ABC Agro Distributor");
  if (!abcId) return;

  const abc = loadChartOfAccounts().find((r) => r.id === abcId);
  if (!abc) return;

  setAbcOpeningBalance(abc);

  if (countPostedLinesForLedger(abcId) < 20) {
    seedGlDemoVouchers(abc);
  }

  localStorage.setItem(VERSION_KEY, GENERAL_LEDGER_DEMO_SEED_VERSION);
}

export function ensureGeneralLedgerDemoOnPageLoad(): void {
  seedGeneralLedgerDemoData();
}
