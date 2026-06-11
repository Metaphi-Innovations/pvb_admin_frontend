"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
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
  type Farmer,
  SEED as FARMER_SEED,
} from "../../../database/farmer/farmer-data";
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
type AttendanceTab = "users" | "farmers" | "distributors";

function formatTitleCase(value: string) {
  return value
    .split(/[\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
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
      <div className="min-h-[36px] rounded-lg border border-border bg-white px-3 py-2 text-xs text-foreground shadow-sm">
        {value}
      </div>
    </div>
  );
}

interface AttendanceColumn<T> {
  header: string;
  cell: (row: T) => React.ReactNode;
  className?: string;
}

function AttendanceTable<T>({
  rows,
  columns,
  emptyMessage,
  getRowKey,
}: {
  rows: T[];
  columns: AttendanceColumn<T>[];
  emptyMessage: string;
  getRowKey: (row: T, index: number) => string;
}) {
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border bg-muted/40">
              {columns.map((column) => (
                <th
                  key={column.header}
                  className={cn(
                    "px-4 py-3 text-left text-xs font-semibold whitespace-nowrap text-foreground",
                    column.className,
                  )}
                >
                  {column.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-6 text-center text-xs text-muted-foreground"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr
                  key={getRowKey(row, index)}
                  className="border-b border-border/60 last:border-b-0"
                >
                  {columns.map((column) => (
                    <td
                      key={column.header}
                      className={cn(
                        "px-4 py-2 text-xs align-top text-foreground whitespace-nowrap",
                        column.className,
                      )}
                    >
                      {column.cell(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
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
  const [activeAttendanceTab, setActiveAttendanceTab] =
    useState<AttendanceTab>("users");

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

  useEffect(() => {
    setActiveAttendanceTab("users");
  }, [viewEvent?.id]);

  const currentEventIndex = useMemo(
    () => (viewEvent ? events.findIndex((event) => event.id === viewEvent.id) : -1),
    [events, viewEvent],
  );
  const locationDisplay = useMemo(
    () => (viewEvent ? resolveLocationDisplay(viewEvent, geoNodes) : null),
    [geoNodes, viewEvent],
  );
  const farmerMap = useMemo(
    () => new Map<number, Farmer>(FARMER_SEED.map((farmer) => [farmer.id, farmer])),
    [],
  );
  const distributorMap = useMemo(
    () =>
      new Map<number, Distributor>(
        distributors.map((distributor) => [distributor.id, distributor]),
      ),
    [distributors],
  );
  const customerDistributorMap = useMemo(
    () =>
      new Map<number, Customer>(
        customers.map((customer) => [customer.id, customer]),
      ),
    [customers],
  );
  const userAttendanceRows = useMemo(
    () =>
      (viewEvent?.userAttendeeIds ?? [])
        .map((id) => users.find((user) => user.id === id))
        .filter((user): user is Employee => Boolean(user)),
    [users, viewEvent],
  );
  const farmerAttendanceRows = useMemo(
    () =>
      (viewEvent?.farmerAttendeeIds ?? [])
        .map((id) => farmerMap.get(id))
        .filter((farmer): farmer is Farmer => Boolean(farmer)),
    [farmerMap, viewEvent],
  );
  const distributorAttendanceRows = useMemo(
    () =>
      (viewEvent?.distributorAttendeeIds ?? [])
        .map((id) => {
          if (id >= CUSTOMER_DISTRIBUTOR_ID_OFFSET) {
            const customer = customerDistributorMap.get(id - CUSTOMER_DISTRIBUTOR_ID_OFFSET);
            if (!customer) return null;

            return {
              key: `customer-${customer.id}`,
              name: customer.customerName,
              mobile: customer.mobile || "-",
              district: customer.districtName || "-",
              state: customer.stateName || "-",
              source: "Customer Master",
              detail: customer.customerType || "-",
            };
          }

          const distributor = distributorMap.get(id);
          if (!distributor) return null;

          return {
            key: `distributor-${distributor.id}`,
            name: distributor.firmName,
            mobile: distributor.phoneNumber || "-",
            district: distributor.district || "-",
            state: distributor.state || "-",
            source: "Distributor Listing",
            detail: distributor.distributorCategory || "-",
          };
        })
        .filter(
          (
            distributor,
          ): distributor is {
            key: string;
            name: string;
            mobile: string;
            district: string;
            state: string;
            source: string;
            detail: string;
          } => Boolean(distributor),
        ),
    [customerDistributorMap, distributorMap, viewEvent],
  );
  const userAttendanceColumns = useMemo<AttendanceColumn<Employee>[]>(
    () => [
      {
        header: "User ID",
        cell: (user) => (
          <span className="font-mono font-semibold text-brand-700">
            {user.employeeId}
          </span>
        ),
      },
      { header: "User Name", cell: (user) => user.fullName },
      { header: "Role", cell: (user) => user.role || "-" },
      { header: "Department", cell: (user) => user.department || "-" },
      { header: "Mobile", cell: (user) => user.mobile || "-", className: "font-mono" },
      {
        header: "Status",
        cell: (user) => formatTitleCase(user.status),
      },
    ],
    [],
  );
  const farmerAttendanceColumns = useMemo<AttendanceColumn<Farmer>[]>(
    () => [
      {
        header: "Farmer ID",
        cell: (farmer) => (
          <span className="font-mono font-semibold text-brand-700">
            {`FMR-${String(farmer.id).padStart(3, "0")}`}
          </span>
        ),
      },
      { header: "Farmer Name", cell: (farmer) => farmer.name },
      { header: "Mobile", cell: (farmer) => farmer.phoneNumber, className: "font-mono" },
      { header: "Village", cell: (farmer) => farmer.village },
      { header: "District", cell: (farmer) => farmer.district },
      { header: "Current Crop", cell: (farmer) => farmer.currentCrop },
    ],
    [],
  );
  const distributorAttendanceColumns = useMemo<
    AttendanceColumn<{
      key: string;
      name: string;
      mobile: string;
      district: string;
      state: string;
      source: string;
      detail: string;
    }>[]
  >(
    () => [
      { header: "Name", cell: (row) => row.name },
      { header: "Mobile", cell: (row) => row.mobile, className: "font-mono" },
      { header: "District", cell: (row) => row.district },
      { header: "State", cell: (row) => row.state },
      { header: "Source", cell: (row) => row.source },
      { header: "Category / Type", cell: (row) => row.detail },
    ],
    [],
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
            <div className="flex min-w-0 items-center gap-3">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 flex-shrink-0 rounded-lg hover:bg-muted"
                onClick={handleCloseView}
                aria-label="Back to event listing"
              >
                <ArrowLeft className="h-4 w-4 text-muted-foreground" />
              </Button>
              <h1 className="truncate text-base font-semibold text-foreground">
                {viewEvent?.eventCode} - Event Details
              </h1>
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
              <Tabs
                value={activeAttendanceTab}
                onValueChange={(value) =>
                  setActiveAttendanceTab(value as AttendanceTab)
                }
                className="space-y-4"
              >
                <TabsList className="w-full gap-0 overflow-x-auto">
                  <TabsTrigger value="users" className="text-xs">
                    {`Users (${userAttendanceRows.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="farmers" className="text-xs">
                    {`Farmers (${farmerAttendanceRows.length})`}
                  </TabsTrigger>
                  <TabsTrigger value="distributors" className="text-xs">
                    {`Distributors (${distributorAttendanceRows.length})`}
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="m-0">
                  <AttendanceTable
                    rows={userAttendanceRows}
                    columns={userAttendanceColumns}
                    emptyMessage="No users linked to this event."
                    getRowKey={(user) => String(user.id)}
                  />
                </TabsContent>

                <TabsContent value="farmers" className="m-0">
                  <AttendanceTable
                    rows={farmerAttendanceRows}
                    columns={farmerAttendanceColumns}
                    emptyMessage="No farmers linked to this event."
                    getRowKey={(farmer) => String(farmer.id)}
                  />
                </TabsContent>

                <TabsContent value="distributors" className="m-0">
                  <AttendanceTable
                    rows={distributorAttendanceRows}
                    columns={distributorAttendanceColumns}
                    emptyMessage="No distributors linked to this event."
                    getRowKey={(row) => row.key}
                  />
                </TabsContent>
              </Tabs>
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
