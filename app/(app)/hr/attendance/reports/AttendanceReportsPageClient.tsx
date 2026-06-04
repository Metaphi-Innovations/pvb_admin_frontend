"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { MONTH_OPTIONS } from "@/lib/hr/config";
import { getMonthlyAttendanceReport } from "../sync/attendance-sync-data";

export default function AttendanceReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const monthlyRows = useMemo(
    () => getMonthlyAttendanceReport(month, year),
    [month, year],
  );

  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Attendance Reports</h1>
            <p className="text-xs text-muted-foreground">
              <Link href="/hr/attendance/sync" className="text-brand-600 hover:underline">
                Attendance Sync
              </Link>
              {" · "}Monthly summary from synced records.
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-8 w-[120px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-[90px] text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[year - 1, year, year + 1].map((y) => (
                  <SelectItem key={y} value={String(y)} className="text-xs">{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="monthly">
          <TabsList className="h-8">
            <TabsTrigger value="monthly" className="text-xs h-7">Monthly Attendance Report</TabsTrigger>
            <TabsTrigger value="summary" className="text-xs h-7">Employee Attendance Summary</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-3">
            <ReportTable rows={monthlyRows} title={`Monthly Attendance — ${MONTH_OPTIONS.find((m) => m.value === month)?.label} ${year}`} />
          </TabsContent>
          <TabsContent value="summary" className="mt-3">
            <ReportTable rows={monthlyRows} title="Employee Attendance Summary" />
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}

function ReportTable({
  rows,
  title,
}: {
  rows: ReturnType<typeof getMonthlyAttendanceReport>;
  title: string;
}) {
  return (
    <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
      <div className="px-3 py-2 border-b text-xs font-semibold">{title}</div>
      <table className="w-full text-xs">
        <thead className="bg-muted/30">
          <tr>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Employee</th>
            <th className="px-3 py-2 text-left text-[11px] font-medium text-muted-foreground">Department</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground">Present</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground">Absent</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground">Leave</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground">WFH</th>
            <th className="px-3 py-2 text-right text-[11px] font-medium text-muted-foreground">Half Day</th>
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">
                No attendance data for this period.
              </td>
            </tr>
          ) : (
            rows.map((r) => (
              <tr key={r.employeeId} className="border-t border-border/40">
                <td className="px-3 py-2">
                  <span className="font-medium">{r.employeeName}</span>
                  <span className="text-muted-foreground ml-1 font-mono text-[10px]">{r.employeeCode}</span>
                </td>
                <td className="px-3 py-2 text-muted-foreground">{r.department}</td>
                <td className="px-3 py-2 text-right font-medium text-emerald-700">{r.presentDays}</td>
                <td className="px-3 py-2 text-right text-red-600">{r.absentDays}</td>
                <td className="px-3 py-2 text-right text-blue-600">{r.leaveDays}</td>
                <td className="px-3 py-2 text-right text-violet-600">{r.wfhDays}</td>
                <td className="px-3 py-2 text-right text-amber-600">{r.halfDays}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
