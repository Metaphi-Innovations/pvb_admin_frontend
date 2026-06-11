"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { Lock, Pencil, Plus, Trash2 } from "lucide-react";
import { CoaLevelBadge } from "./CoaLevelBadge";
import { VISUAL_ICON, VISUAL_ICON_CLASS, resolveCoaVisualLevel } from "./coa-tree-visual";
import { MoneyAmount, MoneyCell } from "@/components/accounts/MoneyAmount";
import { StatusBadge } from "../../../components/AccountsUI";
import type { ChartOfAccount } from "../../../data";
import { loadVouchers } from "../../../vouchers/voucher-data";
import {
  NODE_LEVEL_LABELS,
  canAddLedgerUnder,
  canDeleteLedger,
  canEditLedger,
  getAncestorPath,
  getChildGroups,
  getChildLedgers,
  isStructuralNode,
  parentGroupLabel,
} from "../chart-of-accounts-data";
import { computeLedgerCurrentBalance } from "../../ledgers/ledgers-utils";

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
    <div className="rounded-lg border border-border/40 bg-slate-50/40 px-3 py-2.5">
      <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
        {label}
      </p>
      <div className="text-sm text-foreground">{value}</div>
    </div>
  );
}

function EmptyState({
  message,
  action,
}: {
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-14 px-6 text-center">
      <p className="text-sm text-muted-foreground max-w-sm">{message}</p>
      {action && <div className="mt-4">{action}</div>}
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
  const [structTab, setStructTab] = useState("groups");
  const [ledgerTab, setLedgerTab] = useState("overview");

  useEffect(() => {
    setStructTab("groups");
    setLedgerTab("overview");
  }, [node?.id]);

  const ledgerTransactions = useMemo(() => {
    if (!node || node.nodeLevel !== "ledger") return [];
    const rows: {
      date: string;
      voucher: string;
      type: string;
      debit: number;
      credit: number;
    }[] = [];
    loadVouchers()
      .filter((v) => v.status === "posted" || v.status === "approved" || v.status === "draft")
      .forEach((v) => {
        v.lines.forEach((line) => {
          if (line.ledgerId === node.id) {
            rows.push({
              date: v.date,
              voucher: v.voucherNumber,
              type: v.voucherType,
              debit: line.debit,
              credit: line.credit,
            });
          }
        });
      });
    return rows.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 25);
  }, [node]);

  if (!node) {
    return (
      <div className="flex flex-1 items-center justify-center p-8 min-h-[400px]">
        <div className="rounded-xl border border-border/50 bg-white shadow-sm px-10 py-12 text-center max-w-md">
          <p className="text-base font-medium text-foreground">Select an account</p>
          <p className="text-sm text-muted-foreground mt-2">
            Choose a head, group, sub-group or ledger from the sidebar to view details.
          </p>
        </div>
      </div>
    );
  }

  const path = getAncestorPath(records, node.id);
  const childGroups = isStructuralNode(node) ? getChildGroups(records, node.id) : [];
  const childLedgers = isStructuralNode(node) ? getChildLedgers(records, node.id) : [];
  const isLedger = node.nodeLevel === "ledger";
  const allowAddHere = canCreate && canAddLedgerUnder(node, records);
  const visualLevel = resolveCoaVisualLevel(node, records);
  const Icon = VISUAL_ICON[visualLevel];
  const primaryHead = path.find((p) => p.nodeLevel === "primary_head");
  const parentNode = path.length > 1 ? path[path.length - 2] : null;

  return (
    <div className="flex flex-col flex-1 min-h-0 p-1">
      <div className="flex flex-col flex-1 min-h-0 rounded-xl border border-border/50 bg-white shadow-sm overflow-hidden">
        {/* Header card */}
        <div className="flex-shrink-0 px-6 py-5 border-b border-border/40 bg-gradient-to-b from-slate-50/80 to-white">
          <BreadcrumbPath path={path} onSelect={onSelect} />
          <div className="flex items-start justify-between gap-4 mt-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-2">
                <Icon className={cn("w-5 h-5 flex-shrink-0", VISUAL_ICON_CLASS[visualLevel])} />
                <h2 className="text-xl font-semibold text-foreground whitespace-normal break-words leading-snug">
                  {node.accountName}
                </h2>
                {node.isSystem && isStructuralNode(node) && (
                  <span className="inline-flex items-center gap-1 text-[10px] text-amber-800 bg-amber-50 border border-amber-200/60 rounded-md px-2 py-0.5 font-medium">
                    <Lock className="w-3 h-3" /> System
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground mt-2">
                Code: <span className="text-foreground font-medium">{node.accountCode}</span>
                {node.alias && (
                  <>
                    <span className="mx-2 text-border">|</span>
                    Alias: <span className="text-foreground">{node.alias}</span>
                  </>
                )}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {allowAddHere && (
                <Button
                  size="sm"
                  className="h-8 text-xs bg-brand-600 text-white gap-1"
                  onClick={() => onAddLedger(node.id)}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Ledger
                </Button>
              )}
              {isLedger && canEdit && canEditLedger(node) && (
                <Button variant="outline" size="sm" className="h-8 text-xs gap-1" onClick={() => onEditLedger(node)}>
                  <Pencil className="w-3.5 h-3.5" /> Edit
                </Button>
              )}
              {isLedger && canDelete && canDeleteLedger(node) && (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 text-xs gap-1 text-red-600 border-red-200"
                  onClick={() => onDeleteLedger(node)}
                >
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </Button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 max-w-4xl">
            <MetaField
              label="Node Type"
              value={<CoaLevelBadge level={visualLevel} />}
            />
            <MetaField
              label="Parent"
              value={parentNode ? parentNode.accountName : "—"}
            />
            <MetaField
              label="Primary Head"
              value={primaryHead?.accountName ?? "—"}
            />
            <MetaField
              label="Ledger Allowed"
              value={
                isLedger ? (
                  "—"
                ) : allowAddHere ? (
                  <span className="text-emerald-700 font-medium">Yes</span>
                ) : (
                  <span className="text-muted-foreground">No</span>
                )
              }
            />
          </div>
        </div>

        {/* Body */}
        {isLedger ? (
          <Tabs value={ledgerTab} onValueChange={setLedgerTab} className="flex flex-col flex-1 min-h-0">
            <div className="flex-shrink-0 px-6 border-b border-border/40 bg-white">
              <TabsList className="bg-transparent p-0 h-auto border-0 gap-4">
                <TabsTrigger value="overview" className="text-sm data-[state=active]:text-orange-700">
                  Overview
                </TabsTrigger>
                <TabsTrigger value="transactions" className="text-sm data-[state=active]:text-orange-700">
                  Transactions
                </TabsTrigger>
                <TabsTrigger value="mapping" className="text-sm data-[state=active]:text-orange-700">
                  Mapping
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="overview" className="flex-1 overflow-auto m-0 px-6 py-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl">
                {[
                  { label: "Parent Group", value: node.parentAccountId ? parentGroupLabel(records, node.parentAccountId) : "—" },
                  { label: "GST Applicable", value: node.gstApplicable ? "Yes" : "No" },
                  { label: "TDS Applicable", value: node.tdsApplicable ? "Yes" : "No" },
                  { label: "Status", value: <StatusBadge status={node.status} /> },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/40 bg-slate-50/40 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <div className="text-sm text-foreground">{item.value}</div>
                  </div>
                ))}
                <div className="rounded-lg border border-border/40 bg-slate-50/40 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Opening Balance
                  </p>
                  <MoneyAmount amount={node.openingBalance} side={node.balanceType} />
                </div>
                <div className="rounded-lg border border-border/40 bg-slate-50/40 px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                    Current Balance
                  </p>
                  {(() => {
                    const bal = computeLedgerCurrentBalance(node);
                    return <MoneyAmount amount={bal.amount} side={bal.balanceType} />;
                  })()}
                </div>
              </div>
            </TabsContent>
            <TabsContent value="transactions" className="flex-1 overflow-auto m-0">
              {ledgerTransactions.length === 0 ? (
                <EmptyState message="No voucher entries for this ledger yet." />
              ) : (
                <table className="w-full text-sm">
                  <thead className="bg-slate-50/80 border-b border-border/40 sticky top-0">
                    <tr>
                      <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Date</th>
                      <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Voucher</th>
                      <th className="px-6 py-2.5 text-left text-[11px] font-semibold uppercase text-muted-foreground">Type</th>
                      <th className="px-6 py-2.5 text-right text-[11px] font-semibold uppercase text-muted-foreground">Debit</th>
                      <th className="px-6 py-2.5 text-right text-[11px] font-semibold uppercase text-muted-foreground">Credit</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ledgerTransactions.map((row, i) => (
                      <tr key={i} className="border-b border-border/30 hover:bg-orange-50/20">
                        <td className="px-6 py-2.5 text-xs">{row.date}</td>
                        <td className="px-6 py-2.5 text-xs">{row.voucher}</td>
                        <td className="px-6 py-2.5 text-xs capitalize">{row.type}</td>
                        <MoneyCell amount={row.debit} dashIfZero className="px-6 py-2.5" />
                        <MoneyCell amount={row.credit} dashIfZero className="px-6 py-2.5" />
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </TabsContent>
            <TabsContent value="mapping" className="flex-1 overflow-auto m-0 px-6 py-5">
              <div className="grid grid-cols-1 gap-4 max-w-2xl">
                {[
                  {
                    label: "Voucher Mapping",
                    value: node.usedIn?.length ? node.usedIn.join(", ") : "Journal, Payment, Receipt (default)",
                  },
                  {
                    label: "Reporting Classification",
                    value: `${NODE_LEVEL_LABELS[node.nodeLevel]} under ${path[0]?.accountName ?? "—"}`,
                  },
                  {
                    label: "GST / TDS",
                    value: `GST: ${node.gstApplicable ? "Applicable" : "Not applicable"} · TDS: ${node.tdsApplicable ? "Applicable" : "Not applicable"}`,
                  },
                ].map((item) => (
                  <div key={item.label} className="rounded-lg border border-border/40 bg-slate-50/40 px-4 py-3">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground mb-1">
                      {item.label}
                    </p>
                    <p className="text-sm text-foreground">{item.value}</p>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <Tabs value={structTab} onValueChange={setStructTab} className="flex flex-col flex-1 min-h-0">
            <div className="flex-shrink-0 px-6 pt-3 border-b border-border/40 flex items-center justify-between bg-white">
              <TabsList className="bg-transparent p-0 h-auto border-0 gap-4">
                <TabsTrigger value="groups" className="text-sm data-[state=active]:text-orange-700">
                  Child Groups ({childGroups.length})
                </TabsTrigger>
                <TabsTrigger value="ledgers" className="text-sm data-[state=active]:text-orange-700">
                  Ledgers ({childLedgers.length})
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="groups" className="flex-1 overflow-auto m-0">
              {childGroups.length === 0 ? (
                <EmptyState message="No child groups under this account." />
              ) : (
                <div className="divide-y divide-border/30">
                  {childGroups.map((g) => (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => onSelect(g)}
                      className="w-full flex items-center justify-between gap-4 px-6 py-3.5 text-left hover:bg-orange-50/30 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-foreground whitespace-normal break-words">
                          {g.accountName}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{g.accountCode}</p>
                      </div>
                      <span className="text-xs text-orange-700 font-medium flex-shrink-0">View</span>
                    </button>
                  ))}
                </div>
              )}
            </TabsContent>
            <TabsContent value="ledgers" className="flex-1 overflow-auto m-0">
              {childLedgers.length === 0 ? (
                <EmptyState
                  message="No ledgers created under this group yet."
                  action={
                    allowAddHere ? (
                      <Button
                        size="sm"
                        className="h-8 text-xs bg-brand-600 text-white gap-1"
                        onClick={() => onAddLedger(node.id)}
                      >
                        <Plus className="w-3.5 h-3.5" /> Add Ledger
                      </Button>
                    ) : undefined
                  }
                />
              ) : (
                <div className="divide-y divide-border/30">
                  {childLedgers.map((l) => {
                    const bal = computeLedgerCurrentBalance(l);
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => onSelect(l)}
                        className="w-full flex items-center justify-between gap-4 px-6 py-3.5 text-left hover:bg-orange-50/30 transition-colors"
                      >
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-foreground whitespace-normal break-words">
                            {l.accountName}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">{l.accountCode}</p>
                        </div>
                        <div className="flex items-center gap-4 flex-shrink-0">
                          <MoneyAmount amount={bal.amount} side={bal.balanceType} className="text-[13px]" />
                          <StatusBadge status={l.status} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}

        {node.isSystem && isStructuralNode(node) && (
          <p className="flex-shrink-0 px-6 py-3 text-xs text-muted-foreground border-t border-border/40 bg-slate-50/50">
            System-defined — cannot be renamed, moved or deleted.
          </p>
        )}
      </div>
    </div>
  );
}
