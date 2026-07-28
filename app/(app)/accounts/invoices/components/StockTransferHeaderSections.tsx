"use client";

/**
 * Stock Transfer Invoice — Warehouse Transfer + Invoice Details (compact).
 * Module-scoped: sourceType=stock_transfer only.
 */

import { WarehouseMappedBankAccountSelect } from "@/components/accounts/WarehouseMappedBankAccountSelect";
import { InvoiceFormInput } from "@/app/(app)/accounts/components/InvoiceFormLayout";

function formatDisplayDate(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}-${m}-${y}`;
}

export function StockTransferWarehouseDetailsSection({
  sourceWarehouse,
  destinationWarehouse,
  sourceGstin,
  destinationGstin,
  stockTransferNo,
  placeOfSupply,
}: {
  sourceWarehouse: string;
  destinationWarehouse: string;
  sourceGstin: string;
  destinationGstin: string;
  stockTransferNo: string;
  placeOfSupply: string;
}) {
  return (
    <div className="so-goods-field-grid">
      <div className="so-goods-field so-w-wh">
        <p className="so-goods-field__label">Source Warehouse</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro w-full truncate" title={sourceWarehouse}>
            {sourceWarehouse || "—"}
          </div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-wh">
        <p className="so-goods-field__label">Destination Warehouse</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro w-full truncate" title={destinationWarehouse}>
            {destinationWarehouse || "—"}
          </div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-gstin">
        <p className="so-goods-field__label">Source Warehouse GSTIN</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono">{sourceGstin?.trim() || "—"}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-gstin">
        <p className="so-goods-field__label">Destination Warehouse GSTIN</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono">{destinationGstin?.trim() || "—"}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-so">
        <p className="so-goods-field__label">Stock Transfer No.</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro so-goods-ro--mono">{stockTransferNo || "—"}</div>
        </div>
        <p className="so-goods-field__helper">&nbsp;</p>
      </div>
      <div className="so-goods-field so-w-pos">
        <p className="so-goods-field__label">Place of Supply</p>
        <div className="so-goods-field__control">
          <div className="so-goods-ro w-full">{placeOfSupply || "—"}</div>
        </div>
        <p className="so-goods-field__helper">Destination warehouse state</p>
      </div>
    </div>
  );
}

export function StockTransferInvoiceDetailsSection({
  isEdit,
  invoiceNo,
  previewInvoiceNo,
  invoiceDate,
  onInvoiceDateChange,
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
        <p className="so-goods-field__label">Invoice No.</p>
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
