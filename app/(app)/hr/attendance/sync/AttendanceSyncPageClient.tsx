"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";
import Link from "next/link";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { getActiveHrEmployees } from "../../employees/employee-master-data";
import {
  DEFAULT_SYNC_FORM,
  formToSync,
  loadAttendanceSync,
  saveAttendanceSync,
  validateSyncForm,
  type AttendanceSyncFormValues,
  type AttendanceSyncRecord,
} from "./attendance-sync-data";

const STATUS_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "leave", label: "Leave" },
  { value: "wfh", label: "WFH" },
];

export default function AttendanceSyncPage() {
  const [records, setRecords] = useState<AttendanceSyncRecord[]>([]);
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState<AttendanceSyncFormValues>(DEFAULT_SYNC_FORM);
  const [error, setError] = useState<string | null>(null);
  const employees = getActiveHrEmployees();

  const refresh = useCallback(() => setRecords(loadAttendanceSync()), []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const visible = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter(
      (r) =>
        r.employeeName.toLowerCase().includes(q) ||
        r.employeeCode.toLowerCase().includes(q),
    );
  }, [records, search]);

  const saveRecord = () => {
    const err = validateSyncForm(form);
    if (err) {
      setError(err);
      return;
    }
    const list = loadAttendanceSync();
    const id = list.length ? Math.max(...list.map((r) => r.id)) + 1 : 1;
    saveAttendanceSync([formToSync(form, id), ...list]);
    setDialogOpen(false);
    setForm(DEFAULT_SYNC_FORM);
    setError(null);
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1320px] mx-auto space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold">Attendance Sync</h1>
            <p className="text-xs text-muted-foreground">
              Store attendance records from external systems.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" asChild>
              <Link href="/hr/attendance/reports">Attendance Reports</Link>
            </Button>
            <Button className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="w-3.5 h-3.5" /> Add Record
            </Button>
          </div>
        </div>

        <div className="relative max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search employee…" className="h-8 pl-8 text-xs" />
        </div>

        <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Sync Date</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Employee</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Attendance Date</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Check In</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Check Out</th>
                <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">Status</th>
              </tr>
            </thead>
            <tbody>
              {visible.map((r) => (
                <tr key={r.id} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-3 py-2">{r.syncDate}</td>
                  <td className="px-3 py-2">
                    <span className="font-medium">{r.employeeName}</span>
                    <span className="text-muted-foreground ml-1 font-mono text-[10px]">{r.employeeCode}</span>
                  </td>
                  <td className="px-3 py-2">{r.attendanceDate}</td>
                  <td className="px-3 py-2 font-mono">{r.checkInTime || "—"}</td>
                  <td className="px-3 py-2 font-mono">{r.checkOutTime || "—"}</td>
                  <td className="px-3 py-2"><HrStatusBadge status={r.attendanceStatus} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-sm">Add Attendance Sync Record</DialogTitle>
          </DialogHeader>
          {error && <p className="text-xs text-red-600">{error}</p>}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Sync Date</Label>
              <Input type="date" className="h-8 text-xs" value={form.syncDate} onChange={(e) => setForm({ ...form, syncDate: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Attendance Date</Label>
              <Input type="date" className="h-8 text-xs" value={form.attendanceDate} onChange={(e) => setForm({ ...form, attendanceDate: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px]">Employee</Label>
              <Select value={form.employeeId ? String(form.employeeId) : ""} onValueChange={(v) => setForm({ ...form, employeeId: Number(v) })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select" /></SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)} className="text-xs">{e.employeeName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Check In</Label>
              <Input type="time" className="h-8 text-xs" value={form.checkInTime} onChange={(e) => setForm({ ...form, checkInTime: e.target.value })} />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Check Out</Label>
              <Input type="time" className="h-8 text-xs" value={form.checkOutTime} onChange={(e) => setForm({ ...form, checkOutTime: e.target.value })} />
            </div>
            <div className="space-y-1 col-span-2">
              <Label className="text-[11px]">Attendance Status</Label>
              <Select value={form.attendanceStatus} onValueChange={(v) => setForm({ ...form, attendanceStatus: v as AttendanceSyncFormValues["attendanceStatus"] })}>
                <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-xs">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white mt-2" onClick={saveRecord}>
            Save Record
          </Button>
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
}
