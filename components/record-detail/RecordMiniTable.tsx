"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RecordMiniTableColumn } from "./types";

export function RecordMiniTable<T>({
  columns,
  rows,
  viewAllHref,
  viewAllLabel,
  onRowClick,
}: {
  columns: RecordMiniTableColumn<T>[];
  rows: T[];
  viewAllHref?: string;
  viewAllLabel?: string;
  onRowClick?: (row: T) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-[#64748B] py-4 text-center">No records yet.</p>;
  }

  const align = (a?: "left" | "right" | "center") =>
    a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

  return (
    <div>
      <table className="w-full text-left text-[12px]">
        <thead>
          <tr style={{ backgroundColor: "#F7F9FC" }}>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  "py-2 px-2 font-semibold uppercase text-[11px] text-[#64748B] first:rounded-l-md last:rounded-r-md",
                  align(col.align),
                )}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr
              key={i}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                "border-b border-[#E5E7EB] last:border-0 transition-colors",
                onRowClick && "cursor-pointer hover:bg-[#F8F6F1]",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-2.5 px-2 text-[#0F172A]",
                    col.align === "right" && "text-right tabular-nums",
                    col.align === "center" && "text-center",
                  )}
                >
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {viewAllHref && viewAllLabel && (
        <div className="pt-2 border-t border-[#E5E7EB] mt-1">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#E57A1F] hover:underline hover:text-[#D96C10]"
          >
            {viewAllLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
