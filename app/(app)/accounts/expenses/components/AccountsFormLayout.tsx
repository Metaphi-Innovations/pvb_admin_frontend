"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export function AccountsFormLayout({
  title,
  breadcrumb,
  code,
  children,
  footer,
}: {
  title: string;
  breadcrumb: { label: string; href: string }[];
  code?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const router = useRouter();
  const backHref = breadcrumb[breadcrumb.length - 1]?.href ?? "/accounts";

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)] bg-background flex flex-col">
        <header className="bg-white/95 backdrop-blur-sm border-b border-border/60 px-6 py-3 flex-shrink-0 sticky top-0 z-20">
          <div className="max-w-[1100px] mx-auto w-full flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/70 hover:bg-muted/40"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm font-semibold text-foreground">{title}</h1>
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
            {footer ? <div className="flex items-center gap-2 flex-shrink-0">{footer}</div> : null}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-[1100px] mx-auto">{children}</div>
        </main>
      </div>
    </AppLayout>
  );
}
