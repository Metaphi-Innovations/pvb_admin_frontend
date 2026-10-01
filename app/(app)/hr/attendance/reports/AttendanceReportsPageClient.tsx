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
import { buildDashboardRows, buildAttendanceForDate, todayIso } from "../attendance-ops";
import { getMonthlyAttendanceReport } from "../sync/attendance-sync-data";

export default function AttendanceReportsPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [dailyDate, setDailyDate] = useState(todayIso());

  const monthKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthlyRows = useMemo(() => buildDashboardRows(monthKey), [monthKey]);
  const historyRows = useMemo(
    () => getMonthlyAttendanceReport(month, year),
    [month, year],
  );
  const dailyRows = useMemo(() => buildAttendanceForDate(dailyDate), [dailyDate]);

  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-lg font-semibold">Attendance Reports</h1>
            <p className="text-xs text-muted-foreground">
              Totals reconcile with{" "}
              <Link href="/hr/attendance/dashboard" className="text-brand-600 hover:underline">
                Attendance Dashboard
              </Link>{" "}
              via canonical daily resolution (not the Sync prototype store).
            </p>
          </div>
          <div className="flex gap-2">
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="h-8 w-[120px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={String(m.value)} className="text-xs">{m.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="h-8 w-[90px] text-xs rounded-[10px]"><SelectValue /></SelectTrigger>
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
            <TabsTrigger value="monthly" className="text-xs h-7">Monthly Summary</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs h-7">Daily Report</TabsTrigger>
            <TabsTrigger value="history" className="text-xs h-7">Employee History</TabsTrigger>
          </TabsList>

          <TabsContent value="monthly" className="mt-3">
            <div className="bg-white border border-border/60 rounded-[12px] overflow-hidden">
              <div className="px-3 py-2 border-b text-xs font-semibold">
                Monthly Attendance — {MONTH_OPTIONS.find((m) => m.value === month)?.label} {year}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/30">
                    <tr>
                      <th className="px-3 py-2 text-left">Employee</th>
                      <th className="px-3 py-2 text-right">Present</th>
                      <th className="px-3 py-2 text-right">Absent</th>
                      <th className="px-3 py-2 text-right">Half</th>
                      <th className="px-3 py-2 text-right">Leave</th>
                      <th className="px-3 py-2 text-right">WO</th>
                      <th className="px-3 py-2 text-right">Holiday</th>
                      <th className="px-3 py-2 text-right">Late</th>
                      <th className="px-3 py-2 text-right">Early</th>
                      <th className="px-3 py-2 text-right">OT (min)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyRows.map((r, i) => (
                      <tr key={r.employee.id} className={i % 2 === 1 ? "bg-muted/20 border-t" : "border-t"}>
                        <td className="px-3 py-2">
                          <Link href={`/hr/attendance/${r.employee.id}?month=${monthKey}`} className="font-medium hover:text-brand-700">
                            {r.employee.employeeName}
                          </Link>
                          <span className="text-muted-foreground ml-1 font-mono text-[10px]">{r.employee.employeeCode}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-emerald-700">{r.present}</td>
                        <td className="px-3 py-2 text-right text-red-600">{r.absent}</td>
                        <td className="px-3 py-2 text-right">{r.halfDay}</td>
                        <td className="px-3 py-2 text-right">{r.leave}</td>
                        <td className="px-3 py-2 text-right">{r.weekOff}</td>
                        <td className="px-3 py-2 text-right">{r.holiday}</td>
                        <td className="px-3 py-2 text-right">{r.late}</td>
                        <td className="px-3 py-2 text-right">{r.earlyGoing}</td>
                        <td className="px-3 py-2 text-right">{r.overtimeMinutes || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="daily" className="mt-3 space-y-2">
            <input
              type="date"
              value={dailyDate}
              onChange={(e) => setDailyDate(e.target.value)}
              className="h-8 px-2 text-xs border border-border rounded-[10px]"
            />
            <div className="bg-white border rounded-[12px] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-left">Status</th>
                    <th className="px-3 py-2 text-left">In</th>
                    <th className="px-3 py-2 text-left">Out</th>
                    <th className="px-3 py-2 text-right">Late</th>
                    <th className="px-3 py-2 text-right">OT</th>
                  </tr>
                </thead>
                <tbody>
                  {dailyRows.map((r, i) => (
                    <tr key={r.employee.id} className={i % 2 === 1 ? "bg-muted/20 border-t" : "border-t"}>
                      <td className="px-3 py-2 font-medium">{r.employee.employeeName}</td>
                      <td className="px-3 py-2">{r.statusLabel}</td>
                      <td className="px-3 py-2">{r.firstIn || "—"}</td>
                      <td className="px-3 py-2">{r.lastOut || "—"}</td>
                      <td className="px-3 py-2 text-right">{r.lateMinutes || "—"}</td>
                      <td className="px-3 py-2 text-right">{r.overtimeMinutes || "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="history" className="mt-3">
            <p className="text-[11px] text-muted-foreground mb-2">
              Compact history view (canonical monthly totals). Open an employee for full calendar.
            </p>
            <div className="bg-white border rounded-[12px] overflow-hidden">
              <table className="w-full text-xs">
                <thead className="bg-muted/30">
                  <tr>
                    <th className="px-3 py-2 text-left">Employee</th>
                    <th className="px-3 py-2 text-right">Present</th>
                    <th className="px-3 py-2 text-right">Absent</th>
                    <th className="px-3 py-2 text-right">Leave</th>
                    <th className="px-3 py-2 text-right">Half Day</th>
                  </tr>
                </thead>
                <tbody>
                  {historyRows.map((r, i) => (
                    <tr key={r.employeeId} className={i % 2 === 1 ? "bg-muted/20 border-t" : "border-t"}>
                      <td className="px-3 py-2">
                        <Link href={`/hr/attendance/${r.employeeId}?month=${monthKey}`} className="font-medium hover:text-brand-700">
                          {r.employeeName}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-right">{r.presentDays}</td>
                      <td className="px-3 py-2 text-right">{r.absentDays}</td>
                      <td className="px-3 py-2 text-right">{r.leaveDays}</td>
                      <td className="px-3 py-2 text-right">{r.halfDays}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppLayout>
  );
}
