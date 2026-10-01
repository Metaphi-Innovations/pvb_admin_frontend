"use client";

import React, { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateDisplay, getEmployeeTypeLabel } from "../../../employees/employee-display";
import type { HrEmployee } from "../../../employees/employee-master-data";
import {
  applyWelcomePlaceholders,
  computeWelcomeIntendedSendDate,
  employeeHasWelcomeHistory,
  getWelcomeSendOnLabel,
  loadWelcomeSetup,
  logWelcomeCommunication,
  resolveEmployeeWelcomeEmail,
  resolveWelcomeTemplateForEmployee,
  type WelcomeChannel,
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
  const resolved = useMemo(
    () => resolveWelcomeTemplateForEmployee(employee),
    [open, employee],
  );
  const isResend = employeeHasWelcomeHistory(employee.id);
  const emailResolved = resolveEmployeeWelcomeEmail(employee);
  const intendedSend = computeWelcomeIntendedSendDate(employee.dateOfJoining, setup.sendOn);

  const channelOptions = useMemo(() => {
    const opts: { value: WelcomeChannel; label: string }[] = [];
    if (setup.welcomeEmail) opts.push({ value: "email", label: "Email" });
    if (setup.welcomeNotification) opts.push({ value: "notification", label: "Notification" });
    return opts;
  }, [setup]);

  const [channel, setChannel] = useState<WelcomeChannel | "">("");
  const [error, setError] = useState("");

  React.useEffect(() => {
    if (!open) return;
    setChannel(channelOptions[0]?.value ?? "");
    setError("");
  }, [open, channelOptions]);

  const previewVars = {
    employee_name: employee.employeeName,
    joining_date: formatDateDisplay(employee.dateOfJoining),
    designation: employee.designation || "—",
    department: employee.department || "—",
    branch: employee.branch || "—",
  };

  const handleSend = () => {
    setError("");
    // Re-resolve at action time (not stale)
    const live = resolveWelcomeTemplateForEmployee(employee);
    if (live.configurationRequired || !live.templateId) {
      setError(
        live.configurationMessage ||
          "Welcome template is not configured for this employee type.",
      );
      return;
    }
    if (!channel) {
      setError("Select a delivery channel.");
      return;
    }
    if (channel === "email" && emailResolved.source === "none") {
      setError("Recipient Email Missing. Add Company Email or Personal Email before sending.");
      return;
    }
    const result = logWelcomeCommunication({
      employee,
      channel,
      resolved: live,
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
            Template is resolved from Employee Type mapping (or fallback) at send time.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2.5 text-xs">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Employee Name</p>
              <p className="font-medium text-foreground">{employee.employeeName}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Employee Type</p>
              <p className="font-medium text-foreground">
                {getEmployeeTypeLabel(employee.employeeType)}
              </p>
            </div>
          </div>

          <div>
            <p className="text-[11px] text-muted-foreground">Recipient Email</p>
            <p className="font-medium text-foreground">
              {emailResolved.email || "Recipient Email Missing"}
              {emailResolved.source === "company" && (
                <span className="text-muted-foreground font-normal"> (Company)</span>
              )}
              {emailResolved.source === "personal" && (
                <span className="text-muted-foreground font-normal"> (Personal)</span>
              )}
            </p>
          </div>

          <div className="rounded-lg border border-border bg-muted/15 px-3 py-2 space-y-1">
            <p className="text-[11px] text-muted-foreground">Resolved Welcome Template</p>
            {resolved.configurationRequired ? (
              <p className="text-xs font-medium text-amber-800">{resolved.configurationMessage}</p>
            ) : (
              <>
                <p className="font-semibold text-foreground">{resolved.templateName}</p>
                <p className="text-[11px] text-muted-foreground">
                  Source:{" "}
                  {resolved.source === "mapping"
                    ? "Employee Type Mapping"
                    : resolved.source === "fallback"
                      ? "Fallback"
                      : "—"}
                </p>
              </>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="text-[11px] text-muted-foreground">Send On Rule</p>
              <p className="font-medium">{getWelcomeSendOnLabel(setup.sendOn)}</p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground">Intended Send Date</p>
              <p className="font-medium">
                {intendedSend ? formatDateDisplay(intendedSend) : "—"}
              </p>
            </div>
          </div>

          <div className="space-y-1">
            <p className="text-[11px] font-medium">Channel</p>
            {channelOptions.length === 0 ? (
              <p className="text-[11px] text-amber-700">
                Enable Welcome Email or Notification in Welcome Workflow → Delivery Setup.
              </p>
            ) : (
              <Select
                value={channel || undefined}
                onValueChange={(v) => setChannel(v as WelcomeChannel)}
              >
                <SelectTrigger className={hrSelect()}>
                  <SelectValue placeholder="Select channel" />
                </SelectTrigger>
                <SelectContent>
                  {channelOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {!resolved.configurationRequired && (
            <div className="rounded-lg border border-border bg-white p-2.5 max-h-40 overflow-y-auto">
              <p className="font-semibold text-foreground">
                {applyWelcomePlaceholders(resolved.subject, previewVars)}
              </p>
              <p className="text-muted-foreground mt-1 whitespace-pre-wrap">
                {applyWelcomePlaceholders(resolved.message, previewVars)}
              </p>
            </div>
          )}

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            type="button"
            size="sm"
            className={hrBtn("", true)}
            disabled={resolved.configurationRequired || channelOptions.length === 0}
            onClick={handleSend}
          >
            {isResend ? "Resend" : "Send Welcome"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
