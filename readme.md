# Dharitri Sutra Agri ERP Frontend

Enterprise-grade ERP frontend for agri-input distribution workflows. The app is built as a compact, data-dense admin interface for modules such as dashboard, user management, masters, procurement, sales, HR, accounts, farmer operations, events, and the design-system template hub.

## Stack

- Next.js 14 with App Router
- React 18
- TypeScript
- TailwindCSS 3.4
- Radix UI primitives with custom ShadCN-style components
- Lucide React icons
- Recharts for charting

## Getting Started

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

Run the production server after a build:

```bash
npm run start
```

Run linting:

```bash
npm run lint
```

## Project Structure

```text
app/
  (auth)/                 Login and unauthenticated routes
  (app)/                  Authenticated ERP routes
    dashboard/
    template/             Design-system reference hub
    user-management/
    masters/
    procurement/
    sales/
    hr/
    accounts/
    farmer/
    events/
components/
  layout/                 Persistent app shell, navbar, header, page wrappers
  ui/                     Shared UI primitives and ERP components
  dashboard/              Dashboard-specific widgets
lib/
  fy-store.tsx            Financial year context and localStorage persistence
  tokens.ts               JS-side design tokens
  utils.ts                Utility helpers
tailwind.config.js        Tailwind design tokens
AGENTS.md                 UI foundation and implementation rules
```

## Architecture Notes

- The authenticated app chrome is mounted through `app/(app)/layout.tsx`.
- `AppShell` owns `FYProvider`, `TopNavbar`, and `AppHeader`, keeping navigation chrome persistent across route changes.
- `AppLayout` is a thin page wrapper for padding and content layout helpers.
- Most current modules are client-side prototypes using seed data and `localStorage`.
- No backend API integration is currently wired through `fetch`, `axios`, or server actions.

## Design System

The UI follows the Dharitri Sutra ERP design foundation:

- Compact spacing and dense data layouts
- Warm orange brand actions with deep navy headings and leaf green success states
- Reusable table, form, drawer, dialog, badge, KPI, and empty-state components
- Lucide icons only
- `/template` is the visual reference for components and module patterns

Before adding or changing UI, review `AGENTS.md` and the running `/template` page.

## Data Persistence

Several modules use browser `localStorage` helpers for prototype persistence, including:

- Customers
- Employees
- Geography
- Roles
- UOM
- GST
- HSN
- TDS

These helpers live inside their module folders under `app/(app)`.