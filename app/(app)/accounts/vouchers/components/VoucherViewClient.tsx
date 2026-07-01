"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  canEditVoucher,
  getVoucherById,
  VOUCHER_TYPE_LABELS,
} from "../voucher-data";
import { voucherTypeToUrl } from "../voucher-routes";
import { VoucherEntryClient } from "./VoucherEntryClient";

interface VoucherViewClientProps {
  voucherId: number;
}

export function VoucherViewClient({ voucherId }: VoucherViewClientProps) {
  const router = useRouter();
  const voucher = getVoucherById(voucherId);
  const listHref = voucher
    ? `/accounts/vouchers?tab=${voucherTypeToUrl(voucher.voucherType)}`
    : "/accounts/vouchers?tab=journal";
  const editHref = `/accounts/vouchers/edit/${voucherId}`;

  if (!voucher) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb("Vouchers", "View Voucher", listHref)}
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

  const handleBack = () => router.push(listHref);
  const handleEdit = () => router.push(editHref);
  const editAction = canEditVoucher(voucher) ? handleEdit : undefined;

  if (voucher.voucherType === "receipt") {
    return (
      <VoucherEntryClient
        voucherType="receipt"
        voucherId={voucherId}
        readOnly
        titleOverride={`View ${VOUCHER_TYPE_LABELS.receipt}`}
        cancelHref={listHref}
        onDone={handleBack}
        onEdit={editAction}
      />
    );
  }

  if (voucher.voucherType === "payment") {
    return (
      <VoucherEntryClient
        voucherType="payment"
        voucherId={voucherId}
        readOnly
        titleOverride={`View ${VOUCHER_TYPE_LABELS.payment}`}
        cancelHref={listHref}
        onDone={handleBack}
        onEdit={editAction}
      />
    );
  }

  const label = VOUCHER_TYPE_LABELS[voucher.voucherType];

  return (
    <VoucherEntryClient
      voucherType={voucher.voucherType}
      voucherId={voucherId}
      readOnly
      titleOverride={`View ${label}`}
      cancelHref={listHref}
      onDone={handleBack}
      onEdit={editAction}
    />
  );
}
