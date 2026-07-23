# Accounts UI Standard

> Single visual system for every screen under `/accounts/**`.
> Visual reference: [Dharitri Sutra Template](https://pvb.dev.metaphi.in/template)
> Implementation tokens: `lib/accounts/accounts-typography.ts`, `lib/accounts/accounts-ui-tokens.ts`
> Reusable wrappers: `components/accounts/ui/`

**Scope:** UI only. Do not change business fields, calculations, APIs, routes, or validation.

---

## 1. Design principles

1. One product — no per-module visual dialects.
2. Compact & dense — ERP density, not consumer whitespace.
3. Reuse template / existing Accounts shells before inventing new chrome.
4. Orange (`brand-*`) only for primary actions and active states.
5. Prefer Accounts-scoped wrappers over editing global `components/ui/*`.

---

## 2. Typography hierarchy

| Role | Token / class | Spec |
|------|---------------|------|
| Page title | `.accounts-page-title` | 17px, semibold |
| Page subtitle / breadcrumb | `.accounts-page-subtitle` | 11px, muted |
| Section / card heading | `.accounts-card-title` / `.accounts-section-heading` | 14px, semibold |
| Field label | `.accounts-form-label` | 12px, medium, muted |
| Field value | `.accounts-form-input` | 13px, regular |
| Helper | `.accounts-helper-text` | 12px, muted |
| Table header | `.accounts-table-th` | 11px, semibold |
| Table body | `.accounts-table-td` | 12px, regular |
| Filter label | `.accounts-filter-label` | 10px, medium |
| Grand total only | `accounts-ui` total emphasize | semibold / bold — not every row |

Do not bold entire forms or overuse uppercase section titles outside compact note density.

---

## 3. Control sizes

| Control | Height | Notes |
|---------|--------|-------|
| Form input / select / date | **32px (`h-8`)** | `ACCOUNTS_UI_INPUT_CLASS` |
| Filter control | **32px** | `.accounts-filter-control` |
| Action button | **32px** | `.accounts-action-button` / `h-8 text-xs` |
| Textarea (narration) | compact ~56–72px min-height | resize-y, not oversized |
| Switch | project `Switch` | do not restyle |

**Field widths**

- Amount: narrow, right-aligned tabular nums
- GST %: very narrow
- Date / voucher number: compact (~130–136px)
- Party / ledger: flexible, may span wider columns
- Short fields must not stretch full row width unnecessarily

**Read-only:** prefer text display (`AccountsReadOnlyField`) over large disabled inputs.

---

## 4. Page header

Every Accounts page uses one of:

| Screen type | Component |
|-------------|-----------|
| Listing / report / workbench | `AccountsPageHeader` → `AccountsPageShell` |
| Create / edit / view form | `AccountsPageHeader` form mode → `AccountsFormLayout` |

**Structure**

- Left: back (forms), title, breadcrumb, optional status / document badge
- Right: page actions
- Same title size, badge style, horizontal padding (`px-5` forms / shell defaults for listings), vertical padding (`py-2` forms)

Do not use global `PageHeader` inside Accounts.

---

## 5. Section cards

Use `AccountsSectionCard` (wraps voucher section card).

| Property | Value |
|----------|-------|
| Border | `border border-border` thin |
| Radius | `rounded-xl` (compact notes: `rounded-lg`) |
| Shadow | `shadow-sm` (compact: none) |
| Header | muted strip, compact padding |
| Accent | **no thick orange left bar** on default cards |
| Body padding | compact (`px-4 py-3` / denser for notes) |

---

## 6. Form grid

| Layout | When |
|--------|------|
| 3–4 columns | Compact header / meta fields |
| 2 columns | Naturally wide pairs |
| 1 column | Narration, long text, mobile |

Gaps: `gap-2` / `gap-2.5` / `gap-3` — avoid large empty bands.

---

## 7. Tables

Use `.accounts-table*` / `AccountsTable*` wrappers.

| Property | Spec |
|----------|------|
| Header bg | brand-50 / accounts table head |
| Header height | ~36px |
| Row height | ~42px |
| Amounts | right-aligned |
| Dates / status / actions | compact |
| Empty / loading | `AccountsEmptyState` / listing states |

Do not invent per-module table CSS unless a specialized product grid already exists — then align typography/padding to accounts tokens.

---

## 8. Filters

One-line compact bar via `AccountsFilterBar` / listing filter card:

- Search, date range, dropdowns, export aligned right
- Controls: 32px, filter label 10px
- Do not invent alternate report filter layouts when the shell already provides one

---

## 9. Form actions (vouchers & transaction forms)

**Only:** Cancel · Save Draft · Save & Post

| Side | Actions |
|------|---------|
| Left | Cancel |
| Right | Save Draft, Save & Post |

Use `AccountsStickyActionBar` / `VoucherFormActionBar` in sticky bottom bar.

Do not show Discard / Reset / Clear / Close / Apply / Save Changes / separate Post as the primary voucher footer vocabulary (report filter “Reset” remains for filters only).

---

## 10. Narration & attachments

`AccountsNarrationSection` / `VoucherNarrationAttachmentsSection`:

- Desktop: narration left, attachments right
- Same card, compact textarea, dashed upload control (no floating FAB, no huge empty dropzone)

---

## 11. Summaries

`AccountsSummaryBlock` / existing GST & posting summaries:

- Compact, limited width, amounts right-aligned
- Emphasize only grand total / final balance
- Show CGST, SGST, IGST separately; Round Off separate
- Do not invent full-width empty KPI slabs

---

## 12. Status badges

`AccountsStatusBadge` → `AccountsVoucherStatusBadge` (workflow) or template `StatusBadge` for generic statuses.

---

## 13. Empty states & pagination

- Empty / no-results: `AccountsEmptyState` / `AccountsListingStates`
- Pagination: compact footer (~22px controls), accounts table foot pattern

---

## 14. Import map (preferred)

```ts
import {
  AccountsPageHeader,
  AccountsPageBreadcrumbs,
  AccountsSectionCard,
  AccountsSectionHeader,
  AccountsFormGrid,
  AccountsField,
  AccountsReadOnlyField,
  AccountsTable,
  AccountsAmountCell,
  AccountsFilterBar,
  AccountsSummaryBlock,
  AccountsNarrationSection,
  AccountsAttachmentSection,
  AccountsStickyActionBar,
  AccountsEmptyState,
  AccountsStatusBadge,
  AccountsFormLayout,
  ACCOUNTS_UI_INPUT_CLASS,
  ACCOUNTS_UI_LABEL_CLASS,
} from "@/components/accounts/ui";
```

Reuse existing implementations under `components/accounts/` — `ui/` is the stable public surface for new work.

---

## 15. Regression rules

- Do not modify global CSS for Accounts density (Accounts classes in `globals.css` already exist — extend tokens, do not fork).
- Do not change global Button / Input defaults.
- Do not change posting, validation, or API behavior when applying wrappers.
- Outside Accounts: untouched.

---

## 16. Metric targets (before → after target)

| Metric | Target |
|--------|--------|
| Header vertical padding (forms) | `py-2` |
| Page title | 17px semibold |
| Section title | 14px semibold (compact notes: 10px uppercase muted) |
| Field label | 12px medium muted |
| Input height | 32px |
| Card body padding | ~12–14px |
| Table row | ~42px |
| Footer actions | sticky bottom: Cancel left · Save Draft / Save & Post right |

*Last updated: 2026-07-21*
