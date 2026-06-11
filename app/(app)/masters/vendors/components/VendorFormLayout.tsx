"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { Vendor } from "../vendor-data";
import { cn } from "@/lib/utils";

export function VendorFormLayout({
  mode,
  vendorCode,
  vendor,
  children,
  footer,
  onSave,
}: {
  mode: "create" | "edit" | "view";
  vendorCode: string;
  vendor?: Vendor | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
  onSave?: () => void;
}) {
  const router = useRouter();
  const title =
    mode === "create" ? "Create Vendor" : mode === "edit" ? "Edit Vendor" : "View Vendor";

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)] bg-background flex flex-col">
        <header className="bg-white border-b border-border/70 px-6 py-3 flex-shrink-0 sticky top-0 z-20">
          <div className="w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/masters/vendors")}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/70 hover:bg-muted/40 transition-colors"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground tracking-tight">{title}</h1>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                  <Link href="/masters/vendors" className="hover:text-brand-600">
                    Masters
                  </Link>
                  <span className="mx-1">/</span>
                  <Link href="/masters/vendors" className="hover:text-brand-600">
                    Vendor Master
                  </Link>
                  <span className="mx-1">/</span>
                  <span className="font-mono text-foreground/80">{vendorCode || "New"}</span>
                </p>
              </div>
            </div>
            {onSave && mode !== "view" && (
              <Button
                className="h-8 px-4 text-xs bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                onClick={onSave}
              >
                Save Vendor
              </Button>
            )}
          </div>
          {vendor && (
            <p className="w-full mt-1.5 text-[11px] text-muted-foreground truncate">
              {vendor.vendorName}
              {vendor.companyName && vendor.companyName !== vendor.vendorName && (
                <span className="ml-2 text-foreground/70">· {vendor.companyName}</span>
              )}
            </p>
          )}
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-3">
          <div className="w-full">{children}</div>
        </div>

        {footer && (
          <footer className="flex-shrink-0 border-t border-border/70 bg-white px-6 py-2.5 sticky bottom-0 z-10">
            <div className="w-full flex justify-end gap-2">{footer}</div>
          </footer>
        )}
      </div>
    </AppLayout>
  );
}

export const fieldClass =
  "h-9 text-sm border-border/70 rounded-lg bg-white shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30 placeholder:text-muted-foreground/50";
export const labelClass = "text-xs font-medium text-foreground";
export const selectClass = cn(fieldClass, "w-full px-3");

export function SectionDivider({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2 pb-2 mb-3 border-b border-border/40">
      <p className="text-xs font-semibold text-foreground">{title}</p>
      {subtitle && <p className="text-[11px] text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

export function FieldGrid({ children, cols = 2 }: { children: React.ReactNode; cols?: 2 | 3 }) {
  return (
    <div
      className={cn(
        "grid gap-x-3 gap-y-3",
        cols === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2",
      )}
    >
      {children}
    </div>
  );
}

export function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <label className={labelClass}>
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

export function VendorTabBar({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly { id: string; label: string }[];
  active: string;
  onChange: (id: string) => void;
}) {
  return (
    <div className="flex items-center gap-0.5 border-b border-border/60 bg-white rounded-t-lg px-1 overflow-x-auto">
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={cn(
            "px-3.5 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 -mb-px transition-colors rounded-t-md",
            active === t.id
              ? "border-brand-600 text-brand-700 bg-brand-50/40"
              : "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/30",
          )}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
