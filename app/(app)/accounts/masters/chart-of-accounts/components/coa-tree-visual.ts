import type { ChartOfAccount } from "../../../data";

import { getAncestorPath } from "../chart-of-accounts-data";

import { hasChildLedgers } from "../chart-of-accounts-data";

import type { LucideIcon } from "lucide-react";

import {
  BadgeIndianRupee,
  BadgePercent,
  BookOpen,
  Building2,
  CircleDollarSign,
  FolderOpen,
  FolderTree,
  Handshake,
  Landmark,
  Package,
  PieChart,
  Receipt,
  ReceiptText,
  Scale,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";

import { isUserCreatedGroup } from "@/lib/accounts/coa-hierarchy";
import {
  isSundryCreditorsGroup,
  isSundryDebtorsGroup,
} from "@/lib/accounts/coa-add-ledger-policy";
import { isTdsGroupContext } from "@/lib/accounts/coa-specialized-groups";

/** @deprecated Tree connector guides removed — kept for import compatibility */
export const GUIDE_WIDTH_PX = 0;

export type CoaVisualLevel =
  | "primary_head"
  | "system_group"
  | "predefined_group"
  | "custom_group"
  | "ledger";

export function resolveCoaVisualLevel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaVisualLevel {
  if (node.nodeLevel === "ledger") return "ledger";

  if (node.nodeLevel === "primary_head") return "primary_head";

  if (isUserCreatedGroup(node)) return "custom_group";

  const path = getAncestorPath(records, node.id);
  const parent = path[path.length - 2];
  if (parent?.nodeLevel === "primary_head") return "system_group";

  return "predefined_group";
}

export function resolveCoaTreeDepth(node: ChartOfAccount, records: ChartOfAccount[]): number {
  return getAncestorPath(records, node.id).length - 1;
}

export const VISUAL_BADGE_LABEL: Record<CoaVisualLevel, string> = {
  primary_head: "Primary Group",
  system_group: "System Group",
  predefined_group: "Sub-Group",
  custom_group: "Custom Sub-Group",
  ledger: "Ledger",
};

function normalizeCoaName(name: string): string {
  return name.trim().toLowerCase();
}

function primaryHeadFromPath(records: ChartOfAccount[], nodeId: number): ChartOfAccount | undefined {
  return getAncestorPath(records, nodeId).find((p) => p.nodeLevel === "primary_head");
}

/** Level 1 — primary accounting heads */
export function resolvePrimaryHeadIcon(name: string): LucideIcon {
  const n = normalizeCoaName(name);
  if (n.includes("asset")) return Landmark;
  if (n.includes("liabilit")) return Scale;
  if (n.includes("income")) return TrendingUp;
  if (n.includes("expense")) return TrendingDown;
  return Landmark;
}

/** Contextual outline icon for account groups (levels 2–3). */
export function resolveCoaGroupIcon(node: ChartOfAccount, records: ChartOfAccount[]): LucideIcon {
  const name = normalizeCoaName(node.accountName);

  if (isUserCreatedGroup(node)) return FolderTree;
  if (isSundryDebtorsGroup(node, records)) return Users;
  if (isSundryCreditorsGroup(node, records)) return Handshake;
  if (isTdsGroupContext(node, records)) return BadgePercent;

  if (name.includes("bank account")) return Landmark;
  if (name.includes("cash-in-hand") || name.includes("cash in hand")) return Wallet;
  if (name.includes("inventory") || name.includes("stock-in-hand")) return Package;
  if (name.includes("trade receivables") || name.includes("sundry debtors")) return Users;
  if (name.includes("trade payables") || name.includes("sundry creditors")) return Handshake;
  if (name.includes("gst input")) return Receipt;
  if (name.includes("gst output")) return ReceiptText;
  if (name.includes("tds receivable") || name.includes("tds payable")) return BadgePercent;
  if (name.includes("loan") || name.includes("borrowing") || name.includes("nbfc")) {
    return BadgeIndianRupee;
  }
  if (name.includes("deposit")) return CircleDollarSign;
  if (name.includes("fixed asset")) return Building2;
  if (name.includes("investment")) return PieChart;
  if (name.includes("land & building") || name.includes("plant & machinery")) return Building2;
  if (name.includes("capital") || name.includes("equity")) return Landmark;

  return FolderOpen;
}

/** All posting ledgers use BookOpen — never folder icons. */
export function resolveCoaLedgerIcon(_node: ChartOfAccount, _records: ChartOfAccount[]): LucideIcon {
  return BookOpen;
}

export function resolveCoaSidebarIcon(
  node: ChartOfAccount,
  _visualLevel: CoaVisualLevel,
  records?: ChartOfAccount[],
): LucideIcon {
  if (node.nodeLevel === "ledger") {
    return BookOpen;
  }
  if (node.nodeLevel === "primary_head") {
    return resolvePrimaryHeadIcon(node.accountName);
  }
  if (records) {
    return resolveCoaGroupIcon(node, records);
  }
  return FolderOpen;
}

/** @deprecated Panel tree uses resolveCoaSidebarIcon — kept for legacy imports */
export const VISUAL_ICON: Record<CoaVisualLevel, LucideIcon> = {
  primary_head: Landmark,
  system_group: FolderOpen,
  predefined_group: FolderOpen,
  custom_group: FolderTree,
  ledger: BookOpen,
};

export const COA_TREE_ICON_SIZE_CLASS = "w-4 h-4";

export const VISUAL_TREE_ICON_CLASS: Record<CoaVisualLevel, { default: string; selected: string }> = {
  primary_head: { default: "text-brand-600", selected: "text-brand-700" },
  system_group: { default: "text-navy-500", selected: "text-navy-700" },
  predefined_group: { default: "text-leaf-600", selected: "text-leaf-700" },
  custom_group: { default: "text-purple-500", selected: "text-purple-700" },
  ledger: { default: "text-slate-500", selected: "text-slate-600" },
};

export function coaTreeIconClass(visualLevel: CoaVisualLevel, selected: boolean): string {
  const cfg = VISUAL_TREE_ICON_CLASS[visualLevel];
  return selected ? cfg.selected : cfg.default;
}

export const VISUAL_BADGE_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "bg-brand-50 text-brand-700 border-brand-200",
  system_group: "bg-navy-50 text-navy-700 border-navy-200",
  predefined_group: "bg-leaf-50 text-leaf-700 border-leaf-200",
  custom_group: "bg-purple-50 text-purple-700 border-purple-200",
  ledger: "bg-muted/40 text-muted-foreground border-border",
};

