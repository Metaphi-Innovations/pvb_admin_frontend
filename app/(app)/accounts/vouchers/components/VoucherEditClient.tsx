"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  canEditVoucher,
  getVoucherById,
  VOUCHER_TYPE_LABELS,
} from "../voucher-data";
import { voucherTypeToUrl } from "../voucher-routes";
import { ReceiptVoucherForm } from "./ReceiptVoucherForm";
import { PaymentVoucherForm } from "./PaymentVoucherForm";
import { ContraVoucherForm } from "./ContraVoucherForm";
import { VoucherEntryClient } from "./VoucherEntryClient";

interface VoucherEditClientProps {
  voucherId: number;
  onDone?: () => void;
}

export function VoucherEditClient({ voucherId, onDone }: VoucherEditClientProps) {
  const voucher = getVoucherById(voucherId);
  const listHref = voucher
    ? `/accounts/vouchers?tab=${voucherTypeToUrl(voucher.voucherType)}`
    : "/accounts/vouchers?tab=journal";
  const viewHref = `/accounts/vouchers/view/${voucherId}`;

  const handleDone = () => {
    if (onDone) onDone();
    else window.location.href = viewHref;
  };

  if (!voucher) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "Edit Voucher", listHref)}
        title="Voucher not found"
        description="The requested voucher could not be loaded."
        layout="standard"
      >
        <p className="text-sm text-muted-foreground">
          <Link href={listHref} className="text-brand-600 hover:underline">
            Back to vouchers
          </Link>
        </p>
      </AccountsPageShell>
    );
  }

  if (!canEditVoucher(voucher)) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "Edit Voucher", listHref)}
        title="Cannot edit voucher"
        description="This voucher is locked and cannot be modified."
        layout="standard"
      >
        <p className="text-sm text-muted-foreground mb-3">
          Cancelled vouchers cannot be edited.
        </p>
        <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
          <Link href={viewHref}>View Voucher</Link>
        </Button>
      </AccountsPageShell>
    );
  }

  const label = VOUCHER_TYPE_LABELS[voucher.voucherType];

  if (voucher.voucherType === "receipt") {
    return <ReceiptVoucherForm voucherId={voucherId} onDone={handleDone} />;
  }
  if (voucher.voucherType === "payment") {
    return <PaymentVoucherForm voucherId={voucherId} onDone={handleDone} />;
  }
  if (voucher.voucherType === "contra") {
    return <ContraVoucherForm voucherId={voucherId} onDone={handleDone} />;
  }

  return (
    <VoucherEntryClient
      voucherType={voucher.voucherType}
      voucherId={voucherId}
      onDone={handleDone}
      titleOverride={`Edit ${label}`}
    />
  );
}
