"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * HR form chrome for create/edit/view — designed to sit inside HrModuleShell.
 * Does not wrap AppLayout (module layout already provides chrome).
 */
export function HrFormLayout({
  mode,
  title,
  breadcrumb,
  code,
  subtitle,
  children,
  onSave,
  saveLabel = "Save",
  className,
}: {
  mode: "create" | "edit" | "view";
  title: string;
  breadcrumb: { label: string; href: string }[];
  code?: string;
  subtitle?: string;
  children: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
  className?: string;
}) {
  const router = useRouter();
  const backHref = breadcrumb[breadcrumb.length - 1]?.href ?? "/hr/settings";

  return (
    <div className={cn("flex flex-col h-full min-h-0 -mx-4 -my-3", className)}>
      <header className="bg-white border-b border-border px-4 py-2.5 flex-shrink-0 sticky top-0 z-20 shadow-sm">
        <div className="w-full flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push(backHref)}
              className="w-8 h-8 flex items-center justify-center rounded-[10px] border border-border/70 hover:bg-muted/40"
            >
              <ArrowLeft className="w-4 h-4 text-muted-foreground" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-foreground">{title}</h1>
              <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
                {breadcrumb.map((b, i) => (
                  <span key={b.href}>
                    {i > 0 && <span className="mx-1">/</span>}
                    <Link href={b.href} className="hover:text-brand-600">
                      {b.label}
                    </Link>
                  </span>
                ))}
                {code && (
                  <>
                    <span className="mx-1">/</span>
                    <span className="font-mono text-foreground/80">{code}</span>
                  </>
                )}
              </p>
            </div>
          </div>
          {onSave && mode !== "view" && (
            <Button
              className="h-8 px-4 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
              onClick={onSave}
            >
              {saveLabel}
            </Button>
          )}
        </div>
        {subtitle && (
          <p className="w-full mt-1.5 text-[11px] text-muted-foreground truncate pl-11">{subtitle}</p>
        )}
      </header>
      <div className="flex-1 overflow-y-auto overscroll-contain px-4 py-3 bg-background">
        <div className="max-w-[1100px] w-full mx-auto">{children}</div>
      </div>
    </div>
  );
}
