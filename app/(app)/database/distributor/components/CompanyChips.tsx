"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { classifyCompany, type CompanyGrade } from "@/lib/distributor/distributor-scoring";

const GRADE_CHIP_CLS: Record<CompanyGrade, string> = {
  A: "border-emerald-200 bg-emerald-50 text-emerald-700",
  B: "border-amber-200 bg-amber-50 text-amber-700",
  Others: "border-border bg-muted/30 text-foreground",
};

export function CompanyChips({
  companies,
  showGrade = false,
  className,
}: {
  companies: string[];
  showGrade?: boolean;
  className?: string;
}) {
  if (companies.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className={cn("flex flex-wrap gap-1.5 content-start", className)}>
      {companies.map((company) => {
        const grade = classifyCompany(company);
        return (
          <span
            key={company}
            className={cn(
              "inline-flex max-w-full items-center rounded-md border px-2 py-0.5 text-xs font-medium",
              "whitespace-normal break-words text-left",
              GRADE_CHIP_CLS[grade],
            )}
          >
            {company}
            {showGrade && (
              <span className="ml-1 text-[10px] opacity-70">({grade})</span>
            )}
          </span>
        );
      })}
    </div>
  );
}
