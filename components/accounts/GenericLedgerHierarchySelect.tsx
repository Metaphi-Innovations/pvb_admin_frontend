"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, ChevronRight, ChevronsUpDown, Database, Folder, FileText } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useGenericLedgerDropdown } from "@/hooks/accounts/use-generic-ledger-dropdown";
import type {
  LedgerDropdownItem,
  LedgerDropdownNode,
  GenericLedgerDropdownQuery,
} from "@/services/ledger.service";

function nodeMatchesSearch(node: LedgerDropdownNode, search: string): boolean {
  if (!search) return true;
  const haystack = `${node.code} ${node.name} ${node.aliasName ?? ""} ${node.parentPath}`.toLowerCase();
  if (haystack.includes(search)) return true;
  return node.children.some((child) => nodeMatchesSearch(child, search));
}

function filterTree(nodes: LedgerDropdownNode[], search: string): LedgerDropdownNode[] {
  const q = search.trim().toLowerCase();
  if (!q) return nodes;
  return nodes
    .map((node) => {
      if (node.type === "LEDGER") {
        return nodeMatchesSearch(node, q) ? node : null;
      }
      const children = filterTree(node.children, q);
      if (children.length === 0 && !nodeMatchesSearch(node, q)) return null;
      return { ...node, children };
    })
    .filter((node): node is LedgerDropdownNode => node != null);
}

/** Keep only ledgers under given primary-head codes; optionally drop system ledgers. */
function filterTreeByEligibility(
  nodes: LedgerDropdownNode[],
  allowedPrimaryHeadCodes: Set<string> | null,
  excludeSystemGenerated: boolean,
  underAllowedHead = false,
): LedgerDropdownNode[] {
  return nodes
    .map((node) => {
      if (node.type === "PRIMARY_HEAD") {
        const allowed =
          !allowedPrimaryHeadCodes ||
          allowedPrimaryHeadCodes.has((node.code || "").trim().toUpperCase());
        if (!allowed) return null;
        return {
          ...node,
          children: filterTreeByEligibility(
            node.children,
            allowedPrimaryHeadCodes,
            excludeSystemGenerated,
            true,
          ),
        };
      }
      if (node.type === "LEDGER") {
        if (allowedPrimaryHeadCodes && !underAllowedHead) return null;
        if (excludeSystemGenerated && node.isSystemGenerated) return null;
        return node;
      }
      const children = filterTreeByEligibility(
        node.children,
        allowedPrimaryHeadCodes,
        excludeSystemGenerated,
        underAllowedHead,
      );
      if (children.length === 0) return null;
      return { ...node, children };
    })
    .filter((node): node is LedgerDropdownNode => node != null);
}

function collectExpandableKeys(
  nodes: LedgerDropdownNode[],
  types: LedgerDropdownNode["type"][],
): string[] {
  const keys: string[] = [];
  for (const node of nodes) {
    if (types.includes(node.type)) keys.push(node.id);
    keys.push(...collectExpandableKeys(node.children, types));
  }
  return keys;
}

function findLedgerLabel(
  ledgers: LedgerDropdownItem[],
  value: string | null,
  fallbackLabel?: string,
): string | null {
  if (!value) return fallbackLabel?.trim() || null;
  const ledger = ledgers.find((item) => item.ledgerId === value);
  if (!ledger) return fallbackLabel?.trim() || null;
  return ledger.ledgerCode
    ? `${ledger.ledgerCode} · ${ledger.ledgerName}`
    : ledger.ledgerName;
}

