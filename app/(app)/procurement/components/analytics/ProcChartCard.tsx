"use client";

import type { ReactNode } from "react";

export function ProcChartCard({
  title,
  subtitle,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`bg-white rounded-[13px] border border-[#DDE3EF] shadow-sm overflow-hidden ${className ?? ""}`}>
      <div className="px-4 py-2.5 border-b border-[#DDE3EF]" style={{ backgroundColor: "#F7F9FC" }}>
        <p className="text-[12px] font-bold text-[#0A1628]">{title}</p>
        {subtitle && <p className="text-[10px] text-[#6B80A0] mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-3">{children}</div>
    </div>
  );
}
