"use client";

import { type ReactNode } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { StatusBadge } from "@/app/(app)/accounts/components/AccountsUI";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { formatMoney } from "@/lib/accounts/money-format";
import { useFY } from "@/lib/fy-store";
import { usePermissionsOptional } from "@/lib/auth";
import { useBankAccountByLedgerId } from "@/hooks/accounts/use-bank-accounts";
import {
  ACCOUNT_TYPE_OPTIONS,
  extractBankAccountErrorMessage,
  type BankAccountApiAccountType,
  type BankAccountDetail,
} from "@/services/bank-accounts-list.service";
import { isActiveStatus } from "@/components/listing";
import { BankAccountToggle } from "@/app/(app)/accounts/banking/bank-accounts/components/BankAccountToggle";
import { formatDisplayDateTime } from "@/lib/accounts/date-display";
import { cn } from "@/lib/utils";

function accountTypeLabel(raw: BankAccountApiAccountType | ""): string {
  if (!raw) return "—";
  return ACCOUNT_TYPE_OPTIONS.find((o) => o.value === raw)?.label ?? raw;
}

function formatAuditUser(user: BankAccountDetail["createdBy"]): string {
  if (!user) return "—";
  return user.username || user.user_id || "—";
}

function formatDateTime(value: string): string {
  return formatDisplayDateTime(value);
}

function SectionBlock({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-1.5 border-b border-border bg-muted/30">
        <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
          {title}
        </p>
      </div>
      <div className="px-3 divide-y divide-border/60">{children}</div>
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-1.5 min-w-0">
      <span className="text-[11px] text-muted-foreground flex-shrink-0 pt-0.5">
        {label}
      </span>
      <div
        className={cn(
          "text-xs font-medium text-foreground text-right break-words min-w-0",
          mono && "font-mono font-semibold text-brand-700",
        )}
      >
        {value || "—"}
      </div>
    </div>
  );
}

function KpiChip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-lg border border-border bg-white px-2.5 py-1.5 shadow-sm min-w-0">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <div className="mt-0.5">{children}</div>
    </div>
  );
}

