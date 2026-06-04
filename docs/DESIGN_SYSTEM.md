# Dharitri Sutra Design System

This ERP uses a single visual language aligned with Dharitri Sutra branding.

## Brand colors

| Role | Usage | Token |
|------|--------|--------|
| Orange | Primary actions, active tabs, CTAs | `brand-*`, `primary` |
| Deep blue | Headings, secondary buttons, nav emphasis | `navy-*`, `secondary` |
| Green | Success, approved, active records | `leaf-*`, `success` |

Use color **strategically** — avoid flooding screens with brand hues.

## Canonical imports

```tsx
import {
  ModulePageHeader,
  ModuleDataTable,
  ModuleStatusBadge,
  ModuleEmptyState,
  ModuleFiltersBar,
  ModuleSurface,
  PhoneInput,
  EntityFormLayout,
  EntityFormSection,
  EntityFormField,
} from "@/components/module";
```

## Page pattern

1. `AppLayout` wrapper (padding from layout)
2. `ModulePageHeader` — title, subtitle, breadcrumbs, primary action
3. `ModuleFiltersBar` — search + filters
4. `ModuleSurface` or `ModuleDataTable` — data
5. `ModuleEmptyState` when no rows

## Phone inputs

Always use `PhoneInput` for mobile/contact fields:

```tsx
<PhoneInput
  countryCode={form.mobileCountryCode || "+91"}
  onCountryCodeChange={(v) => set("mobileCountryCode", v)}
  value={form.mobileNumber}
  onChange={(v) => set("mobileNumber", v)}
/>
```

Default country: **+91** (India). Do not use plain `<Input type="tel">`.

## Template module

`/template` is the living style guide. New UI must match patterns shown there and use production components from `components/ui` and `components/module`.

## Tokens

- CSS variables: `app/globals.css`
- Tailwind: `tailwind.config.js`
- JS (charts/dynamic): `lib/tokens.ts`

Keep these three in sync when changing brand values.
