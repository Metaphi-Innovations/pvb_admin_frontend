"use client";

import React, { useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { CalendarDays, Plus, Download, Search, MoreVertical, Eye, Edit, MapPin, Users, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface Event {
  id: number;
  eventCode: string;
  title: string;
  type: "training" | "demo" | "conference" | "workshop" | "exhibition";
  venue: string;
  district: string;
  state: string;
  startDate: string;
  endDate: string;
  organizer: string;
  expectedAttendees: number;
  actualAttendees: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
}

const SEED: Event[] = [
  { id: 1, eventCode: "EVT-001", title: "BioGrow Crop Care Training", type: "training", venue: "Anand Krishi Bhavan", district: "Anand", state: "Gujarat", startDate: "2024-01-25", endDate: "2024-01-25", organizer: "Rajesh Kumar", expectedAttendees: 80, actualAttendees: 72, status: "completed" },
  { id: 2, eventCode: "EVT-002", title: "New Pesticide Product Demo", type: "demo", venue: "Raipur Agriculture College", district: "Raipur", state: "Chhattisgarh", startDate: "2024-01-28", endDate: "2024-01-28", organizer: "Amit Sharma", expectedAttendees: 50, actualAttendees: 48, status: "completed" },
  { id: 3, eventCode: "EVT-003", title: "Farmer Producer Meet Q1", type: "conference", venue: "Solapur Town Hall", district: "Solapur", state: "Maharashtra", startDate: "2024-02-05", endDate: "2024-02-06", organizer: "Neha Patel", expectedAttendees: 200, actualAttendees: 0, status: "upcoming" },
  { id: 4, eventCode: "EVT-004", title: "Precision Farming Workshop", type: "workshop", venue: "Vikarabad FPO Centre", district: "Vikarabad", state: "Telangana", startDate: "2024-02-10", endDate: "2024-02-11", organizer: "Priya Singh", expectedAttendees: 40, actualAttendees: 0, status: "upcoming" },
  { id: 5, eventCode: "EVT-005", title: "Agri Expo 2024 - Stall", type: "exhibition", venue: "Pragati Maidan", district: "New Delhi", state: "Delhi", startDate: "2024-02-15", endDate: "2024-02-18", organizer: "Vikram Das", expectedAttendees: 500, actualAttendees: 0, status: "upcoming" },
  { id: 6, eventCode: "EVT-006", title: "Village Level Demonstration", type: "demo", venue: "Kheralu Village Ground", district: "Mehsana", state: "Gujarat", startDate: "2024-01-20", endDate: "2024-01-20", organizer: "Rajesh Kumar", expectedAttendees: 30, actualAttendees: 28, status: "completed" },
];

const STATUS_CFG = {
  upcoming:  { bg: "bg-blue-50",    text: "text-blue-700",    dot: "bg-blue-500"    },
  ongoing:   { bg: "bg-amber-50",   text: "text-amber-700",   dot: "bg-amber-400"   },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
};

const TYPE_COLORS: Record<string, string> = {
  training:   "bg-purple-100 text-purple-700",
  demo:       "bg-blue-100 text-blue-700",
  conference: "bg-amber-100 text-amber-700",
  workshop:   "bg-emerald-100 text-emerald-700",
  exhibition: "bg-rose-100 text-rose-700",
};

export default function EventsPage() {
  const [events] = useState<Event[]>(SEED);
  const [search, setSearch] = useState("");
  const [openMenu, setOpenMenu] = useState<number | null>(null);

  const filtered = events.filter(e => {
    const q = search.toLowerCase();
    return !q || e.title.toLowerCase().includes(q) || e.eventCode.toLowerCase().includes(q) || e.district.toLowerCase().includes(q);
  });

  return (
    <AppLayout>
      <div className="max-w-[1200px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-foreground">Events</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage trainings, demos, and farmer events</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="h-8 px-3 text-xs border border-border rounded-lg inline-flex items-center gap-1.5 font-medium text-muted-foreground hover:bg-muted transition-colors">
              <Download className="w-3.5 h-3.5" /> Export
            </button>
            <button className="h-8 px-3 text-xs rounded-lg inline-flex items-center gap-1.5 font-medium bg-brand-600 hover:bg-brand-700 text-white transition-colors">
              <Plus className="w-3.5 h-3.5" /> Create Event
            </button>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: "Total Events", value: events.length, icon: CalendarDays, accent: true },
            { label: "Upcoming", value: events.filter(e => e.status === "upcoming").length, icon: Clock },
            { label: "Completed", value: events.filter(e => e.status === "completed").length, icon: CalendarDays },
            { label: "Total Reached", value: events.reduce((s, e) => s + e.actualAttendees, 0), icon: Users },
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
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search events…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-300" />
          </div>
        </div>

        <div className="space-y-3">
          {filtered.map(event => (
            <div key={event.id} className="bg-white border border-border rounded-xl p-4 hover:shadow-sm transition-shadow group">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                    <CalendarDays className="w-5 h-5 text-brand-600" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-semibold text-brand-700">{event.eventCode}</span>
                      <span className={cn("text-[11px] px-2 py-0.5 rounded-full font-semibold capitalize", TYPE_COLORS[event.type])}>
                        {event.type}
                      </span>
                      <span className={cn("inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
                        STATUS_CFG[event.status].bg, STATUS_CFG[event.status].text)}>
                        <span className={cn("w-1.5 h-1.5 rounded-full", STATUS_CFG[event.status].dot)} />
                        {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-foreground">{event.title}</p>
                    <div className="flex items-center gap-3 mt-1">
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <MapPin className="w-3 h-3" /> {event.venue}, {event.district}, {event.state}
                      </span>
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Clock className="w-3 h-3" /> {event.startDate}{event.startDate !== event.endDate ? ` → ${event.endDate}` : ""}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => setOpenMenu(openMenu === event.id ? null : event.id)}
                    className="p-1.5 hover:bg-muted rounded-md opacity-0 group-hover:opacity-100 pointer-events-none group-hover:pointer-events-auto transition-all relative">
                    <MoreVertical className="w-4 h-4 text-muted-foreground" />
                    {openMenu === event.id && (
                      <div className="absolute right-0 top-7 z-50 bg-white border border-border rounded-xl shadow-lg w-40 py-1">
                        <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Eye className="w-3.5 h-3.5 text-muted-foreground" /> View</button>
                        <button className="flex items-center gap-2 w-full px-3 py-1.5 text-xs hover:bg-muted"><Edit className="w-3.5 h-3.5 text-muted-foreground" /> Edit</button>
                      </div>
                    )}
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-border/50">
                <div><p className="text-[11px] text-muted-foreground">Organizer</p><p className="text-xs font-semibold text-foreground">{event.organizer}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Expected Attendees</p><p className="text-xs font-semibold text-foreground">{event.expectedAttendees}</p></div>
                <div><p className="text-[11px] text-muted-foreground">Actual Attendees</p>
                  <p className="text-xs font-semibold text-foreground">
                    {event.status === "completed" ? event.actualAttendees : "-"}
                    {event.status === "completed" && (
                      <span className={cn("ml-1 text-[10px]", event.actualAttendees >= event.expectedAttendees ? "text-emerald-600" : "text-amber-600")}>
                        ({Math.round((event.actualAttendees / event.expectedAttendees) * 100)}%)
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
}
