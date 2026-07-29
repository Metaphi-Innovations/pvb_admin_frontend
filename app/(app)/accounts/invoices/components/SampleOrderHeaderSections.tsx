"use client";

/**
 * Sample Order Proforma Invoice — Customer + Sample Order & Proforma Details.
 * Module-scoped: sourceType=sample_order only.
 */

import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { InvoiceFormInput } from "@/app/(app)/accounts/components/InvoiceFormLayout";
import { CustomerPartyInfoButton } from "./CustomerPartyInfo";

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function SampleOrderCustomerSection({
  customerName,
  customerCode,
  customerGst,
  billingAddress,
  shippingAddress,
  placeOfSupply,
  branch,
  customerType,
  salesperson,
}: {
  customerName: string;
  customerCode?: string;
  customerGst?: string;
  billingAddress?: string;
  shippingAddress?: string;
  placeOfSupply?: string;
  branch?: string;
  customerType?: string;
  salesperson?: string;
}) {
  return (
    <div className="so-goods-field-grid">
      <div className="so-goods-field so-w-customer">
        <p className="so-goods-field__label">Customer Name</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro-with-info">
            <span className="so-goods-ro-with-info__value">{customerName || "—"}</span>
            {customerName ? (
              <CustomerPartyInfoButton
                className="so-goods-info-btn"
                customerName={customerName}
                customerCode={customerCode}
                branch={branch}
                gstin={customerGst}
                billingAddress={billingAddress}
                shippingAddress={shippingAddress}
                placeOfSupply={placeOfSupply}
                customerType={customerType}
                salesperson={salesperson}
              />
            ) : null}
          </div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-gstin">
        <p className="so-goods-field__label">GSTIN</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono">{customerGst?.trim() || "—"}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
    </div>
  );
}

export function SampleOrderProformaDetailsSection({
  isEdit,
  invoiceNo,
  previewInvoiceNo,
  invoiceDate,
  onInvoiceDateChange,
  sampleOrderNo,
  dispatchNo,
  dispatchDate,
  warehouseRef,
  bankAccountId,
  onBankAccountChange,
  bankAccountHelper,
}: {
  isEdit: boolean;
  invoiceNo: string;
  previewInvoiceNo?: string;
  invoiceDate: string;
  onInvoiceDateChange: (v: string) => void;
  sampleOrderNo: string;
  dispatchNo: string;
  dispatchDate: string;
  warehouseRef: string;
  bankAccountId: number | null;
  onBankAccountChange: (id: number | null) => void;
  bankAccountHelper?: string;
}) {
  const displayInvoiceNo = isEdit
    ? invoiceNo
    : previewInvoiceNo?.trim() || "Auto-generated";

  return (
    <div className="so-goods-field-grid">
      <div className="so-goods-field so-w-inv-no">
        <p className="so-goods-field__label">Proforma Invoice No.</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono w-full">{displayInvoiceNo}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-date">
        <p className="so-goods-field__label">
          Invoice Date<span className="text-red-500 ml-0.5">*</span>
        </p>
        <div className="so-goods-field__control">
          <InvoiceFormInput
            type="date"
            className="h-8 w-full"
            value={invoiceDate}
            onChange={(e) => onInvoiceDateChange(e.target.value)}
            required
          />
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-so">
        <p className="so-goods-field__label">Sample Order No.</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono">{sampleOrderNo || "—"}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-dispatch">
        <p className="so-goods-field__label">Dispatch No.</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono w-full">{dispatchNo || "—"}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-date">
        <p className="so-goods-field__label">Dispatch Date</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro w-full">{formatDisplayDate(dispatchDate)}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-bank">
        <p className="so-goods-field__label">Bank Account</p>
        <div className="so-goods-field__control min-w-0 w-full">
          <WarehouseMappedBankAccountSelect
            warehouseRef={warehouseRef}
            value={bankAccountId}
            onChange={(id) => onBankAccountChange(id)}
            label=""
            required={false}
            hideHint
            className="so-bank-select-compact"
          />
        </div>
        <p className="so-goods-field__helper" title={bankAccountHelper || undefined}>
          {bankAccountHelper?.trim() || "\u00a0"}
        </p>
      </div>
    </div>
  );
}
