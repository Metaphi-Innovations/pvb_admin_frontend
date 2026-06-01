# CLAUDE.md — Dharitri Sutra ERP: UI Foundation & Design System

> **Internal Frontend Documentation**
> This file is the single source of truth for every UI decision in Dharitri Sutra ERP.
> Every new module, component, and page **must** follow this specification.
> When in doubt, open `/template` in the running app and look at the reference first.

---

## Table of Contents

1. [Design Philosophy](#1-design-philosophy)
2. [Project Stack](#2-project-stack)
3. [File & Folder Structure](#3-file--folder-structure)
4. [Theme System](#4-theme-system)
5. [Color Tokens](#5-color-tokens)
6. [Typography System](#6-typography-system)
7. [Spacing System](#7-spacing-system)
8. [Border Radius & Shadows](#8-border-radius--shadows)
9. [Layout Foundation](#9-layout-foundation)
10. [Navbar & Header System](#10-navbar--header-system)
11. [Table Foundation](#11-table-foundation)
12. [Form Foundation](#12-form-foundation)
13. [Drawer & Sheet Foundation](#13-drawer--sheet-foundation)
14. [Modal & Dialog Foundation](#14-modal--dialog-foundation)
15. [Filter Patterns](#15-filter-patterns)
16. [Status & Approval System](#16-status--approval-system)
17. [Autocomplete / Select Standards](#17-autocomplete--select-standards)
18. [Dashboard & KPI Widgets](#18-dashboard--kpi-widgets)
19. [Feedback & State Patterns](#19-feedback--state-patterns)
20. [ERP-Specific Patterns](#20-erp-specific-patterns)
21. [Responsive Standards](#21-responsive-standards)
22. [Permission UI Standards](#22-permission-ui-standards)
23. [Financial Year System](#23-financial-year-system)
24. [Reusable Component Rules](#24-reusable-component-rules)
25. [Template Module Reference Index](#25-template-module-reference-index)
26. [New Module Development Guidelines](#26-new-module-development-guidelines)
27. [Do / Don't Rules](#27-do--dont-rules)

---

## 1. Design Philosophy

### Core Principle: Enterprise-Grade, Not Consumer-Grade

Dharitri Sutra ERP serves agricultural business users — distributors, field agents, warehouse managers, and finance teams. The UI must prioritize **clarity, density, and trust** over decoration and animation. Every UI decision should answer: *does this help the user complete their task faster?*

### The Five Pillars

| Pillar | What It Means |
|--------|--------------|
| **Compact & Dense** | ERP users work with large datasets. Tables and forms must use compact spacing — not the wide, airy layouts of consumer apps. |
| **Consistent & Predictable** | Every listing page looks the same. Every form follows the same field order. Users build muscle memory. |
| **Bold & Purposeful** | Warm orange primary with deep navy secondary. High-contrast, confident agri-tech identity. Not harsh, not flat. |
| **Fast & Responsive** | Column sorting by click. Filters via compact Popover. No full-page reloads for simple state changes. |
| **Accessible & Trustworthy** | Clear validation messages, proper disabled states, confirmations before destructive actions. |

### What Dharitri Sutra ERP Is NOT

- It is NOT a consumer app with large cards, massive padding, and gradient banners.
- It is NOT a data-dense admin panel with black-and-white Bootstrap tables.
- It IS the middle ground: **premium, compact, orange-and-navy enterprise ERP**.

### Brand Identity Reference

The Dharitri Sutra logo combines three visual elements that inform the design system:
- **Orange** (`"Dharitri"` wordmark) — warmth, energy, agriculture, action → primary brand color
- **Navy Blue** (`"Sutra"` wordmark + shield border) — trust, authority, precision → secondary/depth color
- **Leaf Green** (plant inside shield) — growth, nature, sustainability → success/accent color

---

## 2. Project Stack

```
Next.js 14         — App Router, file-based routing, (auth) and (app) route groups
React 18           — Client components with "use client" directive
TypeScript         — Strict typing throughout
TailwindCSS 3.4    — Utility-first styling, custom design tokens in tailwind.config.js
tailwindcss-animate — Animation utilities (slide-in, fade-in, zoom-in)
ShadCN UI (custom) — Component foundation (Radix UI primitives + Tailwind styling)
Radix UI           — Dialog, DropdownMenu, Popover, Select, Tabs, Tooltip, etc.
Lucide React       — All icons (0.379.0) — no other icon libraries
Recharts           — Charts and analytics widgets
```

### What Is NOT Installed (as of session)
```
react-hook-form    — NOT installed. Use React useState for form state.
zod                — NOT installed. Use manual validation functions.
zustand            — NOT installed. Use React Context + localStorage.
axios              — NOT installed. Use native fetch or Next.js server actions.
```

> **Important:** The stack documentation above reflects the actual `package.json`. Before adding a new package, check if the pattern can be achieved with what's already installed. If a new package is needed, document it here.

---

## 3. File & Folder Structure

### Top-Level Structure

```
dharitri-sutra-erp/
├── app/
│   ├── (auth)/               ← Login, forgot password (no AppLayout)
│   │   └── login/page.tsx
│   └── (app)/                ← All authenticated pages (wrap with AppLayout)
│       ├── dashboard/
│       ├── template/         ← Design System Hub (this module)
│       │   ├── page.tsx      ← Main template page (left nav + right content)
│       │   └── sections/     ← One file per section
│       └── user-management/
│           └── department/
│               ├── page.tsx
│               └── components/
│                   ├── DepartmentSheet.tsx      ← Add/Edit drawer
│                   └── DepartmentDetailSheet.tsx ← View drawer
├── components/
│   ├── layout/
│   │   ├── AppLayout.tsx     ← FYProvider + TopNavbar + AppHeader + main
│   │   ├── TopNavbar.tsx     ← 56px sticky top navigation bar
│   │   └── AppHeader.tsx     ← 48px sub-header (search, FY, state, notifications)
│   └── ui/                   ← All reusable UI primitives
│       ├── button.tsx
│       ├── input.tsx
│       ├── label.tsx
│       ├── textarea.tsx
│       ├── checkbox.tsx
│       ├── switch.tsx        ← Custom (not Radix), button[role=switch]
│       ├── sheet.tsx         ← Right-panel drawer (built on Radix Dialog)
│       ├── dialog.tsx
│       ├── dropdown-menu.tsx
│       ├── popover.tsx
│       ├── tabs.tsx
│       ├── badge.tsx
│       ├── avatar.tsx
│       ├── tooltip.tsx
│       ├── separator.tsx
│       ├── select.tsx        ← Radix-based (use AutocompleteSection pattern instead)
│       ├── StatusBadge.tsx   ← StatusBadge + CountBadge components
│       ├── KPICard.tsx       ← Dashboard KPI card component
│       ├── DataTable.tsx     ← Generic data table
│       ├── EmptyState.tsx    ← Reusable empty state component
│       ├── PageHeader.tsx    ← Page title + subtitle + actions bar
│       ├── FormFields.tsx    ← Reusable form field wrappers
│       └── Loaders.tsx       ← Skeleton + spinner variants
├── lib/
│   ├── utils.ts              ← cn() utility (clsx + tailwind-merge)
│   └── fy-store.tsx          ← Financial Year React Context + localStorage
└── tailwind.config.js        ← All design tokens (colors, fonts, spacing, shadows)
```

### Module Folder Pattern

Every new feature module follows this structure:

```
app/(app)/[module-name]/
├── page.tsx                          ← Main listing page (wraps with AppLayout)
└── components/
    ├── [Module]Sheet.tsx             ← Add/Edit drawer (≤ 7 fields)
    ├── [Module]DetailSheet.tsx       ← View/detail drawer
    └── [Module]Page.tsx              ← Optional: extract heavy listing logic
```

For complex modules with full-page forms:
```
app/(app)/[module-name]/
├── page.tsx                          ← Listing
├── [id]/
│   ├── page.tsx                      ← View / detail page
│   └── edit/page.tsx                 ← Edit full-page form
└── new/page.tsx                      ← Create full-page form
```

### Component Naming Conventions

| Pattern | Example | Rule |
|---------|---------|------|
| Page files | `page.tsx` | Always lowercase `page.tsx` (Next.js App Router) |
| Component files | `DepartmentSheet.tsx` | PascalCase |
| Section files | `FormsSection.tsx` | PascalCase + `Section` suffix |
| Utility files | `fy-store.tsx` | kebab-case |
| Types/interfaces | `Department`, `FormState` | PascalCase |
| Event handlers | `handleSave`, `handleDelete` | camelCase with `handle` prefix |
| State setters | `setSearch`, `setFilterStatus` | camelCase with `set` prefix |

---

## 4. Theme System

### Design Token Entry Point

All design tokens live in `tailwind.config.js`. **Never hardcode hex colors in components.** Always use Tailwind token classes.

```js
// tailwind.config.js key extensions:
theme: {
  extend: {
    colors: {
      // Primary: brand orange (from "Dharitri" wordmark)
      brand: { 50..950 },
      // Secondary: navy blue (from "Sutra" wordmark + shield)
      navy:  { 50..950 },
      // Accent: leaf green (from plant inside shield)
      leaf:  { 50..900 },
      // Supporting palettes
      earth: { /* warm beige tones */ },
    },
    fontFamily:   { sans, display, mono },
    fontSize:     { "page-title", "section-title", "card-title", "body-lg", "body", "table", "helper", "badge" },
    borderRadius: { input, btn, card, modal },
    boxShadow:    { card, "card-hover", navbar, modal, input },
    backgroundImage: { "brand-gradient", "navy-gradient", "ds-gradient" },
    animation:    { "fade-in", "slide-up", "slide-in-right", "shimmer" },
  }
}
```

### Three-Palette System

Dharitri Sutra uses a deliberate three-palette design:

| Palette | Token prefix | Source | Use for |
|---------|-------------|--------|---------|
| **Brand Orange** | `brand-*` | "Dharitri" wordmark | CTAs, active states, highlights, primary actions |
| **Navy Blue** | `navy-*` | "Sutra" wordmark + shield | Page titles, column headers, deep backgrounds, secondary actions |
| **Leaf Green** | `leaf-*` | Plant inside shield | Success states, active/approved status, growth metrics |

### CSS Custom Properties (globals.css)

The app uses Radix UI CSS variables for light/dark mode compatibility:
```css
--background, --foreground, --card, --popover, --primary, --secondary,
--muted, --accent, --destructive, --border, --input, --ring
```

Reference these via Tailwind: `bg-background`, `text-foreground`, `border-border`, `bg-muted`, `text-muted-foreground`.

---

## 5. Color Tokens

### Brand Palette — Primary Orange

The Dharitri Sutra primary brand color is **warm orange** — energetic, agricultural, confident. Derived from the "Dharitri" wordmark in the logo.

| Token | Hex | Usage |
|-------|-----|-------|
| `brand-50` | `#FFF3E8` | Lightest backgrounds, hover tints, selected row fill |
| `brand-100` | `#FFE4C4` | Light backgrounds, filter chip backgrounds |
| `brand-200` | `#FFCB90` | Hover states, subtle accents |
| `brand-300` | `#FFAA55` | Borders, visual accents, progress fills |
| `brand-400` | `#FF8C2A` | Muted primary elements, icon fills |
| `brand-500` | `#F47920` | Primary brand orange (logo match) |
| `brand-600` | `#D96A10` | **Primary CTA buttons, active states** ← use this most |
| `brand-700` | `#B85508` | Hover on active, active link color, sorted column labels |
| `brand-800` | `#94400A` | Dark text on light brand backgrounds |
| `brand-900` | `#6B2D07` | Very dark backgrounds |
| `brand-950` | `#3D1503` | Text on brand-colored surfaces |

### Navy Palette — Secondary Deep Blue

Derived from the "Sutra" wordmark and shield border in the logo.

| Token | Hex | Usage |
|-------|-----|-------|
| `navy-50` | `#EEF2FF` | Very light navy tint, info backgrounds |
| `navy-100` | `#D8E2FF` | Light navy backgrounds |
| `navy-200` | `#B8C9FF` | Subtle navy accents |
| `navy-300` | `#8AAEFF` | Borders, visual accents |
| `navy-400` | `#5C8EEE` | Muted secondary elements |
| `navy-500` | `#3A6DD8` | Secondary action color |
| `navy-600` | `#2451B7` | Secondary buttons, info badges |
| `navy-700` | `#1A3A96` | Logo navy match — page titles, section headings |
| `navy-800` | `#153080` | Deep navy backgrounds |
| `navy-900` | `#0F2266` | Darkest navy |
| `navy-950` | `#091440` | Near-black navy |

### Leaf Palette — Accent Green

Derived from the plant/leaves inside the shield in the logo.

| Token | Hex | Usage |
|-------|-----|-------|
| `leaf-50` | `#F0F9F0` | Success/active state backgrounds |
| `leaf-100` | `#D8F0D8` | Light success backgrounds |
| `leaf-200` | `#B0E0B0` | Hover on success elements |
| `leaf-300` | `#7CC87C` | Success borders, accents |
| `leaf-400` | `#50AF50` | Muted success |
| `leaf-500` | `#33913A` | Success primary |
| `leaf-600` | `#267A2E` | Logo leaf green — active status, approved states |
| `leaf-700` | `#1A5F22` | Hover on success |
| `leaf-800` | `#134A1A` | Dark success text |
| `leaf-900` | `#0C3514` | Deepest green |

### Semantic Status Colors

```
Emerald / Leaf  (active/approved/success):  bg-emerald-50 text-emerald-700 dot-bg-emerald-500
Amber           (pending/warning):          bg-amber-50   text-amber-700  dot-bg-amber-400
Red             (rejected/error/archived):  bg-red-50     text-red-700    dot-bg-red-400
Slate           (inactive/disabled):        bg-slate-100  text-slate-600  dot-bg-slate-400
Navy / Blue     (info/in-review/upcoming):  bg-navy-50    text-navy-700   dot-bg-navy-500
Purple          (escalated/special):        bg-purple-50  text-purple-700 dot-bg-purple-500
Sky             (dispatch-pending/transit): bg-sky-100    text-sky-700    dot-bg-sky-500
Teal            (auto-approved):            bg-teal-100   text-teal-700   dot-bg-teal-500
Orange          (clarification-needed):     bg-orange-100 text-orange-700 dot-bg-orange-400
```

### Color Usage Rules

**DO:**
- Use `bg-brand-600` for primary CTA buttons
- Use `text-brand-700` for active sorted column headers
- Use `bg-brand-50` for active filter chips, selected rows, active nav items
- Use `text-navy-700` for page titles and section headings
- Use `bg-muted/20` or `bg-muted/30` for alternating backgrounds, card interiors
- Use `border-border` for all container borders
- Use `bg-emerald-50 text-emerald-700` (or `leaf-*` equivalents) for active/approved status

**DON'T:**
- Never hardcode hex in JSX: ~~`style={{ backgroundColor: "#D96A10" }}`~~
- Never use `bg-orange-600` directly — always use `bg-brand-600`
- Never use `bg-green-600` for brand elements — use `bg-leaf-600` for success/nature, `bg-brand-600` for actions
- Never mix emerald and brand for the same "active" state within a module

---

## 6. Typography System

### Font Stack

```css
font-sans:    Plus Jakarta Sans, Inter, Manrope, system-ui, sans-serif
font-display: Plus Jakarta Sans, Inter, sans-serif
font-mono:    JetBrains Mono, Fira Code, monospace
```

### Type Scale

| Name | Size | Weight | Line Height | Tailwind | Usage |
|------|------|--------|-------------|---------|-------|
| Page Title | 20px | 700 | 28px | `text-xl font-bold` | `<h1>` on each page |
| Section Title | 16px | 600 | 22px | `text-base font-semibold` | Drawer titles, section headings |
| Card Title | 14px | 600 | 20px | `text-sm font-semibold` | KPI card labels, sub-panel headers |
| Body | 13px | 400 | 18px | `text-[13px]` | Default body, table cells, form values |
| Table Text | 12px | 400 | 16px | `text-xs` | Table data, compact cell content |
| Label | 12px | 500 | 16px | `text-xs font-medium` | Form labels, column headers |
| Helper Text | 11px | 400 | 14px | `text-[11px]` | Form hints, subtitles, captions |
| Badge / Micro | 11px | 600 | 14px | `text-[11px] font-semibold` | Status badges, audit metadata |
| Uppercase Label | 10px | 700 | — | `text-[10px] uppercase tracking-widest` | Section dividers, group labels |

### Typography Hierarchy Rules

- **Page title:** `text-xl font-bold text-foreground` — one per page, always inside page header block
- **Page subtitle:** `text-[11px] text-muted-foreground mt-0.5` — immediately below page title
- **Section heading (within form/drawer):** `text-xs font-bold text-foreground uppercase tracking-wide`
- **Table column headers:** `text-xs font-semibold text-foreground` — never larger
- **Form labels:** `text-xs font-medium` — never `text-sm`, never `text-base`
- **Code/IDs (dept codes, order numbers, SKUs):** `font-mono text-xs font-semibold text-brand-700`
- **Muted subtitles:** `text-[11px] text-muted-foreground` — never `text-xs text-gray-500`
- **Section divider labels:** `text-[10px] font-bold uppercase tracking-widest text-muted-foreground`
- **Numbers in KPI cards:** `text-xl font-bold text-foreground` (or `text-2xl` for large dashboard KPIs)
- **Navy for headings:** Major page/module titles can use `text-navy-700` to reinforce brand depth

---

## 7. Spacing System

Based on a **4px grid**. All spacing in Tailwind is derived from this grid. **Default to the compact end of ranges — avoid excessive whitespace.**

| Token | Value | Tailwind | Usage |
|-------|-------|---------|-------|
| xs | 4px | `p-1`, `gap-1` | Icon-to-text gap, tight internal spacing |
| sm | 8px | `p-2`, `gap-2` | Small padding, icon buttons, badge padding |
| md | 10px | `p-2.5`, `gap-2.5` | Row padding, compact card interiors |
| lg | 12px | `p-3`, `gap-3` | Default card padding, form field spacing |
| xl | 16px | `p-4`, `gap-4` | Standard gaps, section separators |
| 2xl | 20px | `p-5`, `gap-5` | Drawer body padding |
| 3xl | 24px | `p-6`, `gap-6` | Page content areas, large panels |
| 4xl | 32px | `p-8` | Major section spacing, full-page forms |
| 5xl | 40px | `p-10` | Page-level outer margins |

### Key Spacing Rules (Compact-First)

```
Table row padding:      py-2 px-4     (8px vertical, 16px horizontal) — tighter than consumer apps
Table header padding:   py-2.5 px-4   (10px vertical)
Filter toolbar gap:     space-x-2
Drawer body padding:    py-4 px-5
Mini KPI card padding:  p-3           (12px all sides — compact)
Full dashboard KPI:     p-4           (16px)
Between form fields:    space-y-3     (12px) — NOT space-y-4
Between form sections:  space-y-5     (20px)
Section divider gap:    pb-2.5 (10px) + border-b
Page main padding:      px-5 py-4     (20px horizontal, 16px vertical)
Between page sections:  space-y-4     (16px) — NOT space-y-5 or space-y-6
KPI cards grid gap:     gap-3         (12px)
```

> **Anti-pattern:** Do NOT use `space-y-6`, `py-6`, `p-5` for listing page sections. This creates excessive scroll depth. Every gap should feel purposeful, not airy.

---

## 8. Border Radius & Shadows

### Border Radius Tokens

| Token | Value | Usage |
|-------|-------|-------|
| `rounded-sm` | 6px | Tiny badges, tags, inline chips |
| `rounded-md` / `rounded-input` | 8px | Input fields, text areas, small buttons |
| `rounded-lg` / `rounded-btn` | 10px | Buttons, action elements, filter buttons |
| `rounded-xl` / `rounded-card` | 14px | **Cards, table containers, drawers, filter bars** |
| `rounded-2xl` / `rounded-modal` | 18px | Modals, large panels, full-page form cards |
| `rounded-full` | 9999px | Status pills, avatars, circular icon buttons |

### Shadow Tokens

| Token | Usage |
|-------|-------|
| `shadow-xs` | Subtle lift, inset elements |
| `shadow-sm` | **Table containers, filter bars** — default for most bordered containers |
| `shadow-card` | KPI cards, data cards (slightly more lift) |
| `shadow-card-hover` | KPI card hover state |
| `shadow-navbar` | TopNavbar bottom border shadow |
| `shadow-modal` | Modal/dialog overlay shadow |
| `shadow-xl` | Drawers, side panels |

### Border Rules

- Default container border: `border border-border` (uses CSS variable)
- Soft row dividers: `border-b border-border/60`
- Active filter border: `border-brand-400`
- Active nav accent: `border-l-2 border-brand-600`
- Error input border: `border-red-400`
- Success input border: `border-emerald-400`

---

## 9. Layout Foundation

### AppLayout — The Root Layout Component

**Every authenticated page** must be wrapped in `<AppLayout>`. There is **no route-group level layout.tsx** — each page imports and uses AppLayout directly.

```tsx
// app/(app)/your-module/page.tsx
import { AppLayout } from "@/components/layout/AppLayout";

export default function YourPage() {
  return (
    <AppLayout>
      {/* your content */}
    </AppLayout>
  );
}
```

### AppLayout Structure

```
┌─────────────────────────────────────────────────┐
│  TopNavbar (56px, sticky, z-50)                  │
├─────────────────────────────────────────────────┤
│  AppHeader (48px, sticky)                        │
│  [Search] [FY Selector] [State] [Bell] [Avatar]  │
├─────────────────────────────────────────────────┤
│  <main> flex-1 px-5 py-4                         │
│  (use noPadding=true for full-bleed layouts)      │
└─────────────────────────────────────────────────┘
```

```tsx
// AppLayout signature
<AppLayout
  noPadding={false}  // true for full-bleed like Template Hub
  className=""       // optional extra class on <main>
>
```

### AppLayout internals

```tsx
// FYProvider wraps everything to make useFY() available on all pages
<FYProvider>
  <div className="min-h-screen bg-background flex flex-col">
    <TopNavbar />       {/* 56px */}
    <AppHeader />       {/* 48px */}
    <main className={cn("flex-1", !noPadding && "px-5 py-4", className)}>
      {children}
    </main>
  </div>
</FYProvider>
```

### Page Content Max Width

Use `max-w-[1200px] mx-auto` for standard listing pages:

```tsx
<AppLayout>
  <div className="max-w-[1200px] mx-auto space-y-4">
    {/* page header */}
    {/* KPI cards */}
    {/* toolbar */}
    {/* table */}
  </div>
</AppLayout>
```

Use `max-w-[1440px] mx-auto` for dashboards and analytics.
Use no max-width + `noPadding` for the Template Hub (two-panel layout).

### Full-Height Two-Panel Layout (Template Hub pattern)

```tsx
<AppLayout noPadding>
  <div className="flex" style={{ height: "calc(100vh - 104px)" }}>
    {/* 104px = 56px navbar + 48px header */}
    <aside className="w-60 flex-shrink-0 border-r border-border bg-muted/30 flex flex-col h-full overflow-hidden">
      {/* left nav */}
    </aside>
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* right content — scrollable */}
      <div className="flex-1 overflow-y-auto px-7 py-5 bg-muted/20">
        {/* section content */}
      </div>
    </div>
  </div>
</AppLayout>
```

---

## 10. Navbar & Header System

### TopNavbar (56px)

Fixed top navigation bar. File: `components/layout/TopNavbar.tsx`

**Structure:**
- Left: Dharitri Sutra logo mark + wordmark
- Center: Module navigation links with dropdown children
- Right: Icon-only items (Template/Design System, Settings)

**Logo pattern in TopNavbar:**
```tsx
<Link href="/dashboard" className="flex items-center gap-2.5 px-4 border-r border-border h-full flex-shrink-0">
  {/* Logo mark: DS initials or actual logo image */}
  <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-sm">
    <span className="text-white text-sm font-extrabold">DS</span>
  </div>
  <div className="hidden sm:block">
    <p className="text-[13px] font-bold text-brand-700 leading-tight">Dharitri Sutra</p>
    <p className="text-[10px] text-muted-foreground font-medium leading-tight -mt-0.5">Agri ERP</p>
  </div>
</Link>
```

**Navigation active state styling:**
```tsx
// Active nav item — orange left border + orange tint background
active
  ? "bg-brand-50 text-brand-700 border-brand-600 font-semibold"
  : "text-foreground border-transparent hover:bg-muted/50 hover:text-foreground"
```

**Module navigation items defined in `NAV_ITEMS`:**

```
Dashboard → /dashboard
User Management → /users, /users/roles, /users/groups, /user-management/department, etc.
Masters → /masters/products, /masters/categories, /masters/hsn, etc.
Procurement → /procurement/orders, /procurement/grn, etc.
Sales → (sales sub-modules)
Reports → (report sub-modules)
HR → (HR sub-modules)
Field Force → (field force sub-modules)
Finance → (finance sub-modules)
Monitor → (monitoring sub-modules)
Settings → /settings
Template (icon-only) → /template
```

**Dropdown behavior:** Click on parent shows dropdown with children list. Active state detected via `usePathname()`. Dropdown is inline-rendered (NOT a portal) — see TopNavbar.tsx implementation notes.

**Adding new nav items:**
```tsx
// In TopNavbar.tsx NAV_ITEMS array:
{
  id: "your-module",
  label: "Your Module",
  icon: YourIcon,
  children: [
    { label: "Sub Page",  href: "/your-module/sub" },
    { label: "Sub Page 2", href: "/your-module/sub2" },
  ],
}
```

### AppHeader (48px)

Sub-header below TopNavbar. File: `components/layout/AppHeader.tsx`

**Structure (left to right):**
```
[Global Search Input] [Separator] [FY Selector] [Separator] [State Selector] [Territory Selector] [Separator] [Help] [Notifications] [Approvals Badge] [User Avatar]
```

**Components:**
- **Global Search:** Opens search panel (placeholder for now)
- **FY Selector:** Shows `FY 2024-25 [Live] ▾` — click to switch FY with confirmation dialog
- **State/Territory:** Geographic context selector (dropdown)
- **Notifications Bell:** Popover with notification list, unread badge count
- **Approvals Badge:** Shows total pending approvals with quick links
- **User Avatar:** Dropdown with profile, settings, logout

---

## 11. Table Foundation

### Canonical Table Pattern

All listing pages (master data, transactions, reports) use this exact pattern. Reference: `Template → Listing Patterns`.

```
┌─────────────────────────────────────────────────────────────┐
│  KPI Cards Row (3–4 columns, gap-3)                          │
├─────────────────────────────────────────────────────────────┤
│  Toolbar: [Export] [Add] | [Search] [Filter ▼] [chips]      │
├─────────────────────────────────────────────────────────────┤
│  Table Container (rounded-xl border shadow-sm)               │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐  │
│  │ Code ⇅  │ Name ⇅  │ Status ⇅│ Active   │  ⋮       │  │
│  ├──────────┼──────────┼──────────┼──────────┼──────────┤  │
│  │ DEPT-001 │ Sales    │ ● Active │ [switch] │          │  │
│  │ DEPT-002 │ HR       │ ● Active │ [switch] │          │  │
│  └──────────┴──────────┴──────────┴──────────┴──────────┘  │
│  Footer: Showing X of Y records                              │
└─────────────────────────────────────────────────────────────┘
```

### Table Container

```tsx
<div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
  <div className="overflow-x-auto">
    <table className="w-full">
      <thead>
        <tr className="bg-muted/40 border-b border-border">
          {/* sortable columns */}
        </tr>
      </thead>
      <tbody>
        {rows.map(row => (
          <tr key={row.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors group">
            {/* cells */}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
  {/* Table footer */}
  <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-muted/20">
    <p className="text-[11px] text-muted-foreground">
      Showing <span className="font-medium text-foreground">{count}</span> of{" "}
      <span className="font-medium text-foreground">{total}</span> records
    </p>
  </div>
</div>
```

### Sortable Column Headers

```tsx
// SortTh component pattern (implement per-page or extract to shared)
function SortTh({ label, colKey, sortKey, sortDir, onSort, className }) {
  const active = sortKey === colKey;
  return (
    <th
      onClick={() => onSort(colKey)}
      className={cn(
        "px-4 py-2.5 text-left text-xs font-semibold cursor-pointer select-none group whitespace-nowrap",
        active && "bg-brand-50/60",   // ← active column highlight
      )}
    >
      <div className="flex items-center gap-1.5">
        <span className={active ? "text-brand-700" : "text-foreground"}>{label}</span>
        {active
          ? <ChevronDown className={cn("w-3 h-3 text-brand-600 transition-transform", sortDir === "desc" && "rotate-180")} />
          : <ChevronsUpDown className="w-3 h-3 text-muted-foreground/40 group-hover:text-muted-foreground transition-colors" />
        }
      </div>
    </th>
  );
}

// Sort state
const [sortKey, setSortKey] = useState<"code" | "name" | "status">("name");
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

const handleSort = (key) => {
  if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
  else { setSortKey(key); setSortDir("asc"); }
};
```

**Sort behavior:**
- Click column → sort ascending. Click again → sort descending. Click a different column → new column ascending.
- Active sorted column: `bg-brand-50/60` header, `text-brand-700` label, `ChevronDown` (flips 180° for desc)
- Inactive columns: `text-foreground` label, `ChevronsUpDown` icon at `text-muted-foreground/40`, hover shows `text-muted-foreground`

### Standard Table Columns (Master Data)

| Column | Width | Content | Notes |
|--------|-------|---------|-------|
| Code | `w-36` | `font-mono text-xs font-semibold text-brand-700` | Sortable |
| Name | `w-44` | `text-xs font-semibold text-foreground` + optional subtitle | Sortable, clickable to view |
| Status | `w-28` | `<StatusPill />` | Sortable |
| Active | `w-24` | `<Switch />` | Not sortable, triggers confirm dialog |
| Actions | `w-10` | `<DropdownMenu>` with MoreVertical trigger | Not sortable |

### Action Menu

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="p-1.5 hover:bg-muted rounded-md transition-colors opacity-0 group-hover:opacity-100">
      {/* ← opacity-0 by default, shows on row hover via group-hover */}
      <MoreVertical className="w-4 h-4 text-muted-foreground" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end" className="w-44">
    <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
      Actions
    </DropdownMenuLabel>
    <DropdownMenuSeparator />
    {/* View, Edit, Status Toggle, then separator, then Delete */}
    <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 rounded-sm">
      <Trash2 className="w-3.5 h-3.5" /> Delete
    </button>
  </DropdownMenuContent>
</DropdownMenu>
```

### Row Interaction Rules

- Row hover: `hover:bg-muted/20 transition-colors`
- Selected row: `bg-brand-50/60`
- Action button: `opacity-0 group-hover:opacity-100` (appears on hover via `group` on `<tr>`)
- Name cell: clickable → opens View drawer `onClick={() => setViewDept(dept)}`
- Code cell: always `font-mono text-brand-700`

### Table States

Every table must handle all four states:

```tsx
// 1. Loading — skeleton rows
{isLoading && Array.from({length: 5}).map((_, i) => <SkeletonRow key={i} />)}

// 2. Empty — no records exist
{!isLoading && data.length === 0 && <EmptyTableState onAdd={openAdd} />}

// 3. No results — records exist but search/filter matched nothing
{!isLoading && filtered.length === 0 && hasFilters && <NoResultsState onClear={clearFilters} />}

// 4. Data — normal rows
{filtered.map(row => <DataRow key={row.id} row={row} />)}
```

### Soft Delete Pattern

Never hard-delete master data records. Always soft-archive:

```tsx
const confirmDelete = () => {
  setRecords(prev => prev.map(r =>
    r.id === target.id
      ? { ...r, status: "archived", updatedBy: "Admin", updatedDate: todayStr() }
      : r
  ));
  showToast("Record archived");
};

// Filter out archived from listing:
const visible = records.filter(r => r.status !== "archived");
```

---

## 12. Form Foundation

### When to Use Drawer Form vs Full-Page Form

| Condition | Use |
|-----------|-----|
| ≤ 7 fields, simple master data | **Drawer Form** (Sheet) |
| 8+ fields, or multiple sections | **Full Page Form** |
| Nested line items (order items, invoice lines) | **Full Page Form** |
| Quick status/config toggle | **Inline in table row** |
| Multi-step/wizard flow | **Full Page Stepped Form** |

### Standard Form Fields (All Forms)

```tsx
// Label + Input pattern
<div className="space-y-1.5">
  <Label className="text-xs font-medium">
    Field Name <span className="text-red-500">*</span>
  </Label>
  <Input
    value={form.fieldName}
    onChange={e => set("fieldName", e.target.value)}
    placeholder="Placeholder text…"
    className={cn(
      "h-9 text-sm rounded-lg border border-border",
      "focus-visible:ring-2 focus-visible:ring-brand-300 focus-visible:border-brand-400",
      error && "border-red-400 focus-visible:ring-red-300"
    )}
  />
  {error && (
    <p className="text-xs text-red-500 flex items-center gap-1">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {error}
    </p>
  )}
  <p className="text-[11px] text-muted-foreground">Helper text</p>
</div>
```

### Field Sizing Standards

```
Input height:       h-9 (36px) — strict standard, never h-10 or h-8
Textarea rows:      rows={3} for description, rows={2} for remarks
Label:              text-xs font-medium — never text-sm
Error message:      text-xs text-red-500 with AlertCircle icon
Helper text:        text-[11px] text-muted-foreground
Between fields:     space-y-3 (12px)
Within a field:     space-y-1.5 (6px) — label to input to helper
Input focus ring:   ring-brand-300 border-brand-400 (orange, matches brand)
```

### Form Section Dividers

Use consistent section headings inside forms to group related fields:

```tsx
// Section heading pattern (used inside drawers and full-page forms)
<div className="pb-2.5 border-b border-border mb-3">
  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
    Section Name
  </p>
</div>
```

### Form 2-Column Grid

```tsx
// Preferred for full-page forms — compact 2-column layout
<div className="grid grid-cols-2 gap-3">
  {/* field pairs */}
</div>

// 3-column for very compact sections (addresses, date ranges)
<div className="grid grid-cols-3 gap-3">
  {/* three short fields */}
</div>
```

### Status Toggle — Standard Card Pattern

```tsx
<div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
  <div>
    <p className="text-xs font-medium text-foreground">Status</p>
    <p className="text-[11px] text-muted-foreground mt-0.5">
      {form.status === "active" ? "Active and visible" : "Inactive and hidden"}
    </p>
  </div>
  <div className="flex items-center gap-2 flex-shrink-0">
    <span className={cn("text-xs font-medium", form.status === "active" ? "text-emerald-600" : "text-muted-foreground")}>
      {form.status === "active" ? "Active" : "Inactive"}
    </span>
    <Switch
      checked={form.status === "active"}
      onCheckedChange={v => set("status", v ? "active" : "inactive")}
    />
  </div>
</div>
```

### Form Validation Pattern (without react-hook-form)

```tsx
interface Errors {
  name?: string;
  code?: string;
}

const validate = (): boolean => {
  const e: Errors = {};
  if (!form.name.trim()) e.name = "Name is required";
  if (!form.code.trim()) e.code = "Code is required";
  setErrors(e);
  return Object.keys(e).length === 0;
};

const handleSave = () => {
  if (!validate()) return;
  onSave(form);
};
```

### Audit Info (Edit Mode)

Show read-only audit information at the bottom of edit forms:

```tsx
{isEdit && dept && (
  <div className="bg-muted/30 rounded-xl p-3 space-y-2 text-[11px]">
    <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
    <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
      <div><span className="text-muted-foreground">Created By</span><p className="font-medium">{dept.createdBy}</p></div>
      <div><span className="text-muted-foreground">Created Date</span><p className="font-medium">{dept.createdDate}</p></div>
      <div><span className="text-muted-foreground">Updated By</span><p className="font-medium">{dept.updatedBy}</p></div>
      <div><span className="text-muted-foreground">Updated Date</span><p className="font-medium">{dept.updatedDate}</p></div>
    </div>
  </div>
)}
```

### Full-Page Form Layout

```tsx
// Sticky header bar
<div className="sticky top-0 z-10 bg-white border-b border-border px-5 py-3 flex items-center gap-3">
  <button onClick={goBack}><ArrowLeft className="w-4 h-4" /></button>
  <div className="flex-1">
    <h2 className="text-sm font-semibold">Form Title</h2>
    <p className="text-[11px] text-muted-foreground">Module → Entity → Action</p>
  </div>
  <Button variant="outline" size="sm" className="h-8 text-xs">Discard</Button>
  <Button variant="outline" size="sm" className="h-8 text-xs">Save Draft</Button>
  <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
    <Save className="w-3.5 h-3.5" /> Save & Publish
  </Button>
</div>

// Two-column body
<div className="flex gap-0">
  <div className="flex-1 p-5 space-y-5">
    {/* Section 1 */}
    <div className="pb-2.5 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Section Title</p>
    </div>
    <div className="grid grid-cols-2 gap-3">
      {/* fields */}
    </div>
  </div>
  <div className="w-60 flex-shrink-0 border-l border-border bg-muted/20 p-4">
    {/* sidebar: save actions, status, metadata */}
  </div>
</div>
```

---

## 13. Drawer & Sheet Foundation

### Sheet Component

File: `components/ui/sheet.tsx` — built on `@radix-ui/react-dialog`

```tsx
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
```

### Sheet Structure

```tsx
<Sheet open={open} onOpenChange={onClose}>
  <SheetContent>
    {/* Auto-included: X close button at top-right */}

    <SheetHeader>
      {/* flex-shrink-0 · px-5 pt-5 pb-4 · border-b */}
      <SheetTitle>Title</SheetTitle>
      <SheetDescription>Subtitle</SheetDescription>
    </SheetHeader>

    <SheetBody className="space-y-4">
      {/* flex-1 overflow-y-auto · px-5 py-4 — scrollable */}
      {/* form fields here */}
    </SheetBody>

    <SheetFooter>
      {/* flex-shrink-0 · px-5 py-3 · border-t · bg-muted/30 — sticky */}
      <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
      <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
        <Check className="w-3.5 h-3.5" /> Save
      </Button>
    </SheetFooter>
  </SheetContent>
</Sheet>
```

### Sheet Specs

| Property | Value |
|----------|-------|
| Panel width | `max-w-[440px]` fixed right side |
| Height | Full screen height |
| Position | `fixed right-0 top-0` |
| Open animation | `slide-in-from-right` 300ms |
| Close animation | `slide-out-to-right` 200ms |
| Overlay | `bg-black/40 backdrop-blur-sm` |
| Close button | `absolute right-4 top-4` X icon |
| Z-index | `z-50` |

### Header Icon Badge Pattern (Detail drawers)

```tsx
<SheetHeader>
  <div className="flex items-start gap-3 pr-8">
    <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
      <Building2 className="w-5 h-5 text-brand-600" />
    </div>
    <div className="flex-1 min-w-0">
      <SheetTitle className="truncate">{record.name}</SheetTitle>
      <SheetDescription>{record.code}</SheetDescription>
    </div>
    <StatusPill status={record.status} />
  </div>
</SheetHeader>
```

### When to Open Which Drawer

| Action | Drawer |
|--------|--------|
| + Add [Entity] | `DepartmentSheet` (mode="add") |
| Edit row | `DepartmentSheet` (mode="edit", prefill) |
| Click name in row | `DepartmentDetailSheet` (view mode) |
| View → Edit | Close view, open edit (`onEdit` prop) |

---

## 14. Modal & Dialog Foundation

### Dialog Component

File: `components/ui/dialog.tsx` — built on `@radix-ui/react-dialog`

```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
```

### Confirmation Dialog Pattern

Standard inline pattern used throughout the app:

```tsx
function ConfirmDialog({ open, onClose, onConfirm, title, description, confirmLabel, destructive }) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className={cn(
              "w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0",
              destructive ? "bg-red-50 border border-red-200" : "bg-amber-50 border border-amber-200",
            )}>
              <AlertTriangle className={cn("w-4 h-4", destructive ? "text-red-500" : "text-amber-500")} />
            </div>
            {title}
          </DialogTitle>
          <DialogDescription className="pt-1">{description}</DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className={cn("h-8 text-xs gap-1.5", destructive ? "bg-red-600 hover:bg-red-700 text-white" : "bg-brand-600 hover:bg-brand-700 text-white")}
            onClick={() => { onConfirm(); onClose(); }}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
```

### When to Use Confirmation Dialogs

| Action | Required? | Type |
|--------|-----------|------|
| Delete / Archive | **Required** | Destructive (red) |
| Status deactivate | **Required** | Warning (amber) |
| Status activate | **Required** | Confirmation (brand orange) |
| Financial Year switch | **Required** | Warning (amber) |
| Unsaved form discard | **Required** | Warning (amber) |
| Export / Download | Optional | — |

---

## 15. Filter Patterns

Reference: `Template → Filter Patterns`

### Pattern 1: Filter Button + Popover (Default — Use This)

Use for all master data listing pages:

```tsx
<Popover>
  <PopoverTrigger asChild>
    <button className={cn(
      "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium transition-colors",
      filterStatus.length > 0
        ? "border-brand-400 bg-brand-50 text-brand-700"       // active state
        : "border-border text-muted-foreground hover:bg-muted" // inactive state
    )}>
      <SlidersHorizontal className="w-3.5 h-3.5" />
      Filter
      {filterStatus.length > 0 && (
        <span className="w-4 h-4 text-[10px] bg-brand-600 text-white rounded-full inline-flex items-center justify-center font-bold">
          {filterStatus.length}
        </span>
      )}
    </button>
  </PopoverTrigger>
  <PopoverContent align="start" className="w-52 p-0">
    <div className="px-3 py-2.5 border-b border-border">
      <p className="text-xs font-semibold text-foreground">Filter by Status</p>
    </div>
    <div className="px-3 py-2.5 space-y-2">
      {["active", "inactive"].map(v => (
        <label key={v} className="flex items-center gap-2.5 cursor-pointer">
          <input type="checkbox" className="w-4 h-4 rounded accent-brand-600"
            checked={filterStatus.includes(v)} onChange={() => toggleFilter(v)} />
          <span className="text-xs capitalize text-foreground">{v}</span>
        </label>
      ))}
    </div>
    {filterStatus.length > 0 && (
      <div className="px-3 py-2 border-t border-border">
        <button onClick={() => setFilterStatus([])} className="text-xs text-brand-600 hover:underline">
          Clear filter
        </button>
      </div>
    )}
  </PopoverContent>
</Popover>

{/* Active filter chips */}
{filterStatus.map(v => (
  <span key={v} className="inline-flex items-center gap-1 px-2 py-1 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium">
    {v.charAt(0).toUpperCase() + v.slice(1)}
    <button onClick={() => toggleFilter(v)}><X className="w-3 h-3" /></button>
  </span>
))}
```

### Pattern 2: Inline Pill Tabs

Use only for 2–4 mutually exclusive status options:

```tsx
{["", "active", "inactive"].map(v => (
  <button key={v} onClick={() => setStatusFilter(v)}
    className={cn("h-7 px-3 text-xs rounded-lg border transition-colors font-medium",
      statusFilter === v ? "bg-brand-600 text-white border-brand-600" : "border-border text-muted-foreground hover:bg-muted"
    )}>
    {v === "" ? "All" : v.charAt(0).toUpperCase() + v.slice(1)}
  </button>
))}
```

### Which Pattern to Use

| Scenario | Pattern |
|----------|---------|
| Master data listing (Department, Product, Customer, etc.) | Pattern 1 — Filter Popover |
| 2–4 status tabs, always visible | Pattern 2 — Pill Tabs |
| Reports with many filter dimensions | Pattern 3 — Full Filter Panel |
| Dashboard / analytics | Pattern 3 — Sidebar Filter Panel |
| Combined search + sort only | Pattern 4 — Search + Sort Dropdown |

---

## 16. Status & Approval System

### StatusPill Component (Inline)

The standard status display across ALL tables:

```tsx
// Standard inline implementation (copy this pattern per module)
const STATUS_CFG = {
  active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
  archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
  pending:  { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  approved: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  rejected: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-500"     },
  draft:    { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
};

function StatusPill({ status }) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.inactive;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}
```

### Global StatusBadge Component

File: `components/ui/StatusBadge.tsx` — use for non-table contexts:

```tsx
import { StatusBadge, CountBadge } from "@/components/ui/StatusBadge";

// Usage:
<StatusBadge status="active" size="md" showDot />
<StatusBadge status="pending" size="sm" showDot={false} />
<CountBadge count={12} />  // notification count badge
```

**Available status keys:**
`active | inactive | pending | approved | rejected | draft | shipped | overdue | partial | closed`

### Approval Status System

Used in Approval UI workflows. Reference: `Template → Approval UI`

| Status | Color | Usage |
|--------|-------|-------|
| `pending` | Amber | Awaiting first review |
| `in-review` | Navy/Blue | Currently being reviewed |
| `approved` | Emerald | Fully approved |
| `rejected` | Red | Rejected, requires correction |
| `clarification-needed` | Orange | Sent back for clarification |
| `escalated` | Purple | Escalated to higher authority |
| `auto-approved` | Teal | System auto-approved (below threshold) |

### Approval Timeline Pattern

```tsx
// Each step in the approval chain:
{
  label: "Level 1 — Manager",
  actor: "Rajesh Kumar",
  date: "18 Jan 2024",
  status: "done" | "active" | "pending" | "rejected" | "skipped",
  note: "Optional approval note"
}
```

Timeline visual:
- **done:** `bg-emerald-500 text-white` circle with Check icon + `bg-emerald-300` connector line
- **active:** `bg-brand-600 text-white ring-4 ring-brand-100` circle with animated spinner
- **rejected:** `bg-red-500 text-white` circle with X icon
- **pending:** `bg-white border-2 border-border` empty circle
- **skipped:** `bg-slate-200 text-slate-400` dimmed circle

### Urgency Badges (Approval context)

```
high   → bg-red-100   text-red-700   label="Urgent"
medium → bg-amber-100 text-amber-700 label="Medium"
low    → bg-slate-100 text-slate-600 label="Normal"
```

---

## 17. Autocomplete / Select Standards

**CRITICAL RULE: Never use native HTML `<select>`. Never use Radix `<Select>` for user-facing selects.**

Reference: `Template → Autocomplete / Select`

### Standard Autocomplete Pattern

Use a `Popover` + searchable list for all select inputs in forms:

```tsx
// Trigger — looks like an input field
<button className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors">
  <span className={selected ? "text-foreground" : "text-muted-foreground"}>
    {selected ? selectedLabel : "Select an option…"}
  </span>
  <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
</button>

// Popover content
<PopoverContent className="w-[--radix-popover-trigger-width] p-0">
  {/* search box */}
  <div className="p-2 border-b border-border">
    <div className="relative">
      <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
      <input placeholder="Search…" className="w-full pl-8 pr-3 py-1.5 text-sm focus:outline-none bg-transparent" />
    </div>
  </div>
  {/* option list */}
  {options.map(opt => (
    <button onClick={() => select(opt)}
      className={cn("w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60", selected === opt.value && "bg-brand-50")}>
      <span className="flex-1 truncate">{opt.label}</span>
      {selected === opt.value && <Check className="w-3.5 h-3.5 text-brand-600 flex-shrink-0" />}
    </button>
  ))}
</PopoverContent>
```

### Multi-Select Pattern

```tsx
// Selected items shown as chips inside the trigger:
<div className="flex flex-wrap gap-1 flex-1">
  {selectedValues.map(v => (
    <span key={v} className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md">
      {getLabel(v)}
      <button onClick={e => { e.stopPropagation(); deselect(v); }}><X className="w-3 h-3" /></button>
    </span>
  ))}
</div>
```

### Select Component Types Available

| Type | When to Use |
|------|-------------|
| Single Select Autocomplete | Most form fields: Category, Territory, Department |
| Multi-Select | Permission roles, product tags, zone selection |
| Async/Server-Side Search | Large datasets: Customer, Distributor (>500 items) |
| Icon + Label Select | Status selectors, priority pickers |
| Grouped Select | Product selection (grouped by category) |

---

## 18. Dashboard & KPI Widgets

### KPICard Component

File: `components/ui/KPICard.tsx`

```tsx
import { KPICard } from "@/components/ui/KPICard";

<KPICard
  title="Total Sales"
  value="₹48.2L"
  subtitle="This month"
  change={{ value: 12.4 }}     // positive = green ↑, negative = red ↓
  icon={TrendingUp}
  accent="brand"               // "brand" | "navy" | "amber" | "leaf"
/>
```

### Mini KPI Card — Listing Page Pattern

Used above tables for quick summary. **Compact variant — no unnecessary padding.**

```tsx
// Standard Mini KPI Card
function KpiCard({ label, value, icon: Icon, accent }) {
  return (
    <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
      <div className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
        accent ? "bg-brand-600" : "bg-muted"
      )}>
        <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">{label}</p>
      </div>
    </div>
  );
}

// 3-column grid (standard for listing pages)
<div className="grid grid-cols-3 gap-3">
  <KpiCard label="Total" value={total} icon={Building2} accent />
  <KpiCard label="Active" value={active} icon={CheckCircle2} />
  <KpiCard label="Inactive" value={inactive} icon={XCircle} />
</div>

// 4-column grid (for modules with 4 metrics)
<div className="grid grid-cols-4 gap-3">
  ...
</div>
```

### Left-Border Accent Variant (Alternative KPI Style)

For dashboards where visual differentiation between cards is needed:

```tsx
// Left-border accent KPI card — creates stronger visual hierarchy
function KpiCardAccent({ label, value, icon: Icon, borderColor, iconBg, iconColor }) {
  return (
    <div className={cn(
      "bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm",
      "border-l-4",              // left border accent
      borderColor ?? "border-l-brand-600"
    )}>
      <div className={cn("w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0", iconBg ?? "bg-brand-50")}>
        <Icon className={cn("w-4 h-4", iconColor ?? "text-brand-600")} />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">{label}</p>
      </div>
    </div>
  );
}

// Usage — differentiated accent colors per metric type:
<KpiCardAccent label="Total Revenue"  value="₹2.4Cr"  icon={TrendingUp}   borderColor="border-l-brand-600"  iconBg="bg-brand-50"   iconColor="text-brand-600" />
<KpiCardAccent label="Orders Pending" value="47"      icon={Clock}        borderColor="border-l-amber-500"  iconBg="bg-amber-50"   iconColor="text-amber-600" />
<KpiCardAccent label="Approved Today" value="12"      icon={CheckCircle2} borderColor="border-l-emerald-500" iconBg="bg-emerald-50" iconColor="text-emerald-600" />
<KpiCardAccent label="Overdue"        value="3"       icon={AlertCircle}  borderColor="border-l-red-500"    iconBg="bg-red-50"     iconColor="text-red-600" />
```

### Full Dashboard KPI Card (Analytics-Grade)

For dashboard pages — larger, with trend indicator:

```tsx
<div className="bg-white rounded-xl border border-border p-4 shadow-card">
  <div className="flex items-start justify-between mb-3">
    <div>
      <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      <p className="text-2xl font-bold text-foreground mt-1">{value}</p>
    </div>
    <div className="w-10 h-10 rounded-xl bg-brand-600 flex items-center justify-center flex-shrink-0">
      <Icon className="w-5 h-5 text-white" />
    </div>
  </div>
  <div className="flex items-center gap-1.5">
    {change >= 0
      ? <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
      : <TrendingDown className="w-3.5 h-3.5 text-red-500" />}
    <span className={cn("text-xs font-semibold", change >= 0 ? "text-emerald-600" : "text-red-600")}>
      {Math.abs(change)}%
    </span>
    <span className="text-[11px] text-muted-foreground">{subtitle}</span>
  </div>
</div>
```

### Dashboard Chart Patterns

Library: `recharts`

```tsx
// Wrap charts in fixed-height containers:
<div className="w-full h-[280px]">
  <ResponsiveContainer width="100%" height="100%">
    <LineChart data={data}>
      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
      <YAxis tick={{ fontSize: 11 }} />
      <Tooltip />
      {/* Use brand orange as primary line color */}
      <Line type="monotone" dataKey="value" stroke="#D96A10" strokeWidth={2} dot={{ fill: "#D96A10", r: 3 }} />
      {/* Use navy for secondary series */}
      <Line type="monotone" dataKey="target" stroke="#1A3A96" strokeWidth={2} strokeDasharray="5 5" />
    </LineChart>
  </ResponsiveContainer>
</div>

// Bar chart fill colors:
// Primary metric → fill="#D96A10" (brand orange)
// Secondary metric → fill="#1A3A96" (navy)
// Success/comparison → fill="#267A2E" (leaf green)
```

---

## 19. Feedback & State Patterns

### Toast Notifications

Inline implementation (no Radix Toast wrapper needed for simple cases):

```tsx
interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {/* icon + message + dismiss X */}
    </div>
  );
}

// Auto-dismiss after 3.2 seconds:
useEffect(() => {
  if (!toast) return;
  const t = setTimeout(() => setToast(null), 3200);
  return () => clearTimeout(t);
}, [toast]);
```

### Alert Patterns

```tsx
// Info
<div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
  <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
  <p className="text-xs text-blue-700">Information message</p>
</div>

// Warning
<div className="bg-amber-50 border border-amber-200 rounded-xl p-3.5">
  <p className="text-xs font-semibold text-amber-700">Warning title</p>
</div>

// Success
<div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
  <p className="text-xs text-emerald-700">Success message</p>
</div>

// Error / Destructive
<div className="bg-red-50 border border-red-200 rounded-lg p-3">
  <p className="text-xs text-red-700">Error message</p>
</div>
```

### Empty States

File: `components/ui/EmptyState.tsx`

```tsx
// Inline empty state (inside tables):
<div className="flex flex-col items-center gap-2 py-14">
  <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
    <Building2 className="w-5 h-5 text-muted-foreground" />
  </div>
  <p className="text-sm font-medium text-foreground">No records found</p>
  <p className="text-xs text-muted-foreground">Add your first entry to get started.</p>
  <button onClick={openAdd} className="text-xs text-brand-600 hover:underline mt-1">
    + Add Record
  </button>
</div>
```

### Loading / Skeleton States

File: `components/ui/Loaders.tsx`

```tsx
// Skeleton row in table:
function SkeletonRow({ cols }) {
  return (
    <tr className="border-b border-border">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-2.5">
          <div className={`h-3 bg-muted animate-pulse rounded ${i === 0 ? "w-36" : "w-24"}`} />
        </td>
      ))}
    </tr>
  );
}
```

---

## 20. ERP-Specific Patterns

### Timeline / Activity Log

Reference: `Template → Timeline / Activity`

Used for: Approval history, record audit trail, field agent activity.

```tsx
// Timeline item structure:
{ icon: Calendar, colorScheme: "blue",   label: "Created",          detail: "By Admin on 2024-01-10" }
{ icon: Clock,    colorScheme: "amber",  label: "Last Updated",     detail: "By Admin on 2024-01-15" }
{ icon: Check,    colorScheme: "emerald",label: "Status Changed",   detail: "Changed to Active" }
{ icon: User,     colorScheme: "purple", label: "Last Action",      detail: "Modified by Admin" }

// Icon badge:
<div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
  <Calendar className="w-3.5 h-3.5 text-blue-500" />
</div>
```

### Audit Summary (Detail Drawers)

Always include at the bottom of detail views:

```tsx
<div>
  <SectionHeading icon={FileText} label="Audit Summary" />
  <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
    <InfoRow label="Created By"   value={dept.createdBy} />
    <InfoRow label="Created Date" value={dept.createdDate} />
    <InfoRow label="Updated By"   value={dept.updatedBy} />
    <InfoRow label="Updated Date" value={dept.updatedDate} />
  </div>
</div>
```

### Comments & Notes

Reference: `Template → Comments & Notes`

Structure: Avatar + name + timestamp + message body + reply thread.

### Beat Planning / Route Planning

Reference: `Template → Beat & Route Planning`

Specialized pattern for field force route visualization.

### Nested Data / Line Items

Reference: `Template → Nested Data UI`

Used for: Order line items, invoice details, BOM structure.
Pattern: Expandable rows in table, or dedicated nested table below parent row.

### Profile Components

Reference: `Template → Profile Components`

Used for: User profile cards, distributor profiles, farmer registry cards.

### Stepper Forms

Reference: `Template → Stepper Forms`

Used for: Complex multi-step creation flows (New Customer Onboarding, Purchase Order Creation).

Step indicator:
```tsx
// done → bg-emerald-500, active → bg-brand-600 ring-brand-100, pending → bg-white border-border
```

---

## 21. Responsive Standards

### Breakpoints (Tailwind defaults)

| Breakpoint | Width | Usage |
|------------|-------|-------|
| (default) | <640px | Mobile — stack everything vertically |
| `sm` | 640px | Small tablets |
| `md` | 768px | Tablets — 2-column grids |
| `lg` | 1024px | Laptops — full layout |
| `xl` | 1280px | Desktops — max content width |

### Responsive Grid Rules

```tsx
// KPI cards:
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">

// Form 2-column:
<div className="grid grid-cols-1 md:grid-cols-2 gap-3">

// Dashboard 4-column:
<div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
```

### Table Responsive Behavior

- Tables always inside `overflow-x-auto` container
- On mobile, tables scroll horizontally — do NOT stack rows
- Priority columns (Code, Name, Status, Actions) should be leftmost
- Less important columns (Created Date, etc.) can be rightmost

### Drawer on Mobile

Drawers maintain full-width on mobile: `w-full max-w-[440px]`

### Typography Scaling

```tsx
// Page title — smaller on mobile:
<h1 className="text-lg sm:text-xl font-bold">

// No size change needed for: table text, labels, helper text (already compact)
```

### What Does NOT Change on Mobile

- Table internal layout (scroll instead)
- Form field sizes (h-9 stays h-9)
- Drawer sheet (full width on mobile is fine)
- Status pill sizes

---

## 22. Permission UI Standards

### Permission-Aware Patterns

While full RBAC implementation is pending, UI must be built permission-ready:

```tsx
// Button visibility
{hasPermission("department.create") && (
  <Button onClick={openAdd}>Add Department</Button>
)}

// Action menu items
{hasPermission("department.edit") && (
  <DropdownMenuItem onClick={() => openEdit(dept)}>Edit</DropdownMenuItem>
)}

// Disabled with tooltip (visible but disabled)
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild>
      <span>  {/* wrapper needed for disabled button tooltip */}
        <Button disabled={!hasPermission("department.delete")}>Delete</Button>
      </span>
    </TooltipTrigger>
    <TooltipContent>You don't have permission to delete departments</TooltipContent>
  </Tooltip>
</TooltipProvider>
```

### Role-Based UI Visibility

Modules in TopNavbar should filter based on user role:
- Field Force agents: see only field-force modules
- Finance users: see Finance + Reports + Procurement
- Admin: see all modules

---

## 23. Financial Year System

### Store Location

File: `lib/fy-store.tsx`

### Core Types

```tsx
export type FYStatus = "upcoming" | "live" | "closed" | "archived";

export interface FinancialYear {
  id: string;       // "2024-25"
  label: string;    // "FY 2024-25"
  start: string;    // "Apr 1, 2024"
  end: string;      // "Mar 31, 2025"
  status: FYStatus;
}
```

### Usage in Components

```tsx
import { useFY } from "@/lib/fy-store";

// Inside any component wrapped by AppLayout (which includes FYProvider):
const { selectedFY, setSelectedFY, allFYs } = useFY();
```

### FY Status Configuration

```tsx
export const FY_STATUS_CONFIG = {
  live:     { label: "Live",     bg: "bg-emerald-50", color: "text-emerald-700", dot: "bg-emerald-500" },
  upcoming: { label: "Upcoming", bg: "bg-navy-50",    color: "text-navy-700",    dot: "bg-navy-500"    },
  closed:   { label: "Closed",   bg: "bg-slate-100",  color: "text-slate-600",   dot: "bg-slate-400"   },
  archived: { label: "Archived", bg: "bg-rose-50",    color: "text-rose-700",    dot: "bg-rose-400"    },
};
```

### FY Switch Behavior

- Switching to a `closed` or `archived` FY → show warning: "This year is closed — data will be read-only"
- Switching to `upcoming` → show info: "This FY has not started yet"
- FY selection on login → stored in `localStorage` under key `dharitrisutra_selected_fy`

### FY in Data Queries

All data fetches for transactional modules (Sales Orders, Invoices, etc.) must scope by `selectedFY.id`. The FY context is available anywhere inside AppLayout.

---

## 24. Reusable Component Rules

### The Golden Rules

1. **Never duplicate component logic.** If the same UI pattern appears in 2+ places, extract it.
2. **Never put page-specific logic in `components/ui/`.** Those are pure presentation components.
3. **Never import AppLayout inside `components/ui/`.** Layout components are separate.
4. **Always use `cn()` for conditional className.**
5. **Always use `text-muted-foreground` for secondary text, never `text-gray-500`.**
6. **Never use `style={{ color: "..." }}` for colors.** Use Tailwind classes.
7. **Always handle all table states**: loading, empty, no-results, error, data.
8. **Every new master data module must have**: StatusPill, inline Switch, action menu, filter popover, column sorting.

### Component Extraction Threshold

| Scenario | Action |
|----------|--------|
| Used in 1 place | Keep inline in page/component file |
| Used in 2+ files | Extract to `components/ui/` |
| Used in 2+ files within same module | Extract to `module/components/` |
| Pure layout/container | Extract to `components/layout/` |

### Switch Component

File: `components/ui/switch.tsx` — custom implementation, NOT Radix Switch.

```tsx
<Switch
  checked={isActive}
  onCheckedChange={(checked) => handleToggle(checked)}
  disabled={false}
/>
```

**Always** show a confirmation dialog before changing status via Switch in a table row.

### Popover Component

File: `components/ui/popover.tsx` — built on `@radix-ui/react-popover`.

Default width: `w-72`. Override with className on `PopoverContent`.

### Tooltip Usage

```tsx
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

// Always wrap with TooltipProvider (or use it at layout level):
<TooltipProvider>
  <Tooltip>
    <TooltipTrigger asChild><button>...</button></TooltipTrigger>
    <TooltipContent><p>Tooltip text</p></TooltipContent>
  </Tooltip>
</TooltipProvider>
```

---

## 25. Template Module Reference Index

The Template Module at `/template` is the **live, interactive reference** for everything in this document. It reflects the Dharitri Sutra brand — orange CTAs, navy headings, leaf-green success states. Always open it before building a new UI pattern.

### Navigation Structure

```
Foundation
  ├── Colors & Theme         → Brand orange, navy secondary, leaf accent, semantic colors
  ├── Typography             → All type scales with live examples
  ├── Spacing System         → 4px grid, compact spacing tokens
  ├── Border Radius          → All radius tokens
  ├── Shadows                → All shadow tokens
  └── Icons                  → Lucide icon usage guide

Core Components
  ├── Buttons                → All variants: primary (orange), secondary (navy), ghost, semantic, icon, loading
  ├── Status Badges          → All status variants (active/inactive/pending/approved/rejected/draft/etc.)
  ├── Cards                  → Mini KPI, left-border accent, full dashboard KPI, data cards
  ├── Autocomplete / Select  → All select patterns (single, multi, async, grouped)
  └── Loaders                → Skeleton, spinner variants

Form Patterns
  ├── Form Foundations       → Input fields, states (error/success/disabled), controls (Switch/Checkbox/Radio), layout patterns
  ├── Full Page Forms        → Two-column + sidebar, Accordion sections, Stepped/Wizard
  └── Drawer Forms           → Quick Add, View/Detail, anatomy + specs

Data Display
  ├── Tables & Listings      → Enterprise table with sort/filter/bulk/expand/pagination
  ├── Listing Patterns       → Master data listing (live demo — THE canonical pattern)
  ├── Filter Patterns        → 5 filter patterns with decision guide
  ├── Nested Data UI         → Expandable rows, line items, BOM trees
  └── Charts & Analytics     → Recharts usage — orange primary line, navy secondary, leaf green comparison

Overlays & Navigation
  ├── Modals & Dialogs       → Confirmation, info, form modals
  ├── Drawer Components      → Original drawer reference (visual anatomy)
  ├── Navbar & Header        → TopNavbar (Dharitri Sutra branding) + AppHeader breakdown
  ├── Sidebar Navigation     → Sidebar with group labels, active state
  └── Tabs & Accordions      → Tab variants, accordion patterns

Feedback & States
  ├── Alerts & Notifications → Alert variants (info/warning/success/error)
  └── Empty States           → All empty state patterns

ERP Patterns
  ├── Approval UI            → Full approval chain: timeline, action buttons, modals, status pills
  ├── Profile Components     → User/distributor/farmer profile cards
  ├── Stepper Forms          → Multi-step form with progress indicator
  ├── Timeline / Activity    → Activity log, audit trail timeline
  ├── Comments & Notes       → Comment thread with replies, avatar
  └── Audit Logs             → Audit trail table

Specialised
  ├── File Upload            → Drag-drop zone, file list, progress
  └── Mobile Components      → Touch-optimized patterns for field agents

Field Force
  └── Beat & Route Planning  → Route map, beat plan table

Auth & Config
  ├── Login UI               → Multi-step login (identifier → password/OTP → FY selection)
  └── Financial Year         → FY status badges, selector, switch dialog
```

---

## 26. New Module Development Guidelines

### Before Writing a Single Line of Code

1. **Open `/template` and find the relevant pattern.** Every module type has a reference.
2. **Identify the form type:** ≤7 fields → Drawer. 8+ fields or nested data → Full Page.
3. **Check if components already exist in `components/ui/`.** Don't recreate what's there.
4. **Copy the closest existing module** (e.g., Department module for any master data module).

### New Master Data Module Checklist

```
[ ] page.tsx wraps with <AppLayout>
[ ] Page header: title + subtitle + Export button + Add [Entity] button
[ ] KPI cards: 3–4 columns (total, active, inactive or relevant metrics), gap-3
[ ] Toolbar: search input + Filter button (Popover) + active filter chips + count
[ ] Table container: rounded-xl border shadow-sm
[ ] Column headers: sortable with SortTh pattern, py-2.5 px-4
[ ] Table rows: py-2 px-4 (compact)
[ ] Columns: Code (mono brand-700), Name (clickable to view), Status (StatusPill), Active (Switch), Actions (DropdownMenu)
[ ] Action menu: View, Edit, Activate/Deactivate, separator, Delete
[ ] Empty state: icon + message + CTA button
[ ] No-results state: message + "Clear filters" link
[ ] [Entity]Sheet.tsx: Add/Edit drawer (name, code, status toggle, remarks)
[ ] [Entity]DetailSheet.tsx: View drawer with detail rows + history timeline + audit summary
[ ] Confirmation dialogs: status toggle + delete
[ ] Toast notifications: create success, update success, archived
[ ] Soft delete: status → "archived", filter archived from listing
[ ] Type definition includes: id, code, name, status, remarks, createdBy, createdDate, updatedBy, updatedDate, lastStatusChange
```

### New Transaction Module Checklist (Sales Order, Purchase Order, Invoice, etc.)

```
[ ] Listing page with full table (sortable, filterable, bulk actions)
[ ] Full-page form for Create/Edit
[ ] View/detail page with line items
[ ] Approval timeline if approval workflow required
[ ] Status progression badges
[ ] Print/PDF export action
[ ] Related records links (PO → GRN, SO → Invoice)
```

### Folder Structure for New Module

```
app/(app)/[module-name]/
├── page.tsx                     ← Listing (AppLayout + table)
├── components/
│   ├── [Entity]Sheet.tsx        ← Add/Edit drawer
│   └── [Entity]DetailSheet.tsx  ← View drawer
│
│   For full-page form modules:
├── new/page.tsx                 ← Create full-page form
└── [id]/
    ├── page.tsx                 ← View / detail page
    └── edit/page.tsx            ← Edit full-page form
```

### Data Model Convention

```tsx
// Every entity interface follows this pattern:
interface Entity {
  id: number;
  code: string;         // DEPT-001 pattern, font-mono in UI
  name: string;
  status: string;       // "active" | "inactive" | "archived"
  remarks: string;      // optional notes
  // Audit fields — always present:
  createdBy: string;
  createdDate: string;  // "YYYY-MM-DD"
  updatedBy: string;
  updatedDate: string;  // "YYYY-MM-DD"
  lastStatusChange: string; // "YYYY-MM-DD"
}
```

### State Management Convention

```tsx
// Use React useState — no Zustand, no Redux for page-level state
const [records, setRecords] = useState<Entity[]>(SEED_OR_API_DATA);
const [search, setSearch] = useState("");
const [filterStatus, setFilterStatus] = useState<string[]>([]);
const [sortKey, setSortKey] = useState<"code" | "name" | "status">("name");
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
const [sheetMode, setSheetMode] = useState<"add" | "edit" | null>(null);
const [activeRecord, setActiveRecord] = useState<Entity | null>(null);
const [viewRecord, setViewRecord] = useState<Entity | null>(null);
const [confirmTarget, setConfirmTarget] = useState<{ type: string; record: Entity } | null>(null);
const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
```

### Todaystr Utility

```tsx
// Always use this for dates, not new Date().toLocaleDateString()
function todayStr() {
  return new Date().toISOString().slice(0, 10); // "2024-01-15"
}
```

---

## 27. Do / Don't Rules

### Color Rules

| ✅ DO | ❌ DON'T |
|-------|---------|
| `bg-brand-600` for primary CTA buttons | `bg-orange-600` or `bg-amber-600` directly |
| `text-brand-700` for active sorted column headers | Hardcoded hex color values |
| `bg-brand-50` for active filter chips, selected rows, active nav items | `bg-orange-50` — always use `brand-*` tokens |
| `text-navy-700` for page titles and prominent headings | `text-blue-800` or `text-indigo-900` |
| `text-muted-foreground` for secondary text | `text-gray-500` or `text-gray-400` |
| `border-border` for all container borders | `border-gray-200` or `border-gray-300` |
| `bg-muted/20` for subtle backgrounds | `bg-gray-50` or `bg-slate-50` |
| Emerald/`leaf-*` for success/active/approved states | Orange brand for status indicators |

### Component Rules

| ✅ DO | ❌ DON'T |
|-------|---------|
| Use `<Switch>` from `components/ui/switch` | Use native `<input type="checkbox">` for toggles |
| Use `<Popover>` for select/autocomplete | Use native `<select>` element |
| Use `<Sheet>` from `components/ui/sheet` for drawers | Build custom drawer from scratch |
| Use `<Dialog>` for confirmations | Use browser `confirm()` |
| Use Lucide icons | Use any other icon library |
| Show confirmation before any destructive action | Immediately execute delete/archive |
| Filter `status !== "archived"` from listings | Show archived records in normal listing |

### Layout Rules

| ✅ DO | ❌ DON'T |
|-------|---------|
| Wrap every `(app)` page in `<AppLayout>` | Leave any page without AppLayout |
| Use `max-w-[1200px] mx-auto` for standard listings | Allow full-width unbounded tables |
| Use `rounded-xl border shadow-sm` for table containers | Use plain bordered tables |
| Use `overflow-x-auto` wrapper for tables | Let tables overflow/break layout |
| Use `group` + `group-hover:opacity-100` for action menus | Always show action menu buttons |
| Use `space-y-4` between page sections | Use `space-y-6` or `space-y-8` (too airy) |
| Use `px-5 py-4` for page main padding | Use `px-6 py-6` (too much vertical space) |

### Form Rules

| ✅ DO | ❌ DON'T |
|-------|---------|
| Use `h-9 text-sm rounded-lg` for inputs | Mix different input heights |
| Use `text-xs font-medium` for labels | Use `text-sm` or `text-base` for form labels |
| Use `text-[11px] text-muted-foreground` for helper text | Use `text-xs text-gray-400` |
| Show audit info in edit mode (read-only) | Repeat audit fields as editable |
| Use drawer for ≤7 field forms | Use drawer for complex multi-section forms |
| Use `font-mono` for codes, IDs, order numbers | Display codes in regular font |
| Use `space-y-3` between form fields | Use `space-y-4` or `space-y-5` (wastes vertical space) |
| Use `gap-3` in form grids | Use `gap-4` or `gap-6` for compact forms |

### Status Rules

| ✅ DO | ❌ DON'T |
|-------|---------|
| Soft-delete by setting `status: "archived"` | Hard-delete master data records |
| Always confirm before status changes | Toggle status without confirmation |
| Use StatusPill with dot for all status displays | Use plain text for status |
| Use emerald for active/approved, amber for pending, red for rejected | Use inconsistent colors across modules |

### TypeScript Rules

| ✅ DO | ❌ DON'T |
|-------|---------|
| Define explicit interfaces for all entities | Use `any` type |
| Type sort keys as union: `"code" \| "name" \| "status"` | Use `string` for sort keys |
| Export entity interfaces from `[Entity]Sheet.tsx` | Redefine the same interface in multiple files |
| Use `cn()` for all conditional className | Use template literals for className |
| Double-cast for dynamic key access: `(a as unknown as Record<string, unknown>)[key]` | Use `(a as Record<string, unknown>)[key]` (TS2352 error) |

---

## Appendix: Quick Reference

### Most-Used Tailwind Classes

```
Container:       border border-border rounded-xl bg-white shadow-sm overflow-hidden
Table header:    bg-muted/40 border-b border-border py-2.5 px-4
Table row:       border-b border-border/60 hover:bg-muted/20 transition-colors group py-2 px-4
Active sort col: bg-brand-50/60 (th)  text-brand-700 (label)  ChevronDown text-brand-600
Filter chip:     bg-brand-50 border border-brand-200 text-brand-700 rounded-md
Page header:     text-xl font-bold text-foreground (or text-navy-700 for brand depth)
Page subtitle:   text-[11px] text-muted-foreground mt-0.5
Input:           h-9 text-sm rounded-lg border border-border focus-visible:ring-brand-300
CTA button:      h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white
Cancel button:   h-8 text-xs variant="outline"
Code cell:       font-mono text-xs font-semibold text-brand-700
Section label:   text-[10px] font-bold uppercase tracking-widest text-muted-foreground
Helper text:     text-[11px] text-muted-foreground
Error text:      text-xs text-red-500
Mini KPI card:   bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm
KPI icon (accent): w-9 h-9 rounded-lg bg-brand-600 flex items-center justify-center
Chart stroke:    stroke="#D96A10" (brand orange primary) | stroke="#1A3A96" (navy secondary)
```

### Key File Paths

```
Design system reference:  /template
AppLayout:                components/layout/AppLayout.tsx
TopNavbar:                components/layout/TopNavbar.tsx
AppHeader:                components/layout/AppHeader.tsx
FY store:                 lib/fy-store.tsx
All UI primitives:        components/ui/
Department (reference):   app/(app)/user-management/department/
Tailwind config:          tailwind.config.js
```

### Adding a Section to the Template Module

1. Create `app/(app)/template/sections/[YourName]Section.tsx`
2. Export default function `[YourName]Section() { ... }`
3. Add to `GROUPS` array in `app/(app)/template/page.tsx`
4. Add import at top of `page.tsx`
5. Add `case "[your-id]": return <YourNameSection />;` in `renderSection()`

### Brand Color Quick Reference

```
Primary CTA button:    bg-brand-600   (#D96A10)
Primary CTA hover:     bg-brand-700   (#B85508)
Active tint:           bg-brand-50    (#FFF3E8)
Active text:           text-brand-700 (#B85508)
Active border:         border-brand-600
Page/section heading:  text-navy-700  (#1A3A96)
Success/active status: text-emerald-700  bg-emerald-50
Chart primary line:    #D96A10 (orange)
Chart secondary line:  #1A3A96 (navy)
Chart success bars:    #267A2E (leaf green)
```

---

*This document is maintained by the Dharitri Sutra ERP frontend team.*
*Last updated: 2026-06-01*
*Version: 3.0*
