"use client";

import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";

export function isActiveStatus(status: string): boolean {
  return status.toLowerCase() === "active";
}

export function ListingStatusToggle({
  active,
  onChange,
  disabled,
}: {
  active: boolean;
  onChange: (active: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div
      className="inline-flex items-center"
      onClick={(e) => e.stopPropagation()}
      onKeyDown={(e) => e.stopPropagation()}
    >
      <ActiveInactiveToggle active={active} onChange={onChange} disabled={disabled} />
    </div>
  );
}
