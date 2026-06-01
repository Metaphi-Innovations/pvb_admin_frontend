"use client";

import React from "react";
import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/ui/StatusBadge";
import type { StatusKey } from "@/lib/tokens";

interface ActivityItem {
  id:        string;
  title:     string;
  subtitle:  string;
  time:      string;
  status?:   StatusKey;
  initials?: string;
  color?:    string;
}

const ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    title:    "PO #2341 raised",
    subtitle: "Urea 50kg × 200 bags — Nashik WH",
    time:     "2 min ago",
    status:   "pending",
    initials: "RS",
    color:    "bg-amber-100 text-amber-700",
  },
  {
    id: "2",
    title:    "Invoice INV-0091 generated",
    subtitle: "Deepak Traders — ₹1,24,500",
    time:     "18 min ago",
    status:   "approved",
    initials: "DT",
    color:    "bg-brand-100 text-brand-700",
  },
  {
    id: "3",
    title:    "Farmer Ramkumar registered",
    subtitle: "Village: Borgaon, Dist: Akola",
    time:     "1 hr ago",
    status:   "active",
    initials: "RK",
    color:    "bg-sage-100 text-sage-700",
  },
  {
    id: "4",
    title:    "Stock Alert: DAP 50kg",
    subtitle: "Qty below reorder level — Pune WH",
    time:     "2 hr ago",
    status:   "overdue",
    initials: "AL",
    color:    "bg-red-100 text-red-600",
  },
  {
    id: "5",
    title:    "Collection received",
    subtitle: "Agro World Pvt Ltd — ₹78,000",
    time:     "3 hr ago",
    status:   "approved",
    initials: "AW",
    color:    "bg-blue-100 text-blue-700",
  },
];

export function ActivityFeed() {
  return (
    <div className="bg-white rounded-card border border-border shadow-card overflow-hidden">
      <div className="px-4 py-3 border-b border-border flex items-center justify-between">
        <p className="text-card-title text-foreground">Recent Activity</p>
        <button className="text-[11px] text-brand-600 hover:underline font-medium">View all</button>
      </div>
      <div className="divide-y divide-border/50">
        {ACTIVITY.map(item => (
          <div
            key={item.id}
            className="flex items-start gap-3 px-4 py-3 hover:bg-muted/20 transition-colors cursor-pointer"
          >
            <div
              className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold flex-shrink-0",
                item.color,
              )}
            >
              {item.initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[13px] font-medium text-foreground truncate">{item.title}</p>
              <p className="text-helper text-muted-foreground truncate">{item.subtitle}</p>
            </div>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              {item.status && <StatusBadge status={item.status} size="sm" showDot={false} />}
              <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
