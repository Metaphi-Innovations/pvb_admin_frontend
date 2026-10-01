"use client";

import { useMemo } from "react";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  customerMasterToTransactionFields,
  type CustomerTransactionFields,
} from "@/lib/accounts/transaction-master-fetch";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  formatCustomerDropdownLabel,
  formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import { SearchableSelect } from "./SearchableSelect";

function ReadOnlyField({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  return (
    <div className="cn-ws__field">
      <Label className="text-[11px] font-medium text-muted-foreground">{label}</Label>
      <p className={`cn-ws__ro ${mono ? "font-mono" : ""}`}>
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

export interface CreditNoteCustomerSectionProps {
  customers: Customer[];
  customerId: string;
  onCustomerIdChange: (id: string, fields: CustomerTransactionFields | null) => void;
  fields: CustomerTransactionFields | null;
  billToId: string;
  shipToId: string;
  onBillToChange: (id: string, address: string) => void;
  onShipToChange: (id: string, address: string) => void;
  billingAddress: string;
  shippingAddress: string;
  disabled?: boolean;
  /** Compact: customer + AR only (addresses in collapsed row). */
  compact?: boolean;
}

export function CreditNoteCustomerSection({
  customers,
  customerId,
  onCustomerIdChange,
  fields,
  billToId,
  shipToId,
  onBillToChange,
  onShipToChange,
  billingAddress,
  shippingAddress,
  disabled,
  compact = true,
}: CreditNoteCustomerSectionProps) {
  const options = useMemo(
    () =>
      customers.map((c) => ({
        value: String(c.id),
        label: formatCustomerDropdownLabel(c),
        sub: formatCustomerDropdownSublabel(c),
      })),
    [customers],
  );

  const handleSelect = (id: string) => {
    const c = customers.find((x) => x.id === Number(id));
    onCustomerIdChange(id, c ? customerMasterToTransactionFields(c) : null);
  };

  return (
    <div className="space-y-2">
      <div className="cn-ws__grid-3">
        <div className="cn-ws__field" style={{ gridColumn: "1 / -1" }}>
          <SearchableSelect
            label="Customer"
            options={options}
            value={customerId}
            onChange={handleSelect}
            placeholder="Search customer…"
            disabled={disabled}
            required
          />
        </div>
      </div>

      {fields && !compact ? (
        <div className="cn-ws__grid-4">
          {fields.billToOptions.length > 0 ? (
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">Bill To</Label>
              <Select
                value={billToId}
                disabled={disabled}
                onValueChange={(id) => {
                  const opt = fields.billToOptions.find((o) => o.id === id);
                  onBillToChange(id, opt?.formatted ?? "");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Billing branch…" />
                </SelectTrigger>
                <SelectContent>
                  {fields.billToOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {fields.shipToOptions.length > 0 ? (
            <div className="cn-ws__field">
              <Label className="text-[11px] font-medium text-muted-foreground">Ship To</Label>
              <Select
                value={shipToId}
                disabled={disabled}
                onValueChange={(id) => {
                  const opt = fields.shipToOptions.find((o) => o.id === id);
                  onShipToChange(id, opt?.formatted ?? "");
                }}
              >
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Shipping branch…" />
                </SelectTrigger>
                <SelectContent>
                  {fields.shipToOptions.map((o) => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          <ReadOnlyField label="Billing Address" value={billingAddress} />
          <ReadOnlyField label="Shipping Address" value={shippingAddress} />
        </div>
      ) : null}

      {fields && compact && (billingAddress || shippingAddress) ? (
        <p className="text-[11px] text-muted-foreground truncate">
          Bill: {billingAddress || "—"}
          {shippingAddress ? ` · Ship: ${shippingAddress}` : ""}
        </p>
      ) : null}
    </div>
  );
}
