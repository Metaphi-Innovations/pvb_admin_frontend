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
}

function HierarchyNodeRow({
  node,
  depth,
  value,
  expanded,
  onToggle,
  onSelect,
}: {
  node: CoaHierarchyNode;
  depth: number;
  value: number | null;
  expanded: Set<string>;
  onToggle: (key: string) => void;
  onSelect: (ledger: ChartOfAccount) => void;
}) {
  const pad = depth * 14 + 8;

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
          "w-full flex items-center gap-2 py-2 text-xs text-left hover:bg-brand-50/80",
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
        className="w-full flex items-center gap-1.5 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted/30 cursor-default"
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
          />
        ))}
    </div>
  );
}

export function GroupedLedgerSelect({
  value,
  onChange,
  placeholder = "Select an account",
  label,
  required,
  disabled,
  className,
  contentClassName,
  ledgerFilter,
  quickAddScope,
  enableQuickAdd = true,
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
    if (!value) return null;
    const ledger = coaRecords.find((r) => r.id === value);
    if (!ledger) return null;
    const bankMaster = getBankAccountByLedgerId(ledger.id);
    if (bankMaster) return formatBankAccountMaster(bankMaster);
    return ledger.accountCode
      ? `${ledger.accountCode} · ${ledger.accountName}`
      : ledger.accountName;
  }, [value, coaRecords]);

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

  return (
    <div className="space-y-1.5">
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
            "w-full h-9 px-2.5 text-xs text-left border border-border rounded-md bg-white flex items-center justify-between gap-2",
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
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn("w-[min(480px,92vw)] p-0", contentClassName)}
        align="start"
      >
        <div className="p-2 border-b border-border/60">
          <Input
            placeholder="Search accounts…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 text-sm font-medium"
            autoFocus
          />
        </div>
        <div className="max-h-[320px] overflow-y-auto py-1">
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
              className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
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
