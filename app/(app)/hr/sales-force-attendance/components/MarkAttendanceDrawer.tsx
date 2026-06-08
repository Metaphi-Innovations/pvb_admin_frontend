"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  getHolidayWarning,
  getWeekOffWarning,
  getSfEmployees,
} from "../sf-attendance-data";

type MarkStatus = "present" | "absent";

export function MarkAttendanceDrawer({
  open,
  onClose,
  defaultEmployeeId,
  defaultDate,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  defaultEmployeeId?: number;
  defaultDate?: string;
  onSave: (
    employeeId: number,
    date: string,
    status: MarkStatus,
    remarks: string,
    overrideHoliday: boolean,
    overrideWeekOff: boolean,
  ) => void;
}) {
  const employees = getSfEmployees();
  const [employeeId, setEmployeeId] = useState(String(defaultEmployeeId ?? ""));
  const [date, setDate] = useState(defaultDate ?? new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState<MarkStatus>("present");
  const [remarks, setRemarks] = useState("");
  const [overrideHoliday, setOverrideHoliday] = useState(false);
  const [overrideWeekOff, setOverrideWeekOff] = useState(false);

  useEffect(() => {
    if (open) {
      setEmployeeId(String(defaultEmployeeId ?? employees[0]?.employeeId ?? ""));
      setDate(defaultDate ?? new Date().toISOString().slice(0, 10));
      setStatus("present");
      setRemarks("");
      setOverrideHoliday(false);
      setOverrideWeekOff(false);
    }
  }, [open, defaultEmployeeId, defaultDate, employees]);

  const holidayWarning = employeeId && date ? getHolidayWarning(Number(employeeId), date) : null;
  const weekOffWarning = employeeId && date ? getWeekOffWarning(Number(employeeId), date) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-sm font-semibold">Mark Attendance</SheetTitle>
          <p className="text-xs text-muted-foreground">Holiday and Week Off are system-generated. Mark Present or Absent only.</p>
        </SheetHeader>
        <SheetBody className="px-5 py-4 space-y-3 text-xs flex-1">
          <div className="space-y-1">
            <Label className="text-[11px]">Employee</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {employees.map((e) => <SelectItem key={e.employeeId} value={String(e.employeeId)} className="text-xs">{e.employeeName} ({e.roleName})</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Date</Label>
            <Input type="date" className="h-8 text-xs" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>
          {holidayWarning && (
            <div className="rounded border border-amber-200 bg-amber-50 p-2 text-[11px] text-amber-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold">This date is configured as Holiday.</p>
                <p className="mt-1">{holidayWarning}</p>
                <label className="flex items-center gap-2 mt-2">
                  <Checkbox checked={overrideHoliday} onCheckedChange={(v) => setOverrideHoliday(!!v)} />
                  Override holiday and mark as {status}
                </label>
              </div>
            </div>
          )}
          {weekOffWarning && !holidayWarning && (
            <div className="rounded border border-stone-200 bg-stone-50 p-2 text-[11px] text-stone-800 flex gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <div>
                <p className="font-semibold">This date is configured as Week Off.</p>
                <p className="mt-1">{weekOffWarning}</p>
                <label className="flex items-center gap-2 mt-2">
                  <Checkbox checked={overrideWeekOff} onCheckedChange={(v) => setOverrideWeekOff(!!v)} />
                  Override week off and mark as {status}
                </label>
              </div>
            </div>
          )}
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as MarkStatus)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="present" className="text-xs">Present</SelectItem>
                <SelectItem value="absent" className="text-xs">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Remarks</Label>
            <Textarea className="min-h-[72px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} />
          </div>
        </SheetBody>
        <SheetFooter className="px-5 py-3 border-t flex-row gap-2 justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!employeeId}
            onClick={() => {
              onSave(Number(employeeId), date, status, remarks, overrideHoliday, overrideWeekOff);
              onClose();
            }}
          >
            Save
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
