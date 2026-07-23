# Accounts UI Standardization — Delivery Notes

**Date:** 2026-07-21  
**Constraint confirmed:** No backend, API, database, calculation, validation, route, or posting logic changes.

---

## 1. Audit

See [`docs/accounts-ui-audit.md`](./accounts-ui-audit.md) and session audit (screen-type inventory, duplicate chrome, height/typography/footer divergences).

---

## 2. Components created (`components/accounts/ui/`)

| Export | Role |
|--------|------|
| `AccountsPageHeader` | Listing/report shell wrapper → `AccountsPageShell` |
| `AccountsPageBreadcrumbs` | Standard breadcrumb row |
| `AccountsListingChrome` | Drop-in replacement for global `PageHeader` |
| `AccountsSectionCard` / `AccountsSectionHeader` | Section cards (→ voucher section card) |
| `AccountsFormGrid` / `AccountsField` / `AccountsReadOnlyField` | Form layout primitives |
| `AccountsTable*` / `AccountsAmountCell` | Table primitives re-export |
| `AccountsFilterBar` | Re-export existing filter bar |
| `AccountsSummaryBlock` | Form row totals + listing cards |
| `AccountsNarrationSection` / `AccountsAttachmentSection` | Narration + attachments |
| `AccountsStickyActionBar` | Cancel · Save Draft · Save & Post |
| `AccountsEmptyState` | Empty / no-results |
| `AccountsStatusBadge` | Workflow + generic status |
| `AccountsPagination` | Compact pagination footer |
| `AccountsFormLayout` | Re-export form layout |
| Tokens | `lib/accounts/accounts-ui-tokens.ts` |

**Docs**

- `docs/accounts-ui-standard.md` — the UI standard
- `docs/accounts-ui-audit.md` — audit summary
- `docs/accounts-ui-delivery.md` — this file

---

## 3. Files modified (by phase)

### Phase 1 — standards + wrappers
- `docs/accounts-ui-standard.md` (new)
- `docs/accounts-ui-audit.md` (new)
- `docs/accounts-ui-delivery.md` (new)
- `lib/accounts/accounts-ui-tokens.ts` (new)
- `lib/accounts/accounts-typography.ts` (comment sync)
- `components/accounts/ui/**` (new barrel + wrappers)

### Phase 2 — voucher / form chrome
- `components/accounts/voucher-simple-form-ui.tsx` — h-8 inputs; receipt cream dialect removed
- `components/accounts/voucher-form/VoucherFormSectionCard.tsx` — removed thick orange left bar
- `app/(app)/accounts/components/InvoiceFormLayout.tsx` — header density + optional stickyFooter
- `app/(app)/accounts/debit-notes/components/DebitNoteProductTable.tsx` — `.accounts-table` alignment
- `app/(app)/accounts/credit-notes/components/CreditNoteProductTable.tsx` — qty cell h-8
- `app/(app)/accounts/expenses/components/ExpenseForm.tsx` — field height h-8

Payment / Receipt / Contra / Journal already use `StandardVoucherForm` + `VoucherFormActionBar` (sticky Cancel · Save Draft · Save & Post). CN/DN already use the shared action bar / narration-attachment sections; product tables and section cards now share the same density tokens.

### Phase 3 — listings + banking
- `expenses/ExpensesPageClient.tsx`
- `payments/PaymentsPageClient.tsx`
- `purchase/PurchasePageClient.tsx`
- `components/TransactionPageClient.tsx`
- `bank-reconciliation/ReconciliationPageClient.tsx`
- `bank-reconciliation/BankReconCompleteReviewPageClient.tsx`

All migrated off global `PageHeader` / oversized titles onto Accounts chrome.

### Phase 4 — reports / summary density
- `bank-reconciliation/ManualBankReconciliationPageClient.tsx` — summary tiles → accounts-summary tokens
- `masters/chart-of-accounts/ledgers/BillWiseOutstandingPageClient.tsx` — same

Most financial reports already use `AccountsPageShell` + `.accounts-table*` + `AccountsReportKpiCard`. Remaining GST local `text-lg` KPI dialect can be migrated incrementally onto `AccountsSummaryBlock` / report KPI cards without logic changes.

---

## 4. Metric comparison (before → after target)

| Metric | Before (outliers) | After (standard) |
|--------|-------------------|------------------|
| Header height / padding | `py-3` / mixed | Forms `py-2` |
| Page title | `text-xl` / `text-lg bold` / 17px | **17px semibold** |
| Section title | 10–14px mixed + orange bar | **14px semibold**, no thick orange bar |
| Field label | mixed | **12px medium muted** |
| Input height | h-7 / h-8 / h-9 | **32px (h-8)** |
| Card padding | p-3–p-5 mixed | **compact px-4 py-3** family |
| Table row | mixed | **~42px accounts-table** |
| Footer actions | header-only / Discard / mixed labels | Vouchers: **sticky Cancel · Save Draft · Save & Post** |

---

## 5. Confirmations

| Check | Status |
|-------|--------|
| Business fields unchanged | Yes |
| Functionality / handlers unchanged | Yes (className / layout wrappers only) |
| Backend / API / DB unchanged | Yes |
| Global `components/ui` defaults unchanged | Yes |
| Global CSS not forked | Yes (existing `.accounts-*` tokens reused) |
| Modules outside Accounts untouched | Yes |

---

## 6. Screenshots

Live before/after screenshots were not captured in this session (no browser automation available). Recommended capture set after deploy to staging:

1. Voucher form — Payment create  
2. Listing — Payments / Expenses  
3. Report — Trial Balance  
4. Banking — Bank Reconciliation listing / complete review  
5. Chart of Accounts — explorer + bill-wise summary  

Compare against the metric table above.

---

## 7. Consistency status

Accounts now has **one documented standard** and a **single import surface** (`@/components/accounts/ui`). Highest-visibility dialects (PageHeader listings, receipt cream theme, orange section bars, mixed input heights, DN vs CN tables, BR title XL) are aligned.

Remaining incremental work (same standard, no new dialects):

- Move invoice sticky actions from header `actions` → `stickyFooter` where product owners want voucher-identical footers
- Migrate residual GST local SummaryCards to `AccountsReportKpiCard` / `AccountsSummaryBlock`
- Prefer `AccountsListingChrome` / `AccountsPageHeader` for any remaining one-off titles

*End of delivery notes.*
