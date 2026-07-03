"use client";

import { useMemo, useState } from "react";
import { Info } from "lucide-react";
import { Label } from "@/components/ui/label";
import type { Customer } from "@/app/(app)/masters/customers/customer-data";
import {
  formatCustomerDropdownLabel,
  formatCustomerDropdownSublabel,
} from "@/lib/masters/entity-display";
import { SearchableSelect } from "@/app/(app)/accounts/credit-notes/components/SearchableSelect";
import CustomerInfoDialog from "@/app/(app)/sales/orders/components/CustomerInfoDialog";
import BillToShipToSection from "@/app/(app)/sales/orders/components/BillToShipToSection";
import {
  formatAddressCompact,
  getCustomerAddressesForSalesOrder,
  getDefaultBillShipAddressIds,
  type SalesOrderCustomerAddress,
} from "@/app/(app)/sales/orders/sales-order-address-utils";
import { INVOICE_FORM_LABEL_CLASS } from "@/app/(app)/accounts/components/InvoiceFormLayout";

export function formatInvoiceAddress(addr: SalesOrderCustomerAddress | undefined): string {
  if (!addr) return "";
  return formatAddressCompact(addr).lines.join(", ");
}

export interface SalesInvoiceCustomerSectionProps {
  customers: Customer[];
  customerId: string;
  onCustomerIdChange: (
    id: string,
    customer: Customer | null,
    addressDefaults?: { billToId: string; shipToId: string; billingAddress: string; shippingAddress: string },
  ) => void;
  billToId: string;
  shipToId: string;
  onBillToChange: (id: string, address: string) => void;
  onShipToChange: (id: string, address: string) => void;
  disabled?: boolean;
}

export function SalesInvoiceCustomerSection({
  customers,
  customerId,
  onCustomerIdChange,
  billToId,
  shipToId,
  onBillToChange,
  onShipToChange,
  disabled,
}: SalesInvoiceCustomerSectionProps) {
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === Number(customerId)) ?? null,
    [customers, customerId],
  );

  const customerAddresses = useMemo(
    () => (selectedCustomer ? getCustomerAddressesForSalesOrder(selectedCustomer) : []),
    [selectedCustomer],
  );

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
    const c = customers.find((x) => x.id === Number(id)) ?? null;
    if (!c) {
      onCustomerIdChange(id, null);
      return;
    }
    const addresses = getCustomerAddressesForSalesOrder(c);
    const { billToAddressId, shipToAddressId } = getDefaultBillShipAddressIds(addresses);
    const billAddr = addresses.find((a) => a.id === billToAddressId);
    const shipAddr = addresses.find((a) => a.id === shipToAddressId);
    onCustomerIdChange(id, c, {
      billToId: billToAddressId,
      shipToId: shipToAddressId,
      billingAddress: formatInvoiceAddress(billAddr),
      shippingAddress: formatInvoiceAddress(shipAddr),
    });
  };

  const handleBillToChange = (id: string) => {
    const addr = customerAddresses.find((a) => a.id === id);
    onBillToChange(id, formatInvoiceAddress(addr));
  };

  const handleShipToChange = (id: string) => {
    const addr = customerAddresses.find((a) => a.id === id);
    onShipToChange(id, formatInvoiceAddress(addr));
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1.5">
        <div className="flex items-center gap-1.5">
          <Label className={INVOICE_FORM_LABEL_CLASS}>
            Customer Name <span className="text-red-500">*</span>
          </Label>
          {selectedCustomer && (
            <button
              type="button"
              onClick={() => setCustomerInfoOpen(true)}
              className="flex items-center justify-center w-5 h-5 transition-colors rounded-full shadow-sm bg-brand-600 hover:bg-brand-700"
              title="View customer details"
            >
              <Info className="w-3 h-3 text-white" />
            </button>
          )}
        </div>
        <SearchableSelect
          label=""
          options={options}
          value={customerId}
          onChange={handleSelect}
          placeholder="Search customer…"
          disabled={disabled}
        />
      </div>

      {selectedCustomer && customerAddresses.length > 0 && (
        <BillToShipToSection
          addresses={customerAddresses}
          billToAddressId={billToId}
          shipToAddressId={shipToId}
          onBillToChange={handleBillToChange}
          onShipToChange={handleShipToChange}
          emptyHint="No Bill To / Ship To addresses found for this customer."
        />
      )}

      <CustomerInfoDialog
        customer={selectedCustomer}
        open={customerInfoOpen}
        onOpenChange={setCustomerInfoOpen}
      />
    </div>
  );
}
