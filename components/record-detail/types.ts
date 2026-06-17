import type { LucideIcon } from "lucide-react";
import type React from "react";

export interface RecordDetailTab {
  value: string;
  label: string;
  count?: number;
}

export interface RecordKpiItem {
  icon: LucideIcon;
  iconBg: string;
  iconColor: string;
  value: string;
  label: string;
}

export interface RecordMetaItem {
  icon?: LucideIcon;
  label: string;
  href?: string;
  onClick?: () => void;
}

export interface RecordSidebarAction {
  label: string;
  icon?: LucideIcon;
  onClick: () => void;
  variant?: "default" | "primary" | "outline";
}

export interface RecordActivityItem {
  id: string;
  title: string;
  subtitle?: string;
  date: string;
}

export interface RecordSummaryItem {
  label: string;
  value: React.ReactNode;
  highlight?: boolean;
}

export interface RecordApprovalItem {
  label: string;
  value: React.ReactNode;
  tone?: "pending" | "approved" | "rejected" | "neutral";
}

export interface RecordDocumentItem {
  id: string;
  name: string;
  meta?: string;
  onClick?: () => void;
}

export interface RecordDetailSidebarProps {
  quickActions?: RecordSidebarAction[];
  summary?: RecordSummaryItem[];
  activity?: RecordActivityItem[];
  approval?: RecordApprovalItem[];
  documents?: RecordDocumentItem[];
}

export interface RecordMiniTableColumn<T> {
  key: string;
  header: string;
  align?: "left" | "right" | "center";
  render: (row: T) => React.ReactNode;
}

/** Single-tab default for simple view pages */
export const OVERVIEW_TAB: RecordDetailTab = { value: "overview", label: "Overview" };
