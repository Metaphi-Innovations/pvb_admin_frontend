"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Clock, Download, Search, CheckCircle2, XCircle, AlertCircle, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface AttendanceRecord {
  empCode: string;
  name: string;
  department: string;
  date: string;
  checkIn: string;
  checkOut: string;
  hours: string;
  status: "present" | "absent" | "half-day" | "late" | "leave";
}

const SEED: AttendanceRecord[] = [
  { empCode: "EMP-001", name: "Rajesh Kumar", department: "Sales", date: "2024-01-24", checkIn: "09:02", checkOut: "18:05", hours: "9h 3m", status: "present" },
  { empCode: "EMP-002", name: "Priya Singh", department: "Sales", date: "2024-01-24", checkIn: "09:15", checkOut: "18:10", hours: "8h 55m", status: "present" },
  { empCode: "EMP-003", name: "Amit Sharma", department: "Sales", date: "2024-01-24", checkIn: "10:30", checkOut: "18:00", hours: "7h 30m", status: "late" },
  { empCode: "EMP-004", name: "Neha Patel", department: "Sales", date: "2024-01-24", checkIn: "-", checkOut: "-", hours: "-", status: "absent" },
  { empCode: "EMP-005", name: "Vikram Das", department: "Sales", date: "2024-01-24", checkIn: "-", checkOut: "-", hours: "-", status: "leave" },
  { empCode: "EMP-006", name: "Sunita Rao", department: "HR", date: "2024-01-24", checkIn: "08:55", checkOut: "18:00", hours: "9h 5m", status: "present" },
  { empCode: "EMP-007", name: "Mohan Verma", department: "Accounts", date: "2024-01-24", checkIn: "09:00", checkOut: "13:00", hours: "4h 0m", status: "half-day" },
  { empCode: "EMP-008", name: "Kavita Nair", department: "Operations", date: "2024-01-24", checkIn: "09:05", checkOut: "18:02", hours: "8h 57m", status: "present" },
  { empCode: "EMP-009", name: "Arun Mehta", department: "IT", date: "2024-01-24", checkIn: "09:00", checkOut: "19:30", hours: "10h 30m", status: "present" },
  { empCode: "EMP-010", name: "Pooja Gupta", department: "Finance", date: "2024-01-24", checkIn: "-", checkOut: "-", hours: "-", status: "absent" },
];

const STATUS_CFG = {
  present:  { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  absent:   { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
  "half-day":{ bg: "bg-amber-50",  text: "text-amber-700",   dot: "bg-amber-400"   },
  late:     { bg: "bg-orange-50",  text: "text-orange-700",  dot: "bg-orange-400"  },
  leave:    { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
};

function StatusPill({ status }: { status: string }) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.present;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium", cfg.bg, cfg.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full", cfg.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ")}
    </span>
  );
}

export default function AttendancePage() {
  const [records] = useState<AttendanceRecord[]>(SEED);
  const [search, setSearch] = useState("");
  const [selectedDate, setSelectedDate] = useState("2024-01-24");

  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    return !q || r.name.toLowerCase().includes(q) || r.empCode.toLowerCase().includes(q);
  });

  const present = records.filter(r => r.status === "present").length;
  const absent = records.filter(r => r.status === "absent").length;
  const late = records.filter(r => r.status === "late").length;
  const onLeave = records.filter(r => r.status === "leave").length;

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Attendance</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Daily attendance tracking and records</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 h-8 px-2.5 border border-border rounded-lg bg-white">
              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
              <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
                className="text-xs border-0 focus:outline-none bg-transparent" />
            </div>
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Present", value: present, icon: CheckCircle2, color: "bg-emerald-600" },
            { label: "Absent", value: absent, icon: XCircle, color: "bg-red-500" },
            { label: "Late", value: late, icon: Clock, color: "bg-orange-500" },
            { label: "On Leave", value: onLeave, icon: AlertCircle, color: "bg-blue-500" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", color)}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-base font-bold text-foreground leading-none">{value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground pointer-events-none" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search employees…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  {["Emp Code", "Name", "Department", "Check In", "Check Out", "Hours", "Status"].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={i} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{r.empCode}</span></td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">{r.name}</td>
                    <td className="px-4 py-2 text-xs text-muted-foreground">{r.department}</td>
                    <td className="px-4 py-2 text-xs font-mono text-foreground">{r.checkIn}</td>
                    <td className="px-4 py-2 text-xs font-mono text-foreground">{r.checkOut}</td>
                    <td className="px-4 py-2 text-xs font-semibold text-foreground">{r.hours}</td>
                    <td className="px-4 py-2"><StatusPill status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">Date: <span className="font-medium text-foreground">{selectedDate}</span> · {filtered.length} records</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