export const VISUAL_ICON_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-brand-600",
  system_group: "text-navy-600",
  predefined_group: "text-leaf-600",
  custom_group: "text-purple-600",
  ledger: "text-slate-500",
};

export const VISUAL_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-xs font-bold text-foreground",
  system_group: "text-xs font-semibold text-foreground",
  predefined_group: "text-xs font-medium text-foreground/90",
  custom_group: "text-xs font-medium text-foreground/90",
  ledger: "text-xs font-normal text-foreground/85",
};

/** ~20px per hierarchy level — no tree connector lines */
export function coaSidebarIndentPx(depth: number): number {
  return 8 + depth * 20;
}

export const COA_SIDEBAR_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-[13px] font-semibold text-foreground",
  system_group: "text-xs font-semibold text-foreground/95",
  predefined_group: "text-xs font-medium text-foreground/90",
  custom_group: "text-xs font-medium text-foreground/90",
  ledger: "text-[11px] font-normal text-foreground/80",
};

export function coaSidebarIconSizeClass(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): string {
  if (node.nodeLevel === "ledger") return "w-3.5 h-3.5";
  const depth = resolveCoaTreeDepth(node, records);
  if (depth === 0) return "w-[18px] h-[18px]";
  if (depth === 1) return "w-4 h-4";
  return "w-3.5 h-3.5";
}