function LevelIcon({ type }: { type: LedgerDropdownNode["type"] }) {
  switch (type) {
    case "PRIMARY_HEAD":
      return (
        <span className="p-0.5 rounded bg-orange-50 border border-orange-200 text-orange-600 shrink-0 flex items-center justify-center">
          <Database className="w-3 h-3" />
        </span>
      );
    case "ACCOUNT_GROUP":
      return (
        <span className="p-0.5 rounded bg-orange-100/50 border border-orange-200/60 text-orange-500 shrink-0 flex items-center justify-center">
          <Folder className="w-3 h-3" />
        </span>
      );
    case "ACCOUNT_SUB_GROUP":
      return (
        <span className="p-0.5 rounded bg-purple-50 border border-purple-200 text-purple-600 shrink-0 flex items-center justify-center">
          <Folder className="w-3 h-3" />
        </span>
      );
    case "LEDGER":
      return (
        <span className="p-0.5 rounded bg-teal-50 border border-teal-200 text-teal-600 shrink-0 flex items-center justify-center">
          <FileText className="w-3 h-3" />
        </span>
      );
    default:
      return null;
  }
}

function HierarchyNodeRow({
  node,
  depth,
  value,
  expanded,
  compact,
  onToggle,
  onSelect,
}: {
  node: LedgerDropdownNode;
  depth: number;
  value: string | null;
  expanded: Set<string>;
  compact?: boolean;
  onToggle: (id: string) => void;
  onSelect: (node: LedgerDropdownNode) => void;
}) {
  const pad = depth * (compact ? 12 : 14) + (compact ? 6 : 8);

  if (node.type === "LEDGER") {
    const selected = value === node.id;
    return (
      <button
        type="button"
        title={node.parentPath ? `${node.parentPath} → ${node.name}` : node.name}
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => onSelect(node)}
        className={cn(
          "w-full flex items-center gap-2 text-left hover:bg-brand-50/80 text-teal-950",
          compact ? "py-1.5 text-[11px]" : "py-2.5 text-xs",
          selected && "bg-brand-50 font-medium",
        )}
        style={{ paddingLeft: pad }}
      >
        <LevelIcon type="LEDGER" />
        <span className="flex-1 truncate">
          {node.code && (
            <span className="font-mono text-xs text-muted-foreground mr-1">{node.code}</span>
          )}
          {node.name}
        </span>
        {selected && <Check className="w-4 h-4 text-brand-600 shrink-0" />}
      </button>
    );
  }

  const isOpen = expanded.has(node.id);
  const textClass =
    node.type === "PRIMARY_HEAD"
      ? "text-orange-900 font-bold"
      : node.type === "ACCOUNT_GROUP"
        ? "text-slate-800 font-semibold"
        : "text-purple-950 font-medium";

  return (
    <div>
      <button
        type="button"
        title={node.parentPath || node.name}
        onClick={() => onToggle(node.id)}
        className={cn(
          "w-full flex items-center gap-1.5 hover:bg-muted/30",
          compact ? "py-1.5 text-[11px]" : "py-2 text-xs",
          textClass,
        )}
        style={{ paddingLeft: pad }}
      >
        {isOpen ? (
          <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
        )}
        <LevelIcon type={node.type} />
        <span className="truncate">
          {node.code ? `${node.code} · ${node.name}` : node.name}
        </span>
      </button>
      {isOpen &&
        node.children.map((child) => (
          <HierarchyNodeRow
            key={child.id}
            node={child}
            depth={depth + 1}
            value={value}
            expanded={expanded}
            compact={compact}
            onToggle={onToggle}
            onSelect={onSelect}
          />
        ))}
    </div>
  );
}

