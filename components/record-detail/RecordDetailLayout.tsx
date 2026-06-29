"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft, FileText, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { RecordDetailSidebar } from "./RecordDetailSidebar";
import { RecordDetailTabs } from "./RecordDetailTabs";
import { RecordEntityAvatar } from "./RecordEntityAvatar";
import { RecordKpiBar } from "./RecordKpiBar";
import { RecordStatusPill } from "./RecordStatusPill";
import { RecordStatusToggle } from "./RecordStatusToggle";
import type {
  RecordDetailSidebarProps,
  RecordDetailTab,
  RecordKpiItem,
  RecordMetaItem,
} from "./types";

function hasSidebarContent(sidebar?: RecordDetailSidebarProps): sidebar is RecordDetailSidebarProps {
  if (!sidebar) return false;
  return (
    (sidebar.quickActions?.length ?? 0) > 0 ||
    (sidebar.summary?.length ?? 0) > 0 ||
    (sidebar.activity?.length ?? 0) > 0 ||
    (sidebar.approval?.length ?? 0) > 0 ||
    (sidebar.documents?.length ?? 0) > 0
  );
}

export interface RecordDetailLayoutProps {
  listHref: string;
  listLabel: string;
  recordName: string;
  recordCode?: string;
  typeBadge?: React.ReactNode;
  statusLabel: string;
  statusVariant?: "active" | "inactive" | "draft" | "blocked" | "neutral";
  metaItems?: RecordMetaItem[];
  kpis?: RecordKpiItem[];
  tabs?: RecordDetailTab[];
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  active?: boolean;
  onActiveChange?: (active: boolean) => void;
  toggleDisabled?: boolean;
  onEdit?: () => void;
  editLabel?: string;
  secondaryAction?: { label: string; onClick: () => void };
  headerActions?: React.ReactNode;
  moreActions?: { label: string; onClick: () => void; destructive?: boolean }[];
  sidebar?: RecordDetailSidebarProps;
  banner?: React.ReactNode;
  /** Larger typography for CRM-style profile pages */
  headerVariant?: "default" | "profile";
  children: React.ReactNode;
}

export function RecordDetailLayout({
  listHref,
  listLabel,
  recordName,
  recordCode,
  typeBadge,
  statusLabel,
  statusVariant = "active",
  metaItems = [],
  kpis,
  tabs,
  activeTab = "overview",
  onTabChange,
  active,
  onActiveChange,
  toggleDisabled,
  onEdit,
  editLabel = "Edit",
  secondaryAction,
  headerActions,
  moreActions,
  sidebar,
  banner,
  headerVariant = "default",
  children,
}: RecordDetailLayoutProps) {
  const isProfileHeader = headerVariant === "profile";
  const showTabs = tabs && tabs.length > 0;
  const showSidebar = hasSidebarContent(sidebar);
  const codeMeta: RecordMetaItem[] = recordCode
    ? [{ icon: FileText, label: recordCode }]
    : [];
  const allMeta = [...codeMeta, ...metaItems];

  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)] w-full">
      <div className="sticky top-0 z-30 bg-white border-b border-border shadow-sm">
        <div className="px-5 pt-3 pb-1">
          <nav className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Link
              href={listHref}
              className="inline-flex items-center gap-0.5 hover:text-brand-600 transition-colors"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              {listLabel}
            </Link>
            <span className="text-border">/</span>
            <span className="text-foreground font-medium truncate">{recordName}</span>
          </nav>
        </div>

        <div className="flex items-start justify-between gap-4 px-5 py-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <RecordEntityAvatar
              name={recordName}
              className={isProfileHeader ? "h-14 w-14 text-lg" : undefined}
            />
            <div className="min-w-0 flex-1">
              <div className="flex items-center flex-wrap gap-2.5">
                <h1
                  className={cn(
                    "font-semibold text-foreground leading-tight",
                    isProfileHeader ? "text-[26px] tracking-tight" : "text-base font-bold",
                  )}
                >
                  {recordName}
                </h1>
                {typeBadge}
                <RecordStatusPill label={statusLabel} variant={statusVariant} />
              </div>
              {allMeta.length > 0 && (
                <div
                  className={cn(
                    "flex flex-wrap items-center gap-2.5 mt-1 text-muted-foreground",
                    isProfileHeader ? "text-sm" : "text-xs mt-1.5 gap-3",
                  )}
                >
                  {allMeta.map((item, i) => {
                    const Icon = item.icon;
                    const isCode = i === 0 && recordCode && item.label === recordCode;
                    const content = (
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 transition-colors",
                          isCode
                            ? "font-mono font-semibold text-brand-700"
                            : "hover:text-brand-600",
                        )}
                      >
                        {Icon && <Icon className="w-3.5 h-3.5" />}
                        {item.label}
                      </span>
                    );
                    return (
                      <React.Fragment key={`${item.label}-${i}`}>
                        {i > 0 && <span className="w-px h-3 bg-border" />}
                        {item.href ? (
                          <a href={item.href}>{content}</a>
                        ) : item.onClick ? (
                          <button type="button" onClick={item.onClick}>
                            {content}
                          </button>
                        ) : (
                          content
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0 flex-wrap justify-end">
            {headerActions}
            {onActiveChange !== undefined && (
              <RecordStatusToggle
                active={!!active}
                onChange={onActiveChange}
                disabled={toggleDisabled}
              />
            )}
            {secondaryAction && (
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={secondaryAction.onClick}
              >
                {secondaryAction.label}
              </Button>
            )}
            {onEdit && (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={onEdit}
              >
                {editLabel}
              </Button>
            )}
            {moreActions && moreActions.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {moreActions.map((action) => (
                    <DropdownMenuItem
                      key={action.label}
                      onClick={action.onClick}
                      className={cn(action.destructive && "text-red-600")}
                    >
                      {action.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
        </div>

        {kpis && kpis.length > 0 && <RecordKpiBar items={kpis} />}

        {showTabs && onTabChange && (
          <RecordDetailTabs tabs={tabs!} activeTab={activeTab} onTabChange={onTabChange} />
        )}
      </div>

      <div className="flex-1 bg-muted/20 p-4">
        {banner && <div className="mb-4">{banner}</div>}
        <div
          className={cn(
            "grid gap-4 w-full",
            showSidebar
              ? "grid-cols-1 xl:grid-cols-[minmax(0,7fr)_minmax(280px,3fr)]"
              : "grid-cols-1",
          )}
        >
          <main className="min-w-0 space-y-4">{children}</main>
          {showSidebar && (
            <aside className="min-w-0">
              <div className="xl:sticky xl:top-[calc(4rem+1px)]">
                <RecordDetailSidebar {...sidebar} />
              </div>
            </aside>
          )}
        </div>
      </div>
    </div>
  );
}
