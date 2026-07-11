"use client";

import { useCallback, useMemo } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";
import { ReportMultiSelect } from "@/components/accounts/ReportMultiSelect";
import { loadWarehouseMappingOptions } from "@/lib/accounts/bank-warehouse-mapping";

export function BankWarehouseMappingSelect({
  value,
  onChange,
  disabled,
  error,
}: {
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  error?: string | null;
}) {
  const options = useMemo(() => loadWarehouseMappingOptions(), []);
  const stringValues = useMemo(() => value.map(String), [value]);

  const handleChange = useCallback(
    (next: string[]) => {
      onChange(next.map((v) => Number(v)).filter((n) => Number.isFinite(n)));
    },
    [onChange],
  );

  const labelById = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of options) map.set(opt.value, opt.label);
    return map;
  }, [options]);

  return (
    <div className="space-y-1.5 sm:col-span-2">
      <ReportMultiSelect
        label="Mapped Warehouses *"
        values={stringValues}
        onChange={handleChange}
        options={options}
        entityName="warehouse"
        placeholder="Select warehouses…"
        disabled={disabled}
        minWidthClass="min-w-0 w-full"
      />
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5 pt-0.5">
          {value.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-brand-50 border border-brand-200 text-brand-700 rounded-md font-medium"
            >
              {labelById.get(String(id)) ?? `Warehouse ${id}`}
              {!disabled && (
                <button
                  type="button"
                  onClick={() => onChange(value.filter((v) => v !== id))}
                  className="p-0.5 rounded hover:bg-brand-100"
                  aria-label={`Remove ${labelById.get(String(id))}`}
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
      {error ? (
        <p className="text-xs text-red-500">{error}</p>
      ) : (
        <p className="text-[11px] text-muted-foreground">
          Select all warehouses that may use this bank account on invoices and vouchers.
        </p>
      )}
    </div>
  );
}

export function BankWarehouseMappingReadonly({ warehouseIds }: { warehouseIds: number[] }) {
  const options = useMemo(() => loadWarehouseMappingOptions(), []);
  const labels = warehouseIds.map(
    (id) => options.find((o) => o.value === String(id))?.label ?? `Warehouse ${id}`,
  );

  if (labels.length === 0) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {labels.map((label) => (
        <span
          key={label}
          className={cn(
            "inline-flex items-center px-2 py-0.5 text-xs bg-muted/40 border border-border rounded-md text-foreground",
          )}
        >
          {label}
        </span>
      ))}
    </div>
  );
}
