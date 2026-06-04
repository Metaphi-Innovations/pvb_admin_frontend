/** Shared procurement types (no React / no "use client"). */

export interface ActivityEntry {
  date: string;
  action: string;
  by: string;
  note?: string;
}
