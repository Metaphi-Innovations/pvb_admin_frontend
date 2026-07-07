"use client";

import type { PartyAddressOption } from "@/lib/accounts/transaction-master-fetch";

function AddressDetailCard({
  title,
  option,
  gstin,
}: {
  title: string;
  option: PartyAddressOption | null | undefined;
  gstin?: string;
}) {
  if (!option) return null;
  return (
    <div className="rounded-lg border border-border/60 bg-muted/10 p-3 space-y-2">
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div className="space-y-2 text-xs">
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Company Name</p>
          <p className="font-medium text-foreground">{option.label}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">Address</p>
          <p className="text-foreground whitespace-pre-wrap leading-relaxed">{option.formatted || "—"}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground mb-0.5">GSTIN No.</p>
          <p className="font-mono text-foreground">{gstin?.trim() || "—"}</p>
        </div>
      </div>
    </div>
  );
}

export function PartyAddressDetailCards({
  billToOptions,
  shipToOptions,
  billToId,
  shipToId,
  gstin,
}: {
  billToOptions: PartyAddressOption[];
  shipToOptions: PartyAddressOption[];
  billToId: string;
  shipToId: string;
  gstin?: string;
}) {
  const billOption = billToOptions.find((o) => o.id === billToId);
  const shipOption = shipToOptions.find((o) => o.id === shipToId);

  if (!billOption && !shipOption) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <AddressDetailCard title="Bill To" option={billOption} gstin={gstin} />
      <AddressDetailCard title="Ship To" option={shipOption} gstin={gstin} />
    </div>
  );
}
