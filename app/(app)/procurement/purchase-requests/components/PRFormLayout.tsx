"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Settings } from "lucide-react";
import { StatusPill } from "../../components/ProcurementUI";
import { PR_STATUS_CFG, type PurchaseRequest } from "../pr-data";
import { cn } from "@/lib/utils";

interface PRFormLayoutProps {
  mode: "create" | "edit" | "view";
  prNumber: string;
  pr?: PurchaseRequest | null;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
}

export function PRFormLayout({
  mode,
  prNumber,
  pr,
  children,
  footer,
  headerActions,
  onSave,
  saveLabel = "Save",
}: PRFormLayoutProps) {
  const router = useRouter();
  const title = mode === "create" ? "Create Purchase Request" : mode === "edit" ? "Edit Purchase Request" : "Purchase Request";

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)] bg-background flex flex-col">
        {/* Top header — Swipe-style */}
        <header className="bg-white border-b border-border/70 px-6 py-4 flex-shrink-0">
          <div className="flex items-start justify-between gap-4 max-w-[1400px] mx-auto w-full">
            <div className="flex items-start gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push("/procurement/purchase-requests")}
                className="mt-0.5 w-8 h-8 flex items-center justify-center rounded-lg border border-border/80 hover:bg-muted/50 text-muted-foreground"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-semibold text-foreground tracking-tight">{title}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Link href="/procurement/purchase-requests" className="hover:text-brand-600">
                    Purchase Request
                  </Link>
                  <span className="mx-1.5 text-border">/</span>
                  <span className="text-foreground/80">{prNumber}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {headerActions}
              {onSave && mode !== "view" && (
                <Button
                  size="sm"
                  className="h-9 px-4 text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-sm"
                  onClick={onSave}
                >
                  {saveLabel}
                </Button>
              )}
            </div>
          </div>

          {/* PR number row */}
          <div className="flex flex-wrap items-end gap-4 mt-4 pt-4 border-t border-border/50 max-w-[1400px] mx-auto w-full">
            <div className="flex items-center gap-2 min-w-[200px]">
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">PR No.</span>
              <div className="flex rounded-md border border-border/80 overflow-hidden bg-white h-9">
                <span className="px-2.5 flex items-center text-xs font-medium text-muted-foreground bg-muted/40 border-r border-border/80">
                  PR
                </span>
                <Input
                  readOnly
                  value={prNumber.replace(/^PR-/, "")}
                  className="h-9 border-0 rounded-none text-sm font-semibold font-mono shadow-none focus-visible:ring-0 min-w-[120px]"
                />
              </div>
            </div>
            {pr && (
              <div className="pb-1">
                <StatusPill status={pr.status} config={PR_STATUS_CFG} />
              </div>
            )}
            <div className="ml-auto flex items-center gap-2 pb-0.5">
              <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground gap-1.5">
                <Settings className="w-3.5 h-3.5" /> Settings
              </Button>
            </div>
          </div>
        </header>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="max-w-[1400px] mx-auto w-full">{children}</div>
        </div>

        {/* Sticky footer actions */}
        {footer && (
          <footer className="flex-shrink-0 bg-white border-t border-border/70 px-6 py-3">
            <div className="max-w-[1400px] mx-auto w-full flex items-center justify-end gap-2">
              {footer}
            </div>
          </footer>
        )}
      </div>
    </AppLayout>
  );
}
