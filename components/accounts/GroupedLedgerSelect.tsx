"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Plus } from "lucide-react";
import { getBankAccountByLedgerId } from "@/lib/accounts/bank-accounts-data";
import { formatBankAccountMaster } from "@/lib/accounts/bank-account-display";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { hierarchyBreadcrumb } from "@/lib/accounts/coa-hierarchy";
import {
  buildCoaHierarchyTree,
  collectExpandableGroupKeys,
  filterCoaHierarchyTree,
  type CoaHierarchyNode,
} from "@/lib/accounts/voucher-ledger-groups";
import { useCoaRecords } from "@/lib/accounts/use-coa-records";
import type { VoucherLedgerScope } from "@/lib/accounts/voucher-quick-add-ledger";
import { VoucherQuickAddLedgerSheet } from "@/components/accounts/VoucherQuickAddLedgerModal";

interface GroupedLedgerSelectProps {
  value: number | null;
  onChange: (ledger: ChartOfAccount) => void;
  placeholder?: string;
  /** Shown when value is unset or COA lookup has not resolved yet (e.g. legacy name-only lines). */
  fallbackLabel?: string;
  label?: string;
  required?: boolean;
  disabled?: boolean;
  className?: string;
  contentClassName?: string;
  ledgerFilter?: (ledger: ChartOfAccount) => boolean;
  /** Restrict quick-add parent options (receipt/payment/contra line context) */
  quickAddScope?: VoucherLedgerScope;
  /** Show âž• Create New Ledger — default true when not disabled/read-only */
  enableQuickAdd?: boolean;
  /** Max height of scrollable option list in px */
  listMaxHeight?: number;
  /** Compact trigger and dropdown — for dense voucher forms */
  compact?: boolean;
}

function HierarchyNodeRow({
  node,
  depth,
  value,
  expanded,
  onToggle,
  onSelect,
  compact = false,
}: {
  node: CoaHierarchyNode;
  depth: number;
  value: number | null;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (ledger: ChartOfAccount) => void;
  compact?: boolean;
}) {
  const pad = depth * (compact ? 12 : 14) + (compact ? 6 : 8);

  if (node.kind === "ledger" && node.ledger) {
    const selected = value === node.ledger.id;
    const bankMaster = getBankAccountByLedgerId(node.ledger.id);
    const displayName = bankMaster ? formatBankAccountMaster(bankMaster) : node.label;
    const displayCode = bankMaster ? undefined : node.accountCode;
    return (
      <button
        type="button"
        title={node.path}
        onClick={() => onSelect(node.ledger!)}
        className={cn(
          "w-full flex items-center gap-2 text-left hover:bg-brand-50/80",
          compact ? "py-1 text-[11px]" : "py-2 text-xs",
          selected && "bg-brand-50 font-medium",
        )}
        style={{ paddingLeft: pad }}
      >
        <span className="w-4 shrink-0 text-muted-foreground">•</span>
        <span className="flex-1 truncate">
          {displayCode && (
            <span className="font-mono text-xs text-muted-foreground mr-1">{displayCode}</span>
          )}
          {displayName}
        </span>
        {selected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
      </button>
    );
  }

  const isOpen = expanded.has(node.key);
  return (
    <div>
      <button
        type="button"
        title={node.path}
        onClick={() => onToggle(node.key)}
        className={cn(
          "w-full flex items-center gap-1.5 font-semibold text-muted-foreground hover:bg-muted/30 cursor-default",
          compact ? "py-1 text-[11px]" : "py-1.5 text-xs",
        )}
        style={{ paddingLeft: pad }}
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4 shrink-0" />
        ) : (
          <ChevronRight className="w-4 h-4 shrink-0" />
        )}
        <span className="truncate">{node.label}</span>
      </button>
      {isOpen &&
        node.children.map((child) => (
          <HierarchyNodeRow
            key={child.key}
            node={child}
            depth={depth + 1}
            value={value}
            expanded={expanded}
            onToggle={onToggle}
            onSelect={onSelect}
            compact={compact}
          />
        ))}
    </div>
  );
}

