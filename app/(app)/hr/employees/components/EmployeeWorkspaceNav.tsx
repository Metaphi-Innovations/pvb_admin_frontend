"use client";

import { Lock } from "lucide-react";
import { cn } from "@/lib/utils";

export const EMPLOYEE_WORKSPACE_TABS = [
  { id: "directory", label: "Employee Directory", available: true },
  { id: "attendance", label: "Attendance", available: false },
  { id: "bank", label: "Bank Details", available: false },
  { id: "payroll", label: "Salary & Payroll", available: false },
  { id: "leave", label: "Leave", available: false },
  { id: "documents", label: "Documents", available: false },
  { id: "letters", label: "HR Letters", available: false },
  { id: "offboarding", label: "Offboarding", available: false },
] as const;

export type EmployeeWorkspaceTabId = (typeof EMPLOYEE_WORKSPACE_TABS)[number]["id"];

/**
 * Horizontal Employees workspace navigation.
 * Only Employee Directory is active; other tabs are future-locked.
 */
export function EmployeeWorkspaceNav({
  activeId = "directory",
}: {
  activeId?: EmployeeWorkspaceTabId;
}) {
  return (
    <nav
      aria-label="Employees workspace"
      className="border-b border-border -mx-0 overflow-x-auto"
    >
      <ul className="flex items-stretch gap-0 min-w-0">
        {EMPLOYEE_WORKSPACE_TABS.map((tab) => {
          const active = tab.id === activeId;
          const locked = !tab.available;

          return (
            <li key={tab.id} className="shrink-0">
              <button
                type="button"
                disabled={locked}
                aria-current={active ? "page" : undefined}
                title={locked ? "Coming in a later phase" : undefined}
                className={cn(
                  "relative h-9 px-3 text-xs font-medium whitespace-nowrap transition-colors",
                  "inline-flex items-center gap-1.5 border-b-2 -mb-px",
                  active &&
                    "border-brand-600 text-brand-700 bg-brand-50/50",
                  !active &&
                    !locked &&
                    "border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/40",
                  locked &&
                    "border-transparent text-muted-foreground/55 cursor-not-allowed",
                )}
              >
                {tab.label}
                {locked && <Lock className="w-3 h-3 opacity-60" aria-hidden />}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
