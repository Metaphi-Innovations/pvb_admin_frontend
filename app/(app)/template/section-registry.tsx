"use client";

import type { ComponentType } from "react";
import dynamic from "next/dynamic";
import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";

function SectionFallback() {
  return (
    <div className="p-6">
      <PageContentSkeleton />
    </div>
  );
}

const lazy = (loader: () => Promise<{ default: ComponentType }>) =>
  dynamic(loader, { loading: SectionFallback, ssr: false });

export const TEMPLATE_SECTIONS: Record<string, ComponentType> = {
  colors: lazy(() => import("./sections/ColorSection")),
  typography: lazy(() => import("./sections/TypographySection")),
  spacing: lazy(() => import("./sections/SpacingSection")),
  radius: lazy(() => import("./sections/BorderRadiusSection")),
  shadows: lazy(() => import("./sections/ShadowsSection")),
  icons: lazy(() => import("./sections/IconsSection")),
  buttons: lazy(() => import("./sections/ButtonsSection")),
  badges: lazy(() => import("./sections/StatusBadgesSection")),
  cards: lazy(() => import("./sections/CardsSection")),
  forms: lazy(() => import("./sections/FormsSection")),
  "full-page-forms": lazy(() => import("./sections/FullPageFormsSection")),
  "drawer-forms": lazy(() => import("./sections/DrawerFormsSection")),
  autocomplete: lazy(() => import("./sections/AutocompleteSection")),
  tables: lazy(() => import("./sections/TablesSection")),
  "listing-patterns": lazy(() => import("./sections/ListingPatternsSection")),
  filters: lazy(() => import("./sections/FiltersSection")),
  modals: lazy(() => import("./sections/ModalsSection")),
  loaders: lazy(() => import("./sections/LoadersSection")),
  "empty-states": lazy(() => import("./sections/EmptyStatesSection")),
  alerts: lazy(() => import("./sections/AlertsSection")),
  navbar: lazy(() => import("./sections/NavbarSection")),
  sidebar: lazy(() => import("./sections/SidebarSection")),
  approval: lazy(() => import("./sections/ApprovalUISection")),
  profile: lazy(() => import("./sections/ProfileSection")),
  "nested-data": lazy(() => import("./sections/NestedDataSection")),
  mobile: lazy(() => import("./sections/MobileComponentsSection")),
  charts: lazy(() => import("./sections/ChartsSection")),
  "file-upload": lazy(() => import("./sections/FileUploadSection")),
  stepper: lazy(() => import("./sections/StepperSection")),
  drawer: lazy(() => import("./sections/DrawerSection")),
  tabs: lazy(() => import("./sections/TabsAccordionSection")),
  timeline: lazy(() => import("./sections/TimelineSection")),
  comments: lazy(() => import("./sections/CommentsSection")),
  "audit-logs": lazy(() => import("./sections/AuditLogsSection")),
  "beat-planning": lazy(() => import("./sections/BeatPlanningSection")),
  login: lazy(() => import("./sections/LoginSection")),
  "financial-year": lazy(() => import("./sections/FinancialYearSection")),
};

export function TemplateSection({ id }: { id: string }) {
  const Component = TEMPLATE_SECTIONS[id] ?? TEMPLATE_SECTIONS.colors;
  return <Component />;
}
