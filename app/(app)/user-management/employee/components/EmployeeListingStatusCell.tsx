"use client";

import { cn } from "@/lib/utils";
import type { Employee } from "../employee-data";
import { canActivateEmployee } from "../employee-documents";

function StatusToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={(e) => {
        e.stopPropagation();
        if (!disabled) onChange();
      }}
      className={cn(
        "relative inline-flex h-[21px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#E57A1F]/30",
        active ? "bg-[#16A34A]" : "bg-[#E5E7EB]",
        disabled && "opacity-50 cursor-not-allowed",
      )}
    >
      <span
        className={cn(
          "absolute top-[2px] h-[17px] w-[17px] rounded-full bg-white shadow-sm transition-transform duration-200",
          active ? "translate-x-[19px]" : "translate-x-[2px]",
        )}
      />
    </button>
  );
}

export function EmployeeListingStatusCell({
  status,
  employee,
  onToggleRequest,
  onActivateBlocked,
  disabled,
}: {
  status: Employee["status"];
  employee?: Partial<Employee>;
  onToggleRequest?: (next: "active" | "inactive") => void;
  onActivateBlocked?: (gaps: string[]) => void;
  disabled?: boolean;
}) {
  if (status === "archived" || !onToggleRequest) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const isActive = status === "active";
  const isDraft = status === "draft";
  const activation = employee ? canActivateEmployee(employee) : { ok: true, gaps: [] as string[] };

  return (
    <div
      className="inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <StatusToggle
        active={isActive}
        disabled={disabled}
        onChange={() => {
          if (isActive) {
            onToggleRequest("inactive");
            return;
          }
          if (isDraft && !activation.ok) {
            onActivateBlocked?.(activation.gaps);
            return;
          }
          onToggleRequest("active");
        }}
      />
    </div>
  );
}
