"use client";

import React, { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HrFormDrawer } from "../organization/_components";
import { hrInput, hrTextarea, HR_BTN_CLASS } from "../organization/_components/hr-org-form";
import { cn } from "@/lib/utils";
import { loadRoles } from "@/app/(app)/user-management/roles/roles-data";
import { loadUsers } from "@/app/(app)/user-management/user/user-data";
import {
  EVENT_CATALOG,
  RECIPIENT_KIND_OPTIONS,
  REMINDER_REPEAT_OPTIONS,
  REMINDER_TIMING_OPTIONS,
  findPlaceholders,
  formatRecipients,
  getEventDefinition,
  placeholderLabel,
  renderTemplate,
  sampleContextForEvent,
  unknownPlaceholders,
  type HrNotificationEventConfig,
  type NotificationRecipient,
  type RecipientKind,
} from "@/lib/hr/hr-notifications";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground pb-2.5 border-b border-border mb-3">
      {children}
    </p>
  );
}

function ChannelPill({ on }: { on: boolean }) {
  return (
    <span
      className={cn(
        "text-[11px] font-semibold px-1.5 py-0.5 rounded-md",
        on ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500",
      )}
    >
      {on ? "ON" : "OFF"}
    </span>
  );
}

function KindPicker({
  value,
  onChange,
}: {
  value: RecipientKind;
  onChange: (k: RecipientKind) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = RECIPIENT_KIND_OPTIONS.find((o) => o.kind === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(hrInput(), "h-9 text-left flex items-center justify-between")}>
          <span className="truncate text-sm">{label}</span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
        {RECIPIENT_KIND_OPTIONS.map((o) => (
          <button
            key={o.kind}
            type="button"
            onClick={() => {
              onChange(o.kind);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-left",
              o.kind === value ? "bg-brand-50 text-brand-700" : "hover:bg-muted/60",
            )}
          >
            <span className="flex-1">{o.label}</span>
            {o.kind === value && <Check className="w-3.5 h-3.5 text-brand-600" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function SearchPick({
  placeholder,
  options,
  value,
  onChange,
}: {
  placeholder: string;
  options: { id: number; label: string }[];
  value: number | undefined;
  onChange: (id: number, label: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const selected = options.find((o) => o.id === value);
  const filtered = options.filter((o) => o.label.toLowerCase().includes(q.toLowerCase()));
  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setQ("");
      }}
    >
      <PopoverTrigger asChild>
        <button type="button" className={cn(hrInput(), "h-9 text-left flex items-center justify-between")}>
          <span className={cn("truncate text-sm", !selected && "text-muted-foreground")}>
            {selected?.label ?? placeholder}
          </span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
        <div className="p-2 border-b border-border">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[7px] text-muted-foreground pointer-events-none" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search…"
              className="w-full pl-8 pr-3 py-1.5 text-sm focus:outline-none bg-transparent"
            />
          </div>
        </div>
        <div className="max-h-48 overflow-y-auto p-1">
          {filtered.length === 0 && (
            <p className="text-[11px] text-muted-foreground px-2 py-3">No matches.</p>
          )}
          {filtered.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                onChange(o.id, o.label);
                setOpen(false);
              }}
              className={cn(
                "w-full flex items-center gap-2 px-2.5 py-1.5 text-xs rounded-md text-left",
                o.id === value ? "bg-brand-50" : "hover:bg-muted/60",
              )}
            >
              <span className="flex-1 truncate">{o.label}</span>
              {o.id === value && <Check className="w-3.5 h-3.5 text-brand-600" />}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TimingPick({
  value,
  onChange,
}: {
  value: HrNotificationEventConfig["reminderTiming"];
  onChange: (v: HrNotificationEventConfig["reminderTiming"]) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = REMINDER_TIMING_OPTIONS.find((o) => o.value === value)?.label ?? value;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" className={cn(hrInput(), "h-9 text-left flex items-center justify-between")}>
          <span className="text-sm">{label}</span>
          <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
        {REMINDER_TIMING_OPTIONS.map((o) => (
          <button
            key={o.value}
            type="button"
            onClick={() => {
              onChange(o.value);
              setOpen(false);
            }}
            className={cn(
              "w-full text-left px-2.5 py-1.5 text-xs rounded-md",
              o.value === value ? "bg-brand-50 text-brand-700" : "hover:bg-muted/60",
            )}
          >
            {o.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function ConfigureNotificationDrawer({
  open,
  config,
  onClose,
  onSave,
}: {
  open: boolean;
  config: HrNotificationEventConfig | null;
  onClose: () => void;
  onSave: (next: HrNotificationEventConfig) => void;
}) {
  const [form, setForm] = useState<HrNotificationEventConfig | null>(null);
  const [preview, setPreview] = useState(false);
  const [focus, setFocus] = useState<"inAppTitle" | "inAppMessage" | "emailSubject" | "emailBody">(
    "inAppMessage",
  );

  React.useEffect(() => {
    if (open && config) {
      setForm({ ...config, recipients: config.recipients.map((r) => ({ ...r })) });
      setPreview(false);
    }
  }, [open, config]);

  const def = form ? getEventDefinition(form.eventType) : undefined;
  const catalog = EVENT_CATALOG.find((e) => e.type === form?.eventType);
  const unavailable = catalog?.availability === "unavailable";

  const roles = useMemo(
    () => (open ? loadRoles().filter((r) => r.status === "active") : []),
    [open],
  );
  const users = useMemo(
    () => (open ? loadUsers().filter((u) => u.status === "active") : []),
    [open],
  );

  const allowed = def?.placeholders ?? [];
  const unknown = useMemo(() => {
    if (!form) return [] as string[];
    const texts = [form.inAppTitle, form.inAppMessage, form.emailSubject, form.emailBody];
    return [...new Set(texts.flatMap((t) => unknownPlaceholders(t, allowed)))];
  }, [form, allowed]);

  const sample = def ? sampleContextForEvent(def.type) : {};

  const insert = (key: string) => {
    if (!form) return;
    const field = focus;
    setForm({ ...form, [field]: `${form[field] ?? ""}{{${key}}}` });
  };

  const addRecipient = () => {
    if (!form) return;
    if (form.recipients.some((r) => r.kind === "employee") === false) {
      setForm({ ...form, recipients: [...form.recipients, { kind: "employee" }] });
      return;
    }
    setForm({ ...form, recipients: [...form.recipients, { kind: "hr" }] });
  };

  const setRecipient = (idx: number, next: NotificationRecipient) => {
    if (!form) return;
    const recipients = form.recipients.map((r, i) => (i === idx ? next : r));
    setForm({ ...form, recipients });
  };

  const removeRecipient = (idx: number) => {
    if (!form) return;
    setForm({ ...form, recipients: form.recipients.filter((_, i) => i !== idx) });
  };

  if (!form || !def) {
    return (
      <HrFormDrawer
        open={open}
        onOpenChange={(o) => !o && onClose()}
        title="Configure Notification"
        onSave={() => undefined}
        saveDisabled
      >
        <p className="text-xs text-muted-foreground">Select an event.</p>
      </HrFormDrawer>
    );
  }

  const inAppPrev = renderTemplate(form.inAppTitle, sample, allowed);
  const inAppMsgPrev = renderTemplate(form.inAppMessage, sample, allowed);
  const emailSubPrev = renderTemplate(form.emailSubject, sample, allowed);
  const emailBodyPrev = renderTemplate(form.emailBody, sample, allowed);

  return (
    <HrFormDrawer
      open={open}
      onOpenChange={(o) => !o && onClose()}
      title="Configure Notification"
      description={def.name}
      saveLabel="Update"
      saveDisabled={unavailable}
      onSave={() => {
        if (unavailable) return;
        onSave(form);
      }}
      contentClassName="max-w-[560px] sm:max-w-[560px]"
    >
      <div className="space-y-5">
        {unavailable && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5">
            <p className="text-xs font-semibold text-amber-800">Unavailable</p>
            <p className="text-[11px] text-amber-700 mt-0.5">{catalog?.unavailableReason}</p>
          </div>
        )}

        <div>
          <SectionLabel>Event</SectionLabel>
          <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium">{def.name}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {unavailable ? "Triggers are disabled for this event." : "Active events generate in-app notifications."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className={cn("text-xs font-medium", form.active ? "text-emerald-600" : "text-muted-foreground")}>
                {form.active ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={form.active}
                disabled={unavailable}
                onCheckedChange={(v) => setForm({ ...form, active: v })}
              />
            </div>
          </div>
        </div>

        <div>
          <SectionLabel>Recipients</SectionLabel>
          <div className="space-y-2">
            {form.recipients.map((r, idx) => (
              <div key={`${r.kind}-${idx}`} className="flex items-start gap-2">
                <div className="flex-1 space-y-2">
                  <KindPicker
                    value={r.kind}
                    onChange={(kind) => setRecipient(idx, { kind })}
                  />
                  {r.kind === "specific_role" && (
                    <SearchPick
                      placeholder="Select role…"
                      options={roles.map((role) => ({ id: role.id, label: role.roleName }))}
                      value={r.roleId}
                      onChange={(id, label) => setRecipient(idx, { kind: "specific_role", roleId: id, roleName: label })}
                    />
                  )}
                  {r.kind === "specific_user" && (
                    <SearchPick
                      placeholder="Select user…"
                      options={users.map((u) => ({
                        id: u.id,
                        label: `${u.fullName} · ${u.role}`,
                      }))}
                      value={r.userId}
                      onChange={(id, label) =>
                        setRecipient(idx, { kind: "specific_user", userId: id, userName: label })
                      }
                    />
                  )}
                </div>
                <button
                  type="button"
                  className="h-9 w-9 flex items-center justify-center rounded-lg border border-border hover:bg-muted"
                  onClick={() => removeRecipient(idx)}
                  aria-label="Remove recipient"
                >
                  <X className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
              </div>
            ))}
            <button type="button" className="text-xs text-brand-600 hover:underline font-medium" onClick={addRecipient}>
              + Add recipient
            </button>
            <p className="text-[11px] text-muted-foreground">
              Selected: {formatRecipients(form.recipients) || "—"}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-[1fr_160px] gap-4">
          <div className="space-y-5 min-w-0">
            <div>
              <SectionLabel>In-App</SectionLabel>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium">Enabled</p>
                  <p className="text-[11px] text-muted-foreground">Delivered in the notification center.</p>
                </div>
                <ChannelPill on={form.inAppEnabled} />
                <Switch
                  checked={form.inAppEnabled}
                  disabled={unavailable}
                  onCheckedChange={(v) => setForm({ ...form, inAppEnabled: v })}
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Title</Label>
                  <Input
                    value={form.inAppTitle}
                    onFocus={() => setFocus("inAppTitle")}
                    onChange={(e) => setForm({ ...form, inAppTitle: e.target.value })}
                    className={hrInput()}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Message</Label>
                  <Textarea
                    rows={3}
                    value={form.inAppMessage}
                    onFocus={() => setFocus("inAppMessage")}
                    onChange={(e) => setForm({ ...form, inAppMessage: e.target.value })}
                    className={hrTextarea()}
                  />
                </div>
              </div>
            </div>

            <div>
              <SectionLabel>Email</SectionLabel>
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 mb-3">
                <p className="text-xs font-semibold text-amber-800">Email Delivery</p>
                <p className="text-[11px] text-amber-700 mt-0.5">Integration Pending</p>
              </div>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-xs font-medium">Enabled</p>
                  <p className="text-[11px] text-muted-foreground">Saved only — email is not sent.</p>
                </div>
                <Switch
                  checked={form.emailEnabled}
                  disabled={unavailable}
                  onCheckedChange={(v) => setForm({ ...form, emailEnabled: v })}
                />
              </div>
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Subject</Label>
                  <Input
                    value={form.emailSubject}
                    onFocus={() => setFocus("emailSubject")}
                    onChange={(e) => setForm({ ...form, emailSubject: e.target.value })}
                    className={hrInput()}
                    disabled={!form.emailEnabled}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Message</Label>
                  <Textarea
                    rows={3}
                    value={form.emailBody}
                    onFocus={() => setFocus("emailBody")}
                    onChange={(e) => setForm({ ...form, emailBody: e.target.value })}
                    className={hrTextarea()}
                    disabled={!form.emailEnabled}
                  />
                </div>
              </div>
            </div>

            {def.supportsReminder && (
              <div>
                <SectionLabel>Reminder</SectionLabel>
                <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 mb-3 space-y-1">
                  <p className="text-[11px] text-foreground">
                    <span className="font-semibold">Reminder Configuration</span> — Saved
                  </p>
                  <p className="text-[11px] text-amber-700">
                    <span className="font-semibold">Reminder Delivery</span> — Backend Scheduler Pending
                  </p>
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xs font-medium">Enabled</p>
                    <p className="text-[11px] text-muted-foreground">Timing is stored. Delivery is not scheduled.</p>
                  </div>
                  <Switch
                    checked={form.reminderEnabled}
                    disabled={unavailable}
                    onCheckedChange={(v) => setForm({ ...form, reminderEnabled: v })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium">Timing</Label>
                    <TimingPick
                      value={form.reminderTiming}
                      onChange={(v) => setForm({ ...form, reminderTiming: v })}
                    />
                  </div>
                  {def.supportsRepeat && (
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Repeat</Label>
                      <div className="flex flex-wrap gap-1.5">
                        {REMINDER_REPEAT_OPTIONS.map((o) => (
                          <button
                            key={o.value}
                            type="button"
                            onClick={() => setForm({ ...form, reminderRepeat: o.value })}
                            className={cn(
                              "h-7 px-2.5 text-xs rounded-lg border font-medium",
                              form.reminderRepeat === o.value
                                ? "bg-brand-600 text-white border-brand-600"
                                : "border-border text-muted-foreground hover:bg-muted",
                            )}
                          >
                            {o.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="rounded-xl border border-border bg-muted/20 p-3 h-fit">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Available Fields
            </p>
            <p className="text-[10px] text-muted-foreground mb-2">Click to insert into {focus}.</p>
            <div className="flex flex-wrap gap-1">
              {allowed.map((key) => (
                <button
                  key={key}
                  type="button"
                  title={placeholderLabel(key)}
                  onClick={() => insert(key)}
                  className="text-[10px] px-1.5 py-0.5 rounded-md border bg-white border-border hover:border-brand-400 hover:bg-brand-50 font-mono"
                >
                  {`{{${key}}}`}
                </button>
              ))}
            </div>
            {unknown.length > 0 && (
              <p className="text-[11px] text-amber-700 mt-2">
                Unknown field: {unknown.map((k) => `{{${k}}}`).join(", ")}
              </p>
            )}
            {findPlaceholders(`${form.inAppTitle} ${form.inAppMessage}`).length === 0 && (
              <p className="text-[10px] text-muted-foreground mt-2">No placeholders in the current title/message.</p>
            )}
          </div>
        </div>

        <div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={HR_BTN_CLASS}
            onClick={() => setPreview((p) => !p)}
          >
            {preview ? "Hide preview" : "Preview Notification"}
          </Button>
          {preview && (
            <div className="mt-3 space-y-3">
              <div className="rounded-xl border border-border bg-white p-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                  In-App Preview
                </p>
                <p className="text-xs font-semibold">{inAppPrev.text || "—"}</p>
                <p className="text-[11px] text-muted-foreground mt-1">{inAppMsgPrev.text || "—"}</p>
              </div>
              {form.emailEnabled && (
                <div className="rounded-xl border border-border bg-white p-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                    Email Preview
                  </p>
                  <p className="text-xs font-semibold">{emailSubPrev.text || "—"}</p>
                  <p className="text-[11px] text-muted-foreground mt-1 whitespace-pre-wrap">
                    {emailBodyPrev.text || "—"}
                  </p>
                  <p className="text-[10px] text-amber-700 mt-2">Not sent · Integration Pending</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </HrFormDrawer>
  );
}
