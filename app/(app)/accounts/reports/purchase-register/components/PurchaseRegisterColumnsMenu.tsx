"use client";

import { Columns3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DEFAULT_VISIBLE_COLUMNS,
  PURCHASE_REGISTER_COLUMNS,
  type PurchaseRegisterColKey,
} from "../purchase-register-columns";

const GROUP_LABELS: Record<string, string> = {
  core: "Core",
  link: "Links",
  tax: "Tax & Values",
  rcm: "Reverse Charge",
  itc: "ITC",
  recon: "Reconciliation",
};

export function PurchaseRegisterColumnsMenu({
  visible,
  onChange,
}: {
  visible: PurchaseRegisterColKey[];
  onChange: (next: PurchaseRegisterColKey[]) => void;
}) {
  const set = new Set(visible);

  const toggle = (key: PurchaseRegisterColKey) => {
    if (set.has(key)) {
      if (visible.length <= 4) return;
      onChange(visible.filter((k) => k !== key));
    } else {
      onChange([...visible, key]);
    }
  };

  const groups = ["core", "link", "tax", "rcm", "itc", "recon"] as const;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
          <Columns3 className="w-3.5 h-3.5" />
          Columns
          <span className="text-[10px] text-muted-foreground tabular-nums">
            ({visible.length})
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72 p-0 max-h-[420px] overflow-y-auto">
        <div className="px-3 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-xs font-semibold text-foreground">Show / hide columns</p>
          <button
            type="button"
            className="text-[11px] text-brand-600 hover:underline"
            onClick={() => onChange([...DEFAULT_VISIBLE_COLUMNS])}
          >
            Reset
          </button>
        </div>
        {groups.map((group) => {
          const cols = PURCHASE_REGISTER_COLUMNS.filter((c) => c.group === group);
          if (cols.length === 0) return null;
          return (
            <div key={group} className="px-3 py-2 border-b border-border/60 last:border-0">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                {GROUP_LABELS[group]}
              </p>
              <div className="space-y-1">
                {cols.map((col) => {
                  const checked = set.has(col.key);
                  return (
                    <label
                      key={col.key}
                      className={cn(
                        "flex items-center gap-2 cursor-pointer rounded-md px-1.5 py-1 hover:bg-muted/50",
                        checked && "bg-brand-50/50",
                      )}
                    >
                      <input
                        type="checkbox"
                        className="w-3.5 h-3.5 rounded accent-brand-600"
                        checked={checked}
                        onChange={() => toggle(col.key)}
                      />
                      <span className="text-xs text-foreground">{col.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
