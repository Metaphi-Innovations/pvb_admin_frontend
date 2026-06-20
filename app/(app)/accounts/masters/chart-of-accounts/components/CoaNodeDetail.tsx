"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Pencil, Plus, Settings2, Trash2 } from "lucide-react";
import { resolveCoaMasterLink, isMasterLinkedLedger } from "@/lib/accounts/coa-master-link";
import { CoaGroupDrillDownPanel } from "@/components/accounts/CoaGroupDrillDownPanel";
import { resolveCoaAddLedgerPolicy } from "@/lib/accounts/coa-add-ledger-policy";
import { CoaLedgerDetailPanel } from "@/components/accounts/CoaLedgerDetailPanel";
import { resolveCoaGroupContext } from "@/lib/accounts/coa-group-drilldown";
import { VISUAL_ICON, VISUAL_ICON_CLASS, resolveCoaVisualLevel } from "./coa-tree-visual";
import { CoaLevelBadge } from "./CoaLevelBadge";
import type { ChartOfAccount } from "../../../data";
import {
  canAddLedgerUnder,
  canDeleteLedger,
  canDeleteSubLedger,
  canEditLedger,
  canEditSubLedger,
  getAncestorPath,
  isStructuralNode,
} from "../chart-of-accounts-data";

interface CoaNodeDetailProps {
  node: ChartOfAccount | null;
  records: ChartOfAccount[];
  canCreate: boolean;
  canEdit: boolean;
  canDelete: boolean;
  onSelect: (node: ChartOfAccount) => void;
  onAddLedger: (parentGroupId: number) => void;
  onAddSubLedger: (parentLedgerId: number) => void;
  onEditLedger: (ledger: ChartOfAccount) => void;
  onDeleteLedger: (ledger: ChartOfAccount) => void;
}

function BreadcrumbPath({
  path,
  onSelect,
}: {
  path: ChartOfAccount[];
  onSelect: (node: ChartOfAccount) => void;
}) {
  if (path.length === 0) return null;

  return (
    <nav className="flex items-center flex-wrap gap-x-1.5 gap-y-1 text-xs text-muted-foreground">
      {path.map((p, i) => (
        <React.Fragment key={p.id}>
          {i > 0 && <span className="text-muted-foreground/40 select-none">&gt;</span>}
          <button
            type="button"
            onClick={() => onSelect(p)}
            className={
              i === path.length - 1
                ? "font-medium text-foreground"
                : "hover:text-orange-700 transition-colors"
            }
          >
            {p.accountName}
          </button>
        </React.Fragment>
      ))}
    </nav>
  );
}

function MetaField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-0.5">{label}</p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
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
  const [showAdminConfig, setShowAdminConfig] = useState(false);

  const groupContext = useMemo(
    () => (node ? resolveCoaGroupContext(node, records) : null),
    [node, records],
  );

  useEffect(() => {
    setShowAdminConfig(false);
  }, [node?.id]);

  if (!node) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted-foreground">Select an account from the tree</p>
      </div>
    );
  }

  const path = getAncestorPath(records, node.id);
  const isLedger = node.nodeLevel === "ledger";
  const isSubLedger = node.nodeLevel === "sub_ledger";
  const isUserAccount = isLedger || isSubLedger;
  const addPolicy = resolveCoaAddLedgerPolicy(node, records);
  const allowAddHere = canCreate && canAddLedgerUnder(node, records) && !addPolicy.blocked;
  const masterLink = isUserAccount ? resolveCoaMasterLink(node, records) : null;
  const isMasterOwned = isUserAccount && isMasterLinkedLedger(node, records);
  const visualLevel = resolveCoaVisualLevel(node, records);
  const primaryHead = path.find((p) => p.nodeLevel === "primary_head");
  const parentNode = path.length > 1 ? path[path.length - 2] : null;
  const hasGroupDashboard = !!groupContext && !isUserAccount;
  const hasLedgerContext =
    !!groupContext &&
    isUserAccount &&
    (groupContext.kind === "customer_ledger" || groupContext.kind === "vendor_ledger");

  const selectLedgerById = (ledgerId: number) => {
    const ledger = records.find((r) => r.id === ledgerId);
    if (ledger) onSelect(ledger);
  };

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Compact Header - Only account name and essential actions */}
      <div className="flex-shrink-0 px-3 py-2 border-b border-border/30 bg-white/50">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold text-foreground truncate">{node.accountName}</h2>
          </div>
          <div className="flex items-center gap-1.5 flex-shrink-0">
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
            {canEdit && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2"
                onClick={() => setShowAdminConfig((v) => !v)}
              >
                <Settings2 className="w-3 h-3" />
              </Button>
            )}
            {isUserAccount && canEdit && !isMasterOwned && (isSubLedger ? canEditSubLedger(node) : canEditLedger(node)) && (
              <Button variant="ghost" size="sm" className="h-7 text-xs px-2" onClick={() => onEditLedger(node)}>
                <Pencil className="w-3 h-3" />
              </Button>
            )}
            {isUserAccount && canDelete && !isMasterOwned && (isSubLedger ? canDeleteSubLedger(node) : canDeleteLedger(node)) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs px-2 text-red-600"
                onClick={() => onDeleteLedger(node)}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area - Full height for data */}
      <div className="flex-1 min-h-0 overflow-auto">
        {hasGroupDashboard ? (
          <CoaGroupDrillDownPanel
            context={groupContext}
            onSelectLedger={onSelect}
            onSelectLedgerById={selectLedgerById}
          />
        ) : isUserAccount ? (
          <CoaLedgerDetailPanel
            ledger={node}
            records={records}
            masterLink={masterLink}
            topSlot={
              hasLedgerContext ? (
                <CoaGroupDrillDownPanel
                  context={groupContext}
                  onSelectLedger={onSelect}
                  onSelectLedgerById={selectLedgerById}
                />
              ) : undefined
            }
          />
        ) : null}
      </div>

      {/* Admin Config - Hidden by default */}
      {showAdminConfig && (
        <div className="flex-shrink-0 border-t border-border/30 px-3 py-2 bg-slate-50/50 text-xs space-y-2">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <MetaField label="Node Type" value={<CoaLevelBadge level={visualLevel} />} />
            <MetaField label="Parent" value={parentNode ? parentNode.accountName : "—"} />
            <MetaField label="Primary Head" value={primaryHead?.accountName ?? "—"} />
            <MetaField label="Code" value={node.accountCode} />
          </div>
          {isUserAccount && (
            <p className="text-muted-foreground">
              Mapping: {node.usedIn?.length ? node.usedIn.join(", ") : "Journal, Payment, Receipt (default)"}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
