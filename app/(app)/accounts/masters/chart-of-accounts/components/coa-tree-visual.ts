import type { ChartOfAccount } from "../../../data";

import { getAncestorPath } from "../chart-of-accounts-data";

import { hasChildLedgers } from "../chart-of-accounts-data";

import type { LucideIcon } from "lucide-react";

import { FileText, Folder, FolderOpen, Folders, Layers } from "lucide-react";



export const GUIDE_WIDTH_PX = 14;



/** Tree display levels — indentation carries hierarchy more than icon shape */

export type CoaVisualLevel = "primary_head" | "account_group" | "sub_group" | "ledger";



/**

 * Level 1: Primary Head (Assets, Liabilities, …) → Layers

 * Level 2: Account Group under primary head (Current Assets, …) → Folder

 * Level 3: Sub group under account group (Bank Accounts, …) → Boxes

 * Level 4: Ledger → FileText

 */

export function resolveCoaVisualLevel(

  node: ChartOfAccount,

  records: ChartOfAccount[],

): CoaVisualLevel {

  if (node.nodeLevel === "ledger") return "ledger";

  if (node.nodeLevel === "primary_head") return "primary_head";



  const path = getAncestorPath(records, node.id);

  const parent = path[path.length - 2];

  if (parent?.nodeLevel === "primary_head") return "account_group";

  return "sub_group";

}



export const VISUAL_BADGE_LABEL: Record<CoaVisualLevel, string> = {

  primary_head: "Primary Head",

  account_group: "Group",

  sub_group: "Accounting Group",

  ledger: "Ledger",

};



export const VISUAL_ICON: Record<CoaVisualLevel, LucideIcon> = {
  primary_head: Layers,
  account_group: Folders,
  sub_group: FolderOpen,
  ledger: FileText,
};

/** Sidebar tree icon — distinct shape per hierarchy level */
export function resolveCoaSidebarIcon(
  _node: ChartOfAccount,
  visualLevel: CoaVisualLevel,
): LucideIcon {
  if (visualLevel === "primary_head") return Folder;
  return VISUAL_ICON[visualLevel];
}



/** Outline icons — 16px (within 16–18px spec) */

export const COA_TREE_ICON_SIZE_CLASS = "w-4 h-4";



/** Per-level tree icon colors — subtle theme accents for left hierarchy */

export const VISUAL_TREE_ICON_CLASS: Record<CoaVisualLevel, { default: string; selected: string }> = {

  primary_head: { default: "text-brand-600", selected: "text-brand-700" },

  account_group: { default: "text-leaf-600", selected: "text-leaf-700" },

  sub_group: { default: "text-purple-500", selected: "text-purple-700" },

  ledger: { default: "text-amber-600", selected: "text-amber-700" },

};



export function coaTreeIconClass(visualLevel: CoaVisualLevel, selected: boolean): string {

  const cfg = VISUAL_TREE_ICON_CLASS[visualLevel];

  return selected ? cfg.selected : cfg.default;

}



export const VISUAL_BADGE_CLASS: Record<CoaVisualLevel, string> = {

  primary_head: "bg-muted/50 text-muted-foreground border-border",

  account_group: "bg-muted/30 text-muted-foreground border-border",

  sub_group: "bg-muted/30 text-muted-foreground border-border",

  ledger: "bg-muted/30 text-muted-foreground border-border",

};



/** @deprecated Use coaTreeIconClass — kept for panel badge compatibility */

export const VISUAL_ICON_CLASS: Record<CoaVisualLevel, string> = {

  primary_head: "text-brand-600",

  account_group: "text-leaf-600",

  sub_group: "text-purple-500",

  ledger: "text-amber-600",

};



export const VISUAL_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-xs font-semibold text-[#1F2937]",
  account_group: "text-xs font-medium text-[#1F2937]",
  sub_group: "text-xs font-medium text-[#1F2937]/90",
  ledger: "text-xs font-medium text-[#1F2937]/85",
};



