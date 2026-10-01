"use client";

import React, { memo, useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CountBadge } from "@/components/ui/StatusBadge";
import { cn } from "@/lib/utils";
import { useClientMounted } from "@/lib/use-client-mounted";
import {
  HR_NOTIFICATIONS_EVENT,
  activeInboxKeys,
  formatNotificationTime,
  markInboxAllRead,
  markNotificationRead,
  notificationsForInbox,
  unreadCountForInbox,
  type HrInAppNotification,
} from "@/lib/hr/hr-notifications";

function HrNotificationBellInner() {
  const mounted = useClientMounted();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<HrInAppNotification[]>([]);
  const [unread, setUnread] = useState(0);

  const refresh = useCallback(() => {
    if (typeof window === "undefined") return;
    const keys = activeInboxKeys();
    setItems(notificationsForInbox(keys).slice(0, 8));
    setUnread(unreadCountForInbox(keys));
  }, []);

  useEffect(() => {
    if (!mounted) return;
    refresh();
    const on = () => refresh();
    window.addEventListener(HR_NOTIFICATIONS_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(HR_NOTIFICATIONS_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, [mounted, refresh]);

  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          className="relative w-8 h-8 flex items-center justify-center rounded-lg hover:bg-muted transition-colors"
          aria-label="HR notifications"
        >
          <Bell className="w-4 h-4 text-muted-foreground" />
          {mounted && unread > 0 && (
            <CountBadge
              count={unread}
              variant="red"
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4"
            />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" sideOffset={8} className="w-80 p-0 rounded-modal overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-sm font-semibold text-foreground">Notifications</p>
          <button
            type="button"
            className="text-[11px] text-brand-600 hover:underline font-medium disabled:opacity-40"
            disabled={unread === 0}
            onClick={() => markInboxAllRead()}
          >
            Mark all as read
          </button>
        </div>
        <div className="max-h-72 overflow-y-auto">
          {items.length === 0 && (
            <p className="text-xs text-muted-foreground px-4 py-8 text-center">No HR notifications yet.</p>
          )}
          {items.map((n) => (
            <button
              key={n.id}
              type="button"
              onClick={() => {
                markNotificationRead(n.id);
                setOpen(false);
                if (n.sourceHref) router.push(n.sourceHref);
              }}
              className={cn(
                "w-full flex items-start gap-3 px-4 py-3 border-b border-border/50 border-l-2 transition-all text-left cursor-pointer",
                !n.readAt
                  ? "bg-brand-50/40 border-brand-300 hover:bg-brand-50/60"
                  : "border-transparent hover:bg-muted/30",
              )}
            >
              <div
                className={cn(
                  "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                  n.readAt ? "bg-muted-foreground/30" : "bg-brand-500",
                )}
              />
              <div className="flex-1 min-w-0">
                <p className={cn("text-xs leading-relaxed", !n.readAt && "font-medium text-foreground")}>
                  {n.title}
                </p>
                {n.message && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{n.message}</p>
                )}
                <p className="text-[11px] text-muted-foreground mt-0.5">{formatNotificationTime(n.createdAt)}</p>
              </div>
            </button>
          ))}
        </div>
        <div className="px-4 py-2.5 border-t border-border">
          <Link
            href="/hr/notifications"
            className="block w-full text-center text-xs text-brand-600 font-medium hover:underline"
            onClick={() => setOpen(false)}
          >
            View all notifications
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export const HrNotificationBell = memo(HrNotificationBellInner);
