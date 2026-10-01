"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  applyManualAttendanceCorrection,
  formatPunchTime,
  statusDisplayLabel,
  type AttendanceEmployeeDayRow,
} from "../attendance-ops";

type Mode = "present" | "absent" | "half_day" | "punches";

export function AttendanceCorrectionDrawer({
  open,
  row,
  onClose,
  onSaved,
}: {
  open: boolean;
  row: AttendanceEmployeeDayRow | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [mode, setMode] = useState<Mode>("punches");
  const [firstIn, setFirstIn] = useState("");
  const [lastOut, setLastOut] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!row) return;
    setFirstIn(row.firstIn || "");
    setLastOut(row.lastOut || "");
    setNote("");
    setError(null);
    setMode(row.firstIn || row.lastOut ? "punches" : "present");
  }, [row]);

  if (!row) return null;

  const save = () => {
    const result = applyManualAttendanceCorrection({
      employeeId: row.employee.id,
      date: row.date,
      mode,
      firstIn: firstIn || undefined,
      lastOut: lastOut || undefined,
      note: note || undefined,
    });
    if (!result.ok) {
      setError(result.error);
      return;
    }
    onSaved();
    onClose();
  };

  const r = row.resolution;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[440px] w-full p-0 flex flex-col">
        <SheetHeader className="px-5 pt-5 pb-4 border-b">
          <SheetTitle className="text-sm font-semibold">Edit Attendance</SheetTitle>
          <p className="text-[11px] text-muted-foreground">
            {row.employee.employeeName} · {row.employee.employeeCode} · {row.date}
          </p>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="rounded-[12px] border border-border bg-muted/20 px-3 py-2 space-y-1.5 text-[11px]">
            <Row label="Resolved status" value={statusDisplayLabel(row.status)} />
            <Row label="Shift" value={row.shiftName} />
            {r.evaluation?.shiftStart && (
              <Row
                label="Scheduled"
                value={`${formatPunchTime(r.evaluation.shiftStart)} – ${formatPunchTime(r.evaluation.shiftEnd ?? "")}`}
              />
            )}
            <Row label="First In" value={row.firstIn ? formatPunchTime(row.firstIn) : "—"} />
            <Row label="Last Out" value={row.lastOut ? formatPunchTime(row.lastOut) : "—"} />
            <Row label="Hours" value={row.workingHoursLabel} />
            <Row label="Late" value={row.lateMinutes > 0 ? `${row.lateMinutes}m` : "—"} />
            <Row label="Early Going" value={row.earlyMinutes > 0 ? `${row.earlyMinutes}m` : "—"} />
            <Row label="Overtime" value={row.overtimeMinutes > 0 ? `${row.overtimeMinutes}m` : "—"} />
            {r.scheduledPublicHoliday && <Row label="Holiday" value={r.holidayName ?? "Public Holiday"} />}
            {r.scheduledWeeklyOff && <Row label="Weekly Off" value={r.weekOffLabel ?? "Configured"} />}
            {r.approvedLeave && <Row label="Leave" value="Approved leave covers this date" />}
          </div>

          {row.record?.punches && row.record.punches.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1.5">
                Punch timeline
              </p>
              <ul className="space-y-1 text-[11px]">
                {row.record.punches.map((p) => (
                  <li key={p.id} className="flex justify-between border-b border-border/40 py-1">
                    <span className="capitalize">{p.type}</span>
                    <span className="font-medium">
                      {formatPunchTime(p.time)}
                      {p.sourceDetail ? (
                        <span className="text-muted-foreground font-normal"> · {p.sourceDetail}</span>
                      ) : null}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
              Admin correction
            </p>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(
                [
                  ["punches", "Edit punches"],
                  ["present", "Mark Present"],
                  ["half_day", "Mark Half Day"],
                  ["absent", "Mark Absent"],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setMode(v)}
                  className={cn(
                    "h-7 px-2.5 text-[11px] rounded-[10px] border font-medium",
                    mode === v
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs font-medium">Punch In</Label>
                <Input
                  type="time"
                  value={firstIn}
                  onChange={(e) => setFirstIn(e.target.value)}
                  className="h-9 text-sm rounded-[10px]"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs font-medium">Punch Out</Label>
                <Input
                  type="time"
                  value={lastOut}
                  onChange={(e) => setLastOut(e.target.value)}
                  className="h-9 text-sm rounded-[10px]"
                />
              </div>
            </div>
            <div className="space-y-1 mt-2">
              <Label className="text-xs font-medium">Note / reason</Label>
              <Input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Reason for correction…"
                className="h-9 text-sm rounded-[10px]"
              />
            </div>
            {error && <p className="text-xs text-red-500 mt-2">{error}</p>}
            <p className="text-[11px] text-muted-foreground mt-2">
              Holiday / Weekly Off come from Settings. Approved Leave comes from Leave Requests — do not
              mark Leave here.
            </p>
          </div>
        </SheetBody>
        <SheetFooter className="px-5 py-3 border-t bg-muted/30">
          <Button variant="outline" size="sm" className="h-8 text-xs rounded-[10px]" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white"
            onClick={save}
          >
            Save correction
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-muted-foreground shrink-0">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}
