"use client";

/**
 * Direct Service Invoice — compact read-only Customer / Warehouse info.
 * Uses already-available Customer VIEW and Warehouse VIEW data. Informational only.
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

function InfoTrigger({
  enabled,
  label,
  onClick,
}: {
  enabled: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={!enabled}
      className={cn(
        "inline-flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md",
        enabled
          ? "text-muted-foreground hover:bg-muted hover:text-brand-700"
          : "text-muted-foreground/30 cursor-not-allowed",
      )}
      aria-label={label}
      title={enabled ? label : undefined}
      onClick={(e) => {
        e.stopPropagation();
        if (enabled) onClick();
      }}
    >
      <Info className="w-3.5 h-3.5" />
    </button>
  );
}

export type ServiceInvoiceCustomerInfo = {
  customerName?: string;
  customerCode?: string;
  gstin?: string;
  billingAddress?: string;
  shippingAddress?: string;
  state?: string;
  branch?: string;
  customerType?: string;
  paymentTerms?: string;
  linkedLedger?: string;
};

export function ServiceInvoiceCustomerInfoButton({
  enabled,
  info,
}: {
  enabled: boolean;
  info: ServiceInvoiceCustomerInfo;
}) {
  const [open, setOpen] = useState(false);
  const title = info.customerName?.trim() || "Customer";

  return (
    <>
      <InfoTrigger
        enabled={enabled}
        label={`Customer details for ${title}`}
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sales-order-invoice-form-compact max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{title}</DialogTitle>
            <DialogDescription className="text-[11px]">Customer details</DialogDescription>
          </DialogHeader>
          <div className="rounded-xl border border-border bg-muted/20 px-3 py-1">
            <InfoRow label="Customer Name" value={info.customerName} />
            <InfoRow label="Customer Code" value={info.customerCode} />
            <InfoRow label="GSTIN" value={info.gstin} />
            <InfoRow label="Billing Address" value={info.billingAddress} />
            <InfoRow label="Shipping Address" value={info.shippingAddress} />
            <InfoRow label="State" value={info.state} />
            <InfoRow label="Branch" value={info.branch} />
            <InfoRow label="Customer Type" value={info.customerType} />
            <InfoRow label="Payment Terms" value={info.paymentTerms} />
            <InfoRow label="Linked Ledger" value={info.linkedLedger} />
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

export function ServiceInvoiceWarehouseInfoButton({
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
      <InfoTrigger
        enabled={enabled}
        label="Warehouse details"
        onClick={() => setOpen(true)}
      />
      <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
        <DialogContent className="sales-order-invoice-form-compact max-w-md max-h-[85vh] overflow-y-auto">
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
