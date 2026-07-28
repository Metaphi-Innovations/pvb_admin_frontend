"use client";

import Link from "next/link";
import { FolderTree } from "lucide-react";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";

/** Lightweight COA sidebar entry — no tree, no CoaNavigationContext dependency. */
export function CoaSidebarNavLink() {
  return (
    <Link
      href={CHART_OF_ACCOUNTS_HREF}
      className="mb-2 flex items-center gap-2 px-2.5 py-2 rounded-lg border border-border/60 bg-white shadow-sm hover:bg-brand-50/40 transition-colors"
    >
      <span className="w-7 h-7 rounded-md bg-brand-100 border border-brand-200/80 flex items-center justify-center flex-shrink-0">
        <FolderTree className="w-4 h-4 text-brand-600" />
      </span>
      <span className="flex-1 text-sm font-medium text-brand-800 truncate">Chart of Accounts</span>
    </Link>
  );
}
