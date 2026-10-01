"use client";

import React, { useMemo, useState } from "react";
import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateDisplay } from "../../../employees/employee-display";
import type { HrEmployee } from "../../../employees/employee-master-data";
import {
  applyWelcomePlaceholders,
  employeeHasWelcomeHistory,
  formatWelcomeMaterialLabel,
  getActiveWelcomeTemplates,
  loadWelcomeSetup,
  logWelcomeCommunication,
  resolveEmployeeWelcomeEmail,
  type WelcomeChannel,
  type WelcomeTemplateRecord,
} from "../../welcome-workflow-data";
import { hrSelect, hrBtn } from "../../organization/_components";

export function SendWelcomeDialog({
  open,
  onOpenChange,
  employee,
  onSent,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  employee: HrEmployee;
  onSent?: () => void;
}) {
  const setup = useMemo(() => loadWelcomeSetup(), [open]);
  const templates = useMemo(() => getActiveWelcomeTemplates(), [open]);
  const isResend = employeeHasWelcomeHistory(employee.id);
  const resolved = resolveEmployeeWelcomeEmail(employee);

  const channelOptions = useMemo(() => {
    const opts: { value: WelcomeChannel; label: string }[] = [];
    if (setup.welcomeEmail) opts.push({ value: "email", label: "Email" });
    if (setup.welcomeNotification) opts.push({ value: "notification", label: "Notification" });
    return opts;
  }, [setup]);

  const [templateId, setTemplateId] = useState<number | "">("");
  const [channel, setChannel] = useState<WelcomeChannel | "">("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!open) return;
    const def =
      templates.find((t) => t.id === setup.defaultTemplateId) ?? templates[0];
    setTemplateId(def?.id ?? "");
    setChannel(channelOptions[0]?.value ?? "");
    setError("");
  }, [open, templates, setup.defaultTemplateId, channelOptions]);

  const template: WelcomeTemplateRecord | undefined = templates.find(
    (t) => t.id === templateId,
  );

  const previewVars = {
    employee_name: employee.employeeName,
    joining_date: formatDateDisplay(employee.dateOfJoining),
    designation: employee.designation || "—",
    department: employee.department || "—",
    branch: employee.branch || "—",
  };

  const handleSend = () => {
    setError("");
    if (!template) {
      setError("Select a welcome template.");
      return;
    }
    if (!channel) {
      setError("Select a delivery channel.");
      return;
    }
    const result = logWelcomeCommunication({
      employee,
      template,
      channel,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSent?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-[16px] p-4 gap-3">
        <DialogHeader className="space-y-1">
          <DialogTitle className="text-sm font-semibold">
            {isResend ? "Resend Welcome" : "Send Welcome"}
          </DialogTitle>
          <DialogDescription className="text-[11px]">
            Review recipient, template, and channel before sending.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Employee Name</p>
              <p className="font-medium text-foreground">{employee.employeeName}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Employee Code</p>
              <p className="font-mono font-semibold text-brand-700">{employee.employeeCode}</p>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground">Recipient Email</p>
            <p className="font-medium text-foreground">
              {resolved.email || "—"}
              {resolved.source === "company" && (
                <span className="text-muted-foreground font-normal"> (Company)</span>
              )}
              {resolved.source === "personal" && (
                <span className="text-muted-foreground font-normal"> (Personal)</span>
              )}
            </p>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium">Template</p>
            {templates.length === 0 ? (
              <p className="text-[11px] text-amber-700">
                No active welcome templates. Add one under Welcome Workflow → Templates.
              </p>
            ) : (
              <Select
                value={templateId === "" ? undefined : String(templateId)}
                onValueChange={(v) => setTemplateId(Number(v))}
              >
                <SelectTrigger className={cn(hrSelect(), "h-9 text-xs")}>
                  <SelectValue placeholder="Select template…" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)} className="text-xs">
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium">Channel</p>
            {channelOptions.length === 0 ? (
              <p className="text-[11px] text-amber-700">
                Enable Welcome Email or Welcome Notification in Welcome Setup.
              </p>
            ) : (
              <Select
                value={channel || undefined}
                onValueChange={(v) => setChannel(v as WelcomeChannel)}
              >
                <SelectTrigger className={cn(hrSelect(), "h-9 text-xs")}>
                  <SelectValue placeholder="Select channel…" />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {template && (
            <div className="rounded-[10px] border border-border bg-muted/20 p-2.5 space-y-1.5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Preview
              </p>
              <p className="text-[11px]">
                <span className="text-muted-foreground">Subject: </span>
                <span className="font-medium">
                  {applyWelcomePlaceholders(template.subject, previewVars)}
                </span>
              </p>
              <p className="text-[11px] whitespace-pre-wrap leading-snug">
                {applyWelcomePlaceholders(template.message, previewVars)}
              </p>
              <p className="text-[11px]">
                <span className="text-muted-foreground">Material: </span>
                {formatWelcomeMaterialLabel({
                  attachments: template.attachments,
                  videoLink: template.videoLink,
                })}
              </p>
              {template.attachments.length > 0 && (
                <ul className="space-y-0.5">
                  {template.attachments.map((a) => (
                    <li key={a.id} className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <FileText className="w-3 h-3 shrink-0" />
                      {a.fileName}
                    </li>
                  ))}
                </ul>
              )}
              {template.videoLink.trim() && (
                <a
                  href={template.videoLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-brand-700 hover:underline"
                >
                  Video link <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={hrBtn()}
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={hrBtn("", true)}
            onClick={handleSend}
            disabled={!template || !channel}
          >
            Send
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
