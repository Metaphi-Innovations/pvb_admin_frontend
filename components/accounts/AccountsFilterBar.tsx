"use client";

/**
 * Standard accounts filter bar — white card, horizontal filter row.
 * Replaces ModuleFiltersBar inside the Accounts module.
 */

import React from "react";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/lib/accounts/accounts-typography";
import { AccountsListingFilterCard } from "@/components/accounts/AccountsListingHeader";

export interface AccountsFilterBarProps {
  /** Filter controls — date range, dropdowns, etc. Rendered before search. */
  children?: React.ReactNode;
  searchValue?: string;
  onSearchChange?: (value: string) => void;
  searchPlaceholder?: string;
  /** Right-aligned actions (Add, Export) */
  actions?: React.ReactNode;
  className?: string;
}

export function AccountsFilterBar({
  children,
  searchValue,
  onSearchChange,
  searchPlaceholder = "Search…",
  actions,
  className,
}: AccountsFilterBarProps) {
  const mounted = useClientMounted();

  return (
    <AccountsListingFilterCard actions={actions} className={className}>
      {children}
      {onSearchChange !== undefined && (
        <div className="space-y-0.5 min-w-[160px] flex-1 max-w-sm">
          <span className={ACCOUNTS_FILTER_LABEL_CLASS}>Search</span>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
            <Input
              value={searchValue ?? ""}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={searchPlaceholder}
              className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "pl-8 pr-8 w-full mt-0")}
            />
            {mounted && searchValue ? (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#1F2937]"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      )}
    </AccountsListingFilterCard>
  );
}
