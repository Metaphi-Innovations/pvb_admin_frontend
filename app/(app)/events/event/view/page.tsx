"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
  type GeoLevel,
  type GeoNode,
  loadGeoNodes,
} from "../../../masters/geography/geo-data";
import {
  type Employee,
  loadEmployees,
} from "../../../user-management/employee/employee-data";
import {
  type Customer,
  loadCustomers,
} from "../../../masters/customers/customer-data";
import {
  type Distributor,
  loadDistributors,
} from "../../../database/distributor/distributor-data";
import {
  type Event,
  EVENTS_STORAGE_KEY,
  VIEW_EVENT_STORAGE_KEY,
  SEED,
  STATUS_CFG,
  TYPE_COLORS,
  formatDateRange,
  formatTimeDisplay,
} from "../event-data";

const CUSTOMER_DISTRIBUTOR_ID_OFFSET = 100000;
const LOCATION_LEVELS: GeoLevel[] = ["Zone", "State", "Region", "Area", "Territory", "Locality", "City"];
const FARMER_NAMES = [
  "Ramesh Patel",
  "Suresh Kumar",
  "Mahesh Singh",
  "Prakash Rao",
  "Rajan Verma",
  "Haridas Patil",
  "Gopal Nair",
  "Bharat Das",
  "Lakshmi Reddy",
  "Sunita Chauhan",
  "Devendra Yadav",
  "Manjunath Gowda",
  "Pooja Jat",
  "Ajay Boro",
  "Rekha Pawar",
  "Tsering Namgyal",
  "Imran Sheikh",
  "Nirmala Sahu",
  "Joseph Mathew",
  "Kavita Solanki",
] as const;

function formatTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatListOrDash(values: string[]) {
  return values.length > 0 ? values.join(", ") : "-";
}

function withSuffix(value: string, suffix: string) {
  if (!value) return "-";
  return value.toLowerCase().includes(suffix.toLowerCase()) ? value : `${value} ${suffix}`;
}

function inferZoneFromState(state: string) {
  const normalized = state.trim().toLowerCase();
  if (["gujarat", "maharashtra", "chhattisgarh", "delhi"].includes(normalized)) return "West Zone";
  if (["karnataka", "tamil nadu", "telangana"].includes(normalized)) return "South Zone";
  return "West Zone";
}

function resolveLocationDisplay(event: Event, geoNodes: GeoNode[]) {
  const fallbackDistrict = event.district || event.state || "Event Area";
  const fallbackLocality = event.venue || event.district || event.state || "Event Locality";
  const fallback = {
    Zone: inferZoneFromState(event.state || ""),
    State: event.state || "-",
    Region: withSuffix(fallbackDistrict, "Region"),
    Area: withSuffix(fallbackDistrict, "Area"),
    Territory: withSuffix(fallbackDistrict, "Territory"),
    Locality: fallbackLocality,
    City: event.district || event.state || "Event City",
  };

  const getNodeName = (level: GeoLevel) => {
    const nodeId = event.location?.[level];
    if (!nodeId) return fallback[level];
    return geoNodes.find((node) => node.id === nodeId)?.name ?? fallback[level];
  };

  return {
    Zone: getNodeName("Zone"),
    State: getNodeName("State"),
    Region: getNodeName("Region"),
    Area: getNodeName("Area"),
    Territory: getNodeName("Territory"),
    Locality: getNodeName("Locality"),
    City: getNodeName("City"),
  };
}

function SectionCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-border bg-white shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <p className="text-sm font-semibold text-foreground">{title}</p>
      </div>
      <div className="space-y-4 px-4 py-4">{children}</div>
    </section>
  );
}

function InfoField({
  label,
  value,
  className,
}: {
  label: string;
  value: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <p className="text-[11px] font-medium text-muted-foreground">{label}</p>
      <div className="min-h-[36px] rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-sm">
        {value}
      </div>
    </div>
  );
}

