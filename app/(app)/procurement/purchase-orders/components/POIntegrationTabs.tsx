"use client";

import { useEffect, useState, type ReactNode } from "react";
import { FileText, Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PurchaseOrder } from "../po-data";
import { POVendorInvoiceSection } from "./POVendorInvoiceSection";
import { ThreeWayMatchSection } from "./ThreeWayMatchSection";

type TabId = "invoice" | "match";

export function POIntegrationTabs({
  po,
  refreshKey,
  onUpload,
  onReplace,
}: {
  po: PurchaseOrder;
  refreshKey: number;
  onUpload: () => void;
  onReplace: () => void;
}) {
  const [tab, setTab] = useState<TabId>("invoice");

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.location.hash === "#three-way-match") setTab("match");
    if (window.location.hash === "#vendor-invoice") setTab("invoice");
  }, [refreshKey]);

  const tabs: { id: TabId; label: string; icon: ReactNode }[] = [
    { id: "invoice", label: "Supplier Invoice", icon: <FileText className="w-3.5 h-3.5" /> },
    { id: "match", label: "3-Way Match", icon: <Scale className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="space-y-3">
      <div className="inline-flex rounded-lg border border-[#DDE3EF] bg-[#F7F9FC] p-0.5 gap-0.5">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[12px] font-semibold transition-colors",
              tab === t.id
                ? "bg-white text-brand-700 shadow-sm border border-[#DDE3EF]"
                : "text-[#6B80A0] hover:text-[#0A1628]",
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
          onUpload={onUpload}
          onReplace={onReplace}
        />
      )}

      {tab === "match" && (
        <div id="three-way-match">
          <ThreeWayMatchSection po={po} refreshKey={refreshKey} />
        </div>
      )}
    </div>
  );
}
