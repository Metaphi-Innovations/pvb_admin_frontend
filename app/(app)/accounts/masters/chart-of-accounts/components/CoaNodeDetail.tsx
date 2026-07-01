"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { BookOpen, Pencil, Plus } from "lucide-react";
import { isMasterLinkedLedger } from "@/lib/accounts/coa-master-link";
import {
  isGroupingLedger,
  isPostableNode,
  isStructuralNode,
} from "@/lib/accounts/coa-hierarchy";
import {
  buildTdsPartyWiseReportHref,
  isTdsCoaNode,
} from "@/lib/accounts/tds-coa-utils";
import { CoaGroupDrillDownPanel } from "@/components/accounts/CoaGroupDrillDownPanel";
import { resolveCoaAddLedgerPolicy } from "@/lib/accounts/coa-add-ledger-policy";
import { resolveCoaGroupContext } from "@/lib/accounts/coa-group-drilldown";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  canDeleteLedger,
  canEditLedger,
  getChildLedgers,
} from "../chart-of-accounts-data";

interface CoaNodeDetailProps {
  node: ChartOfAccount | null;
  records: ChartOfAccount[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: (node: ChartOfAccount) => void;
  onAddLedger: (parentGroupId: number) => void;
  onEditLedger: (ledger: ChartOfAccount) => void;
  onDeleteLedger: (ledger: ChartOfAccount) => void;
}

export function CoaNodeDetail({
  node,
  records,
  canCreate,
  canEdit,
  canDelete,
  onSelect,
  onAddLedger,
  onEditLedger,
  onDeleteLedger,
}: CoaNodeDetailProps) {
  const groupContext = useMemo(
    () => (node ? resolveCoaGroupContext(node, records) : null),
    [node, records],
  );

  if (!node) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Select an account from the tree</p>
      </div>
    );
  }

  const isLedger = node.nodeLevel === "ledger";
  const isTds = isTdsCoaNode(node, records);
  const isGrouping = isLedger && isGroupingLedger(node, records);
  const isPosting = isLedger && isPostableNode(node, records) && !isTds;
  const isMasterOwned = isLedger && isMasterLinkedLedger(node, records);
  const addPolicy = resolveCoaAddLedgerPolicy(node, records);
  const allowAddHere = canCreate && canAddLedgerUnder(node, records) && !addPolicy.blocked;
  const hasGroupDashboard = !!groupContext && (isStructuralNode(node) || isGrouping);
  const canEditLedgerHere = isLedger && canEdit && !isMasterOwned && canEditLedger(node);
  const canDeleteLedgerHere = isLedger && canDelete && !isMasterOwned && canDeleteLedger(node);
  const showStructuralToolbar = !isPosting && (allowAddHere || addPolicy.blocked || isGrouping);

  const selectLedgerById = (ledgerId: number) => {
    const ledger = records.find((r) => r.id === ledgerId);
    if (ledger) onSelect(ledger);
  };

  if (isTds) {
    const reportHref = buildTdsPartyWiseReportHref(node, records);
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex-shrink-0 px-3 py-2 border-b border-border/30 bg-white/50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{node.accountName}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">TDS liability account</p>
            </div>
            <Button asChild size="sm" className="h-7 text-xs px-2 bg-brand-600 text-white gap-1">
              <Link href={reportHref}>View TDS Party-wise Report</Link>
            </Button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            TDS transaction details are available in the Party-wise Report. Chart of Accounts shows
            balances only.
          </p>
        </div>
      </div>
    );
  }

  if (isPosting) {
    return (
      <div className="flex flex-1 min-h-0 flex-col">
        <div className="flex-shrink-0 px-3 py-2 border-b border-border/30 bg-white/50">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-foreground truncate">{node.accountName}</h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">Posting ledger</p>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Button asChild size="sm" className="h-7 text-xs px-2 bg-brand-600 text-white gap-1">
                <Link href={`/accounts/reports/ledger?ledger=${node.id}`}>
                  <BookOpen className="w-3 h-3" /> View General Ledger
                </Link>
              </Button>
              {canEditLedgerHere && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 gap-1"
                  onClick={() => onEditLedger(node)}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <p className="text-xs text-muted-foreground text-center max-w-sm">
            This is a posting ledger. Open General Ledger to view transactions, or use Edit to
            update ledger settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {showStructuralToolbar && (
        <div className="flex-shrink-0 px-3 py-1.5 border-b border-border/30 bg-white/50">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground truncate min-w-0">
              {node.accountName}
            </h2>
            <div className="flex items-center gap-1.5 flex-shrink-0 ml-auto">
              {addPolicy.blocked &&
                addPolicy.alternatives.map((alt) => (
                  <Button
                    key={alt.href}
                    asChild
                    size="sm"
                    variant="outline"
                    className="h-7 text-xs px-2"
                  >
                    <Link href={alt.href}>{alt.label}</Link>
                  </Button>
                ))}
              {allowAddHere && (
                <Button
                  size="sm"
                  className="h-7 text-xs px-2 bg-brand-600 text-white gap-1"
                  onClick={() => onAddLedger(node.id)}
                >
                  <Plus className="w-3 h-3" /> Add Ledger
                </Button>
              )}
              {isGrouping && canEditLedgerHere && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs px-2 gap-1"
                  onClick={() => onEditLedger(node)}
                >
                  <Pencil className="w-3 h-3" /> Edit
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {hasGroupDashboard ? (
          <CoaGroupDrillDownPanel
            context={groupContext}
            onSelectLedger={onSelect}
            onSelectLedgerById={selectLedgerById}
          />
        ) : isGrouping ? (
          <div className="p-4 space-y-3">
            <p className="text-[11px] text-muted-foreground uppercase tracking-widest font-bold">
              Child Ledgers
            </p>
            {getChildLedgers(records, node.id).length === 0 ? (
              <p className="text-xs text-muted-foreground">No child ledgers yet.</p>
            ) : (
              <ul className="space-y-1">
                {getChildLedgers(records, node.id).map((child) => (
                  <li key={child.id}>
                    <button
                      type="button"
                      className="text-xs text-brand-700 hover:underline"
                      onClick={() => onSelect(child)}
                    >
                      {child.accountName}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}
      </div>
    </div>
  );
}
