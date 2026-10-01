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
  stickyFooter,
  headerMeta,
  fullWidth = false,
  onBackClick,
}: {
  title: string;
  breadcrumb: { label: string; href: string }[];
  code?: string;
  children: React.ReactNode;
  /** Actions rendered in the sticky header (legacy). Prefer stickyFooter for transaction workspaces. */
  footer?: React.ReactNode;
  /** Actions rendered in a sticky bottom bar (enterprise transaction pattern). */
  stickyFooter?: React.ReactNode;
  /** Optional status / meta chips next to the title. */
  headerMeta?: React.ReactNode;
  /** When true, form uses full content width (Zoho Books-style documents). */
  fullWidth?: boolean;
  /** When set, overrides default back navigation (e.g. unsaved-changes guard). */
  onBackClick?: () => void;
}) {
  const router = useRouter();
  const backHref = breadcrumb[breadcrumb.length - 1]?.href ?? "/accounts";

  const handleBack = () => {
    if (onBackClick) onBackClick();
    else router.push(backHref);
  };

  return (
    <div
      className={`${
        stickyFooter ? "h-full min-h-0" : "min-h-full -m-3"
      } bg-background flex flex-col`}
    >
        <header className="bg-white border-b border-border px-5 py-2 flex-shrink-0 sticky top-0 z-20 shadow-sm">
          <div className={`${fullWidth ? "w-full max-w-none" : "max-w-[1100px]"} mx-auto w-full flex items-center justify-between gap-3`}>
            <div className="flex items-center gap-2.5 min-w-0">
              <button
                type="button"
                onClick={handleBack}
                className="w-7 h-7 flex items-center justify-center rounded-md border border-border/70 hover:bg-muted/40 flex-shrink-0"
              >
                <ArrowLeft className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>{title}</h1>
                  {headerMeta}
                </div>
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
        <main
          className={`flex-1 min-h-0 overflow-y-auto overscroll-contain ${
            stickyFooter ? "px-5 py-2 pb-3" : "px-4 py-3"
          }`}
        >
          <div className={fullWidth ? "w-full max-w-none" : "max-w-[1100px] mx-auto"}>{children}</div>
        </main>
        {stickyFooter ? (
          <div className="flex-shrink-0 bg-white border-t border-border px-5 py-1.5 z-20 shadow-[0_-2px_8px_rgba(15,23,42,0.05)]">
            <div className={`${fullWidth ? "w-full max-w-none" : "max-w-[1100px]"} mx-auto w-full`}>
              {stickyFooter}
            </div>
          </div>
        ) : null}
    </div>
  );
}
