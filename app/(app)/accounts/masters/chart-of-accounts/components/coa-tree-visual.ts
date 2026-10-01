import type { ChartOfAccount } from "../../../data";
import { getAncestorPath, hasChildLedgers } from "../chart-of-accounts-data";
import {
  COA_HIERARCHY_LEVEL_LABELS,
  COA_MAX_HIERARCHY_LEVEL,
} from "@/lib/accounts/coa-hierarchy-constants";
import { getCoaHierarchyLevelForNode } from "../chart-of-accounts-data";
import type { LucideIcon } from "lucide-react";
import { Database, File, FileText, Folder, FolderOpen } from "lucide-react";
export const GUIDE_WIDTH_PX = 0;

/**
 * Five-level COA visual keys — one fixed icon + colour per hierarchy level (1–5).
 * Not account-type based; depth alone determines styling.
 */
export type CoaVisualLevel =
  | "primary_head"
  | "account_group"
  | "sub_group"
  | "ledger"
  | "sub_ledger";

/** Map numeric hierarchy level (1–5) to visual level key. */
export function hierarchyLevelToVisualLevel(level: number): CoaVisualLevel {
  const clamped = Math.min(Math.max(Math.round(level), 1), COA_MAX_HIERARCHY_LEVEL);
  switch (clamped) {
    case 1:
      return "primary_head";
    case 2:
      return "account_group";
    case 3:
      return "sub_group";
    case 4:
      return "ledger";
    case 5:
      return "sub_ledger";
    default:
      return "sub_ledger";
  }
}

/** Resolve visual level from tree depth only — same depth always yields same icon/colour. */
export function resolveCoaVisualLevel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaVisualLevel {
  return hierarchyLevelToVisualLevel(getCoaHierarchyLevelForNode(node, records));
}

export function resolveCoaTreeDepth(node: ChartOfAccount, records: ChartOfAccount[]): number {
  return getAncestorPath(records, node.id).length - 1;
}

export const VISUAL_BADGE_LABEL: Record<CoaVisualLevel, string> = {
  primary_head: COA_HIERARCHY_LEVEL_LABELS[1],
  account_group: COA_HIERARCHY_LEVEL_LABELS[2],
  sub_group: COA_HIERARCHY_LEVEL_LABELS[3],
  ledger: COA_HIERARCHY_LEVEL_LABELS[4],
  sub_ledger: COA_HIERARCHY_LEVEL_LABELS[5],
};

/** Level 1 — Primary Head: Database, blue */
export function resolvePrimaryHeadIcon(_name?: string): LucideIcon {
  return Database;
}

/** Level 2 — Account Group: Folder, orange */
export function resolveCoaAccountGroupIcon(): LucideIcon {
  return Folder;
}

/** Level 3 — Sub Group: Open folder, purple */
export function resolveCoaSubGroupIcon(): LucideIcon {
  return FolderOpen;
}

/** Level 4 — Ledger: File text, teal */
export function resolveCoaLedgerIcon(): LucideIcon {
  return FileText;
}

/** Level 5 — Sub Ledger: File, red */
export function resolveCoaSubLedgerIcon(): LucideIcon {
  return File;
}

/** @deprecated Use resolveCoaSubGroupIcon */
export function resolveCoaGroupIcon(_node: ChartOfAccount, _records: ChartOfAccount[]): LucideIcon {
  return FolderOpen;
}

/** @deprecated Use resolveCoaLedgerIcon */
export function resolveCoaSystemLedgerIcon(): LucideIcon {
  return FileText;
}

/** @deprecated Use resolveCoaSubLedgerIcon */
export function resolveCoaManualLedgerIcon(): LucideIcon {
  return File;
}

/** Map legacy visual level keys from older COA tree code. */
export function normalizeCoaVisualLevel(level: CoaVisualLevel | string): CoaVisualLevel {
  switch (level) {
    case "primary_head":
    case "account_group":
    case "sub_group":
    case "ledger":
    case "sub_ledger":
      return level;
    case "group":
      return "sub_group";
    case "system_ledger":
      return "ledger";
    case "manual_ledger":
      return "sub_ledger";
    default:
      return "ledger";
  }
}