function primaryHeadIconClass(name: string, selected: boolean): string {
  const n = normalizeCoaName(name);
  if (n.includes("asset")) return selected ? "text-leaf-700" : "text-leaf-600";
  if (n.includes("liabilit")) return selected ? "text-purple-700" : "text-purple-600";
  if (n.includes("income")) return selected ? "text-navy-700" : "text-navy-600";
  if (n.includes("expense")) return selected ? "text-brand-700" : "text-brand-600";
  return selected ? "text-brand-700" : "text-brand-600";
}

function contextualGroupIconClass(
  node: ChartOfAccount,
  records: ChartOfAccount[],
  selected: boolean,
): string | null {
  const name = normalizeCoaName(node.accountName);

  if (name.includes("bank account")) {
    return selected ? "text-sky-700" : "text-sky-600";
  }
  if (
    isSundryDebtorsGroup(node, records) ||
    name.includes("trade receivables") ||
    name.includes("sundry debtors")
  ) {
    return selected ? "text-cyan-700" : "text-cyan-600";
  }
  if (
    isSundryCreditorsGroup(node, records) ||
    name.includes("trade payables") ||
    name.includes("sundry creditors")
  ) {
    return selected ? "text-orange-700" : "text-orange-600";
  }
  if (name.includes("gst input") || (name.includes("gst") && name.includes("input"))) {
    return selected ? "text-purple-700" : "text-purple-600";
  }
  if (name.includes("gst output") || (name.includes("gst") && name.includes("output"))) {
    return selected ? "text-purple-700" : "text-purple-600";
  }
  if (isTdsGroupContext(node, records) || name.includes("tds")) {
    const root = primaryHeadFromPath(records, node.id);
    if (root) return primaryHeadIconClass(root.accountName, selected);
  }

  return null;
}

export function coaSidebarNodeIconClass(
  node: ChartOfAccount,
  visualLevel: CoaVisualLevel,
  selected: boolean,
  records?: ChartOfAccount[],
): string {
  if (visualLevel === "primary_head") {
    return primaryHeadIconClass(node.accountName, selected);
  }

  if (visualLevel === "ledger") {
    return selected ? "text-slate-600" : "text-slate-500";
  }

  if (records) {
    const contextual = contextualGroupIconClass(node, records, selected);
    if (contextual) return contextual;

    const root = primaryHeadFromPath(records, node.id);
    if (root) return primaryHeadIconClass(root.accountName, selected);
  }

  return coaTreeIconClass(visualLevel, selected);
}

export function coaNodeAccessibleLabel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): string {
  const visualLevel = resolveCoaVisualLevel(node, records);
  const badge = VISUAL_BADGE_LABEL[visualLevel];
  const depth = resolveCoaTreeDepth(node, records);
  return `${node.accountName}, ${badge}${depth > 0 ? `, level ${depth + 1}` : ""}`;
}

export function coaSidebarShowsNodeIcon(_visualLevel: CoaVisualLevel): boolean {
  return true;
}

export function coaNodeShowsExpandChevron(
  node: ChartOfAccount,
  _records: ChartOfAccount[],
  hasChildren: boolean,
): boolean {
  if (!hasChildren) return false;
  if (node.nodeLevel === "ledger") return false;
  return true;
}

/** @deprecated Use VISUAL_* with resolveCoaVisualLevel */
export const LEVEL_BADGE_LABEL = VISUAL_BADGE_LABEL;

export const LEVEL_ICON = VISUAL_ICON;

export const LEVEL_BADGE_CLASS = VISUAL_BADGE_CLASS;

export const LEVEL_ICON_CLASS = VISUAL_ICON_CLASS;

export const LEVEL_ROW_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: VISUAL_ROW_CLASS.primary_head,
  account_group: VISUAL_ROW_CLASS.system_group,
  ledger: VISUAL_ROW_CLASS.ledger,
};

export const LEVEL_SELECTED_ROW_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: "text-xs font-semibold text-brand-800",
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
  if (level === "system_group") return "account_group";
  if (level === "predefined_group" || level === "custom_group") return "sub_group";
  return level;
}