export function GenericLedgerHierarchySelect({
  value,
  onChange,
  placeholder = "Select ledger…",
  fallbackLabel,
  disabled,
  className,
  compact = true,
  query,
  allowedPrimaryHeadCodes,
  excludeSystemGenerated = false,
}: {
  value: string | null;
  onChange: (ledger: LedgerDropdownItem) => void;
  placeholder?: string;
  fallbackLabel?: string;
  disabled?: boolean;
  className?: string;
  compact?: boolean;
  query?: GenericLedgerDropdownQuery;
  /** When set, only show ledgers under these primary-head codes (e.g. INC, EXP). */
  allowedPrimaryHeadCodes?: string[];
  /** Hide system-controlled ledgers (system_ledger_type / isSystemGenerated). */
  excludeSystemGenerated?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const searchRef = useRef<HTMLInputElement>(null);
  const { data, isLoading } = useGenericLedgerDropdown({ query });

  const allowedCodes = useMemo(() => {
    if (!allowedPrimaryHeadCodes?.length) return null;
    return new Set(
      allowedPrimaryHeadCodes.map((c) => c.trim().toUpperCase()).filter(Boolean),
    );
  }, [allowedPrimaryHeadCodes]);

  const ledgers = useMemo(() => {
    const all = data?.ledgers ?? [];
    return all.filter((ledger) => {
      if (excludeSystemGenerated && ledger.isSystemGenerated) return false;
      if (
        allowedCodes &&
        !allowedCodes.has((ledger.primaryHead?.code || "").trim().toUpperCase())
      ) {
        return false;
      }
      return true;
    });
  }, [data?.ledgers, allowedCodes, excludeSystemGenerated]);

  const tree = useMemo(() => {
    const raw = data?.tree ?? [];
    if (!allowedCodes && !excludeSystemGenerated) return raw;
    return filterTreeByEligibility(raw, allowedCodes, excludeSystemGenerated);
  }, [data?.tree, allowedCodes, excludeSystemGenerated]);

  const visibleTree = useMemo(() => filterTree(tree, search), [tree, search]);

  useEffect(() => {
    setExpanded(
      new Set(collectExpandableKeys(tree, ["PRIMARY_HEAD", "ACCOUNT_GROUP"])),
    );
  }, [tree]);

  const displayExpanded = useMemo(() => {
    if (search.trim()) return new Set(collectExpandableKeys(visibleTree, ["PRIMARY_HEAD", "ACCOUNT_GROUP", "ACCOUNT_SUB_GROUP"]));
    return expanded;
  }, [expanded, search, visibleTree]);

  const selectedLabel = findLedgerLabel(ledgers, value, fallbackLabel);

  const toggleGroup = useCallback((id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleSelect = useCallback(
    (node: LedgerDropdownNode) => {
      const ledger = ledgers.find((item) => item.ledgerId === node.id);
      if (!ledger) return;
      onChange(ledger);
      setOpen(false);
      setSearch("");
    },
    [ledgers, onChange],
  );

  useEffect(() => {
    if (!open) return;
    const id = window.requestAnimationFrame(() => searchRef.current?.focus());
    return () => window.cancelAnimationFrame(id);
  }, [open]);

  return (
    <Popover
      open={open && !disabled}
      modal={false}
      onOpenChange={(next) => {
        if (disabled) return;
        setOpen(next);
        if (!next) setSearch("");
      }}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
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
            {isLoading && !selectedLabel ? "Loading ledgers…" : selectedLabel || placeholder}
          </span>
          <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        className={cn(
          "p-0",
          compact
            ? "w-[min(420px,92vw)]"
            : "w-[min(480px,92vw)]",
        )}
        align="start"
        side="bottom"
        sideOffset={4}
        collisionPadding={12}
        onOpenAutoFocus={(e) => e.preventDefault()}
        onWheel={(e) => e.stopPropagation()}
      >
        <div className={cn("border-b border-border/60", compact ? "p-1.5" : "p-2")}>
          <Input
            ref={searchRef}
            placeholder="Search ledgers…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className={cn(compact ? "h-7 text-xs" : "h-8 text-[13px]")}
          />
        </div>
        <div
          className="overflow-y-auto overscroll-contain py-0.5"
          style={{ maxHeight: compact ? 220 : 300 }}
          onWheel={(e) => e.stopPropagation()}
        >
          {visibleTree.length === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">
              {isLoading ? "Loading ledgers…" : "No ledgers found"}
            </p>
          ) : (
            visibleTree.map((node) => (
              <HierarchyNodeRow
                key={node.id}
                node={node}
                depth={0}
                value={value}
                expanded={displayExpanded}
                compact={compact}
                onToggle={toggleGroup}
                onSelect={handleSelect}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
