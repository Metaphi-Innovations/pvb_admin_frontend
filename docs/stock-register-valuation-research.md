# Stock Register & Stock Valuation — Research Notes

**Status:** Research / audit only (as of Sep 2026)  
**Scope:** Accounts → Reports → Stock Register & Stock Valuation  
**Rule:** Document findings from codebase tracing. No implementation decisions beyond what was already discussed.

---

## 1. Executive summary

| Report | What it is today | What Accounts valuation *should* be |
|--------|------------------|-------------------------------------|
| **Stock Register** | Client-side stock **movement** report (demo/local loaders) | Warehouse / inventory movement SoT (future) |
| **Stock Valuation** | Same client movement ledger + Pricing CP / WAC | **STOCK_IN_HAND** posted accounting lines only |

**Critical finding:** Neither report currently calls a live Stock Register / Stock Valuation backend API. Both build data in the browser from a shared frontend “stock movement ledger.” A real SIH API exists for COA drill-down but is **not** wired to Stock Valuation.

Mixing warehouse/ERP movements with accounting books will make tabs disagree. Decision discussed: fix **Stock Valuation first**, and drive **both** Summary and Accounting Details from **STOCK_IN_HAND**.

---

## 2. Key files

### Stock Register (frontend)

| Role | Path |
|------|------|
| Page | `pvb_admin_frontend/app/(app)/accounts/reports/stock-register/page.tsx` |
| UI client | `.../stock-register/StockRegisterPageClient.tsx` |
| Export | `.../stock-register/stock-register-export.ts` |
| Compute | `pvb_admin_frontend/lib/accounts/stock-register-compute.ts` |
| Shared ledger | `pvb_admin_frontend/lib/accounts/stock-movement-ledger.ts` |
| Movement builders | `pvb_admin_frontend/lib/accounts/inventory-accounting-data.ts` |

### Stock Valuation (frontend)

| Role | Path |
|------|------|
| Page | `pvb_admin_frontend/app/(app)/accounts/reports/stock-valuation/page.tsx` |
| UI client | `.../stock-valuation/StockValuationPageClient.tsx` |
| Types / re-export | `.../stock-valuation/stock-valuation-data.ts` |
| Export | `.../stock-valuation/stock-valuation-export.ts` |
| Compute | `pvb_admin_frontend/lib/accounts/stock-valuation-compute.ts` |
| Same ledger | `stock-movement-ledger.ts` |

### Related backend (SIH — not used by these report pages)

| Role | Path |
|------|------|
| Routes | `pvb_backend/src/modules/Accounts/ledgers/ledger.routes.ts` — `/stock-in-hand`, `/stock-in-hand/product-transactions` |
| Service | `ledger.service.ts` — `getStockInHandProductWise`, `getStockInHandProductTransactions` |
| Status filter | `shared/accounting-voucher-status.ts` — `POSTED` + `REVERSED` |
| Line model | Prisma `AccountingVoucherLine` → table `accounting_voucher_lines` |

### Stub only (unused)

- `pvb_admin_frontend/lib/accounts/api/types.ts` → `reports.stockValuation: /api/accounts/reports/stock-valuation`  
- **No** matching backend Stock Valuation / Stock Register report module.

---

## 3. Shared data source (current)

```
Client demo / localStorage / mock loaders
  ├─ loadStockOpeningRows()
  ├─ getGrnRecords() (qc_completed) — warehouse mock
  ├─ getDispatchRecords() → [] (stubbed empty)
  ├─ loadInvoices() / loadDebitNotes() / loadCreditNotes()
  ├─ loadStockReconciliations()
  ├─ loadPurchaseInvoices() (PI without matching GRN)
  ├─ loadTransfers() / sample issue / sample return
        ↓
buildInventoryMovements() + ledger extras
        ↓
buildStockLedgerRows()     ← shared by Register + Valuation
        ↓
Tab-specific builders (summary / detailed / batch / valuation)
```

**Not used:** `AccountingVoucherLine`, `InventoryDetail`, `InventoryTransaction`, live GRN DB, Prisma warehouse tables.

---

## 4. Stock Register — tabs & UI research

### Intended tab purposes (UI restructure)

