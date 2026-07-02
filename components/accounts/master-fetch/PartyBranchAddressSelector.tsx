"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { PartyAddressOption } from "@/lib/accounts/transaction-master-fetch";

export function PartyBranchAddressSelector({
  billToOptions,
  shipToOptions,
  billToId,
  shipToId,
  onBillToChange,
  onShipToChange,
  disabled,
}: {
  billToOptions: PartyAddressOption[];
  shipToOptions: PartyAddressOption[];
  billToId: string;
  shipToId: string;
  onBillToChange: (id: string, formatted: string) => void;
  onShipToChange: (id: string, formatted: string) => void;
  disabled?: boolean;
}) {
  if (!billToOptions.length && !shipToOptions.length) return null;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
      <div className="space-y-1">
        <Label className="text-xs">Bill To</Label>
        <Select
          value={billToId}
          disabled={disabled || billToOptions.length <= 1}
          onValueChange={(id) => {
            const opt = billToOptions.find((o) => o.id === id);
            onBillToChange(id, opt?.formatted ?? "");
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select billing location…" />
          </SelectTrigger>
          <SelectContent>
            {billToOptions.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <Label className="text-xs">Ship To</Label>
        <Select
          value={shipToId}
          disabled={disabled || shipToOptions.length <= 1}
          onValueChange={(id) => {
            const opt = shipToOptions.find((o) => o.id === id);
            onShipToChange(id, opt?.formatted ?? "");
          }}
        >
          <SelectTrigger className="h-8 text-xs">
            <SelectValue placeholder="Select delivery location…" />
          </SelectTrigger>
          <SelectContent>
            {shipToOptions.map((o) => (
              <SelectItem key={o.id} value={o.id} className="text-xs">
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
