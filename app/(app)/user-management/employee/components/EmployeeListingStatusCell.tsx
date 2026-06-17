"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/record-detail/StatusBadge";
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
  if (status === "draft") {
    const activation = employee ? canActivateEmployee(employee) : { ok: false, gaps: [] as string[] };
    return (
      <div
        className="inline-flex items-center gap-2"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <StatusBadge status="draft" />
        {onToggleRequest && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!activation.ok || disabled}
            title={activation.ok ? "Activate user" : activation.gaps.join("; ")}
            className={cn(
              "h-6 px-2 text-[10px] border-emerald-200 text-emerald-700 hover:bg-emerald-50",
              !activation.ok && "opacity-60 cursor-not-allowed",
            )}
            onClick={() => {
              if (activation.ok) onToggleRequest("active");
              else onActivateBlocked?.(activation.gaps);
            }}
          >
            Activate
          </Button>
        )}
      </div>
    );
  }

  if (status === "archived") {
    return <StatusBadge status="inactive" />;
  }

  const isActive = status === "active";

  return (
    <div
      className="inline-flex items-center gap-2"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <StatusToggle
        active={isActive}
        disabled={disabled}
        onChange={() => onToggleRequest?.(isActive ? "inactive" : "active")}
      />
      <StatusBadge status={isActive ? "active" : "inactive"} />
    </div>
  );
}