export function GroupedLedgerSelect({
  value,
  onChange,
  placeholder = "Select an account",
  fallbackLabel,
  label,
  required,
  disabled,
  className,
  contentClassName,
  ledgerFilter,
  quickAddScope,
  enableQuickAdd = true,
  listMaxHeight = 300,
  compact = false,
}: GroupedLedgerSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set());
  const [quickAddOpen, setQuickAddOpen] = useState(false);

  const coaRecords = useCoaRecords();

  const tree = useMemo(
    () => buildCoaHierarchyTree(coaRecords, ledgerFilter),
    [coaRecords, ledgerFilter],
  );

  useEffect(() => {
    const topGroups = tree.filter((n) => n.kind === "group").map((n) => n.key);
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      return new Set(topGroups);
    });
  }, [tree]);

  const filteredTree = useMemo(() => filterCoaHierarchyTree(tree, search), [tree, search]);

  const displayExpanded = useMemo(() => {
    if (search.trim()) return collectExpandableGroupKeys(filteredTree);
    return expanded;
  }, [search, filteredTree, expanded]);

  const selectedLabel = useMemo(() => {
    if (!value) {
      return fallbackLabel?.trim() || null;
    }
    const ledger = coaRecords.find((r) => r.id === value);
    if (!ledger) return fallbackLabel?.trim() || null;
    const bankMaster = getBankAccountByLedgerId(ledger.id);
    if (bankMaster) return formatBankAccountMaster(bankMaster);
    return ledger.accountCode
      ? `${ledger.accountCode} · ${ledger.accountName}`
      : ledger.accountName;
  }, [value, coaRecords, fallbackLabel]);

  const selectedPath = useMemo(() => {
    if (!value) return "";
    return hierarchyBreadcrumb(coaRecords, value);
  }, [value, coaRecords]);

  const toggleGroup = useCallback((key: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const handleSelect = (ledger: ChartOfAccount) => {
    onChange(ledger);
    setOpen(false);
    setSearch("");
  };

  const handleQuickAddCreated = (ledger: ChartOfAccount) => {
    if (!ledgerFilter || ledgerFilter(ledger)) {
      onChange(ledger);
    }
    setQuickAddOpen(false);
    setOpen(false);
    setSearch("");
  };

  const showQuickAdd = enableQuickAdd && !disabled;

  const resolvedListMaxHeight = compact ? Math.min(listMaxHeight, 220) : listMaxHeight;

  return (
    <div className={cn(compact ? "space-y-1" : "space-y-1.5")}>
      {label && (
        <label className="text-xs font-medium leading-none">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </label>
      )}
      <Popover
      open={open && !disabled}
      onOpenChange={(v) => {
        if (!disabled) {
          setOpen(v);
          if (!v) setSearch("");
        }
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          title={selectedPath || undefined}
          className={cn(
            "w-full text-left border border-border rounded-md bg-white flex items-center justify-between gap-2 min-w-0",
            compact ? "h-8 px-2 text-xs" : "h-9 px-2.5 text-[13px]",
            disabled ? "opacity-60 cursor-not-allowed bg-muted/30" : "hover:bg-muted/20",
            className,
          )}
        >
          <span
            className={cn(
              "truncate",
              selectedLabel ? "text-foreground font-medium" : "text-muted-foreground",
            )}
          >
            {selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0",
          compact
            ? "w-[var(--radix-popover-trigger-width)] max-w-[min(340px,92vw)]"
            : "w-[min(480px,92vw)]",
          contentClassName,
        )}
        align="start"
      >
        <div className={cn("border-b border-border/60", compact ? "p-1.5" : "p-2")}>
          <Input
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(compact ? "h-7 text-xs" : "h-8 text-[13px]")}
            autoFocus
          />
        </div>
        <div className="overflow-y-auto py-0.5" style={{ maxHeight: resolvedListMaxHeight }}>
          {filteredTree.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">No accounts found</p>
          ) : (
            filteredTree.map((node) => (
              <HierarchyNodeRow
                key={node.key}
                node={node}
                depth={0}
                value={value}
                expanded={displayExpanded}
                onToggle={toggleGroup}
                onSelect={handleSelect}
                compact={compact}
              />
            ))
          )}
        </div>
        {showQuickAdd && (
          <div className="border-t border-border/60 p-1.5">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setSearch("");
                setQuickAddOpen(true);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors",
                compact ? "py-1.5 text-[11px]" : "py-2 text-xs",
              )}
            >
              <Plus className="w-4 h-4 shrink-0" />
              Create New Sub Group Ledger
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>

      {showQuickAdd && (
        <VoucherQuickAddLedgerSheet
          open={quickAddOpen}
          onOpenChange={setQuickAddOpen}
          scope={quickAddScope}
          onCreated={handleQuickAddCreated}
        />
      )}
    </div>
  );
}
