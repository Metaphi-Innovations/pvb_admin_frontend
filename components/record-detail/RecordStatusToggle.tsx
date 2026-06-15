"use client";

import { cn } from "@/lib/utils";

/** 38×21px active/inactive pill toggle */
export function RecordStatusToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={active}
      disabled={disabled}
      onClick={() => !disabled && onChange(!active)}
      className={cn(
        "relative inline-flex h-[21px] w-[38px] shrink-0 items-center rounded-full transition-colors duration-200",
        "outline-none focus-visible:ring-2 focus-visible:ring-[#1554B4]/30",
        active ? "bg-[#1E9E61]" : "bg-slate-300",
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
