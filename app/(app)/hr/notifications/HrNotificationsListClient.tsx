"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Bell, ChevronsUpDown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { HrPageShell } from "../components/HrPageShell";
import { hrBreadcrumb } from "@/lib/hr/hr-nav";
import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import {
  HR_NOTIFICATIONS_EVENT,
  activeInboxKeys,
  clearReadInboxNotifications,
  formatNotificationTime,
  inboxLabel,
  loadInboxView,
  markInboxAllRead,
  markNotificationRead,
  notificationsForInbox,
  saveInboxView,
  sourceModuleLabel,
  unreadCountForInbox,
  type HrInAppNotification,
  type InboxView,
} from "@/lib/hr/hr-notifications";

const MODULE_FILTERS = [
  { id: "", label: "All modules" },
  { id: "leave", label: "Leave" },
  { id: "reimbursements", label: "Reimbursements" },
  { id: "payroll", label: "Payroll" },
  { id: "offboarding", label: "Offboarding" },
  { id: "hr_letters", label: "HR Letters" },
  { id: "employees", label: "Employees" },
  { id: "onboarding", label: "Onboarding" },
];

function todayKey(iso: string): string {
  return iso.slice(0, 10);
}

export default function HrNotificationsListClient() {
  const [items, setItems] = useState<HrInAppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [label, setLabel] = useState("Current user");
  const [tab, setTab] = useState<"all" | "unread">("all");
  const [module, setModule] = useState("");
  const [date, setDate] = useState("");
  const [inboxOpen, setInboxOpen] = useState(false);
  const [employees, setEmployees] = useState<{ id: number; name: string }[]>([]);

  const refresh = useCallback(() => {
    const keys = activeInboxKeys();
    setItems(notificationsForInbox(keys));
    setUnread(unreadCountForInbox(keys));
    setLabel(inboxLabel());
  }, []);

  useEffect(() => {
    refresh();
    setEmployees(
      loadHrEmployees()
        .filter((e) => e.status === "active")
        .map((e) => ({ id: e.id, name: `${e.employeeName} (${e.employeeCode})` })),
    );
    const on = () => refresh();
    window.addEventListener(HR_NOTIFICATIONS_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(HR_NOTIFICATIONS_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, [refresh]);

  const filtered = useMemo(() => {
    return items.filter((n) => {
      if (tab === "unread" && n.readAt) return false;
      if (module && n.sourceModule !== module) return false;
      if (date && todayKey(n.createdAt) !== date) return false;
      return true;
    });
  }, [items, tab, module, date]);

  const setView = (view: InboxView) => {
    saveInboxView(view);
    setInboxOpen(false);
    refresh();
  };

  return (
    <HrPageShell
      breadcrumbs={hrBreadcrumb({ label: "Notifications" })}
      title="Notifications"
      description="In-app HR notifications for the selected inbox."
      icon={Bell}
      actions={
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => markInboxAllRead()}
            disabled={unread === 0}
          >
            Mark all as read
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => clearReadInboxNotifications()}
          >
            Clear read
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Popover open={inboxOpen} onOpenChange={setInboxOpen}>
            <PopoverTrigger asChild>
              <button className="h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium border-border hover:bg-muted">
                Inbox: {label}
                <ChevronsUpDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-72 p-0">
              <div className="px-3 py-2 border-b border-border">
                <p className="text-xs font-semibold">Prototype inbox</p>
                <p className="text-[10px] text-muted-foreground">Notifications are stored per recipient.</p>
              </div>
              <div className="p-1 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/60 flex items-center gap-2"
                  onClick={() => setView({ mode: "session" })}
                >
                  <span className="flex-1">Current user (session)</span>
                  {loadInboxView().mode === "session" && <Check className="w-3.5 h-3.5 text-brand-600" />}
                </button>
                {["role:admin", "role:hr", "role:finance"].map((key) => (
                  <button
                    key={key}
                    type="button"
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/60"
                    onClick={() => setView({ mode: "role", key })}
                  >
                    {key.replace("role:", "").replace(/^\w/, (c) => c.toUpperCase())} inbox
                  </button>
                ))}
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground px-2.5 pt-2 pb-1">
                  Employee
                </p>
                {employees.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/60 truncate"
                    onClick={() => setView({ mode: "employee", employeeId: e.id })}
                  >
                    {e.name}
                  </button>
                ))}
              </div>
            </PopoverContent>
          </Popover>

          {(["all", "unread"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setTab(v)}
              className={cn(
                "h-7 px-3 text-xs rounded-lg border font-medium",
                tab === v
                  ? "bg-brand-600 text-white border-brand-600"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {v === "all" ? "All" : `Unread (${unread})`}
            </button>
          ))}

          <Popover>
            <PopoverTrigger asChild>
              <button
                className={cn(
                  "h-8 px-2.5 text-xs border rounded-lg inline-flex items-center gap-1.5 font-medium",
                  module ? "border-brand-400 bg-brand-50 text-brand-700" : "border-border text-muted-foreground hover:bg-muted",
                )}
              >
                {MODULE_FILTERS.find((m) => m.id === module)?.label ?? "Module"}
              </button>
            </PopoverTrigger>
            <PopoverContent align="start" className="w-44 p-1">
              {MODULE_FILTERS.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="w-full text-left px-2.5 py-1.5 text-xs rounded-md hover:bg-muted/60"
                  onClick={() => setModule(m.id)}
                >
                  {m.label}
                </button>
              ))}
            </PopoverContent>
          </Popover>

          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="h-8 px-2 text-xs border border-border rounded-lg bg-white"
          />
          {(module || date || tab === "unread") && (
            <button
              type="button"
              className="text-xs text-brand-600 hover:underline"
              onClick={() => {
                setModule("");
                setDate("");
                setTab("all");
              }}
            >
              Clear filters
            </button>
          )}
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center gap-2 py-14">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Bell className="w-5 h-5 text-muted-foreground" />
              </div>
              <p className="text-sm font-medium">No notifications</p>
              <p className="text-xs text-muted-foreground">Nothing in this inbox for the current filters.</p>
            </div>
          ) : (
            <ul>
              {filtered.map((n) => (
                <li key={n.id} className={cn("border-b border-border/60 last:border-0", !n.readAt && "bg-brand-50/40")}>
                  <div className="px-4 py-3 flex items-start gap-3">
                    <span
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        n.readAt ? "bg-muted-foreground/30" : "bg-brand-500",
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className={cn("text-xs", !n.readAt && "font-semibold text-foreground")}>{n.title}</p>
                      {n.message && <p className="text-[11px] text-muted-foreground mt-0.5">{n.message}</p>}
                      <p className="text-[10px] text-muted-foreground mt-1">
                        {sourceModuleLabel(n.sourceModule)} · {formatNotificationTime(n.createdAt)}
                        {n.channelStatus.email === "pending_integration" ? " · Email: Pending Integration" : ""}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5">
                        {!n.readAt && (
                          <button
                            type="button"
                            className="text-[11px] text-brand-600 hover:underline"
                            onClick={() => markNotificationRead(n.id)}
                          >
                            Mark as read
                          </button>
                        )}
                        {n.sourceHref && (
                          <Link
                            href={n.sourceHref}
                            className="text-[11px] text-brand-600 hover:underline"
                            onClick={() => markNotificationRead(n.id)}
                          >
                            Open related record
                          </Link>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="px-4 py-2.5 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">
              Showing <span className="font-medium text-foreground">{filtered.length}</span> of{" "}
              <span className="font-medium text-foreground">{items.length}</span> in this inbox
            </p>
          </div>
        </div>
      </div>
    </HrPageShell>
  );
}
