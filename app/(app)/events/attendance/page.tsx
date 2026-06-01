"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Users, Search, Download, CheckCircle2, XCircle, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface EventAttendee {
  id: number;
  eventCode: string;
  eventTitle: string;
  attendeeName: string;
  mobile: string;
  village: string;
  farmerCode: string;
  checkIn: string;
  checkOut: string;
  status: "present" | "absent" | "late";
}

const SEED: EventAttendee[] = [
  { id: 1, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", attendeeName: "Ramesh Patel", mobile: "9876501001", village: "Navapura", farmerCode: "FMR-001", checkIn: "09:05", checkOut: "17:00", status: "present" },
  { id: 2, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", attendeeName: "Suresh Kumar", mobile: "9876501002", village: "Kheralu", farmerCode: "FMR-002", checkIn: "10:15", checkOut: "17:00", status: "late" },
  { id: 3, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", attendeeName: "Mahesh Singh", mobile: "9876501003", village: "Bhanpur", farmerCode: "FMR-003", checkIn: "-", checkOut: "-", status: "absent" },
  { id: 4, eventCode: "EVT-001", eventTitle: "BioGrow Crop Care Training", attendeeName: "Prakash Rao", mobile: "9876501004", village: "Tandur", farmerCode: "FMR-004", checkIn: "09:00", checkOut: "17:10", status: "present" },
  { id: 5, eventCode: "EVT-002", eventTitle: "New Pesticide Product Demo", attendeeName: "Haridas Patil", mobile: "9876501006", village: "Mohol", farmerCode: "FMR-006", checkIn: "10:00", checkOut: "15:00", status: "present" },
  { id: 6, eventCode: "EVT-002", eventTitle: "New Pesticide Product Demo", attendeeName: "Gopal Nair", mobile: "9876501007", village: "Kuttanad", farmerCode: "FMR-007", checkIn: "10:05", checkOut: "15:00", status: "present" },
];

const STATUS_CFG = {
  present: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  absent:  { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
  late:    { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
};

export default function EventAttendancePage() {
  const [records] = useState<EventAttendee[]>(SEED);
  const [search, setSearch] = useState("");
  const [selectedEvent, setSelectedEvent] = useState("all");

  const events = [...new Set(records.map(r => r.eventCode))];
  const filtered = records.filter(r => {
    const q = search.toLowerCase();
    const matchQ = !q || r.attendeeName.toLowerCase().includes(q) || r.mobile.includes(q);
    const matchEv = selectedEvent === "all" || r.eventCode === selectedEvent;
    return matchQ && matchEv;
  });

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Event Attendance</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Track attendee presence at events</p>
          </div>
          <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
            <Download className="w-3.5 h-3.5" /> Export
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total Attendees", value: records.length, icon: Users, accent: true },
            { label: "Present", value: records.filter(r => r.status === "present").length, icon: CheckCircle2 },
            { label: "Absent", value: records.filter(r => r.status === "absent").length, icon: XCircle },
          ].map(({ label, value, icon: Icon, accent }) => (
            <div key={label} className="bg-white rounded-xl border border-border p-3 flex items-center gap-3">
              <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0", accent ? "bg-brand-600" : "bg-muted")}>
                <Icon className={cn("w-4 h-4", accent ? "text-white" : "text-muted-foreground")} />
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search attendees…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
          <select value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}
            className="h-8 px-2.5 text-xs border border-border rounded-lg bg-white focus:outline-none">
            <option value="all">All Events</option>
            {events.map(ev => <option key={ev} value={ev}>{ev}</option>)}
          </select>
        </div>

        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                {["Event", "Attendee", "Farmer Code", "Village", "Mobile", "Check In", "Check Out", "Status"].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-muted/20 transition-colors">
                  <td className="px-4 py-2"><span className="font-mono text-xs font-semibold text-brand-700">{r.eventCode}</span><p className="text-[11px] text-muted-foreground truncate max-w-[120px]">{r.eventTitle}</p></td>
                  <td className="px-4 py-2 text-xs font-semibold text-foreground">{r.attendeeName}</td>
                  <td className="px-4 py-2"><span className="font-mono text-xs text-muted-foreground">{r.farmerCode}</span></td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.village}</td>
                  <td className="px-4 py-2 text-xs text-muted-foreground">{r.mobile}</td>
                  <td className="px-4 py-2 text-xs font-mono text-foreground">{r.checkIn}</td>
                  <td className="px-4 py-2 text-xs font-mono text-foreground">{r.checkOut}</td>
                  <td className="px-4 py-2">
                    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                      STATUS_CFG[r.status].bg, STATUS_CFG[r.status].text)}>
                      <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CFG[r.status].dot)} />
                      {r.status.charAt(0).toUpperCase() + r.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-3 border-t border-border bg-muted/20">
            <p className="text-[11px] text-muted-foreground">{filtered.length} records</p>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
