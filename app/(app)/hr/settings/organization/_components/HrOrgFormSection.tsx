"use client";

import React from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  HR_SECTION_CLASS,
  HR_SECTION_HEAD_CLASS,
  HR_SECTION_LABEL_CLASS,
  HR_SECTION_DESC_CLASS,
  HR_FORM_GRID_CLASS,
  HR_ICON_BOX_CLASS,
  HR_ICON_CLASS,
} from "./hr-org-form";

/**
 * Logical form section inside a single page panel.
 * Icon + title + thin divider — no nested bordered card.
 */
export function HrOrgFormSection({
  title,
  description,
  icon: Icon,
  children,
  className,
  grid = true,
}: {
  title: string;
  description?: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
  grid?: boolean;
}) {
  return (
    <section className={cn(HR_SECTION_CLASS, className)}>
      <div className={HR_SECTION_HEAD_CLASS}>
        <div className="flex items-center gap-2">
          {Icon && (
            <div className={HR_ICON_BOX_CLASS} aria-hidden>
              <Icon className={HR_ICON_CLASS} />
            </div>
          )}
          <div className="min-w-0">
            <h2 className={HR_SECTION_LABEL_CLASS}>{title}</h2>
            {description && <p className={HR_SECTION_DESC_CLASS}>{description}</p>}
          </div>
        </div>
      </div>
      {grid ? <div className={HR_FORM_GRID_CLASS}>{children}</div> : children}
    </section>
  );
}

/** Single page container — wrap sections; use divide-y via HR_FORM_STACK_CLASS */
export function HrOrgFormPanel({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-white shadow-sm overflow-hidden divide-y divide-border",
        className,
      )}
    >
      {children}
    </div>
  );
}
