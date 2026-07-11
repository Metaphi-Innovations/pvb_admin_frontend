"use client";

import { VoucherEntryClient } from "./components/VoucherEntryClient";
import { PaymentVoucherForm } from "./components/PaymentVoucherForm";
import { ReceiptVoucherForm } from "./components/ReceiptVoucherForm";
import { ContraVoucherForm } from "./components/ContraVoucherForm";
import type { VoucherTypeCode } from "../masters/masters-data";

interface VoucherNewEntryProps {
  activeTab: VoucherTypeCode;
  onDone: () => void;
}

/** Code-split entry forms — not loaded on voucher listing routes. */
export function VoucherNewEntry({ activeTab, onDone }: VoucherNewEntryProps) {
  if (activeTab === "journal") {
    return <VoucherEntryClient voucherType="journal" onDone={onDone} />;
  }
  if (activeTab === "payment") {
    return <PaymentVoucherForm onDone={onDone} />;
  }
  if (activeTab === "receipt") {
    return <ReceiptVoucherForm onDone={onDone} />;
  }
  if (activeTab === "contra") {
    return <ContraVoucherForm onDone={onDone} />;
  }
  return <VoucherEntryClient voucherType={activeTab} onDone={onDone} />;
}
