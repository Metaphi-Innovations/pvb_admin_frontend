"use client";

import { Switch } from "@/components/ui/switch";

/** Cash Flow–only filter — not shared with other reports. */
export function CashFlowCompareToggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 py-1">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground">Compare with Previous Period</p>
        <p className="text-[11px] text-muted-foreground mt-0.5">
          Show current and prior-year equivalent date range
        </p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