export default function BankAccountDetailClient({ ledgerId }: { ledgerId: string }) {
  const router = useRouter();
  const { selectedFY } = useFY();
  const permissions = usePermissionsOptional();

  const canUpdate =
    !permissions || permissions.isLoading
      ? true
      : permissions.canEdit("accounts", "bank_account");

  const detailQuery = useBankAccountByLedgerId(ledgerId, {
    financialYearId: selectedFY?.id ?? null,
  });

  const account = detailQuery.data;
  const loading = detailQuery.isLoading;
  const error = detailQuery.isError
    ? extractBankAccountErrorMessage(
        detailQuery.error,
        "Unable to load bank account details.",
      )
    : null;

  if (loading) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(
          "Banking",
          "Bank Accounts",
          "/accounts/banking/bank-accounts",
        )}
        title="Bank Account"
        description="Loading…"
        layout="split"
      >
        <div className="p-4 text-xs text-muted-foreground">Loading bank account…</div>
      </AccountsPageShell>
    );
  }

  if (error || !account) {
    return (
      <AccountsPageShell
        breadcrumbs={accountsBreadcrumb(
          "Banking",
          "Bank Accounts",
          "/accounts/banking/bank-accounts",
        )}
        title="Account not found"
        description="This bank account could not be loaded."
        layout="split"
      >
        <div className="p-6 text-center space-y-2">
          <p className="text-xs text-red-600">{error || "Bank account not found."}</p>
          <Link
            href="/accounts/banking/bank-accounts"
            className="text-xs text-brand-600 hover:underline"
          >
            Back to Bank Accounts
          </Link>
        </div>
      </AccountsPageShell>
    );
  }

  const openingAmount = Number(account.openingBalance) || 0;
  const openingSide =
    account.openingBalanceType === "CREDIT" ? ("Credit" as const) : ("Debit" as const);
  const editHref =
    account.bankDetailsStatus === "PENDING"
      ? `/accounts/banking/bank-accounts/${account.ledgerId}/complete`
      : `/accounts/banking/bank-accounts/${account.ledgerId}/edit`;

  const warehouseLabel =
    account.warehouses.length === 0
      ? "—"
      : account.warehouses.map((w) => w.name).filter(Boolean).join(", ");

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb(
        "Banking",
        "Bank Accounts",
        "/accounts/banking/bank-accounts",
      )}
      title={account.ledgerName || "Bank Account"}
      description={
        [account.ledgerCode, account.bankName || null].filter(Boolean).join(" · ") ||
        "Bank account details"
      }
      actions={
        <div className="flex items-center gap-2">
          {canUpdate && account.editable !== false ? (
            <Button
              size="sm"
              variant="outline"
              className="h-8 text-xs"
              onClick={() => router.push(editHref)}
            >
              {account.bankDetailsStatus === "PENDING" ? "Complete details" : "Edit"}
            </Button>
          ) : null}
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs"
            onClick={() => router.push("/accounts/banking/bank-accounts")}
          >
            Back to list
          </Button>
        </div>
      }
      layout="split"
    >
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-shrink-0 grid grid-cols-2 lg:grid-cols-4 gap-2 px-3 py-2 border-b border-border bg-muted/20">
          <KpiChip label="Opening Balance">
            <MoneyAmount
              amount={openingAmount}
              side={openingSide}
              className="text-xs font-semibold"
            />
          </KpiChip>
          <KpiChip label="Current Balance">
            <p className="text-xs font-semibold text-muted-foreground">—</p>
          </KpiChip>
          <KpiChip label="Details">
            <StatusBadge
              status={account.bankDetailsStatus === "PENDING" ? "pending" : "completed"}
            />
          </KpiChip>
          <KpiChip label="Status">
            <div className="pt-0.5">
              <BankAccountToggle
                checked={isActiveStatus(account.status)}
                disabled
                onCheckedChange={() => undefined}
              />
            </div>
          </KpiChip>
        </div>

        <div className="flex-1 overflow-auto min-h-0 bg-muted/15">
          <div className="p-3 grid grid-cols-1 lg:grid-cols-2 gap-3">
            <SectionBlock title="Ledger (COA)">
              <InfoRow label="Ledger Name" value={account.ledgerName} />
              <InfoRow label="Ledger Code" value={account.ledgerCode} mono />
              <InfoRow label="Alias" value={account.alias || "—"} />
              <InfoRow label="Description" value={account.description || "—"} />
              <InfoRow
                label="Status"
                value={
                  <StatusBadge
                    status={account.status === "ACTIVE" ? "active" : "inactive"}
                  />
                }
              />
              <InfoRow label="Parent Path" value={account.parentPath || "—"} />
            </SectionBlock>

            <SectionBlock title="Bank Information">
              <InfoRow label="Bank Name" value={account.bankName || "—"} />
              <InfoRow
                label="Account Holder"
                value={account.accountHolderName || "—"}
              />
              <InfoRow
                label="Account Number"
                value={account.accountNumber || "—"}
                mono
              />
              <InfoRow label="IFSC Code" value={account.ifscCode || "—"} mono />
              <InfoRow label="Branch Name" value={account.branchName || "—"} />
              <InfoRow
                label="Account Type"
                value={accountTypeLabel(account.accountType)}
              />
            </SectionBlock>

            <SectionBlock title="Accounting & Defaults">
              <InfoRow
                label="Opening Balance"
                value={`${formatMoney(openingAmount)} (${openingSide})`}
              />
              <InfoRow
                label="Current Balance"
                value={
                  account.currentBalance != null && account.currentBalance !== ""
                    ? `${formatMoney(Number(account.currentBalance) || 0)} (${
                        account.currentBalanceType === "CREDIT" ? "Credit" : "Debit"
                      })`
                    : "—"
                }
              />
              <InfoRow
                label="Reconciliation"
                value={account.reconciliationEnabled ? "Enabled" : "Disabled"}
              />
              <InfoRow
                label="Default for Receipts"
                value={account.defaultForReceipts ? "Yes" : "No"}
              />
              <InfoRow
                label="Default for Payments"
                value={account.defaultForPayments ? "Yes" : "No"}
              />
              <InfoRow label="Mapped Warehouses" value={warehouseLabel} />
            </SectionBlock>

            <SectionBlock title="Audit">
              <InfoRow label="Created By" value={formatAuditUser(account.createdBy)} />
              <InfoRow label="Created At" value={formatDateTime(account.createdAt)} />
              <InfoRow label="Updated By" value={formatAuditUser(account.updatedBy)} />
              <InfoRow label="Updated At" value={formatDateTime(account.updatedAt)} />
            </SectionBlock>
          </div>
        </div>
      </div>
    </AccountsPageShell>
  );
}