export function resolveCoaSidebarIcon(
  _node: ChartOfAccount,
  visualLevel: CoaVisualLevel,
  _records?: ChartOfAccount[],
): LucideIcon {
  return VISUAL_ICON[normalizeCoaVisualLevel(visualLevel)] ?? FileText;
}

/** Fixed icon per hierarchy level — level-based, not account-based. */
export const VISUAL_ICON: Record<CoaVisualLevel, LucideIcon> = {
  primary_head: Database,
  account_group: Folder,
  sub_group: FolderOpen,
  ledger: FileText,
  sub_ledger: File,
};

export const COA_TREE_ICON_SIZE_CLASS = "w-4 h-4";

/** Distinct colour families per level — no shared palette shades across levels. */
export const VISUAL_TREE_ICON_CLASS: Record<CoaVisualLevel, { default: string; selected: string }> = {
  primary_head: { default: "text-blue-600", selected: "text-blue-700" },
  account_group: { default: "text-brand-600", selected: "text-brand-700" },
  sub_group: { default: "text-purple-600", selected: "text-purple-700" },
  ledger: { default: "text-teal-600", selected: "text-teal-700" },
  sub_ledger: { default: "text-red-600", selected: "text-red-700" },
};

export function coaSidebarRowClass(visualLevel: CoaVisualLevel | string): string {
  return COA_SIDEBAR_ROW_CLASS[normalizeCoaVisualLevel(visualLevel)];
}

export function coaVisualRowClass(visualLevel: CoaVisualLevel | string): string {
  return VISUAL_ROW_CLASS[normalizeCoaVisualLevel(visualLevel)];
}

export function coaTreeIconClass(visualLevel: CoaVisualLevel, selected: boolean): string {
  const key = normalizeCoaVisualLevel(visualLevel);
  const cfg = VISUAL_TREE_ICON_CLASS[key] ?? VISUAL_TREE_ICON_CLASS.ledger;
  return selected ? cfg.selected : cfg.default;
}

export const VISUAL_BADGE_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "bg-blue-50 text-blue-700 border-blue-200",
  account_group: "bg-brand-50 text-brand-700 border-brand-200",
  sub_group: "bg-purple-50 text-purple-700 border-purple-200",
  ledger: "bg-teal-50 text-teal-700 border-teal-200",
  sub_ledger: "bg-red-50 text-red-700 border-red-200",
};

export const VISUAL_ICON_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-blue-600",
  account_group: "text-brand-600",
  sub_group: "text-purple-600",
  ledger: "text-teal-600",
  sub_ledger: "text-red-600",
};

/** Icon badge background — used in legend and optional row adornments. */
export const VISUAL_ICON_BG_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "bg-blue-50 border-blue-200",
  account_group: "bg-brand-50 border-brand-200",
  sub_group: "bg-purple-50 border-purple-200",
  ledger: "bg-teal-50 border-teal-200",
  sub_ledger: "bg-red-50 border-red-200",
};

export const VISUAL_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-xs font-bold text-foreground",
  account_group: "text-xs font-semibold text-foreground/95",
  sub_group: "text-xs font-medium text-foreground/90",
  ledger: "text-xs font-normal text-foreground/85",
  sub_ledger: "text-[11px] font-normal text-foreground/80",
};

/** Horizontal indent per hierarchy level (compact sidebar tree). */
export const COA_TREE_LEVEL_INDENT_PX = 14;

/** Fixed width for expand/collapse control — keeps chevrons aligned at every depth. */
export const COA_TREE_CHEVRON_WIDTH_CLASS = "w-5 shrink-0";