export default function EventViewPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(SEED);
  const [viewEvent, setViewEvent] = useState<Event | null>(null);
  const [geoNodes, setGeoNodes] = useState<GeoNode[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const storedEvents = window.sessionStorage.getItem(EVENTS_STORAGE_KEY);
    if (!storedEvents) return;

    try {
      const parsed = JSON.parse(storedEvents) as Event[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        setEvents(parsed);
      }
    } catch {
      window.sessionStorage.removeItem(EVENTS_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    setGeoNodes(loadGeoNodes().filter((node) => node.status === "active"));
    setUsers(loadEmployees().filter((employee) => employee.status !== "archived"));
    setDistributors(loadDistributors());
    setCustomers(loadCustomers());
  }, []);

  useEffect(() => {
    let selectedEvent: Event | undefined;
    if (typeof window !== "undefined") {
      const selectedId = window.sessionStorage.getItem(VIEW_EVENT_STORAGE_KEY);
      selectedEvent = events.find((event) => String(event.id) === selectedId);
    }

    setViewEvent(selectedEvent ?? events[0] ?? null);
  }, [events]);

  const currentEventIndex = useMemo(
    () => (viewEvent ? events.findIndex((event) => event.id === viewEvent.id) : -1),
    [events, viewEvent],
  );
  const userLabelMap = useMemo(
    () => new Map(users.map((user) => [user.id, user.fullName])),
    [users],
  );
  const farmerLabelMap = useMemo(
    () => new Map<number, string>(FARMER_NAMES.map((name, index) => [index + 1, name])),
    [],
  );
  const distributorLabelMap = useMemo(
    () =>
      new Map([
        ...distributors.map((distributor) => [distributor.id, distributor.firmName] as const),
        ...customers.map((customer) => [CUSTOMER_DISTRIBUTOR_ID_OFFSET + customer.id, customer.customerName] as const),
      ]),
    [customers, distributors],
  );
  const locationDisplay = useMemo(
    () => (viewEvent ? resolveLocationDisplay(viewEvent, geoNodes) : null),
    [geoNodes, viewEvent],
  );
  const viewEventUsers = useMemo(
    () =>
      (viewEvent?.userAttendeeIds ?? [])
        .map((id) => userLabelMap.get(id))
        .filter((value): value is string => Boolean(value)),
    [userLabelMap, viewEvent],
  );
  const viewEventFarmers = useMemo(
    () =>
      (viewEvent?.farmerAttendeeIds ?? [])
        .map((id) => farmerLabelMap.get(id))
        .filter((value): value is string => Boolean(value)),
    [farmerLabelMap, viewEvent],
  );
  const viewEventDistributors = useMemo(
    () =>
      (viewEvent?.distributorAttendeeIds ?? [])
        .map((id) => distributorLabelMap.get(id))
        .filter((value): value is string => Boolean(value)),
    [distributorLabelMap, viewEvent],
  );

  const handleStepViewEvent = (direction: -1 | 1) => {
    if (currentEventIndex < 0) return;

    const nextEvent = events[currentEventIndex + direction];
    if (!nextEvent) return;

    if (typeof window !== "undefined") {
      window.sessionStorage.setItem(VIEW_EVENT_STORAGE_KEY, String(nextEvent.id));
    }
    setViewEvent(nextEvent);
    router.push("/events/event/view");
  };

  const handleCloseView = () => {
    router.push("/events/event");
  };

  return (
    <AppLayout>
      <div className="space-y-4">
        <section className="rounded-xl border border-border bg-white shadow-sm">
          <div className="flex items-start justify-between gap-4 px-5 py-4">
            <div>
              <h1 className="text-base font-semibold text-foreground">
                {viewEvent?.eventCode} - Event Details
              </h1>
              <p className="mt-0.5 text-[11px] text-muted-foreground">
                View-only event schedule, attendance, and geography details
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-label="Previous event"
                disabled={currentEventIndex <= 0}
                onClick={() => handleStepViewEvent(-1)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted",
                  currentEventIndex <= 0 ? "cursor-not-allowed opacity-40" : "hover:text-foreground",
                )}
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                type="button"
                aria-label="Next event"
                disabled={currentEventIndex < 0 || currentEventIndex >= events.length - 1}
                onClick={() => handleStepViewEvent(1)}
                className={cn(
                  "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted",
                  currentEventIndex < 0 || currentEventIndex >= events.length - 1
                    ? "cursor-not-allowed opacity-40"
                    : "hover:text-foreground",
                )}
              >
                <ChevronRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleCloseView}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </button>
            </div>
          </div>
        </section>

        {viewEvent && locationDisplay && (
          <>
            <SectionCard title="Event Information">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                <InfoField label="Event Name" value={viewEvent.title} />
                <InfoField
                  label="Event Type"
                  value={
                    <span
                      className={cn(
                        "inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold",
                        TYPE_COLORS[viewEvent.type],
                      )}
                    >
                      {formatTitleCase(viewEvent.type)}
                    </span>
                  }
                />
                <InfoField
                  label="Status"
                  value={
                    <span
                      className={cn(
                        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
                        STATUS_CFG[viewEvent.status].bg,
                        STATUS_CFG[viewEvent.status].text,
                      )}
                    >
                      <span className={cn("h-1.5 w-1.5 rounded-full", STATUS_CFG[viewEvent.status].dot)} />
                      {formatTitleCase(viewEvent.status)}
                    </span>
                  }
                />
                <InfoField label="Event Dates" value={formatDateRange(viewEvent.startDate, viewEvent.endDate)} />
                <InfoField label="Time" value={viewEvent.time ? formatTimeDisplay(viewEvent.time) : "-"} />
                <InfoField label="Organizer" value={viewEvent.organizer || "-"} />
              </div>
            </SectionCard>

            <SectionCard title="Attendance">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
                <InfoField label="Expected Attendees" value={viewEvent.expectedAttendees} />
                <InfoField label="Actual Attendees" value={viewEvent.actualAttendees} />
                <InfoField label="Users Invited" value={viewEvent.userAttendeeIds?.length ?? 0} />
                <InfoField label="Farmers Invited" value={viewEvent.farmerAttendeeIds?.length ?? 0} />
                <InfoField label="Distributors Invited" value={viewEvent.distributorAttendeeIds?.length ?? 0} />
              </div>

              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <InfoField label="Users" value={formatListOrDash(viewEventUsers)} />
                <InfoField label="Farmers" value={formatListOrDash(viewEventFarmers)} />
                <InfoField
                  label="Distributors"
                  value={formatListOrDash(viewEventDistributors)}
                  className="lg:col-span-2"
                />
              </div>
            </SectionCard>

            <SectionCard title="Location">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                {LOCATION_LEVELS.map((level) => (
                  <InfoField key={level} label={level} value={locationDisplay[level]} />
                ))}
              </div>
            </SectionCard>
          </>
        )}
      </div>
    </AppLayout>
  );
}
