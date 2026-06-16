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
    return <p className="text-sm text-[#6B80A0] py-4 text-center">No records yet.</p>;
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
                  "py-2 px-2 font-semibold uppercase text-[11px] text-[#9AAAC5] first:rounded-l-md last:rounded-r-md",
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
                "border-b border-[#F0F3FA] last:border-0 transition-colors",
                onRowClick && "cursor-pointer hover:bg-[#F4F7FE]",
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    "py-2.5 px-2 text-[#3D5473]",
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
        <div className="pt-2 border-t border-[#F0F3FA] mt-1">
          <Link
            href={viewAllHref}
            className="inline-flex items-center gap-1 text-[12px] font-semibold text-[#1554B4] hover:underline"
          >
            {viewAllLabel}
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}
    </div>
  );
}
