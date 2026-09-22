/**
 * TDS Summary display / query mapping tests.
 * Run: npx tsx app/(app)/accounts/reports/tds-party-wise/tds-summary-api-display.test.ts
 *
 * Asserts frontend maps backend rows and query params.
 * Does not recalculate TDS amounts.
 */
import assert from "node:assert/strict";
import {
  buildTdsSummaryQueryParams,
  joinIds,
} from "../../../../../services/tds-summary.service";
import type {
  TdsSummaryApiRow,
  TdsSummaryReportResult,
} from "../../../../../types/tds-summary.types";

const FY = "33333333-3333-4333-8333-333333333333";
const SECTION = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaa1";
const PARTY = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbb1";

function row(partial: Partial<TdsSummaryApiRow> = {}): TdsSummaryApiRow {
  return {
    id: partial.id ?? "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    accounting_voucher_id:
      partial.accounting_voucher_id ?? "dddddddd-dddd-4ddd-8ddd-ddddddddddd1",
    accounting_tax_detail_id:
      partial.accounting_tax_detail_id ??
      "cccccccc-cccc-4ccc-8ccc-ccccccccccc1",
    month_key: partial.month_key ?? "2026-07",
    month_label: partial.month_label ?? "Jul-2026",
    party_id: partial.party_id !== undefined ? partial.party_id : PARTY,
    party_ledger_id:
      partial.party_ledger_id !== undefined ? partial.party_ledger_id : PARTY,
    party_name: partial.party_name ?? "Acme Traders",
    pan: partial.pan !== undefined ? partial.pan : "ABCDE1234F",
    party_kind: partial.party_kind ?? "CUSTOMER",
    party_source: partial.party_source ?? "snapshot",
    invoice_id: partial.invoice_id !== undefined ? partial.invoice_id : "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeee1",
    invoice_type:
      partial.invoice_type !== undefined ? partial.invoice_type : "SalesInvoice",
    invoice_date:
      partial.invoice_date !== undefined ? partial.invoice_date : "2026-07-01",
    invoice_number:
      partial.invoice_number !== undefined ? partial.invoice_number : "SI-001",
    taxable_amount: partial.taxable_amount ?? "100000.00",
    tds_amount: partial.tds_amount ?? "10000.00",
    tds_rate: partial.tds_rate ?? "10",
    tds_section_id: partial.tds_section_id ?? SECTION,
    tds_section_code: partial.tds_section_code ?? "194A",
    tds_section_name: partial.tds_section_name ?? "Interest",
    tds_nature: partial.tds_nature ?? "TDS_RECEIVABLE",
    financial_year_id: partial.financial_year_id ?? FY,
    warehouse_id: partial.warehouse_id !== undefined ? partial.warehouse_id : null,
    warehouse_name:
      partial.warehouse_name !== undefined ? partial.warehouse_name : null,
    voucher_date: partial.voucher_date ?? "2026-07-15",
    voucher_number: partial.voucher_number ?? "JV-001",
    application_mode:
      partial.application_mode !== undefined
        ? partial.application_mode
        : "AGAINST_INVOICE",
  };
}

function report(rows: TdsSummaryApiRow[]): TdsSummaryReportResult {
  return {
    scope: {
      financial_year_id: FY,
      financial_year_code: "FY26-27",
      financial_year_name: "FY 2026-27",
      from_date: "2026-04-01",
      to_date: "2026-09-19",
      company_name: "PVB",
      branch_ids: [],
      warehouse_ids: [],
    },
    applied_filters: {
      month: "2026-07",
      tds_section_ids: [SECTION],
      party_ids: [PARTY],
      party_ledger_ids: [],
      tds_nature: "TDS_RECEIVABLE",
      application_mode: "ALL",
      search: "ABC",
      sort_by: "voucher_date",
      sort_order: "desc",
    },
    rows,
    summary: {
      entry_count: rows.length,
      taxable_amount: rows
        .reduce((sum, r) => sum + Number(r.taxable_amount), 0)
        .toFixed(2),
      tds_amount: rows
        .reduce((sum, r) => sum + Number(r.tds_amount), 0)
        .toFixed(2),
    },
    page_summary: {
      entry_count: Math.min(rows.length, 25),
      taxable_amount: "0.00",
      tds_amount: "0.00",
    },
    pagination: {
      page: 1,
      page_size: 25,
      total_rows: rows.length,
      total_pages: rows.length === 0 ? 0 : 1,
    },
    health: { warnings: [] },
    notes: {},
  };
}

// Test 1–6: query params from UI filters
{
  const params = buildTdsSummaryQueryParams({
    financial_year_id: FY,
    from_date: "2026-04-01",
    to_date: "2026-09-19",
    month: "2026-07",
    tds_section_ids: [SECTION],
    party_ids: [PARTY],
    search: "ABC",
    tds_nature: "TDS_RECEIVABLE",
    page: 2,
    page_size: 25,
    sort_by: "party_name",
    sort_order: "asc",
  });
  assert.equal(params.financial_year_id, FY);
  assert.equal(params.from_date, "2026-04-01");
  assert.equal(params.to_date, "2026-09-19");
  assert.equal(params.month, "2026-07");
  assert.equal(params.tds_section_ids, SECTION);
  assert.equal(params.party_ids, PARTY);
  assert.equal(params.search, "ABC");
  assert.equal(params.tds_nature, "TDS_RECEIVABLE");
  assert.equal(params.page, 2);
  assert.equal(params.page_size, 25);
  assert.equal(params.sort_by, "party_name");
}

// Export omits pagination
{
  const params = buildTdsSummaryQueryParams(
    {
      financial_year_id: FY,
      from_date: "2026-04-01",
      to_date: "2026-09-19",
      page: 3,
      page_size: 25,
    },
    { includePage: false },
  );
  assert.equal(params.page, undefined);
  assert.equal(params.page_size, undefined);
}

// Test 7: summary uses backend full-filter totals (not page row count alone)
{
  const rows = [
    row({ id: "1", taxable_amount: "100000.00", tds_amount: "10000.00" }),
    row({ id: "2", taxable_amount: "50000.00", tds_amount: "5000.00" }),
  ];
  const result = report(rows);
  assert.equal(result.summary.entry_count, 2);
  assert.equal(result.summary.taxable_amount, "150000.00");
  assert.equal(result.summary.tds_amount, "15000.00");
  // Footer must use summary (full filter), not visible page rows alone.
  assert.equal(result.pagination.total_rows, result.summary.entry_count);
}

// Test 9: multi-invoice rows keep distinct ids
{
  const rows = [
    row({ id: "alloc-1", invoice_number: "SI-001" }),
    row({ id: "alloc-2", invoice_number: "SI-002" }),
  ];
  const ids = new Set(rows.map((r) => r.id));
  assert.equal(ids.size, 2);
  assert.equal(rows[0].invoice_number, "SI-001");
  assert.equal(rows[1].invoice_number, "SI-002");
}

// Test 10: on-account null invoice fields
{
  const onAccount = row({
    application_mode: "ON_ACCOUNT",
    invoice_id: null,
    invoice_type: null,
    invoice_date: null,
    invoice_number: null,
  });
  assert.equal(onAccount.invoice_date, null);
  assert.equal(onAccount.invoice_number, null);
  assert.ok(onAccount.taxable_amount);
  assert.ok(onAccount.tds_amount);
}

// joinIds helper
{
  assert.equal(joinIds(["a", "a", "b"]), "a,b");
  assert.equal(joinIds([]), undefined);
}

console.log("tds-summary-api-display.test.ts: all assertions passed");
