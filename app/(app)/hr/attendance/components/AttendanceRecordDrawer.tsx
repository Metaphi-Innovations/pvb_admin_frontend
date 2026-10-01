"use client";

import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import {
  SOURCE_LABELS,
  formatPunchTime,
  type DailyAttendanceRecord,
} from "../attendance-data";
import { LogIn, LogOut } from "lucide-react";

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-1.5 border-b border-border/40 last:border-0">
      <span className="text-[11px] text-muted-foreground shrink-0">{label}</span>
      <span className="text-[11px] font-medium text-right">{value}</span>
    </div>
  );
}

export function AttendanceRecordDrawer({
  record,
  open,
  onClose,
}: {
  record: DailyAttendanceRecord | null;
  open: boolean;
  onClose: () => void;
}) {
  if (!record) return null;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className="max-w-[460px] w-full p-0 flex flex-col">
        <SheetHeader className="px-4 py-3 border-b">
          <SheetTitle className="text-sm font-semibold">Attendance Record</SheetTitle>
          <p className="text-xs text-muted-foreground">{record.employeeName}</p>
        </SheetHeader>
        <SheetBody className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Details
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-1">
              <DetailRow label="Date" value={record.date} />
              <DetailRow label="Day" value={record.dayName} />
              <DetailRow
                label="Status"
                value={<HrStatusBadge status={record.attendanceStatus} />}
              />
              <DetailRow label="Shift" value={record.shift} />
              <DetailRow label="Working Hours" value={record.workingHours} />
              <DetailRow label="Late By" value={record.lateBy} />
              <DetailRow label="Early Exit" value={record.earlyExit} />
            </div>
          </section>

          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Punch Timeline
            </p>
            {record.punches.length === 0 ? (
              <p className="text-xs text-muted-foreground">No punches recorded.</p>
            ) : (
              <ul className="space-y-2">
                {record.punches.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-start gap-2.5 text-xs border-l-2 border-brand-200 pl-3 py-0.5"
                  >
                    {p.type === "in" ? (
                      <LogIn className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                    ) : (
                      <LogOut className="w-3.5 h-3.5 text-amber-600 mt-0.5 shrink-0" />
                    )}
                    <div>
                      <p className="font-semibold">
                        {formatPunchTime(p.time)}{" "}
                        <span className="font-normal text-muted-foreground capitalize">
                          {p.type}
                        </span>
                      </p>
                      {p.sourceDetail && (
                        <p className="text-[10px] text-muted-foreground mt-0.5">{p.sourceDetail}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Attendance Source
            </p>
            <p className="text-xs font-medium">{SOURCE_LABELS[record.source]}</p>
          </section>

          <section>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">
              Audit
            </p>
            <div className="rounded-lg border border-border/60 bg-muted/10 px-3 py-1">
              <DetailRow label="Created By" value={record.createdBy} />
              <DetailRow label="Updated By" value={record.updatedBy} />
              <DetailRow
                label="Correction Requested By"
                value={record.correctionRequestedBy ?? "—"}
              />
              <DetailRow
                label="Correction Approved By"
                value={record.correctionApprovedBy ?? "—"}
              />
            </div>
          </section>

          {record.note && (
            <section>
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                Note
              </p>
              <p className="text-xs text-muted-foreground">{record.note}</p>
            </section>
          )}
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