| Tab | Purpose | Grain |
|-----|---------|--------|
| **Summary** | Product-level qty movement | Product → Opening / Inward / Outward / Closing |
| **Detailed** | Document / transaction history | Date → Voucher → Product → Warehouse → Party → Qty In/Out |
| **Batch Wise** | Batch-level position | Product + Batch + Warehouse → Opening / Inward / Outward / Closing |

### Builder ↔ UI mapping (important naming trap)

| UI tab | Function actually called | What it returns |
|--------|--------------------------|-----------------|
| Summary | `buildStockRegisterSummary` | Product aggregates |
| Detailed | `buildStockRegisterBatchWise` | **One row per transaction** |
| Batch Wise | `buildStockRegisterDetailed` → `toBatchSummaryRow()` | **Product+Batch+Warehouse** summary |

So function names do **not** match tab names.

### UI changes already done (frontend only)

- Summary: qty-only columns; removed Rate / Closing Stock Value; KPI uses Closing Quantity (not value).
- Detailed: removed Batch / Mfg / Expiry from UI; optional Balance Quantity from `runningBalanceQty`.
- Batch Wise: no longer a transaction list; batch-level summary from `buildStockRegisterDetailed`.
- Filters aligned with Valuation: FY | Date Range (From/To) | Warehouse | Product | Export (Branch/Category/Batch removed from filter bar).

### Qty formulas (Register Summary)

- Opening = Σ(in − out) for movements with `date < dateFrom`
- Inward / Outward = Σ in / out in `[dateFrom, dateTo]` ∩ FY (if FY selected)
- Closing = Opening + Inward − Outward

---

## 5. Stock Register — movement sources (what feeds the ledger)

| Label in UI | Client source | Notes |
|-------------|---------------|--------|
| Opening Stock | `loadStockOpeningRows` (localStorage seed) | Not accounting SIH opening |
| Purchase / GRN | GRN mock `qc_completed` + PI without GRN | Not live GRN / not necessarily PI_SIH |
| Sales | Sales invoices (non-cancelled); dispatch stub = `[]` | Invoice-driven, not dispatch SoT |
| Sales Return | Approved credit notes | Not Sales Return QC SIH |
| Purchase Return | Approved debit notes | Backend *can* post `DN_STOCK_IN_HAND`; report doesn’t read it |
| Stock Transfer In/Out | Client transfer store (selected statuses) | Both warehouses get a row |
| ± Stock Adjustment | Stock reconciliation local (`posted`/`approved`) | Physical; typically **no** SIH |
| Sample issue / return | Sample modules | Client |

**Authoritative source today:** frontend movement ledger — **not** warehouse Prisma, **not** SIH.

---

## 6. Batch Wise — batch field provenance

Batch Number / Mfg / Expiry come from:

1. Stock opening rows  
2. GRN mock batches (`mfgDate`, `expDate`)  
3. QC-passed stock mock  
4. Optional PI / transfer line fields  

Enriched via `buildBatchMetaMap()` in `stock-movement-ledger.ts`.

**Not from:** Accounts SIH, `InventoryDetail` provenance (`origin_grn_id`, `parent_inventory_detail_id`, etc.).

**Conclusion:** Batch Wise is warehouse-*shaped* but mock/client-backed. Accounts does not provide batch-wise accounting data for this report.

---

## 7. Stock Valuation — current behavior

### Tabs

| Tab | Current source | Comment in code |
|-----|----------------|-----------------|
| Summary | `buildStockValuationRows` ← same movement ledger + WAC layers | Movement valuation, not SIH |
| Accounting Details | `buildAccountingDetailRows` ← same ledger remapped to debit/credit | Explicit **placeholder until SIH API** |

### Summary fields (current)

| Field | How |
|-------|-----|
| Closing Quantity | Opening + inward − outward through as-on (To Date) |
| Cost Rate | Weighted average of cost layers (UI hardcodes `weighted_average`) |
| Cost Value | `closingQty × costRate` (0 if missing) |
| Market Rate / Value | Always null (`getApprovedMarketRate` returns null) |
| Final Stock Value | = Cost Value when market missing |

### Cost path (current)

1. Movement `rate` ≈ `getCostPriceBySku` → Pricing Master CP (or 0)  
2. Opening may use seed rate; PI-without-GRN may use `unitPrice`  
3. Layers: WAC on inward; consume on outward  
4. Fallback again to Pricing CP if layers have no positive value  

