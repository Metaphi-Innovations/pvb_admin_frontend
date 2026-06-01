# CLAUDE-NAVBAR.md — Paramverse Bio ERP: Top Navigation System

> **Internal Frontend Documentation — Navigation Layer**
> This file is the authoritative reference for all navbar and header behavior in Paramverse Bio ERP.
> Every change to navigation, dropdown menus, header controls, or routing config **must** follow this specification.
> Read this before touching `TopNavbar.tsx`, `AppHeader.tsx`, `fy-store.tsx`, or `AppLayout.tsx`.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [File Locations & Responsibilities](#2-file-locations--responsibilities)
3. [NAV_ITEMS Config Architecture](#3-nav_items-config-architecture)
4. [Navigation Item Types](#4-navigation-item-types)
5. [NavDropdown — Dropdown System](#5-navdropdown--dropdown-system)
6. [Active & Selected States](#6-active--selected-states)
7. [Hover Behavior & Timing](#7-hover-behavior--timing)
8. [Two-Column Layout Logic](#8-two-column-layout-logic)
9. [Multi-Level Menu & Mega Menu (Future)](#9-multi-level-menu--mega-menu-future)
10. [Collapsed & Open States](#10-collapsed--open-states)
11. [Logo Block](#11-logo-block)
12. [AppHeader — Sub-Header Layer](#12-appheader--sub-header-layer)
13. [Search Integration](#13-search-integration)
14. [Financial Year Selector](#14-financial-year-selector)
15. [State & Territory Selectors](#15-state--territory-selectors)
16. [Approval Dropdown](#16-approval-dropdown)
17. [Notification System](#17-notification-system)
18. [Profile Dropdown](#18-profile-dropdown)
19. [Help Button](#19-help-button)
20. [Responsive & Mobile Behavior](#20-responsive--mobile-behavior)
21. [Permission-Based Menu Visibility](#21-permission-based-menu-visibility)
22. [Loading & Empty States](#22-loading--empty-states)
23. [Animation Standards](#23-animation-standards)
24. [Accessibility Standards](#24-accessibility-standards)
25. [Z-Index Layering](#25-z-index-layering)
26. [Spacing, Typography & Sizing Reference](#26-spacing-typography--sizing-reference)
27. [Adding New Modules to the Navbar](#27-adding-new-modules-to-the-navbar)
28. [Backend Permission Integration (Roadmap)](#28-backend-permission-integration-roadmap)
29. [Do / Don't Rules](#29-do--dont-rules)

---

## 1. Architecture Overview

The Paramverse Bio ERP navigation system is a **two-layer sticky header** that sits above all page content. Both layers are independently sticky and always visible during scrolling.

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│  LAYER 1 — TopNavbar  (56px, z-40, sticky top-0)                                 │
│  [Logo] [Dashboard] [User Mgmt ▾] [Masters ▾] [Procurement ▾] ... [⚙]            │
├──────────────────────────────────────────────────────────────────────────────────┤
│  LAYER 2 — AppHeader  (48px, z-30, sticky top-[56px])                            │
│  [🔍 Search…  ⌘K] | [📅 FY 2024-25 Live] | [🌐 State] [📍 Territory] ···        │
│                                         [Approvals 25] [🔔] [?] | [RS ▾]         │
└──────────────────────────────────────────────────────────────────────────────────┘
│  Page content starts here (calc offset = 104px from top)                          │
```

### Key Measurements

| Element | Height | Position | Z-Index |
|---------|--------|----------|---------|
| TopNavbar | `56px` (`h-[56px]`) | `sticky top-0` | `z-40` |
| AppHeader | `48px` (`h-12`) | `sticky top-[56px]` | `z-30` |
| **Total** | **104px** | — | — |
| Drawers/Sheets | full-height | `fixed right-0 top-0` | `z-50` |
| Modals/Dialogs | center | `fixed inset-0` | `z-50` |
| Dropdown menus | auto | anchored to trigger | `z-50` (Radix default) |
| Tooltips | auto | anchored to trigger | `z-50` (Radix default) |

> **Critical:** Any full-height two-panel layout must subtract `104px` to fill the remaining viewport:
> ```tsx
> style={{ height: "calc(100vh - 104px)" }}
> ```

### Why Two Layers?

- **TopNavbar** handles **module-level navigation** — which domain of the ERP you're in.
- **AppHeader** handles **contextual controls** — which data scope (FY, State, Territory) and quick-access utilities (Search, Approvals, Notifications, Profile).
- Separating them prevents the primary navigation from getting cluttered with operational controls.
- Both layers remain visible on scroll — ERP users constantly switch modules and check approvals mid-task.

---

## 2. File Locations & Responsibilities

```
components/
└── layout/
    ├── TopNavbar.tsx      ← Module navigation, logo, dropdown menus
    ├── AppHeader.tsx      ← Search, FY selector, state/territory, approvals, notifications, profile
    └── AppLayout.tsx      ← Composes TopNavbar + AppHeader + FYProvider + <main>

lib/
└── fy-store.tsx           ← FY Context, FYProvider, useFY hook, FINANCIAL_YEARS data, FY_STATUS_CONFIG
```

### AppLayout — The Composition Root

```tsx
// components/layout/AppLayout.tsx
export function AppLayout({ children, noPadding = false }: AppLayoutProps) {
  return (
    <FYProvider>                         {/* ← FY context available to ALL children */}
      <div className="min-h-screen bg-background flex flex-col">
        <TopNavbar />                    {/* 56px sticky */}
        <AppHeader />                    {/* 48px sticky top-[56px] */}
        <main className={cn("flex-1", !noPadding && "px-6 py-6")}>
          {children}
        </main>
      </div>
    </FYProvider>
  );
}
```

**Rules:**
- `FYProvider` wraps **everything** inside AppLayout. Every page has access to `useFY()` automatically.
- `TopNavbar` and `AppHeader` are **not** imported or rendered anywhere else — only through AppLayout.
- Every `(app)/` route page must be wrapped in `<AppLayout>`. There is no route-group `layout.tsx`.
- Never import `TopNavbar` or `AppHeader` directly into a page component.

---

## 3. NAV_ITEMS Config Architecture

All navigation structure is defined in a single declarative array at the top of `TopNavbar.tsx`. This is the **single source of truth** for what appears in the navbar.

### Interfaces

```tsx
interface NavChild {
  label: string;   // Display text in dropdown
  href: string;    // Next.js route path (used for active detection + Link href)
}

interface NavItem {
  id: string;           // Unique key — used as React key, never shown to users
  label: string;        // Display text in navbar button
  icon: LucideIcon;     // Lucide icon component reference (not JSX — no <>)
  href?: string;        // Direct route — only for items without children
  iconOnly?: boolean;   // true → renders as icon-only with Tooltip (e.g. Settings)
  children?: NavChild[]; // Sub-pages — triggers dropdown rendering
}
```

### Current NAV_ITEMS

```tsx
const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    href: "/dashboard",                     // ← simple link, no dropdown
  },
  {
    id: "user-management",
    label: "User Management",
    icon: Users,
    children: [                             // ← 7 items → 2-column dropdown
      { label: "All Users",           href: "/users" },
      { label: "Roles & Permissions", href: "/users/roles" },
      { label: "User Groups",         href: "/users/groups" },
      { label: "Department",          href: "/user-management/department" },
      { label: "States",              href: "/users/states" },
      { label: "Districts",           href: "/users/districts" },
      { label: "Territory Map",       href: "/users/territory" },
    ],
  },
  {
    id: "masters",
    label: "Masters",
    icon: BookOpen,
    children: [                             // ← 7 items → 2-column dropdown
      { label: "Products",         href: "/masters/products" },
      { label: "Categories",       href: "/masters/categories" },
      { label: "HSN / Tax",        href: "/masters/hsn" },
      { label: "Distributors",     href: "/masters/distributors" },
      { label: "Retailers",        href: "/masters/retailers" },
      { label: "Warehouse",        href: "/masters/warehouse" },
      { label: "Units of Measure", href: "/masters/uom" },
    ],
  },
  {
    id: "procurement",
    label: "Procurement",
    icon: ShoppingCart,
    children: [                             // ← 5 items → 2-column dropdown
      { label: "Purchase Orders", href: "/procurement/orders" },
      { label: "GRN",             href: "/procurement/grn" },
      { label: "Vendor Bills",    href: "/procurement/bills" },
      { label: "Vendor Returns",  href: "/procurement/returns" },
      { label: "Stock Ledger",    href: "/procurement/stock" },
    ],
  },
  {
    id: "sales",
    label: "Sales",
    icon: BarChart3,
    children: [                             // ← 6 items → 2-column dropdown
      { label: "Sales Orders", href: "/sales/orders" },
      { label: "Invoices",     href: "/sales/invoices" },
      { label: "Dispatch",     href: "/sales/dispatch" },
      { label: "Collections",  href: "/sales/collections" },
      { label: "Targets",      href: "/sales/targets" },
      { label: "Beat Plan",    href: "/sales/beat-plan" },
    ],
  },
  {
    id: "hr",
    label: "HR",
    icon: UserCheck,
    children: [                             // ← 5 items → 2-column dropdown
      { label: "Employees",        href: "/hr/employees" },
      { label: "Attendance",       href: "/hr/attendance" },
      { label: "Leave Management", href: "/hr/leaves" },
      { label: "Payroll",          href: "/hr/payroll" },
      { label: "Expense Claims",   href: "/hr/expenses" },
    ],
  },
  {
    id: "accounts",
    label: "Accounts",
    icon: Wallet,
    children: [                             // ← 4 items → 1-column dropdown
      { label: "Ledger",      href: "/accounts/ledger" },
      { label: "Vouchers",    href: "/accounts/vouchers" },
      { label: "Outstanding", href: "/accounts/outstanding" },
      { label: "Reports",     href: "/accounts/reports" },
    ],
  },
  {
    id: "farmer",
    label: "Farmer",
    icon: Wheat,
    children: [                             // ← 5 items → 2-column dropdown
      { label: "Farmer Registry",    href: "/farmer/registry" },
      { label: "Field Surveys",      href: "/farmer/surveys" },
      { label: "Crop Calendar",      href: "/farmer/crop-calendar" },
      { label: "Input Distribution", href: "/farmer/inputs" },
      { label: "FPO Management",     href: "/farmer/fpo" },
    ],
  },
  {
    id: "event",
    label: "Event",
    icon: CalendarDays,
    children: [                             // ← 3 items → 1-column dropdown
      { label: "Events",     href: "/events" },
      { label: "Attendance", href: "/events/attendance" },
      { label: "Feedback",   href: "/events/feedback" },
    ],
  },
  {
    id: "demo",
    label: "Demo",
    icon: Monitor,
    children: [                             // ← 2 items → 1-column dropdown
      { label: "Listing Demo", href: "/listing-demo" },
      { label: "Form Demo",    href: "/form-demo" },
    ],
  },
  {
    id: "template",
    label: "Template",
    icon: Palette,
    href: "/template",                      // ← simple link, no dropdown
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    iconOnly: true,                         // ← icon-only, renders with Tooltip
    href: "/settings",
  },
];
```

### Dropdown Column Threshold

| Children count | Width | Grid |
|---|---|---|
| ≤ 4 | `w-[200px]` | `grid-cols-1` |
| > 4 | `w-[320px]` | `grid-cols-2` |

This is controlled by `const useTwoCols = children.length > 4` inside `NavDropdown`.

---

## 4. Navigation Item Types

The navbar renders **three distinct item types** based on the shape of each `NavItem`:

### Type 1 — Simple Link

**Condition:** `item.href` is defined AND `item.children` is undefined.

**Examples:** Dashboard, Template

**Renders as:** Next.js `<Link>` — direct page navigation on click, no dropdown.

```tsx
<Link
  href={item.href}
  className={cn(
    "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap",
    "transition-all duration-150",
    active
      ? "bg-brand-100 text-brand-700 font-semibold"
      : "text-muted-foreground hover:bg-muted hover:text-foreground",
  )}
>
  <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
  {item.label}
</Link>
```

### Type 2 — Dropdown

**Condition:** `item.children` is defined (regardless of whether `href` is also set).

**Examples:** User Management, Masters, Procurement, Sales, HR, Accounts, Farmer, Event, Demo

**Renders as:** `<NavDropdown>` component — `<button>` trigger + Radix `DropdownMenu`.

### Type 3 — Icon Only

**Condition:** `item.iconOnly === true`

**Examples:** Settings

**Renders as:** `<Link>` wrapped in Radix `<Tooltip>`. No label visible in navbar — only a square icon button. Label revealed on hover via tooltip.

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <Link
      href={item.href!}
      className={cn(
        "w-9 h-9 rounded-lg flex items-center justify-center ml-auto transition-all duration-150",
        active
          ? "bg-brand-100 text-brand-600"
          : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      <item.icon className="w-4 h-4" />
    </Link>
  </TooltipTrigger>
  <TooltipContent side="bottom" sideOffset={6}>{item.label}</TooltipContent>
</Tooltip>
```

> **Note:** `ml-auto` on the icon-only item pushes it to the far right end of the nav container, creating the visual separation between main nav items and the Settings icon.

---

## 5. NavDropdown — Dropdown System

The `NavDropdown` component handles all dropdown menu rendering. It is a **self-contained component** with its own open/close state.

### Full Implementation

```tsx
function NavDropdown({ item, active }: { item: NavItem; active: boolean }) {
  const [open, setOpen] = useState(false);
  const children = item.children ?? [];
  const useTwoCols = children.length > 4;

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      {/* Trigger button */}
      <DropdownMenuTrigger asChild>
        <button
          className={cn(
            "flex items-center gap-1.5 px-3 h-9 rounded-lg text-[13px] font-medium whitespace-nowrap",
            "transition-all duration-150 outline-none",
            active
              ? "bg-brand-100 text-brand-700 font-semibold"    // page is under this module
              : "text-muted-foreground hover:bg-muted hover:text-foreground", // default + hover
            open && !active && "bg-muted text-foreground",     // dropdown open but not the active module
          )}
        >
          <item.icon className="w-3.5 h-3.5 flex-shrink-0" />
          {item.label}
          <ChevronDown
            className={cn(
              "w-3 h-3 ml-0.5 opacity-50 transition-transform duration-200",
              open && "rotate-180",                             // flips when open
            )}
          />
        </button>
      </DropdownMenuTrigger>

      {/* Dropdown panel */}
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        collisionPadding={12}
        className={cn(
          "p-2.5 rounded-xl border border-border/60 shadow-lg bg-white",
          useTwoCols ? "w-[320px]" : "w-[200px]",
        )}
      >
        <div className={cn("grid gap-x-1 gap-y-0.5", useTwoCols ? "grid-cols-2" : "grid-cols-1")}>
          {children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              onClick={() => setOpen(false)}                    // close on navigate
              className="group flex items-center gap-2.5 px-2.5 py-[7px] rounded-lg hover:bg-muted/70 transition-colors duration-100"
            >
              {/* Circle bullet */}
              <span className="w-[14px] h-[14px] rounded-full border border-muted-foreground/30 flex-shrink-0 group-hover:border-brand-500 transition-colors duration-100" />
              <span className="text-[13px] font-medium text-foreground/80 group-hover:text-foreground leading-tight transition-colors duration-100">
                {child.label}
              </span>
            </Link>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

### Dropdown Panel Specs

| Property | Value | Notes |
|----------|-------|-------|
| Corner radius | `rounded-xl` (16px) | Matches card radius |
| Border | `border border-border/60` | Slightly softer than default border |
| Shadow | `shadow-lg` | Elevated, distinct from page content |
| Background | `bg-white` | Always white, even if page bg is muted |
| Padding | `p-2.5` (10px) | Comfortable grid container padding |
| Open from trigger | `sideOffset={6}` | 6px gap between trigger bottom and panel top |
| Viewport collision | `collisionPadding={12}` | Won't overflow screen edges — nudges inward |
| Alignment | `align="start"` | Left-aligned with trigger button |

### Child Item Specs

| Property | Value |
|----------|-------|
| Padding | `px-2.5 py-[7px]` |
| Corner radius | `rounded-lg` (12px) |
| Hover background | `hover:bg-muted/70` |
| Transition | `transition-colors duration-100` |
| Bullet size | `w-[14px] h-[14px]` |
| Bullet shape | `rounded-full` |
| Bullet default border | `border-muted-foreground/30` |
| Bullet hover border | `border-brand-500` |
| Text default | `text-[13px] font-medium text-foreground/80` |
| Text hover | `text-foreground` |
| Gap between bullet and text | `gap-2.5` (10px) |

---

## 6. Active & Selected States

### Active Detection Logic

Active state is computed by the `isActive()` function in `TopNavbar`:

```tsx
const isActive = (item: NavItem) => {
  // Simple link: matches if current path starts with item's href
  if (item.href) return pathname.startsWith(item.href);
  // Dropdown: active if ANY child's href matches current path
  return item.children?.some((c) => pathname.startsWith(c.href)) ?? false;
};
```

**Why `startsWith` and not exact match?**
Because ERP sub-pages live under module routes. Being on `/procurement/orders/new` should still show "Procurement" as active. `startsWith` handles all nested routes automatically.

**Edge case:** Dashboard uses `href="/dashboard"` with `startsWith`. Since no other route starts with `/dashboard`, this is safe. Do not use very short hrefs like `/` for any item — it would make everything appear active.

### Trigger Button Visual States

| State | Tailwind Classes | When |
|-------|-----------------|------|
| **Active** (current module) | `bg-brand-100 text-brand-700 font-semibold` | `pathname` is under this module's routes |
| **Open** (dropdown visible, not active) | `bg-muted text-foreground` | Dropdown is open but this isn't the active module |
| **Hover** (not active, not open) | `hover:bg-muted hover:text-foreground` | Mouse over the button |
| **Default** (idle) | `text-muted-foreground` | No interaction |

### Icon-Only Item States

| State | Tailwind Classes |
|-------|-----------------|
| **Active** | `bg-brand-100 text-brand-600` |
| **Hover** | `hover:bg-muted hover:text-foreground` |
| **Default** | `text-muted-foreground` |

> **Note:** Icon-only items use `text-brand-600` for active (not `text-brand-700`) because there's no background label to provide contrast. The slightly lighter token maintains readability on the `bg-brand-100` background.

### Child Item — Active State (Future Enhancement)

Currently, child items inside dropdowns do **not** have an active visual state (they close when clicked). When implementing per-child active indicators, use:

```tsx
// Detect if this specific child is the current page
const childActive = pathname === child.href || pathname.startsWith(child.href + "/");

// Apply to child item className:
childActive && "bg-brand-50 text-brand-700"

// Apply to bullet:
childActive && "border-brand-500 bg-brand-500"
```

---

## 7. Hover Behavior & Timing

### TopNavbar Item Hover

- **Trigger:** Mouse enters the nav button
- **Duration:** `duration-150` (150ms) — fast enough to feel responsive, slow enough to not flash
- **Properties animated:** `background-color`, `color` (both handled by `transition-all`)
- **Easing:** Tailwind default (`ease-in-out`)

```tsx
"transition-all duration-150"
```

### Dropdown Open Behavior

The dropdown opens via **Radix DropdownMenu**, which is click-triggered (not hover). This is intentional:

- **Why click, not hover?** ERP users scan menus deliberately. Hover-triggered dropdowns cause accidental openings while moving the cursor across the navbar. Click gives users precise control.
- **Close on outside click:** Radix handles this automatically.
- **Close on navigation:** `onClick={() => setOpen(false)}` on each `<Link>` inside the dropdown.
- **Close on Escape:** Radix handles this automatically.

### Chevron Rotation

```tsx
<ChevronDown
  className={cn(
    "w-3 h-3 ml-0.5 opacity-50 transition-transform duration-200",
    open && "rotate-180",
  )}
/>
```

- **Duration:** `duration-200` (200ms) — slightly longer than the button hover for a smooth, intentional feel
- **Property:** `transform: rotate(180deg)` when `open === true`
- **Opacity:** Always `opacity-50` — the chevron is a secondary visual cue, not a primary element

### Dropdown Child Item Hover

```tsx
"transition-colors duration-100"
```

- **Duration:** `duration-100` (100ms) — fastest transition in the system; dropdown items should respond instantly to scanning
- **Properties:** `background-color`, `border-color`, `color`

### AppHeader Item Hover

```tsx
"hover:text-brand-600 transition-colors"
// or for icon buttons:
"hover:bg-muted transition-colors"
```

AppHeader items use the same fast transition. Text-only items shift to `text-brand-600`. Icon-only buttons get a `bg-muted` background.

---

## 8. Two-Column Layout Logic

When a module has more than 4 child pages, its dropdown automatically renders in a **2-column grid** to keep the panel compact and scannable.

```tsx
const useTwoCols = children.length > 4;
// → w-[320px] with grid-cols-2
// → w-[200px] with grid-cols-1
```

### Column Threshold Decision Table

| Children | Layout | Width | Rationale |
|----------|--------|-------|-----------|
| 2–4 | 1 column | `w-[200px]` | Short list reads top-to-bottom cleanly |
| 5–10 | 2 columns | `w-[320px]` | Prevents excessive vertical length |
| 11+ | Consider mega menu | See Section 9 | 2 columns starts to feel cramped at this scale |

### Current Module Column Assignments

| Module | Children | Layout |
|--------|----------|--------|
| User Management | 7 | 2-column |
| Masters | 7 | 2-column |
| Procurement | 5 | 2-column |
| Sales | 6 | 2-column |
| HR | 5 | 2-column |
| Accounts | 4 | 1-column |
| Farmer | 5 | 2-column |
| Event | 3 | 1-column |
| Demo | 2 | 1-column |

---

## 9. Multi-Level Menu & Mega Menu (Future)

### Current Limitation

`NavChild` only supports one level of nesting (`label` + `href`). There is no `children` on `NavChild`. The current system handles **two levels**: top-level module → sub-pages. Three-level menus are not implemented.

### Adding a Third Level (Sub-Groups)

When a module grows large enough to require grouped children (e.g., Sales → "Orders" group + "Analytics" group), extend the interfaces:

```tsx
// Future NavChild with optional group
interface NavChild {
  label: string;
  href: string;
  group?: string;  // ← group label for visual separation
}

// Future NavGroup (alternative approach — grouped children object)
interface NavGroup {
  groupLabel: string;
  items: NavChild[];
}

interface NavItem {
  // ...existing fields
  groups?: NavGroup[];  // ← used instead of children for grouped mega menu
}
```

### Mega Menu Layout (Future)

For modules with 12+ sub-pages or distinct sub-categories, implement a mega menu panel:

```
┌───────────────────────────────────────────────────────┐
│  Masters                                               │
│  ──────────────────────────────────────────────────── │
│  PRODUCTS              PARTIES              LOGISTICS  │
│  • Products            • Distributors       • Warehouse│
│  • Categories          • Retailers          • UOM      │
│  • HSN / Tax           • Customers          • Carriers │
└───────────────────────────────────────────────────────┘
```

**Implementation approach:**
- Add `isMegaMenu?: boolean` to `NavItem`
- Render a custom `<MegaMenuDropdown>` component instead of `<NavDropdown>`
- Use `DropdownMenuContent` with `w-[560px]` or `w-[640px]`
- Render group labels as `text-[10px] font-bold uppercase tracking-widest text-muted-foreground` section headers
- Keep child item structure identical to current for visual consistency

**Rules for mega menu adoption:**
- Only introduce if a module has **12+ children** OR **3+ logical sub-groups**
- Do NOT use mega menus for modules with ≤8 children — the 2-column dropdown is sufficient
- Mega menu panels must still use `align="start"` and `sideOffset={6}`

---

## 10. Collapsed & Open States

### Dropdown Open State

Each `NavDropdown` manages its own `open` boolean via `useState(false)`. The Radix `DropdownMenu` is a **controlled component**:

```tsx
const [open, setOpen] = useState(false);
<DropdownMenu open={open} onOpenChange={setOpen}>
```

**`onOpenChange` fires for:**
- Click outside the dropdown panel
- Pressing `Escape`
- Clicking a `DropdownMenuItem` (Radix default)
- Manual calls to `setOpen(false)` on `<Link>` clicks inside the panel

### Why Controlled vs Uncontrolled?

Using `open` + `onOpenChange` (controlled) allows:
- Programmatic close after navigation (`onClick={() => setOpen(false)}`)
- Potential future animations or custom close logic
- Ability to read current open state for trigger styling (`open && !active && "bg-muted text-foreground"`)

### Only One Dropdown Open at a Time

Radix `DropdownMenu` instances are **independent** — opening one does not close others at the DOM level. However, in practice:
- Clicking a new trigger outside the open dropdown closes the current one (Radix outside-click detection)
- Users cannot have two dropdowns open simultaneously in normal interaction

**Future enhancement:** If you need explicit "only one open at a time" enforcement (e.g., for keyboard navigation), implement a shared context that tracks `activeDropdownId` and passes it down to each `NavDropdown`.

---

## 11. Logo Block

```tsx
<Link
  href="/dashboard"
  className="flex items-center gap-2.5 px-4 border-r border-border h-full flex-shrink-0"
>
  {/* Icon mark */}
  <div className="w-8 h-8 rounded-xl bg-brand-gradient flex items-center justify-center shadow-sm">
    <span className="text-white text-sm font-extrabold">P</span>
  </div>

  {/* Text — hidden on mobile */}
  <div className="hidden sm:block">
    <p className="text-[13px] font-bold text-brand-700 leading-tight">Paramverse</p>
    <p className="text-[10px] text-muted-foreground font-medium leading-tight -mt-0.5">Bio ERP</p>
  </div>
</Link>
```

### Logo Specs

| Property | Value |
|----------|-------|
| Logo area width | Auto (px-4 on both sides + icon + text) |
| Right border | `border-r border-border` separates logo from nav items |
| Icon size | `w-8 h-8` (32×32px) |
| Icon radius | `rounded-xl` (16px) |
| Icon background | `bg-brand-gradient` (from `tailwind.config.js`) |
| Icon shadow | `shadow-sm` |
| Product name | `text-[13px] font-bold text-brand-700` |
| Product type | `text-[10px] text-muted-foreground font-medium` |
| Mobile behavior | Text hidden (`hidden sm:block`), icon always visible |
| Click target | Navigates to `/dashboard` |
| `flex-shrink-0` | Logo never compresses when nav items overflow |

---

## 12. AppHeader — Sub-Header Layer

```
h-12 (48px) • sticky top-[56px] • z-30 • bg-white • border-b border-border/50
```

The AppHeader is a horizontal toolbar containing **left-anchored context** (search, data scope) and **right-anchored utilities** (approvals, notifications, profile).

### Full Layout (Left → Right)

```
[🔍 Search input  ⌘K] [|] [📅 FY 2024-25 ● Live ▾] [|] [🌐 All States ▾] [📍 All Territories ▾]
                                                                               <flex spacer>
[☑ Approvals 25] [🔔 •] [?] [|] [RS Avatar · Rajesh S. · ASM ▾]
```

### Component Breakdown

| Zone | Component | Width |
|------|-----------|-------|
| Left | Global Search input | `flex-1 max-w-md` |
| Separator | `<Separator orientation="vertical" className="h-5">` | — |
| Left-center | FY Selector | auto |
| Separator | `<Separator>` | — |
| Left-center | State Selector | auto |
| Left-center | Territory Selector | auto |
| Spacer | `<div className="flex-1" />` | fills remaining |
| Right | Pending Approvals | auto |
| Right | Notification Bell | `w-8 h-8` |
| Right | Help Button | `w-8 h-8` |
| Separator | `<Separator>` | — |
| Right | Profile Dropdown | auto |

---

## 13. Search Integration

```tsx
<div className="relative flex-1 max-w-md">
  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
  <Input
    className="pl-8 h-8 text-xs rounded-input bg-muted/40 border-transparent focus:bg-white focus:border-border"
    placeholder="Search farmer, order, distributor, product…"
  />
  <kbd className="absolute right-2.5 top-1/2 -translate-y-1/2 hidden sm:flex items-center gap-0.5 text-[10px] text-muted-foreground bg-muted/60 border border-border rounded px-1 py-0.5">
    ⌘K
  </kbd>
</div>
```

### Search Specs

| Property | Value |
|----------|-------|
| Max width | `max-w-md` (448px) |
| Height | `h-8` (32px) |
| Font size | `text-xs` (12px) |
| Corner radius | `rounded-input` (10px — matches form input token) |
| Idle background | `bg-muted/40 border-transparent` |
| Focus background | `bg-white border-border` |
| Search icon | `w-3.5 h-3.5 text-muted-foreground` at `left-3` |
| Keyboard hint | `⌘K` kbd element, `hidden sm:flex` (hidden on mobile) |

### Search Behavior (Current)

The search input is currently a **visual placeholder** — it accepts text but does not filter or redirect. The `⌘K` shortcut hint is shown but not wired to a keyboard listener.

### Search Implementation (When Ready)

```tsx
// Wire up keyboard shortcut
useEffect(() => {
  const handleKey = (e: KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "k") {
      e.preventDefault();
      inputRef.current?.focus();
    }
  };
  window.addEventListener("keydown", handleKey);
  return () => window.removeEventListener("keydown", handleKey);
}, []);

// Or open a global search modal (recommended for ERP scale):
// ⌘K → open <CommandPalette /> dialog with fuzzy search across all entities
```

**Recommended pattern for production search:**
- `⌘K` opens a full-screen command palette overlay (like Linear, Notion)
- The input in the header becomes a trigger button (not an actual input)
- Search results grouped by entity type: Farmers, Orders, Products, Distributors
- Recent searches stored in `localStorage`

---

## 14. Financial Year Selector

The FY Selector is the most complex AppHeader component. It involves a Context, localStorage persistence, a dropdown, and a confirmation dialog.

### Data Layer — `lib/fy-store.tsx`

```tsx
export type FYStatus = "upcoming" | "live" | "closed" | "archived";

export interface FinancialYear {
  id: string;       // "2024-25"  — used as localStorage key value
  label: string;    // "FY 2024-25"  — display text
  start: string;    // "Apr 1, 2024"
  end: string;      // "Mar 31, 2025"
  status: FYStatus;
}

// All available financial years (extend this array as new FYs open)
export const FINANCIAL_YEARS: FinancialYear[] = [
  { id: "2022-23", label: "FY 2022-23", start: "Apr 1, 2022", end: "Mar 31, 2023", status: "archived" },
  { id: "2023-24", label: "FY 2023-24", start: "Apr 1, 2023", end: "Mar 31, 2024", status: "closed"   },
  { id: "2024-25", label: "FY 2024-25", start: "Apr 1, 2024", end: "Mar 31, 2025", status: "live"     },
  { id: "2025-26", label: "FY 2025-26", start: "Apr 1, 2025", end: "Mar 31, 2026", status: "upcoming" },
  { id: "2026-27", label: "FY 2026-27", start: "Apr 1, 2026", end: "Mar 31, 2027", status: "upcoming" },
];
```

### FY Status Config

```tsx
export const FY_STATUS_CONFIG = {
  live:     { label: "Live",     bg: "bg-green-50",  color: "text-green-700",  dot: "bg-green-500",  border: "border-green-200" },
  upcoming: { label: "Upcoming", bg: "bg-blue-50",   color: "text-blue-700",   dot: "bg-blue-500",   border: "border-blue-200"  },
  closed:   { label: "Closed",   bg: "bg-slate-100", color: "text-slate-600",  dot: "bg-slate-400",  border: "border-slate-200" },
  archived: { label: "Archived", bg: "bg-rose-50",   color: "text-rose-700",   dot: "bg-rose-400",   border: "border-rose-200"  },
};
```

### FY Context & Provider

```tsx
// FYProvider wraps AppLayout → available on every authenticated page
<FYProvider>
  ...
</FYProvider>

// Use in any component inside AppLayout:
const { selectedFY, setSelectedFY, allFYs } = useFY();
```

**Hydration safety:** The provider renders the default `live` FY on the server to prevent hydration mismatch, then reads `localStorage` on `useEffect` mount to restore the user's saved selection.

```tsx
const FY_STORAGE_KEY = "paramverse_selected_fy";

useEffect(() => {
  setMounted(true);
  const stored = localStorage.getItem(FY_STORAGE_KEY);
  if (stored) {
    const found = FINANCIAL_YEARS.find((f) => f.id === stored);
    if (found) setSelectedFYState(found);
  }
}, []);
```

### FY Selector Trigger

```tsx
<button className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap group">
  <Calendar className="w-3.5 h-3.5 text-muted-foreground group-hover:text-brand-500 transition-colors" />
  <span className="hidden sm:inline font-semibold">{selectedFY.label}</span>
  <FYStatusBadge status={selectedFY.status} compact />
  <ChevronDown className="w-3 h-3 text-muted-foreground" />
</button>
```

### FYStatusBadge — Two Variants

```tsx
// compact={true} — used in the trigger button (smaller)
// px-1.5 py-0.5 rounded text-[10px] font-bold border
// dot: w-1.5 h-1.5 rounded-full + animate-pulse if status === "live"

// compact={false} — used in the switch dialog (full size)
// px-2 py-0.5 rounded-full text-[11px] font-semibold border
```

The `animate-pulse` on the live dot is a subtle real-time indicator that the current FY is active.

### FY Dropdown Panel

```
w-64 • align="start" • p-2
```

Each FY option shows:
- Icon: `w-7 h-7 rounded-md bg-brand-500` with Check if selected, `bg-muted` with Calendar if not
- Label: `text-xs font-semibold` in `text-brand-700` if selected, `text-foreground` otherwise
- Date range: `text-[10px] text-muted-foreground`
- Status badge: compact colored badge on the right

### FY Switch Confirmation Dialog

Switching to a **different** FY requires a confirmation step (prevents accidental FY changes mid-task):

```tsx
// Flow:
// 1. User clicks a different FY in dropdown
// 2. handleSelect() stores pendingFY and opens FYSwitchDialog
// 3. Dialog shows FY preview card with date range + status badge
// 4. If status === "closed" → warning: "Data will be read-only"
// 5. User confirms → setSelectedFY(pendingFY) + localStorage update
// 6. User cancels → pendingFY cleared, selection unchanged
```

**Dialog appearance:**
- Icon: `w-8 h-8 rounded-lg bg-amber-50 border border-amber-200` with `AlertTriangle text-amber-500`
- FY preview card: `bg-muted/40 border border-border`, `w-9 h-9 bg-brand-100` Calendar icon
- Closed FY warning: `text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded-lg p-2.5`
- Buttons: Cancel (outline) + "Switch FY" (`bg-brand-600 hover:bg-brand-700`)

---

## 15. State & Territory Selectors

Both selectors follow an identical pattern — Radix `DropdownMenu` with a simple item list:

### State Selector

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap">
      <Globe className="w-3.5 h-3.5 text-muted-foreground" />
      <span className="hidden sm:inline">{selectedState}</span>
      <ChevronDown className="w-3 h-3 text-muted-foreground" />
    </button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="start" className="w-44">
    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest text-muted-foreground">State</DropdownMenuLabel>
    {STATES.map((s) => (
      <DropdownMenuItem
        key={s}
        className={cn("text-xs", selectedState === s && "text-brand-600 font-semibold")}
        onClick={() => setSelectedState(s)}
      >
        {s}
      </DropdownMenuItem>
    ))}
  </DropdownMenuContent>
</DropdownMenu>
```

### Territory Selector

Same structure, `w-52` panel, `MapPin` icon, `hidden md:inline` label (hides on small tablets).

### Selector Specs

| Selector | Dropdown Width | Label visibility | Icon |
|----------|---------------|-----------------|------|
| State | `w-44` | `hidden sm:inline` | `Globe` |
| Territory | `w-52` | `hidden md:inline` | `MapPin` |

**Active item:** `text-brand-600 font-semibold` — no background tint in DropdownMenu items (simpler than the FY selector).

---

## 16. Approval Dropdown

```tsx
const PENDING_APPROVALS = [
  { label: "Purchase Orders", count: 4,  href: "/procurement/orders?status=pending" },
  { label: "Expense Claims",  count: 7,  href: "/hr/expenses?status=pending"        },
  { label: "Leave Requests",  count: 2,  href: "/hr/leaves?status=pending"          },
  { label: "New Farmers",     count: 12, href: "/farmer/registry?status=pending"    },
];

const totalPending = PENDING_APPROVALS.reduce((s, a) => s + a.count, 0); // → 25
```

### Trigger

```tsx
<button className="relative flex items-center gap-1.5 text-[12px] font-medium text-foreground hover:text-brand-600 transition-colors whitespace-nowrap">
  <CheckSquare className="w-4 h-4 text-muted-foreground" />
  <span className="hidden sm:inline">Approvals</span>
  {totalPending > 0 && <CountBadge count={totalPending} variant="amber" />}
</button>
```

### Popover Panel

```
w-64 • p-3 • rounded-modal (20px) • align="end" • sideOffset={8}
```

Each approval category links to the listing page pre-filtered by `status=pending`:

```tsx
<a
  href={a.href}
  className="flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-muted/50 transition-colors"
>
  <span className="text-xs text-foreground">{a.label}</span>
  <span className="text-xs font-bold text-amber-600 bg-amber-50 border border-amber-200 rounded-md px-2 py-0.5">
    {a.count}
  </span>
</a>
```

**Count badge color:** `text-amber-600 bg-amber-50 border-amber-200` — amber signals "needs action" without being alarming.

### Approval Data (Production Integration)

When connecting to a real backend:

```tsx
// Replace PENDING_APPROVALS static array with:
const { data: approvals, isLoading } = useQuery(["pending-approvals"], fetchPendingApprovals);

// fetchPendingApprovals hits an API endpoint that returns approval counts per category
// scoped to: selectedFY.id + current user's permission scope
```

---

## 17. Notification System

```tsx
const NOTIFICATIONS = [
  { id: 1, type: "approval", title: "PO #2340 awaiting approval",     time: "2 min ago",  read: false },
  { id: 2, type: "alert",    title: "Stock below reorder: Urea 50kg", time: "15 min ago", read: false },
  { id: 3, type: "info",     title: "Farmer survey #1123 submitted",  time: "1 hr ago",   read: false },
  { id: 4, type: "success",  title: "Invoice INV-0088 paid",          time: "3 hr ago",   read: true  },
  { id: 5, type: "info",     title: "New distributor onboarded",      time: "Yesterday",  read: true  },
];

const unreadCount = NOTIFICATIONS.filter((n) => !n.read).length; // → 3
```

### Bell Trigger

```tsx
<button className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
  <Bell className="w-4 h-4 text-muted-foreground" />
  {unreadCount > 0 && (
    // Unread indicator dot — top-right corner
    <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 border border-white" />
  )}
</button>
```

**Dot position:** `absolute top-1 right-1` — 4px from top, 4px from right of the `w-8 h-8` button.
**Dot border:** `border border-white` — creates a "punched out" gap between dot and bell icon for clarity.

### Notification Panel

```
w-80 • p-0 • rounded-modal • align="end" • sideOffset={8} • overflow-hidden
```

**Structure:**
```
[Header: "Notifications" text + "Mark all read" link]
[Scrollable list: max-h-72 overflow-y-auto]
  [Notification item 1]  ← bg-brand-50/40 if unread
  [Notification item 2]
  ...
[Footer: "View all notifications" link]
```

**Notification item:**
```tsx
<div className={cn(
  "flex items-start gap-3 px-4 py-3 border-b border-border/50 hover:bg-muted/30 transition-colors cursor-pointer",
  !n.read && "bg-brand-50/40",   // ← unread items get a soft brand tint
)}>
  {/* Unread/read dot indicator */}
  <div className={cn(
    "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
    n.read ? "bg-muted-foreground/30" : "bg-brand-500",
  )} />
  <div className="flex-1 min-w-0">
    <p className={cn("text-xs leading-relaxed", !n.read && "font-medium text-foreground")}>
      {n.title}
    </p>
    <p className="text-[11px] text-muted-foreground mt-0.5">{n.time}</p>
  </div>
</div>
```

**Unread items:** `bg-brand-50/40` background + `font-medium text-foreground` title + `bg-brand-500` dot.
**Read items:** `bg-transparent` + default text weight + `bg-muted-foreground/30` dot.

---

## 18. Profile Dropdown

```tsx
<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <button className="flex items-center gap-2 hover:bg-muted/50 rounded-xl px-2 py-1 transition-colors">
      <Avatar className="w-7 h-7">
        <AvatarImage src="" />
        <AvatarFallback className="bg-brand-500 text-white text-xs font-bold">RS</AvatarFallback>
      </Avatar>
      {/* Name + Role — hidden on tablets */}
      <div className="hidden md:block text-left">
        <p className="text-[12px] font-semibold text-foreground leading-tight">Rajesh S.</p>
        <p className="text-[10px] text-muted-foreground leading-tight">Area Sales Manager</p>
      </div>
      {/* Role badge — hidden below lg */}
      <span className="hidden lg:inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-semibold bg-brand-100 text-brand-700 border border-brand-200">
        ASM
      </span>
      <ChevronDown className="w-3 h-3 text-muted-foreground hidden md:block" />
    </button>
  </DropdownMenuTrigger>
```

### Profile Dropdown Panel

```
w-56 • rounded-modal • align="end" • sideOffset={8}
```

**Structure:**
```
[User info header]
  Full name: text-sm font-semibold
  Email: text-xs text-muted-foreground
  Role badge: bg-brand-100 text-brand-700
[Separator]
[My Profile]      — User icon
[Account Settings] — Settings icon
[Change Password] — Shield icon
[Separator]
[Sign Out]        — LogOut icon, text-red-500, hover:bg-red-50
```

### Profile Trigger Responsive States

| Breakpoint | Visible elements |
|-----------|-----------------|
| Mobile (`< md`) | Avatar only |
| Tablet (`md`) | Avatar + Name + Role text + Chevron |
| Desktop (`lg+`) | Avatar + Name + Role text + Role abbreviation badge + Chevron |

---

## 19. Help Button

```tsx
<Tooltip>
  <TooltipTrigger asChild>
    <button className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors">
      <HelpCircle className="w-4 h-4 text-muted-foreground" />
    </button>
  </TooltipTrigger>
  <TooltipContent side="bottom">Help & Support</TooltipContent>
</Tooltip>
```

The Help button is intentionally minimal — icon only, tooltip label. It can link to documentation, open a support chat, or navigate to a help center page when implemented.

---

## 20. Responsive & Mobile Behavior

### TopNavbar Responsive Rules

| Element | Mobile | sm (640px+) | md (768px+) | lg (1024px+) |
|---------|--------|-------------|-------------|--------------|
| Logo icon | ✅ visible | ✅ visible | ✅ visible | ✅ visible |
| Logo text | ❌ hidden | ✅ visible | ✅ visible | ✅ visible |
| Nav items | Scroll horizontally | Scroll horizontally | All visible | All visible |
| Settings icon | ✅ visible | ✅ visible | ✅ visible | ✅ visible |

**Nav container:** `overflow-x-auto scrollbar-none flex-1`

On small screens, nav items don't wrap or collapse into a hamburger — they scroll horizontally. `scrollbar-none` hides the scrollbar visually while keeping scroll functionality. This matches ERP convention — users on tablets and phones in field-force contexts need full access to all modules.

### AppHeader Responsive Rules

| Element | Mobile | sm+ | md+ | lg+ |
|---------|--------|-----|-----|-----|
| Search input | Compressed | Full width | Full width | Full width |
| ⌘K hint | ❌ hidden | ✅ visible | ✅ visible | ✅ visible |
| FY label | ❌ icon only | ✅ label shown | ✅ | ✅ |
| State label | ❌ icon only | ✅ | ✅ | ✅ |
| Territory label | ❌ hidden | ❌ hidden | ✅ | ✅ |
| Approvals label | ❌ hidden | ✅ | ✅ | ✅ |
| Profile name/role | ❌ hidden | ❌ hidden | ✅ | ✅ |
| Profile role badge | ❌ hidden | ❌ hidden | ❌ hidden | ✅ |
| Profile chevron | ❌ hidden | ❌ hidden | ✅ | ✅ |

### Mobile Navbar (Full Hamburger) — Future

When implementing a mobile-first hamburger drawer:

```tsx
// Add to NavItem interface:
interface NavItem {
  // ...existing
  mobileHidden?: boolean;  // hide from mobile drawer (e.g. Demo, Template)
}

// Mobile drawer implementation:
// 1. Replace overflow-x-auto nav with a hamburger icon button on mobile
// 2. Tap hamburger → slide-in drawer from left (Sheet component, side="left")
// 3. Inside drawer: logo + vertically stacked nav items with expand/collapse
// 4. Each dropdown item expands inline (accordion behavior)
// 5. Drawer closes on navigation
```

---

## 21. Permission-Based Menu Visibility

### Current State

The navbar renders **all items for all users**. Permission filtering is not yet implemented.

### Planned Architecture — Config-Based Filtering

```tsx
// Step 1: Add visibility config to NavItem
interface NavItem {
  // ...existing fields
  roles?: string[];          // e.g. ["admin", "manager", "finance"]
  permissions?: string[];    // e.g. ["procurement.view", "sales.view"]
  featureFlag?: string;      // e.g. "beta_farmer_module"
}

// Step 2: Extended NAV_ITEMS with role restrictions
{
  id: "accounts",
  label: "Accounts",
  icon: Wallet,
  roles: ["admin", "finance", "accountant"],  // ← only these roles see Accounts
  children: [...],
},

// Step 3: Filter in TopNavbar
const { user } = useAuth();

const visibleItems = NAV_ITEMS.filter((item) => {
  if (!item.roles) return true;                           // no restriction → visible to all
  return item.roles.some((r) => user.roles.includes(r)); // show if user has any matching role
});

// Step 4: Filter children too
const visibleChildren = item.children?.filter((child) => {
  if (!child.permissions) return true;
  return user.permissions.includes(child.permissions);
});
```

### Child-Level Permission Filtering

```tsx
// Extended NavChild with permission gate
interface NavChild {
  label: string;
  href: string;
  permission?: string;  // e.g. "procurement.purchase_orders.view"
}

// In NavDropdown — filter children before rendering:
const visibleChildren = children.filter((c) =>
  !c.permission || hasPermission(c.permission)
);
const useTwoCols = visibleChildren.length > 4; // ← recalculate after filter
```

### Role-Based Module Visibility Matrix

| Module | Admin | Manager | Sales | Finance | HR | Field Agent |
|--------|-------|---------|-------|---------|-----|-------------|
| Dashboard | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| User Management | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Masters | ✅ | ✅ | 👁️ read | ✅ | ❌ | ❌ |
| Procurement | ✅ | ✅ | ❌ | ✅ | ❌ | ❌ |
| Sales | ✅ | ✅ | ✅ | 👁️ read | ❌ | ✅ |
| HR | ✅ | ✅ | ❌ | ✅ | ✅ | 👁️ self |
| Accounts | ✅ | ❌ | ❌ | ✅ | ❌ | ❌ |
| Farmer | ✅ | ✅ | ✅ | ❌ | ❌ | ✅ |
| Event | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| Template | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Settings | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |

> This matrix is illustrative — final permissions are defined by the backend access control system.

---

## 22. Loading & Empty States

### Navbar Loading Skeleton

When the navbar loads (e.g., user data fetch is pending), show a skeleton instead of blank or broken nav:

```tsx
// Skeleton nav items
function NavSkeleton() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[80, 130, 68, 110, 52, 28, 68].map((w, i) => (
        <div
          key={i}
          className="h-9 rounded-lg bg-muted animate-pulse flex-shrink-0"
          style={{ width: `${w}px` }}
        />
      ))}
    </div>
  );
}
```

### Approval Count — Empty State

```tsx
{totalPending === 0 && (
  <div className="px-4 py-8 text-center">
    <CheckSquare className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
    <p className="text-xs font-medium text-foreground">All caught up!</p>
    <p className="text-[11px] text-muted-foreground mt-0.5">No pending approvals</p>
  </div>
)}
```

### Notification — Empty State

```tsx
{NOTIFICATIONS.length === 0 && (
  <div className="px-4 py-8 text-center">
    <Bell className="w-8 h-8 text-muted-foreground/30 mx-auto mb-2" />
    <p className="text-xs text-muted-foreground">No notifications yet</p>
  </div>
)}
```

### Dropdown Empty State (No children after permission filter)

```tsx
{visibleChildren.length === 0 && (
  <p className="px-3 py-4 text-[11px] text-muted-foreground text-center">
    No pages available
  </p>
)}
```

---

## 23. Animation Standards

All animations in the navbar system follow these exact timings. **Never deviate** from these values without updating this document — consistency makes the UI feel cohesive.

| Animation | Duration | Property | Trigger |
|-----------|----------|----------|---------|
| Nav button hover | `duration-150` | `background-color`, `color` | Mouse enter/leave |
| Chevron rotation | `duration-200` | `transform: rotate(180deg)` | Dropdown open/close |
| Dropdown child hover | `duration-100` | `background-color`, `border-color`, `color` | Mouse enter/leave on child |
| AppHeader item hover | `transition-colors` (default ~150ms) | `color` | Mouse enter/leave |
| Icon button hover | `transition-colors` | `background-color` | Mouse enter/leave |
| FY dot pulse | `animate-pulse` | `opacity` | Always on when status=live |
| Profile trigger hover | `transition-colors` | `background-color` | Mouse enter/leave |
| Dropdown panel open | Radix built-in | `opacity`, `transform` | Click trigger |
| Sheet/Drawer open | `slide-in-from-right 300ms` | `transform` | Programmatic |
| Toast notification | `slide-in-from-bottom-2 fade-in-0 duration-300` | `transform`, `opacity` | Programmatic |

### Radix Animation Classes

Radix DropdownMenu and Popover use data attributes for enter/exit animations. These are configured in `globals.css` or `tailwind.config.js`:

```css
@keyframes slide-down-and-fade {
  from { opacity: 0; transform: translateY(-4px); }
  to   { opacity: 1; transform: translateY(0); }
}

[data-radix-popper-content-wrapper] {
  animation: slide-down-and-fade 150ms ease-out;
}
```

---

## 24. Accessibility Standards

### TooltipProvider

All tooltips in the navbar system are wrapped in a single `<TooltipProvider>` at the `TopNavbar` root and another at the `AppHeader` root:

```tsx
// TopNavbar.tsx
<TooltipProvider delayDuration={300}>
  <nav ...>
    {/* All tooltip-using items live here */}
  </nav>
</TooltipProvider>

// AppHeader.tsx
<TooltipProvider delayDuration={300}>
  <header ...>
    ...
  </header>
</TooltipProvider>
```

**`delayDuration={300}`:** 300ms before tooltip appears — fast enough for discovery, slow enough not to flash during cursor transit.

### Radix Accessibility Primitives

All interactive elements use Radix UI primitives which handle ARIA attributes automatically:

| Component | ARIA provided by Radix |
|-----------|----------------------|
| `DropdownMenu` | `role="menu"`, `aria-haspopup`, `aria-expanded` |
| `DropdownMenuItem` | `role="menuitem"` |
| `Popover` | `role="dialog"`, `aria-modal` |
| `Dialog` | `role="dialog"`, `aria-modal`, focus trap |
| `Tooltip` | `role="tooltip"`, `aria-describedby` |
| `Avatar` | `aria-label` (add manually) |

### Keyboard Navigation

| Key | Behavior |
|-----|----------|
| `Tab` | Moves focus between nav items |
| `Enter` / `Space` | Opens dropdown, activates link |
| `Escape` | Closes open dropdown/popover/dialog |
| `Arrow Down/Up` | Moves focus within open dropdown |
| `Arrow Right/Left` | Moves focus between top-level nav items |
| `Home` / `End` | First/last item in dropdown |
| `⌘K` | (Planned) Focus search input |

### Focus Rings

Nav buttons use `outline-none` to suppress the browser default, but **must** implement visible focus indicators for accessibility:

```tsx
// Current — suppresses focus ring (accessibility gap)
"outline-none"

// Required addition for WCAG 2.1 AA compliance:
"outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-1"
```

### Semantic HTML

- `<nav>` element wraps TopNavbar — correct landmark for screen readers
- `<header>` element wraps AppHeader — correct landmark
- All interactive items are `<button>` or `<a>` (never `<div onClick>`)
- Links use Next.js `<Link>` (renders as `<a>` with correct href)
- Icon-only items have `<TooltipContent>` providing the accessible label

---

## 25. Z-Index Layering

The full z-index stack for the application:

```
z-50 — Drawers (Sheet), Modals (Dialog), Dropdowns (Radix), Tooltips, Toasts
z-40 — TopNavbar (sticky)
z-30 — AppHeader (sticky)
z-20 — (reserved for floating action buttons, FABs)
z-10 — Sticky table headers, sticky form headers
z-0  — Page content (default)
```

**Rules:**
- Never assign `z-index` values outside this stack without updating this table
- Dropdown menus inherit `z-50` from Radix — they always appear above sticky headers
- Toasts use `fixed bottom-5 right-5 z-[100]` to ensure they appear above all other overlays during critical notifications

---

## 26. Spacing, Typography & Sizing Reference

### TopNavbar Internal Specs

| Element | Value | Tailwind |
|---------|-------|---------|
| Navbar height | 56px | `h-[56px]` |
| Nav item height | 36px | `h-9` |
| Nav item padding | 0 12px | `px-3` |
| Nav item gap | 2px | `gap-0.5` (on container) |
| Nav item border radius | 12px | `rounded-lg` |
| Nav item font size | 13px | `text-[13px]` |
| Nav item font weight (default) | 500 | `font-medium` |
| Nav item font weight (active) | 600 | `font-semibold` |
| Icon size (in nav items) | 14×14px | `w-3.5 h-3.5` |
| Chevron size | 12×12px | `w-3 h-3` |
| Logo area padding | 16px | `px-4` |
| Logo icon size | 32×32px | `w-8 h-8` |
| Icon-only item size | 36×36px | `w-9 h-9` |
| Icon-only icon size | 16×16px | `w-4 h-4` |

### Dropdown Panel Specs

| Element | Value | Tailwind |
|---------|-------|---------|
| Panel padding | 10px | `p-2.5` |
| Panel radius | 16px | `rounded-xl` |
| 1-col panel width | 200px | `w-[200px]` |
| 2-col panel width | 320px | `w-[320px]` |
| Panel gap from trigger | 6px | `sideOffset={6}` |
| Child item padding | 7px 10px | `py-[7px] px-2.5` |
| Child item radius | 12px | `rounded-lg` |
| Child item font size | 13px | `text-[13px]` |
| Child item font weight | 500 | `font-medium` |
| Child bullet size | 14×14px | `w-[14px] h-[14px]` |
| Gap (bullet → text) | 10px | `gap-2.5` |
| Grid gap (2-col, x) | 4px | `gap-x-1` |
| Grid gap (2-col, y) | 2px | `gap-y-0.5` |

### AppHeader Internal Specs

| Element | Value | Tailwind |
|---------|-------|---------|
| Header height | 48px | `h-12` |
| Header padding | 16px | `px-4` |
| Header gap | 12px | `gap-3` |
| Separator height | 20px | `h-5` |
| Search height | 32px | `h-8` |
| Search font size | 12px | `text-xs` |
| Search max width | 448px | `max-w-md` |
| Context selectors font | 12px | `text-[12px]` |
| Context icon size | 14×14px | `w-3.5 h-3.5` |
| Icon button size | 32×32px | `w-8 h-8` |
| Avatar size | 28×28px | `w-7 h-7` |

### Dropdown Panel Widths — AppHeader

| Panel | Width | Alignment |
|-------|-------|-----------|
| FY Selector | `w-64` (256px) | `align="start"` |
| State Selector | `w-44` (176px) | `align="start"` |
| Territory Selector | `w-52` (208px) | `align="start"` |
| Approvals | `w-64` (256px) | `align="end"` |
| Notifications | `w-80` (320px) | `align="end"` |
| Profile | `w-56` (224px) | `align="end"` |

---

## 27. Adding New Modules to the Navbar

### Step-by-Step Guide

**Step 1: Import the Lucide icon**

```tsx
// In TopNavbar.tsx — add to existing import block
import { YourIcon } from "lucide-react";
```

**Step 2: Add entry to NAV_ITEMS**

```tsx
// Simple module (single page):
{
  id: "field-force",
  label: "Field Force",
  icon: Users2,
  href: "/field-force",
},

// Module with sub-pages (generates dropdown):
{
  id: "inventory",
  label: "Inventory",
  icon: Package,
  children: [
    { label: "Stock Overview", href: "/inventory/stock" },
    { label: "Stock Transfer", href: "/inventory/transfer" },
    { label: "Adjustments",   href: "/inventory/adjustments" },
    { label: "Cycle Count",   href: "/inventory/cycle-count" },
    { label: "Stock Alerts",  href: "/inventory/alerts" },
  ],
},

// Icon-only utility (rare — use only for Settings-class items):
{
  id: "help",
  label: "Help Center",
  icon: HelpCircle,
  iconOnly: true,
  href: "/help",
},
```

**Step 3: Position in the array**

The order in `NAV_ITEMS` determines the visual order in the navbar. Follow this convention:

```
[Dashboard] [Domain Modules in user workflow order] [Template] [Settings ← always last]
```

Current workflow order: User Management → Masters → Procurement → Sales → HR → Accounts → Farmer → Event

Add new domain modules **before Template**, in the logical workflow sequence for ERP users.

**Step 4: Create the page**

```
app/(app)/your-module/
├── page.tsx             ← listing page (AppLayout + table)
└── components/
    ├── YourSheet.tsx    ← add/edit drawer
    └── YourDetailSheet.tsx  ← view drawer
```

**Step 5: Update TopNavbar.tsx if using new icon**

Add the icon to the import statement — keep all icon imports on a single import line, sorted by usage order.

**That's it.** No other files need changing. The navbar renders dynamically from `NAV_ITEMS`.

### Module Checklist Before Adding to Navbar

```
[ ] Route exists: app/(app)/[module]/ has a page.tsx
[ ] AppLayout wraps the page
[ ] Lucide icon chosen and imported in TopNavbar.tsx
[ ] NAV_ITEMS entry added with correct id, label, icon
[ ] hrefs in children match actual Next.js routes
[ ] Icon-only flag NOT used unless it's a utility (Settings-class)
[ ] Children count noted — >4 will auto 2-column, ≤4 will auto 1-column
[ ] Module added to TopNavbar section of CLAUDE-NAVBAR.md
[ ] Role visibility planned (add roles[] if restricting access)
```

---

## 28. Backend Permission Integration (Roadmap)

When backend RBAC (Role-Based Access Control) is implemented, the navbar permission system should integrate as follows:

### Phase 1 — Frontend Role Filtering (Current target)

```tsx
// 1. Add useAuth() hook that reads user from session/token
const { user } = useAuth();
// user = { id, name, email, roles: ["sales", "field-agent"], permissions: ["sales.orders.view"] }

// 2. Filter NAV_ITEMS before rendering
const visibleItems = NAV_ITEMS.filter((item) =>
  !item.roles || item.roles.some((r) => user.roles.includes(r))
);
```

### Phase 2 — API-Driven Menu Config

```tsx
// Backend returns allowed menu items for the logged-in user:
// GET /api/navigation → { items: NavItem[] }

// Benefits:
// - Backend controls all visibility — no client-side security bypass
// - Menu updates without frontend deploy
// - Supports org-level feature flags (some tenants get Farmer module, others don't)

const { data: navConfig, isLoading } = useQuery(["navigation"], fetchNavConfig);
const NAV_ITEMS = navConfig?.items ?? DEFAULT_NAV_ITEMS;
```

### Phase 3 — Permission Gates on Child Routes

```tsx
// Each child href should correspond to a backend permission
// e.g. /procurement/orders → permission "procurement.purchase_orders.view"

// Navigation is filtered client-side, but the actual routes are also guarded:
// app/(app)/procurement/orders/page.tsx
// → checks permission on load → redirects to /403 if unauthorized

// This creates defense-in-depth:
// - Navbar: hides links the user can't access (UX)
// - Route: blocks direct URL access (security)
```

### Permission Naming Convention

```
[module].[entity].[action]

Examples:
procurement.purchase_orders.view
procurement.purchase_orders.create
procurement.purchase_orders.approve
sales.invoices.view
hr.employees.edit
accounts.ledger.view
```

---

## 29. Do / Don't Rules

### Navbar Structure

| ✅ DO | ❌ DON'T |
|-------|---------|
| Add new modules by extending `NAV_ITEMS` array only | Add nav items directly in JSX inside `TopNavbar` return |
| Use `children: []` for modules with sub-pages | Add sub-pages as separate top-level nav items |
| Keep `id` values kebab-case, unique, never changed | Change an existing `id` after it's been deployed |
| Keep `href` values matching actual Next.js route paths | Use hrefs that don't correspond to real routes |
| Use Lucide icons only | Import icons from other libraries |
| Import icon as component reference (`icon: Users`) | Pass JSX as icon (`icon: <Users />`) |

### Dropdown Behavior

| ✅ DO | ❌ DON'T |
|-------|---------|
| Let Radix control open/close lifecycle | Manually manage DOM visibility with CSS `display: none` |
| Close dropdown on child link click (`onClick={() => setOpen(false)}`) | Leave dropdown open after navigation |
| Use `align="start"` for all nav dropdowns | Use `align="end"` for nav dropdowns (breaks left-to-right flow) |
| Use `sideOffset={6}` consistently | Use different offsets per dropdown |
| Let `useTwoCols` control columns automatically | Manually hardcode `grid-cols-2` on specific dropdowns |

### Active States

| ✅ DO | ❌ DON'T |
|-------|---------|
| Use `pathname.startsWith(item.href)` for active detection | Use `pathname === item.href` (breaks nested routes) |
| Apply `bg-brand-100 text-brand-700 font-semibold` for active | Use `bg-brand-600 text-white` for active nav items (too heavy) |
| Keep active state in the trigger button only | Add active indicator line/border below the trigger |

### Visual & Styling

| ✅ DO | ❌ DON'T |
|-------|---------|
| Use `text-[13px]` for nav item labels | Use `text-sm` (14px) — it's too large for compact nav |
| Use `gap-0.5` between nav items | Add larger gaps — nav items already have px-3 padding |
| Keep `scrollbar-none` on the nav container | Add scrollbar — it visually clutters the navbar |
| Use `whitespace-nowrap` on nav labels | Allow nav labels to wrap — they must stay single-line |
| Use `transition-all duration-150` for button states | Use longer durations — nav hover should feel immediate |

### AppHeader

| ✅ DO | ❌ DON'T |
|-------|---------|
| Position AppHeader as `sticky top-[56px]` | Use `sticky top-0` — it would overlap TopNavbar |
| Use `align="end"` for right-side dropdowns (Approvals, Notifications, Profile) | Use `align="start"` — panel would extend off-screen right |
| Show confirmation dialog before FY switch | Switch FY immediately on click |
| Show amber CountBadge for approvals | Use red badge — amber signals "needs attention", red signals error |
| Use `border border-white` on notification dot | Skip the border — the dot blends into the bell icon |

---

## Appendix A — Quick Reference Card

```
LAYOUT
  TopNavbar:  h-[56px] • sticky top-0 • z-40 • bg-white • shadow-navbar
  AppHeader:  h-12     • sticky top-[56px] • z-30 • bg-white
  Total:      104px from top of viewport

TOPNAV ITEMS
  Default:    text-[13px] font-medium text-muted-foreground
  Hover:      bg-muted text-foreground  (150ms)
  Active:     bg-brand-100 text-brand-700 font-semibold
  Open:       bg-muted text-foreground  (when dropdown open, not active)
  Padding:    px-3 h-9 rounded-lg

DROPDOWNS
  Small (≤4): w-[200px] grid-cols-1
  Large (>4): w-[320px] grid-cols-2
  Padding:    p-2.5 rounded-xl
  Gap:        sideOffset={6} from trigger

CHILD ITEMS
  Size:       text-[13px] font-medium
  Padding:    px-2.5 py-[7px] rounded-lg
  Hover:      bg-muted/70 (100ms)
  Bullet:     w-[14px] h-[14px] rounded-full border-muted-foreground/30
  Hover dot:  border-brand-500

CHEVRON
  Icon:       w-3 h-3 ml-0.5 opacity-50
  Animation:  rotate-180 when open (200ms)

APPHEADER DROPDOWNS
  FY:         w-64  align="start"
  State:      w-44  align="start"
  Territory:  w-52  align="start"
  Approvals:  w-64  align="end"
  Bell:       w-80  align="end"
  Profile:    w-56  align="end"

TRANSITIONS
  Nav buttons:    duration-150
  Chevron:        duration-200
  Dropdown items: duration-100
  Live FY dot:    animate-pulse (always)
```

## Appendix B — File Edit Checklist

When making any change to the navbar:

```
[ ] TopNavbar.tsx — NAV_ITEMS change, new component, styling tweak
[ ] AppHeader.tsx — header control added/modified
[ ] fy-store.tsx  — FY data, FY_STATUS_CONFIG, FYProvider logic
[ ] AppLayout.tsx — if layout/wrapper structure changes
[ ] CLAUDE-NAVBAR.md — update this documentation to match
[ ] CLAUDE.md Section 10 — if a fundamental behavior changes, update main doc too
```

---

*This document covers the navigation layer of Paramverse Bio ERP.*
*Last updated: 2026-05-29*
*Version: 1.0*
*Companion to: `CLAUDE.md` (main design system reference)*