/** Sidebar left padding from tree depth — clear 4-level stepped indent */
export function coaSidebarIndentPx(depth: number): number {
  return 4 + depth * 16;
}

/** Sidebar row typography by hierarchy level */
export const COA_SIDEBAR_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-[13px] font-bold text-foreground",
  account_group: "text-xs font-medium text-foreground/90",
  sub_group: "text-xs font-normal text-foreground/85",
  ledger: "text-[11px] font-normal text-foreground/80",
};

/** Sidebar icon size by level — compact, not bulky */
export function coaSidebarIconSizeClass(visualLevel: CoaVisualLevel): string {
  if (visualLevel === "ledger" || visualLevel === "sub_group") return "w-3.5 h-3.5";
  return "w-4 h-4";
}

/** Bank / cash accounting groups — teal accent (not generic "bank" in ledger names). */
function isBankCashAccountingGroupName(name: string): boolean {
  const n = name.toLowerCase().trim();
  return (
    n === "bank accounts" ||
    n.includes("bank account") ||
    n === "cash-in-hand" ||
    n === "cash in hand" ||
    n.includes("cash-in-hand") ||
    (n.includes("cash") && n.includes("hand"))
  );
}

function isUnderBankCashGroup(records: ChartOfAccount[], nodeId: number): boolean {
  const path = getAncestorPath(records, nodeId);
  return path.some((ancestor) => isBankCashAccountingGroupName(ancestor.accountName));
}

/**
 * Colored icons per node type — primary heads by category, bank/cash teal by group, else level colors.
 */
export function coaSidebarNodeIconClass(
  node: ChartOfAccount,
  visualLevel: CoaVisualLevel,
  selected: boolean,
  records?: ChartOfAccount[],
): string {
  const name = node.accountName.toLowerCase();

  if (visualLevel === "primary_head") {
    if (name.includes("asset")) return selected ? "text-leaf-700" : "text-leaf-600";
    if (name.includes("liabilit")) return selected ? "text-purple-700" : "text-purple-600";
    if (name.includes("income")) return selected ? "text-navy-700" : "text-navy-600";
    if (name.includes("expense")) return selected ? "text-brand-700" : "text-brand-600";
  }

  if (visualLevel === "ledger") {
    if (records && isUnderBankCashGroup(records, node.id)) {
      return selected ? "text-teal-700" : "text-teal-600";
    }
    return selected ? "text-amber-700" : "text-amber-600";
  }

  if (visualLevel === "sub_group" || visualLevel === "account_group") {
    if (isBankCashAccountingGroupName(node.accountName)) {
      return selected ? "text-teal-700" : "text-teal-600";
    }
  }

  return coaTreeIconClass(visualLevel, selected);
}

/** All sidebar nodes show their level icon */
export function coaSidebarShowsNodeIcon(_visualLevel: CoaVisualLevel): boolean {
  return true;
}



/** Expand chevron only for non-ledger nodes with children */

export function coaNodeShowsExpandChevron(

  node: ChartOfAccount,

  records: ChartOfAccount[],

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

  account_group: VISUAL_ROW_CLASS.account_group,

  ledger: VISUAL_ROW_CLASS.ledger,

};



export const LEVEL_SELECTED_ROW_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: "text-xs font-semibold text-brand-800",
  account_group: "text-xs font-semibold text-brand-800",
  ledger: "text-xs font-semibold text-[#1F2937]",
};



export const LEVEL_TITLE_CLASS: Record<ChartOfAccount["nodeLevel"], string> = {
  primary_head: "text-lg font-semibold text-foreground",
  account_group: "text-sm font-semibold text-foreground",
  ledger: "text-sm font-semibold text-foreground",
};



export function ledgerRowExpandable(node: ChartOfAccount, records: ChartOfAccount[]): boolean {

  return node.nodeLevel === "ledger" && hasChildLedgers(records, node.id);

}