**Not:** SIH debit−credit amounts, FIFO as selected method (supported in code but UI locks WAC), live `InventoryDetail.unit_cost`.

### Filters (after UI alignment)

- FY | Date Range | From | To | Warehouse | Product | Export  
- Valuation cutoff = **To Date** (`asOnDate = dateTo`)  
- **From Date** is UI-only for Valuation today (not passed into valuation compute)  
- No `x-financial-year-id` on report data path  

---

## 8. Accounting rule vs current Valuation

**Business rule discussed:**

> Stock Valuation must be based only on POSTED/REVERSED accounting voucher lines on the STOCK_IN_HAND ledger.

**Required filters (target):**

- Voucher status ∈ {POSTED, REVERSED}  
- `voucher_date <= asOnDate` (To Date)  
- `is_inventory_line = true`  
- `product_id IS NOT NULL` for product-wise  
- Warehouse via `AccountingVoucherLine.warehouse_id` when filtering  

**Target formulas:**

- Closing Qty = Σ SIH debit qty − Σ SIH credit qty  
- Cost Value = Σ SIH debit amount − Σ SIH credit amount  
- Cost Rate = Cost Value / Qty when Qty ≠ 0  
- Final = Cost Value while market is unavailable  

**Current Valuation:** fails all of the above (uses demo movements).

---

## 9. Existing SIH API (usable domain, not wired to report)

`LedgerService.getStockInHandProductWise`:

- Finds ledger with `system_ledger_type = STOCK_IN_HAND`  
- Aggregates `accounting_voucher_lines` with `is_inventory_line`, `product_id not null`, voucher POSTED|REVERSED  
- Optional warehouse / date range  
- Net qty/value = debit − credit (asset convention)  

`getStockInHandProductTransactions` / `_getProductTransactions`:

- Line-level: date, voucher, qty, unit rate, debit/credit, warehouse names, transfer route hints  

**Prisma line fields relevant to Valuation:**  
`product_id`, `warehouse_id`, `batch_id` (optional), `quantity`, `unit_rate`, `debit_amount`, `credit_amount`, `entry_type`, `is_inventory_line`, plus voucher header fields.

---

## 10. What SIH can / cannot supply for Valuation

### Usable from SIH

- Closing quantity & book value  
- Cost rate derived from posted amounts (or line `unit_rate`)  
- Debit / credit qty & value trail  
- Product, warehouse (when on line), voucher identity, source module refs  

### Not available (or weak) from SIH — do not force into Valuation

| Need | Why missing |
|------|-------------|
| Market rate / market value | No SIH field; no approved market source |
| Warehouse-only adjustments | Never posted to SIH |
| GRN QC before purchase posting | SIH usually from PI posting, not GRN alone |
| Credit Note as “Sales Return” | CN posts party/tax; stock return SIH is SR QC (`SR_QC_STOCK_IN_HAND`) |
| Demo opening without SIH posting | Opening only if posted / prior SIH balance |
| Rich batch / mfg / expiry | Optional `batch_id` only; dates live in inventory/GRN |
| Pricing Master fallback CP | Not accounting; should not drive book valuation |
| Non-stock filter field | Report didn’t check an inventory flag; SIH should naturally exclude non-inventory if posting is correct |

---

## 11. Transaction types — Valuation inclusion (accounting view)

| Type | In current fake Valuation? | Typically in SIH? | Should affect accounting Valuation? |
|------|----------------------------|-------------------|-------------------------------------|
| Opening (posted) | Demo opening yes | Only if posted | Yes |
| Purchase (PI → SIH) | Via GRN/PI demo | `PI_STOCK_IN_HAND` | Yes |
| GRN QC only | Yes (mock) | Usually no | No (until capitalized) |
| Sales (SI → SIH credit) | Via invoice demo | `SI_STOCK_IN_HAND` (when posted) | Yes |
| Purchase return (DN) | DN demo | `DN_STOCK_IN_HAND` | Yes |
| Sales return | CN demo | SR QC SIH, not CN | Yes when QC posts |
| Stock transfer | Client transfers | Internal SIH pairs possible | Net often zero; warehouse split matters |
| Physical / negative adjustment | Recon demo | Usually no | No |
| Sample / packing | Sometimes in ledger | Only if posted | Only if posted |

---

## 12. Non-stock & zero-cost findings

### Non-stock products

