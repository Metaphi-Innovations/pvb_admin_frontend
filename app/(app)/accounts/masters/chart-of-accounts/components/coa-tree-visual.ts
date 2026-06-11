import type { ChartOfAccount, CoaNodeLevel } from "../../../data";
import { canAddLedgerUnder } from "../chart-of-accounts-data";
import type { LucideIcon } from "lucide-react";
import { BookOpen, FileText, Folder, Layers } from "lucide-react";

export const GUIDE_WIDTH_PX = 14;

/** Display level — leaf_group is a structural node that can hold ledgers */
export type CoaVisualLevel = CoaNodeLevel | "leaf_group";

export function resolveCoaVisualLevel(
  node: ChartOfAccount,
  records: ChartOfAccount[],
): CoaVisualLevel {
  if (node.nodeLevel === "ledger") return "ledger";
  if (canAddLedgerUnder(node, records)) return "leaf_group";
  return node.nodeLevel;
}

export const VISUAL_BADGE_LABEL: Record<CoaVisualLevel, string> = {
  primary_head: "Primary Head",
  account_group: "Group",
  sub_group: "Sub Group",
  leaf_group: "Leaf Group",
  ledger: "Ledger",
};

export const VISUAL_ICON: Record<CoaVisualLevel, LucideIcon> = {
  primary_head: Folder,
  account_group: Folder,
  sub_group: Layers,
  leaf_group: FileText,
  ledger: BookOpen,
};

export const VISUAL_BADGE_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "bg-orange-100 text-orange-800 border-orange-200/80",
  account_group: "bg-blue-50 text-blue-800 border-blue-200/70",
  sub_group: "bg-purple-50 text-purple-800 border-purple-200/70",
  leaf_group: "bg-emerald-50 text-emerald-800 border-emerald-200/70",
  ledger: "bg-slate-100 text-slate-600 border-slate-200/80",
};

export const VISUAL_ICON_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-orange-600",
  account_group: "text-blue-600",
  sub_group: "text-purple-600",
  leaf_group: "text-emerald-600",
  ledger: "text-slate-500",
};

export const VISUAL_ROW_CLASS: Record<CoaVisualLevel, string> = {
  primary_head: "text-[13px] font-bold text-foreground",
  account_group: "text-[13px] font-medium text-foreground/90",
  sub_group: "text-[12px] font-medium text-foreground/80",
  leaf_group: "text-[12px] font-medium text-foreground/85",
  ledger: "text-[12px] font-medium text-foreground/75",
};

/** @deprecated Use VISUAL_* with resolveCoaVisualLevel */
export const LEVEL_BADGE_LABEL = VISUAL_BADGE_LABEL;
export const LEVEL_ICON = VISUAL_ICON;
export const LEVEL_BADGE_CLASS = VISUAL_BADGE_CLASS;
export const LEVEL_ICON_CLASS = VISUAL_ICON_CLASS;

export const LEVEL_ROW_CLASS: Record<CoaNodeLevel, string> = {
  primary_head: VISUAL_ROW_CLASS.primary_head,
  account_group: VISUAL_ROW_CLASS.account_group,
  sub_group: VISUAL_ROW_CLASS.sub_group,
  ledger: VISUAL_ROW_CLASS.ledger,
};

export const LEVEL_SELECTED_ROW_CLASS: Record<CoaNodeLevel, string> = {
  primary_head: "text-sm font-bold text-brand-900",
  account_group: "text-[13px] font-semibold text-brand-900",
  sub_group: "text-[13px] font-semibold text-brand-900",
  ledger: "text-[12px] font-semibold text-foreground",
};

export const LEVEL_TITLE_CLASS: Record<CoaNodeLevel, string> = {
  primary_head: "text-xl font-bold text-foreground",
  account_group: "text-lg font-semibold text-foreground",
  sub_group: "text-base font-semibold text-foreground/90",
  ledger: "text-lg font-semibold text-foreground",
};
