"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { HrSuccessToast } from "../../components/HrSuccessToast";
import { HrOrgPageHeader, hrBtn } from "../organization/_components";
import { ConfigureNotificationDrawer } from "./ConfigureNotificationDrawer";
import {
  EVENT_CATALOG,
  EVENT_GROUPS,
  HR_NOTIFICATION_SETTINGS_EVENT,
  formatRecipients,
  getEventDefinition,
  loadNotificationSettings,
  reminderRepeatLabel,
  reminderTimingLabel,
  upsertNotificationConfig,
  type HrNotificationEventConfig,
} from "@/lib/hr/hr-notifications";

function OnOff({ on }: { on: boolean }) {
  return (
    <span className={cn("text-xs font-semibold", on ? "text-emerald-700" : "text-muted-foreground")}>
      {on ? "ON" : "OFF"}
    </span>
  );
}

export default function HrNotificationsSettingsClient() {
  const [rows, setRows] = useState<HrNotificationEventConfig[]>([]);
  const [editing, setEditing] = useState<HrNotificationEventConfig | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setRows(loadNotificationSettings());
  }, []);

  useEffect(() => {
    refresh();
    const on = () => refresh();
    window.addEventListener(HR_NOTIFICATION_SETTINGS_EVENT, on);
    window.addEventListener("storage", on);
    return () => {
      window.removeEventListener(HR_NOTIFICATION_SETTINGS_EVENT, on);
      window.removeEventListener("storage", on);
    };
  }, [refresh]);

  const grouped = useMemo(
    () =>
      EVENT_GROUPS.map((g) => ({
        ...g,
        events: EVENT_CATALOG.filter((e) => e.group === g.id).map((def) => ({
          def,
          config: rows.find((r) => r.eventType === def.type),
        })),
      })),
    [rows],
  );

  return (
    <HrOrgPageHeader
      title="HR Notifications"
      description="Configure employee, manager and HR notifications for key HR events."
      icon={Bell}
      sectionLabel="Notification Settings"
      sectionHref="/hr/settings"
    >
      <div className="space-y-4">
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
          <p className="text-xs text-amber-800">
            In-app delivery is live in this prototype. Email is configuration only (Integration Pending).
            Reminders save timing but are not scheduled (Backend Scheduler Pending).
          </p>
        </div>

        {grouped.map((group) => (
          <div key={group.id} className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
            <div className="px-4 py-2.5 border-b border-border bg-muted/30">
              <p className="text-xs font-semibold text-navy-700">{group.label}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/40 border-b border-border">
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Event</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold">Recipients</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold w-20">In-App</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold w-20">Email</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold w-36">Reminder</th>
                    <th className="px-4 py-2.5 text-left text-xs font-semibold w-24">Active</th>
                    <th className="px-4 py-2.5 text-right text-xs font-semibold w-28">Configure</th>
                  </tr>
                </thead>
                <tbody>
                  {group.events.map(({ def, config }) => {
                    if (!config) return null;
                    const unavailable = def.availability === "unavailable";
                    const reminderText = !def.supportsReminder
                      ? "—"
                      : !config.reminderEnabled
                        ? "—"
                        : [
                            reminderTimingLabel(config.reminderTiming),
                            def.supportsRepeat ? reminderRepeatLabel(config.reminderRepeat) : "",
                          ]
                            .filter(Boolean)
                            .join(" · ");
                    return (
                      <tr key={def.type} className="border-b border-border/60 hover:bg-muted/20">
                        <td className="px-4 py-2">
                          <p className="text-xs font-semibold text-foreground">{def.name}</p>
                          {unavailable && (
                            <p className="text-[10px] text-amber-700 mt-0.5">Unavailable</p>
                          )}
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">
                          {formatRecipients(config.recipients)}
                        </td>
                        <td className="px-4 py-2">
                          <OnOff on={config.inAppEnabled} />
                        </td>
                        <td className="px-4 py-2">
                          <OnOff on={config.emailEnabled} />
                        </td>
                        <td className="px-4 py-2 text-xs text-muted-foreground">{reminderText}</td>
                        <td className="px-4 py-2">
                          <Switch
                            size="sm"
                            checked={config.active}
                            disabled={unavailable}
                            aria-label={`${def.name} active`}
                            onCheckedChange={(v) => {
                              upsertNotificationConfig({ ...config, active: v });
                              setRows(loadNotificationSettings());
                            }}
                          />
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className={cn(hrBtn(), "h-8 text-xs")}
                            onClick={() => setEditing(config)}
                          >
                            Configure
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ))}
      </div>

      <ConfigureNotificationDrawer
        open={!!editing}
        config={editing}
        onClose={() => setEditing(null)}
        onSave={(next) => {
          const def = getEventDefinition(next.eventType);
          if (def?.availability === "unavailable") {
            setEditing(null);
            return;
          }
          upsertNotificationConfig(next);
          setRows(loadNotificationSettings());
          setEditing(null);
          setToast("Notification settings updated");
        }}
      />
      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