- Current reports include any SKU that appears in the movement ledger.  
- Product master used here has **no inventory-vs-service flag checked**.  
- Services/expenses/assets should not appear on SIH if posting rules are correct.

### Zero cost with qty > 0 (current compute)

Causes:

1. Pricing CP missing / ≤ 0  
2. All movement rates 0 → layers empty → fallback 0 → `costRateMissing`  
3. Opening qty without rate  
4. Market never fills the gap  

Under SIH SoT, zero value with qty would mean **posted lines lack amount/qty integrity** — a data/posting issue, not Pricing Master.

---

## 13. Filter / FY research

| Topic | Finding |
|-------|---------|
| Common filter bar | FY, Date Range, From, To, Warehouse, Product, Export |
| Valuation cutoff | **To Date** |
| From Date on Valuation | Display/consistency only today |
| FY application | Client date compare vs FY start/end; not voucher FY header |
| Branch on Register | Removed from UI; never applied to movements |
| Backend filter params | N/A until APIs exist |

**FY pitfall:** Accounting Details (current) can drop prior-FY rows while Summary keeps them for opening layers — inconsistent. True as-on SIH balance must include prior history through To Date.

---

## 14. Agreed direction (discussion — not yet implemented)

1. **Stock Valuation only first** (fewer tabs, clearer SoT).  
2. **Both** Summary and Accounting Details from **STOCK_IN_HAND** (same filters, same To Date cutoff).  
3. Do **not** mix half warehouse ERP + half Accounts for Valuation.  
4. Stock Register can remain movement-oriented later (warehouse SoT).  
5. Exclude from Valuation anything that never posts to SIH (physical adj, pre-capitalization GRN, CN-as-return label, etc.).  
6. Market value stays “Not Available” until a real source exists.  
7. Batch-wise accounting valuation is out of scope for Valuation; batch belongs to Register / warehouse.

### Target data flow (Valuation)

```
AccountingVoucher (POSTED | REVERSED)
  + AccountingVoucherLine on STOCK_IN_HAND
        ↓
Summary          → product[/warehouse] balance as on To Date
Accounting Details → SIH lines that compose that balance
```

Implementation choice (reuse COA SIH endpoints vs dedicated report API) is secondary; **source of truth is SIH either way**.

---

## 15. UI work already shipped (context)

- Register tab differentiation (qty Summary, txn Detailed, batch summary Batch Wise).  
- Valuation UI earlier: Accounting Details tab shell, removed stock status emphasis, etc.  
- Shared filter layout Register ↔ Valuation.  
- Infinite loop fix: unstable `batchNos = []` in Register filters deps → stable `EMPTY_BATCH_NOS`.

---

## 16. Open questions / not determined from code alone

- Exact production posting coverage per document type in a given environment.  
- Whether every SIH line always has `quantity` + amounts populated.  
- How often `warehouse_id` / `batch_id` are filled on inventory lines.  
- Company opening-balance process for SIH across FY.  
- Dedicated Stock Valuation report API shape (not implemented).

---

## 17. Recommended architecture boundaries

| Surface | Domain SoT |
|---------|------------|
| Stock Register Summary / Detailed | Warehouse inventory movements (future live) |
| Stock Register Batch Wise | Warehouse batch / lot inventory |
| Stock Valuation Summary | **STOCK_IN_HAND** balances as on date |
| Stock Valuation Accounting Details | **STOCK_IN_HAND** voucher lines |
| COA Stock-in-Hand panel | Same SIH aggregates (already closer to correct) |

---

## 18. Quick reference — “do not confuse”

| Name | Reality |
|------|---------|
| Accounting Details tab | Currently **not** accounting — movement placeholder |
| Purchase / GRN in Valuation | GRN mock / PI demo — not SIH |
| Sales Return in Valuation | Credit note demo — not SR QC SIH |
| Negative Stock Adjustment | Physical recon — must **not** appear in SIH Valuation |
| `buildStockRegisterDetailed` | Batch **summary** builder (used by Batch Wise UI) |
| `buildStockRegisterBatchWise` | Transaction list builder (used by Detailed UI) |
| Cost Rate today | Pricing CP + client WAC — not SIH |

---

*End of research notes. Next implementation step (when approved): wire Stock Valuation Summary + Accounting Details to STOCK_IN_HAND only; leave Stock Register unchanged until its warehouse SoT is defined.*
