"use client";

/**
 * Read-only Warehouse details popup for Direct Debit Note create/edit.
 * Uses existing Warehouse VIEW via useWarehouse. Informational only.
 * Warehouse code is omitted — WarehouseListRecord does not expose it.
 */

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useWarehouse } from "@/hooks/masters/use-warehouse-master";
import { cn } from "@/lib/utils";

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  const text = value?.trim();
  if (!text) return null;
  return (
    <div className="grid grid-cols-[120px_1fr] gap-2 py-1.5 border-b border-border/50 last:border-0">
      <span className="text-[11px] text-muted-foreground">{label}</span>
      <span className="text-xs font-medium text-foreground break-words">{text}</span>
    </div>
  );
}

export function DebitNoteWarehouseInfoButton({
  warehouseId,
}: {
  warehouseId: string | null;
}) {
  const [open, setOpen] = useState(false);
  const enabled = Boolean(warehouseId);
  const { data: warehouse, isLoading } = useWarehouse(open ? warehouseId : null);

  const rows = useMemo(() => {
    if (!warehouse) return [];
    const address = [warehouse.address, warehouse.address1].filter((p) => p?.trim()).join(", ");
    return [
      { label: "Warehouse Name", value: warehouse.warehouseName },
      { label: "GSTIN", value: warehouse.gstNumber },
      { label: "Address", value: address || warehouse.registeredGstAddress },
      { label: "State", value: warehouse.state },
      { label: "City", value: warehouse.city },
      { label: "Pincode", value: warehouse.pincode },
    ].filter((r) => r.value?.trim());
  }, [warehouse]);

  return (
    <>
      <button
        type="button"
        disabled={!enabled}
        className={cn(
          "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md",
          enabled
            ? "text-muted-foreground hover:bg-muted hover:text-brand-700"
            : "text-muted-foreground/30 cursor-not-allowed",
        )}
        aria-label="Warehouse details"
        title={enabled ? "Warehouse details" : undefined}
        onClick={(e) => {
          e.stopPropagation();
          if (enabled) setOpen(true);
        }}
      >
        <Info className="w-3.5 h-3.5" />
      </button>
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">
              {warehouse?.warehouseName || "Warehouse"}
            </DialogTitle>
            <DialogDescription className="text-[11px]">
              {isLoading ? "Loading warehouse details…" : "Warehouse details"}
            </DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
            {rows.length ? (
              rows.map((r) => <InfoRow key={r.label} label={r.label} value={r.value} />)
            ) : (
              <p className="py-2 text-xs text-muted-foreground">
                {isLoading ? "Loading…" : "No warehouse details available."}
              </p>
            )}
          </div>
          <div className="flex justify-end">
            <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => setOpen(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
