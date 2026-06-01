"use client";

import React from "react";
import { useParams } from "next/navigation";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { Construction, ArrowLeft } from "lucide-react";
import Link from "next/link";

// Friendly labels for known module roots
const MODULE_LABELS: Record<string, string> = {
  users:       "User Management",
  masters:     "Masters",
  procurement: "Procurement",
  sales:       "Sales",
  hr:          "HR",
  accounts:    "Accounts",
  farmer:      "Farmer",
  events:      "Events",
  settings:    "Settings",
  demo:        "Demo",
};

function toTitle(slug: string) {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export default function PlaceholderPage() {
  const params  = useParams();
  const segments = Array.isArray(params.slug) ? params.slug : [params.slug ?? ""];
  const root     = segments[0] ?? "";
  const module   = MODULE_LABELS[root] ?? toTitle(root);
  const sub      = segments.slice(1).map(toTitle).join(" › ");
  const title    = sub ? `${module} › ${sub}` : module;

  const crumbs = [
    { label: "Home", href: "/dashboard" },
    { label: module, href: segments.length > 1 ? `/${root}` : undefined },
    ...(sub ? [{ label: sub }] : []),
  ];

  return (
    <AppLayout>
      <PageShell>
        <PageHeader
          title={title}
          description={`${title} module`}
          breadcrumbs={crumbs}
        />

        <div className="flex flex-col items-center justify-center py-24 px-6">
          <div className="w-16 h-16 rounded-2xl bg-brand-50 border border-brand-200 flex items-center justify-center mb-5">
            <Construction className="w-8 h-8 text-brand-400" />
          </div>

          <h2 className="text-lg font-semibold text-foreground mb-2">
            {title} — Coming Soon
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm mb-8">
            This module is under development. The UI foundation and routing are
            in place — business logic and data will be wired up in the next sprint.
          </p>

          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        </div>
      </PageShell>
    </AppLayout>
  );
}
