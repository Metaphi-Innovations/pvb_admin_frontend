"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { ArrowLeft, Settings } from "lucide-react";
import { ProcBadge, ProcButton, PROC } from "../../design/proc-design";

interface POFormLayoutProps {
  mode: "create" | "edit" | "view";
  poNumber: string;
  status?: string;
  backHref?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  headerActions?: React.ReactNode;
  onSave?: () => void;
  saveLabel?: string;
}

export function POFormLayout({
  mode,
  poNumber,
  status = "draft",
  backHref,
  children,
  footer,
  headerActions,
  onSave,
  saveLabel = "Save",
}: POFormLayoutProps) {
  const router = useRouter();
  const title = mode === "create" ? "Create Purchase Order" : mode === "edit" ? "Edit Purchase Order" : "Purchase Order";
  const defaultBack = mode === "create" ? "/procurement/purchase-orders" : backHref ?? "/procurement/purchase-orders";

  return (
    <AppLayout noPadding>
      <div className="min-h-[calc(100vh-104px)] flex flex-col" style={{ backgroundColor: PROC.pageBg }}>
        <header className="bg-white border-b border-[#DDE3EF] shadow-sm px-6 py-3 shrink-0">
          <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => router.push(defaultBack)}
                className="w-9 h-9 flex items-center justify-center rounded-[9px] border border-[#DDE3EF] hover:bg-[#F4F7FE] text-[#3D5473]"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <div>
                <h1 className="text-lg font-bold text-[#0A1628]">{title}</h1>
                <p className="text-[11px] text-[#6B80A0]">
                  <Link href="/procurement/purchase-orders" className="hover:text-brand-600">Purchase Order</Link>
                  <span className="mx-1">/</span>
                  <span className="font-mono font-semibold text-brand-700">{poNumber || "New"}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <ProcBadge status={status} />
              <ProcButton variant="ghost" size="sm"><Settings className="w-3.5 h-3.5" /> Settings</ProcButton>
              {headerActions}
              {onSave && mode !== "view" && (
                <ProcButton variant="primary" onClick={onSave}>{saveLabel}</ProcButton>
              )}
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="max-w-[1400px] mx-auto w-full">{children}</div>
        </div>

        {footer && (
          <footer className="shrink-0 bg-white border-t border-[#DDE3EF] px-6 py-3 shadow-[0_-2px_8px_rgba(10,22,40,0.04)]">
            <div className="max-w-[1400px] mx-auto flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[11px] text-[#6B80A0]">
                <span className="font-mono font-semibold text-brand-700">{poNumber || "New PO"}</span>
                <ProcBadge status={status} />
              </div>
              <div className="flex items-center gap-2">{footer}</div>
            </div>
          </footer>
        )}
      </div>
    </AppLayout>
  );
}
