"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, BookOpen, ListOrdered, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { CoaMasterLink } from "@/lib/accounts/coa-master-link";
import { coaHrefForLedger } from "@/lib/accounts/coa-master-link";

interface CoaMasterLinkPanelProps {
  ledgerId: number;
  link: CoaMasterLink;
  onViewTransactions?: () => void;
  compact?: boolean;
}

export function CoaMasterLinkBadge({ link }: { link: CoaMasterLink }) {
  return (
    <Badge variant="secondary" className="text-xs font-medium gap-1">
      <Link2 className="w-3 h-3" />
      Master-linked · {link.categoryLabel}
    </Badge>
  );
}

export function CoaMasterLinkActions({
  ledgerId,
  link,
  onViewTransactions,
}: CoaMasterLinkPanelProps) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-sm font-medium gap-1"
        onClick={() => router.push(coaHrefForLedger(ledgerId))}
      >
        <BookOpen className="w-4 h-4" /> View Ledger
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-sm font-medium gap-1"
        onClick={() => (onViewTransactions ? onViewTransactions() : router.push(`${coaHrefForLedger(ledgerId)}`))}
      >
        <ListOrdered className="w-4 h-4" /> View Transactions
      </Button>
      <Button
        size="sm"
        className="h-9 text-sm font-medium gap-1 bg-brand-600 hover:bg-brand-700 text-white"
        onClick={() => router.push(link.masterHref)}
      >
        <ExternalLink className="w-4 h-4" /> Open Source Master
      </Button>
    </div>
  );
}

export function CoaMasterLinkPanel({ ledgerId, link, compact }: CoaMasterLinkPanelProps) {
  return (
    <div
      className={
        compact
          ? "rounded-lg border border-blue-200/60 bg-blue-50/40 px-4 py-3"
          : "rounded-xl border border-blue-200/60 bg-gradient-to-b from-blue-50/60 to-white px-5 py-4"
      }
    >
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800/80 mb-1">
            Source Master Link
          </p>
          <p className="text-sm font-medium text-foreground">{link.sourceName}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {link.categoryLabel}
            {link.sourceCode ? ` · ${link.sourceCode}` : ""}
          </p>
        </div>
        <CoaMasterLinkBadge link={link} />
      </div>
      <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
        Profile and operational details are maintained in the source master only. COA shows accounting
        balances and transactions for this ledger.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <Link
          href={link.masterHref}
          className="text-xs text-primary font-medium hover:underline inline-flex items-center gap-1"
        >
          Open {link.categoryLabel.split("/")[0].trim()} Master
          <ExternalLink className="w-3 h-3" />
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link href={link.masterListHref} className="text-xs text-muted-foreground hover:text-foreground">
          Browse all
        </Link>
        <span className="text-muted-foreground/40">·</span>
        <Link href={coaHrefForLedger(ledgerId)} className="text-xs text-muted-foreground hover:text-foreground">
          View in Chart of Accounts
        </Link>
      </div>
    </div>
  );
}
