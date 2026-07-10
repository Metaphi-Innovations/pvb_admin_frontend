"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import {
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";

export function AccountsFormLayout({
  title,
  breadcrumb,
  code,
  children,
  footer,
  fullWidth = false,
}: {
  title: string;
  breadcrumb: { label: string; href: string }[];
  code?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** When true, form uses full content width (Zoho Books-style documents). */
  fullWidth?: boolean;
}) {
  const router = useRouter();
  const backHref = breadcrumb[breadcrumb.length - 1]?.href ?? "/accounts";

  return (
    <div className="min-h-full bg-background flex flex-col -m-3">
        <header className="bg-white border-b border-border px-6 py-3 flex-shrink-0 sticky top-0 z-20 shadow-sm">
          <div className={`${fullWidth ? "w-full max-w-none" : "max-w-[1100px]"} mx-auto w-full flex items-center justify-between gap-4`}>
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push(backHref)}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-border/70 hover:bg-muted/40"
              >
                <ArrowLeft className="w-4 h-4 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>{title}</h1>
                <p className={`${ACCOUNTS_PAGE_SUBTITLE_CLASS} truncate`}>
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
          <div className={fullWidth ? "w-full max-w-none" : "max-w-[1100px] mx-auto"}>{children}</div>
        </main>
    </div>
  );
}
