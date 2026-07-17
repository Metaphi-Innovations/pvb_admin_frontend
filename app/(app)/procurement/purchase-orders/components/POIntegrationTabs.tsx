"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FileText } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "../po-data";
import { POVendorInvoiceSection } from "./POVendorInvoiceSection";
// import { ThreeWayMatchSection } from "./ThreeWayMatchSection";
import type { POVendorInvoiceView } from "@/services/purchase-order.service";

type TabId = "invoice" | "match";

export function POIntegrationTabs({
  po,
  refreshKey,
  onUpload,
  invoices = [],
}: {
  po: PurchaseOrder;
  refreshKey: number;
  onUpload: () => void;
  invoices?: POVendorInvoiceView[];
}) {
  const [tab, setTab] = useState<TabId>("invoice");

  useEffect(() => {
    if (typeof window === "undefined") return;
    // if (window.location.hash === "#three-way-match") setTab("match");
    if (window.location.hash === "#vendor-invoice") setTab("invoice");
  }, [refreshKey]);

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "invoice", label: "Supplier Invoice", icon: <FileText className="w-3.5 h-3.5" /> },
    // 3-Way Match — temporarily hidden until module is ready
    // { id: "match", label: "3-Way Match", icon: <Scale className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-border bg-muted/30 p-0.5 gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
              tab === t.id
                ? "bg-white text-brand-700 shadow-sm border border-border"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {tab === "invoice" && (
        <POVendorInvoiceSection
          po={po}
          refreshKey={refreshKey}
          invoices={invoices}
          onUpload={onUpload}
        />
      )}

      {/* 3-Way Match — temporarily hidden
      {tab === "match" && (
        <div id="three-way-match">
          <ThreeWayMatchSection po={po} refreshKey={refreshKey} />
        </div>
      )}
      */}
    </div>
  );
}
