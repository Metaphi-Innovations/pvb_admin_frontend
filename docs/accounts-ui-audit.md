# Accounts UI Audit — Phase 1 Deliverable

**Date:** 2026-07-21  
**Scope:** `app/(app)/accounts/**`, `components/accounts/**`  
**Constraint:** UI standardization only — no business/API/DB changes

Full inventory and inconsistency map is summarized below. Canonical standard: [`docs/accounts-ui-standard.md`](./accounts-ui-standard.md).

---

## Screen-type inventory (summary)

| Type | Examples |
|------|----------|
| **A. Forms** | Vouchers, CN/DN, invoices, expenses, payments, COA ledger forms, bank account form |
| **B. Listings** | Document lists, AR/AP, masters, workflow queues |
| **C. Detail / View** | Invoice/CN/DN/payment/expense views, voucher read-only |
| **D. Reports** | TB, BS, P&L, cash flow, registers, GST, ledgers, day book |
| **E. Dashboard** | Accounts hub, banking hub, inventory KPI strip |
| **F. Banking** | Bank accounts, recon workspace, statement import |
| **G. Vouchers** | Payment / Receipt / Contra / Journal (+ transaction aliases) |
| **H. COA** | Explorer tree, ledger create, bill-wise |

---

## Pre-standardization findings

1. **Three chrome layers:** dense Accounts tokens (globals) · voucher-form kit · legacy global `PageHeader` / invoice layouts.
2. **Input heights mixed:** h-7 / h-8 / h-9 within related screens.
3. **Footer vocabulary mixed:** Discard / Cancel / Reset / Save / Save Draft / Save & Post / Post.
4. **Duplicate clusters:** GST trees, bank-recon routes, CN vs DN product tables, local SummaryCards, SearchableSelect copies.
5. **Strong shared foundation already existed:** `AccountsPageShell`, `.accounts-table*`, `AccountsReportKpiCard`, `voucher-form/*`.

---

## Target metrics (Accounts UI standard)

| Metric | Target |
|--------|--------|
| Header padding (forms) | `py-2` |
| Page title | 17px semibold |
| Section title | 14px semibold |
| Field label | 12px medium muted |
| Input height | 32px (`h-8`) |
| Card padding | compact ~12px |
| Table row | ~42px |
| Form footer | Cancel left · Save Draft / Save & Post right |

---

## Shared components created (`components/accounts/ui/`)

See delivery summary in the PR/session notes. Prefer `@/components/accounts/ui` for new Accounts UI work.