/** ~14px per hierarchy level — compact indent for deep COA trees */
export function coaSidebarIndentPx(depth: number): number {
  return Math.max(0, depth) * COA_TREE_LEVEL_INDENT_PX;
}

export const COA_SIDEBAR_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-[13px] font-bold text-foreground",
  account_group: "text-xs font-semibold text-foreground/95",
  sub_group: "text-xs font-medium text-foreground/90",
  ledger: "text-[11px] font-normal text-foreground/85",
  sub_ledger: "text-[11px] font-normal text-foreground/80",
};

/** Same icon size at every level — level is conveyed by icon shape + colour, not size. */
export function coaSidebarIconSizeClass(
  _node: ChartOfAccount,
  _records: ChartOfAccount[],
): string {
  return COA_TREE_ICON_SIZE_CLASS;
}

export function coaSidebarNodeIconClass(
  _node: ChartOfAccount,
  visualLevel: CoaVisualLevel,
  selected: boolean,
  _records?: ChartOfAccount[],
): string {
  return coaTreeIconClass(visualLevel, selected);
}

export function coaNodeAccessibleLabel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): string {
  const visualLevel = resolveCoaVisualLevel(node, records);
  const badge = VISUAL_BADGE_LABEL[visualLevel];
  const depth = getCoaHierarchyLevelForNode(node, records);
  return `${node.accountName}, ${badge}${depth > 0 ? `, level ${depth}` : ""}`;
}

export function coaSidebarShowsNodeIcon(_visualLevel: CoaVisualLevel): boolean {
  return true;
}

export function coaNodeShowsExpandChevron(
  node: ChartOfAccount,
  records: ChartOfAccount[],
  hasChildren: boolean,
): boolean {
  if (!hasChildren) return false;
  if (node.nodeLevel === "ledger") {
    return ledgerRowExpandable(node, records);
  }
  return true;
}

/** @deprecated Use VISUAL_* with resolveCoaVisualLevel */
export const LEVEL_BADGE_LABEL = VISUAL_BADGE_LABEL;

export const LEVEL_ICON = VISUAL_ICON;

export const LEVEL_BADGE_CLASS = VISUAL_BADGE_CLASS;

export const LEVEL_ICON_CLASS = VISUAL_ICON_CLASS;

export const LEVEL_ROW_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: VISUAL_ROW_CLASS.primary_head,
  account_group: VISUAL_ROW_CLASS.sub_group,
  ledger: VISUAL_ROW_CLASS.ledger,
};

export const LEVEL_SELECTED_ROW_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: "text-xs font-bold text-brand-800",
  account_group: "text-xs font-semibold text-brand-800",
  ledger: "text-xs font-semibold text-foreground",
};

export const LEVEL_TITLE_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: "text-lg font-semibold text-foreground",
  account_group: "text-sm font-semibold text-foreground",
  ledger: "text-sm font-semibold text-foreground",
};

export function ledgerRowExpandable(node: ChartOfAccount, records: ChartOfAccount[]): boolean {
  return node.nodeLevel === "ledger" && hasChildLedgers(records, node.id);
}

/** Backward-compatible alias */
export type CoaLegacyVisualLevel = "primary_head" | "account_group" | "sub_group" | "ledger";

export function resolveCoaVisualLevelLegacy(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaLegacyVisualLevel {
  const level = resolveCoaVisualLevel(node, records);
  if (level === "sub_ledger") return "ledger";
  if (level === "account_group" || level === "sub_group") {
    return level === "account_group" ? "account_group" : "sub_group";
  }
  return level;
}

/** @deprecated Legacy group levels map to unified group styling */
export type LegacyCoaVisualLevel =
  | "primary_head"
  | "system_group"
  | "predefined_group"
  | "custom_group"
  | "ledger";

export function mapLegacyVisualLevel(level: CoaVisualLevel): LegacyCoaVisualLevel {
  if (level === "account_group" || level === "sub_group") return "system_group";
  if (level === "ledger" || level === "sub_ledger") return "ledger";
  return level;
}
