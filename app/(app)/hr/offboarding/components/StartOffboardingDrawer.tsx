"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HrDateInput } from "@/app/(app)/hr/components/HrDateInput";
import { hrBtn, HrOrgField } from "@/app/(app)/hr/settings/organization/_components";
import { Switch } from "@/components/ui/switch";
import {
  getActiveHrEmployees,
  type HrEmployee,
} from "@/app/(app)/hr/employees/employee-master-data";
import { policyToday } from "@/lib/hr/policy-common";
import { HrLetterCombobox } from "@/app/(app)/hr/hr-letters/components/HrLetterCombobox";
import {
  eligibleOffboardingEmployees,
  EXIT_TYPE_OPTIONS,
  LEAVING_REASON_OPTIONS,
  startOffboarding,
  type LeavingReasonKey,
  type OffboardingExitType,
} from "../offboarding-data";
import { OffboardingEmployeePicker } from "./OffboardingEmployeePicker";

export function StartOffboardingDrawer({
  open,
  onOpenChange,
  lockedEmployeeId,
  onStarted,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  lockedEmployeeId?: number | null;
  onStarted?: (id: string) => void;
}) {
  const router = useRouter();
  const [employees, setEmployees] = useState<HrEmployee[]>([]);
  const [employeeId, setEmployeeId] = useState<number | null>(null);
  const [exitType, setExitType] = useState<OffboardingExitType>("resignation");
  const [initiatedDate, setInitiatedDate] = useState(policyToday());
  const [lwd, setLwd] = useState("");
  const [reasonKey, setReasonKey] = useState<LeavingReasonKey | "">("");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState("");
  const [resignationDate, setResignationDate] = useState(policyToday());
  const [terminationDate, setTerminationDate] = useState(policyToday());
  const [immediate, setImmediate] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [requiredDays, setRequiredDays] = useState("");
  const [servedDays, setServedDays] = useState("");
  const [lastAttended, setLastAttended] = useState("");
  const [reported, setReported] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEmployees(eligibleOffboardingEmployees(getActiveHrEmployees()));
    setEmployeeId(lockedEmployeeId ?? null);
    setExitType("resignation");
    setInitiatedDate(policyToday());
    setLwd("");
    setReasonKey("");
    setReason("");
    setNotes("");
    setResignationDate(policyToday());
    setTerminationDate(policyToday());
    setImmediate(false);
    setWaiver(false);
    setRequiredDays("");
    setServedDays("");
    setLastAttended("");
    setReported("");
    setErrors({});
    setBanner(null);
  }, [open, lockedEmployeeId]);

  const eligible = useMemo(() => {
    const list = [...employees];
    return list;
  }, [employees]);

  const handleStart = () => {
    const e: Record<string, string> = {};
    if (employeeId == null) e.employee = "Employee is required";
    if (!exitType) e.exitType = "Exit Type is required";
    if (!initiatedDate) e.initiatedDate = "Initiated Date is required";
    if (!lwd) e.lwd = "Proposed Last Working Date is required";
    if (!reasonKey) e.reasonKey = "Reason is required";
    if (reasonKey === "other" && !reason.trim()) e.reason = "Please describe the reason";
    setErrors(e);
    if (Object.keys(e).length) return;

    setBusy(true);
    const result = startOffboarding({
      employeeId: employeeId!,
      exitType,
      initiatedDate,
      lastWorkingDate: lwd,
      reasonKey,
      reason,
      internalNotes: notes,
      resignationDate: exitType === "resignation" ? resignationDate : "",
      terminationDate: exitType === "termination" ? terminationDate : "",
      immediateExit: exitType === "termination" ? immediate : false,
      noticeWaiver: exitType === "resignation" ? waiver : false,
      requiredNoticeDays: requiredDays,
      servedNoticeDays: servedDays,
      lastAttendedDate: exitType === "absconding" ? lastAttended : "",
      reportedDate: exitType === "absconding" ? reported : "",
    });
    setBusy(false);
    if (!result.ok) {
      setBanner(result.error);
      return;
    }
    onOpenChange(false);
    onStarted?.(result.record.id);
    router.push(`/hr/offboarding/${result.record.id}`);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full max-w-[800px] flex flex-col p-0 gap-0">
        <SheetHeader className="px-5 pt-4 pb-3 pr-12">
          <SheetTitle className="text-[15px] font-semibold">Start Offboarding</SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            Initiate an employee exit. Checklist and letters are completed on the process page.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-5 py-4 space-y-4">
          {banner ? (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700 flex gap-2">
              <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              {banner}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <HrOrgField label="Employee" required error={errors.employee}>
              <OffboardingEmployeePicker
                employees={eligible}
                valueId={employeeId}
                disabled={lockedEmployeeId != null}
                error={!!errors.employee}
                onChange={(emp) => setEmployeeId(emp?.id ?? null)}
              />
            </HrOrgField>
            <HrOrgField label="Exit Type" required error={errors.exitType}>
              <HrLetterCombobox
                value={exitType}
                onChange={(v) => setExitType(v as OffboardingExitType)}
                placeholder="Select exit type…"
                options={EXIT_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </HrOrgField>
            <HrOrgField label="Initiated Date" required error={errors.initiatedDate}>
              <HrDateInput value={initiatedDate} onChange={setInitiatedDate} />
            </HrOrgField>
            <HrOrgField label="Proposed Last Working Date" required error={errors.lwd}>
              <HrDateInput value={lwd} onChange={setLwd} />
            </HrOrgField>

            {exitType === "resignation" ? (
              <>
                <HrOrgField label="Resignation Date">
                  <HrDateInput value={resignationDate} onChange={setResignationDate} />
                </HrOrgField>
                <HrOrgField label="Required Notice Days">
                  <Input
                    value={requiredDays}
                    onChange={(e) => setRequiredDays(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Days"
                    className="h-9 text-sm rounded-lg"
                  />
                </HrOrgField>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 md:col-span-2">
                  <div>
                    <p className="text-xs font-medium">Notice Waiver / Shortfall</p>
                    <p className="text-[11px] text-muted-foreground">
                      Financial recovery is handled later in Full & Final.
                    </p>
                  </div>
                  <Switch checked={waiver} onCheckedChange={setWaiver} />
                </div>
              </>
            ) : null}

            {exitType === "termination" ? (
              <>
                <HrOrgField label="Termination Date">
                  <HrDateInput value={terminationDate} onChange={setTerminationDate} />
                </HrOrgField>
                <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2">
                  <div>
                    <p className="text-xs font-medium">Immediate exit</p>
                    <p className="text-[11px] text-muted-foreground">Skip notice period</p>
                  </div>
                  <Switch checked={immediate} onCheckedChange={setImmediate} />
                </div>
              </>
            ) : null}

            {exitType === "absconding" ? (
              <>
                <HrOrgField label="Last Attended Date">
                  <HrDateInput value={lastAttended} onChange={setLastAttended} />
                </HrOrgField>
                <HrOrgField label="Reported / Identified Date">
                  <HrDateInput value={reported} onChange={setReported} />
                </HrOrgField>
              </>
            ) : null}

            {!immediate && exitType !== "absconding" ? (
              <>
                <HrOrgField label="Served Notice Days" helper="Employee notice policy is not on the master yet.">
                  <Input
                    value={servedDays}
                    onChange={(e) => setServedDays(e.target.value.replace(/[^\d]/g, ""))}
                    placeholder="Days"
                    className="h-9 text-sm rounded-lg"
                  />
                </HrOrgField>
                {exitType !== "resignation" ? (
                  <HrOrgField label="Required Notice Days">
                    <Input
                      value={requiredDays}
                      onChange={(e) => setRequiredDays(e.target.value.replace(/[^\d]/g, ""))}
                      placeholder="Days"
                      className="h-9 text-sm rounded-lg"
                    />
                  </HrOrgField>
                ) : null}
              </>
            ) : null}

            <HrOrgField label="Reason" required error={errors.reasonKey} size="md">
              <HrLetterCombobox
                value={reasonKey}
                onChange={(v) => setReasonKey(v as LeavingReasonKey)}
                placeholder="Select reason…"
                error={!!errors.reasonKey}
                options={LEAVING_REASON_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              />
            </HrOrgField>
            {reasonKey === "other" ? (
              <HrOrgField label="Reason details" required error={errors.reason} size="md">
                <Input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="h-9 text-sm rounded-lg"
                  placeholder="Describe…"
                />
              </HrOrgField>
            ) : null}
          </div>

          <HrOrgField label="Remarks / Internal Notes" helper="Internal only — not printed on letters.">
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              className="text-sm rounded-lg"
              placeholder="Internal notes…"
            />
          </HrOrgField>
        </SheetBody>
        <SheetFooter className="px-5 py-3 gap-2">
          <Button type="button" variant="outline" size="sm" className={hrBtn()} onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" size="sm" className={hrBtn("", true)} onClick={handleStart} disabled={busy}>
            Start Offboarding
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
