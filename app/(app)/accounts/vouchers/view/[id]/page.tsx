"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  RecordDetailPage,
  RecordSectionCard,
  OVERVIEW_TAB,
} from "@/components/record-detail";
import { FileText, IndianRupee } from "lucide-react";
import { MoneyAmount } from "@/components/accounts/MoneyAmount";
import { StatusBadge } from "../../../components/AccountsUI";
import { getVoucherById, VOUCHER_TYPE_LABELS, type AccountingVoucher, type VoucherLine } from "../../voucher-data";
import { voucherTypeToUrl } from "../../voucher-routes";

function statusVariant(status: string): "active" | "inactive" | "draft" | "blocked" | "neutral" {
  if (status === "posted" || status === "approved") return "active";
  if (status === "draft") return "draft";
  if (status === "cancelled") return "blocked";
  return "neutral";
}

export default function VoucherViewPageClient() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [voucher, setVoucher] = useState<AccountingVoucher | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setVoucher(getVoucherById(Number(id)) ?? null);
  }, [id]);

  if (!voucher) {
    return (
      <RecordDetailPage
        listHref="/accounts/vouchers?tab=journal"
        listLabel="Vouchers"
        recordName="Voucher not found"
        statusLabel="—"
        statusVariant="neutral"
        tabs={[OVERVIEW_TAB]}
        activeTab="overview"
        onTabChange={() => {}}
        sidebar={{}}
      >
        <p className="text-sm text-muted-foreground text-center py-8">
          <Link href="/accounts/vouchers?tab=journal" className="text-brand-600 hover:underline">
            Back to vouchers
          </Link>
        </p>
      </RecordDetailPage>
    );
  }

  const typeLabel = VOUCHER_TYPE_LABELS[voucher.voucherType];
  const listHref = `/accounts/vouchers?tab=${voucherTypeToUrl(voucher.voucherType)}`;

  return (
    <RecordDetailPage
      listHref={listHref}
      listLabel="Vouchers"
      recordName={typeLabel}
      recordCode={voucher.voucherNumber}
      statusLabel={voucher.status.charAt(0).toUpperCase() + voucher.status.slice(1)}
      statusVariant={statusVariant(voucher.status)}
      metaItems={[
        { label: voucher.date, icon: FileText },
        { label: voucher.financialYearName || "—", icon: IndianRupee },
      ]}
      kpis={[
        {
          icon: IndianRupee,
          iconBg: "#FFF4E6",
          iconColor: "#D96A10",
          value: `₹${voucher.totalDebit.toLocaleString("en-IN")}`,
          label: "Total Debit",
        },
        {
          icon: IndianRupee,
          iconBg: "#E6F7EF",
          iconColor: "#1E9E61",
          value: `₹${voucher.totalCredit.toLocaleString("en-IN")}`,
          label: "Total Credit",
        },
        {
          icon: FileText,
          iconBg: "#E8F4FD",
          iconColor: "#1554B4",
          value: String(voucher.lines.length),
          label: "Lines",
        },
      ]}
      tabs={[OVERVIEW_TAB, { value: "lines", label: "Line Items", count: voucher.lines.length }]}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      sidebar={{
        summary: [
          { label: "Reference", value: voucher.referenceNo || "—", highlight: true },
          { label: "Financial Year", value: voucher.financialYearName || "—" },
          { label: "Created By", value: voucher.createdBy },
        ],
        approval: [
          {
            label: "Posting Status",
            value: voucher.status,
            tone:
              voucher.status === "posted" || voucher.status === "approved"
                ? "approved"
                : voucher.status === "draft"
                  ? "pending"
                  : "neutral",
          },
        ],
      }}
    >
      {activeTab === "overview" ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecordSectionCard title="Voucher Details" icon={FileText} accent="blue">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                <span className="text-muted-foreground">Voucher No.</span>
                <span className="font-mono font-semibold text-brand-700">{voucher.voucherNumber}</span>
              </div>
              <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                <span className="text-muted-foreground">Date</span>
                <span className="font-medium">{voucher.date}</span>
              </div>
              <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                <span className="text-muted-foreground">Type</span>
                <span className="font-medium">{typeLabel}</span>
              </div>
              <div className="flex justify-between gap-4 py-2 border-b border-border/50">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-medium">{voucher.referenceNo || "—"}</span>
              </div>
              <div className="flex justify-between gap-4 py-2">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge status={voucher.status} />
              </div>
            </div>
          </RecordSectionCard>
          <RecordSectionCard title="Narration" icon={FileText} accent="orange">
            <p className="text-sm text-foreground leading-relaxed py-2">
              {voucher.narration || "—"}
            </p>
          </RecordSectionCard>
        </div>
      ) : (
        <RecordSectionCard title="Voucher Lines" icon={IndianRupee} accent="green">
          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[640px]">
              <thead>
                <tr className="border-b border-border bg-muted/20">
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Ledger</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Debit</th>
                  <th className="text-right px-3 py-2 font-semibold text-muted-foreground">Credit</th>
                  <th className="text-left px-3 py-2 font-semibold text-muted-foreground">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {voucher.lines.map((line: VoucherLine) => (
                  <tr key={line.id} className="border-b border-border/40">
                    <td className="px-3 py-2 font-medium">{line.ledgerName}</td>
                    <td className="px-3 py-2 text-right">
                      <MoneyAmount amount={line.debit} />
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyAmount amount={line.credit} />
                    </td>
                    <td className="px-3 py-2 text-muted-foreground">{line.remarks || "—"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-muted/10 font-semibold">
                  <td className="px-3 py-2 text-right">Total</td>
                  <td className="px-3 py-2 text-right">
                    <MoneyAmount amount={voucher.totalDebit} />
                  </td>
                  <td className="px-3 py-2 text-right">
                    <MoneyAmount amount={voucher.totalCredit} />
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        </RecordSectionCard>
      )}
    </RecordDetailPage>
  );
}
