"use client";

import { useState } from "react";
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
import { getSfEmployees } from "../sf-attendance-data";

type BulkStatus = "present" | "absent";

export function BulkMarkAttendanceDrawer({
  open,
  onClose,
  onSave,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (opts: {
    employeeIds: number[];
    dateFrom: string;
    dateTo: string;
    status: BulkStatus;
    remarks: string;
    overrideHoliday?: boolean;
    overrideWeekOff?: boolean;
  }) => void;
}) {
  const employees = getSfEmployees();
  const territories = [...new Set(employees.map((e) => e.territory))];
  const roles = [...new Set(employees.map((e) => e.roleName))];

  const [scope, setScope] = useState<"all" | "territory" | "role" | "employee">("all");
  const [territory, setTerritory] = useState(territories[0] ?? "");
  const [role, setRole] = useState(roles[0] ?? "");
  const [employeeId, setEmployeeId] = useState(String(employees[0]?.employeeId ?? ""));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [status, setStatus] = useState<BulkStatus>("present");
  const [remarks, setRemarks] = useState("");
  const [overrideHoliday, setOverrideHoliday] = useState(false);
  const [overrideWeekOff, setOverrideWeekOff] = useState(false);

  const resolveIds = (): number[] => {
    if (scope === "all") return employees.map((e) => e.employeeId);
    if (scope === "territory") return employees.filter((e) => e.territory === territory).map((e) => e.employeeId);
    if (scope === "role") return employees.filter((e) => e.roleName === role).map((e) => e.employeeId);
    return [Number(employeeId)];
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="sm:max-w-md flex flex-col p-0">
        <SheetHeader className="px-5 pt-5 pb-3 border-b">
          <SheetTitle className="text-sm font-semibold">Bulk Mark Attendance</SheetTitle>
          <p className="text-xs text-muted-foreground">Mark Present or Absent for a date range. Holidays and week offs are skipped unless overridden.</p>
        </SheetHeader>
        <SheetBody className="px-5 py-4 space-y-3 text-xs flex-1">
          <div className="space-y-1">
            <Label className="text-[11px]">Apply To</Label>
            <Select value={scope} onValueChange={(v) => setScope(v as typeof scope)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Sales Force</SelectItem>
                <SelectItem value="territory" className="text-xs">Territory</SelectItem>
                <SelectItem value="role" className="text-xs">Role</SelectItem>
                <SelectItem value="employee" className="text-xs">Employee</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {scope === "territory" && (
            <Select value={territory} onValueChange={setTerritory}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{territories.map((t) => <SelectItem key={t} value={t} className="text-xs">{t}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {scope === "role" && (
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{roles.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
            </Select>
          )}
          {scope === "employee" && (
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>{employees.map((e) => <SelectItem key={e.employeeId} value={String(e.employeeId)} className="text-xs">{e.employeeName}</SelectItem>)}</SelectContent>
            </Select>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1"><Label className="text-[11px]">From Date</Label><Input type="date" className="h-8 text-xs" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} /></div>
            <div className="space-y-1"><Label className="text-[11px]">To Date</Label><Input type="date" className="h-8 text-xs" value={dateTo} onChange={(e) => setDateTo(e.target.value)} /></div>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as BulkStatus)}>
              <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="present" className="text-xs">Present</SelectItem>
                <SelectItem value="absent" className="text-xs">Absent</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-[11px]">Remarks</Label>
            <Textarea className="min-h-[60px] text-xs resize-none" value={remarks} onChange={(e) => setRemarks(e.target.value)} placeholder="Optional remarks" />
          </div>
          <label className="flex items-center gap-2">
            <Checkbox checked={overrideHoliday} onCheckedChange={(v) => setOverrideHoliday(!!v)} />
            <span className="text-[11px]">Override configured holidays</span>
          </label>
          <label className="flex items-center gap-2">
            <Checkbox checked={overrideWeekOff} onCheckedChange={(v) => setOverrideWeekOff(!!v)} />
            <span className="text-[11px]">Override configured week offs</span>
          </label>
        </SheetBody>
        <SheetFooter className="px-5 py-3 border-t flex-row gap-2 justify-end">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            disabled={!dateFrom || !dateTo}
            onClick={() => {
              onSave({
                employeeIds: resolveIds(),
                dateFrom,
                dateTo,
                status,
                remarks,
                overrideHoliday,
                overrideWeekOff,
              });
              onClose();
            }}
          >
            Apply Bulk Mark
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
