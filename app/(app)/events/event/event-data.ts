import type { GeoLevel } from "../../masters/geography/geo-data";

export interface Event {
  id: number;
  eventCode: string;
  title: string;
  type: "training" | "demo" | "conference" | "workshop" | "exhibition";
  venue: string;
  district: string;
  state: string;
  startDate: string;
  endDate: string;
  time?: string;
  organizer: string;
  expectedAttendees: number;
  actualAttendees: number;
  status: "upcoming" | "ongoing" | "completed" | "cancelled";
  scheduledDates?: string[];
  locationSummary?: string;
  location?: LocationSelection;
  userAttendeeIds?: number[];
  farmerAttendeeIds?: number[];
  distributorAttendeeIds?: number[];
}

export type LocationSelection = Partial<Record<GeoLevel, number>>;

export const EVENTS_STORAGE_KEY = "events:event:records";
export const VIEW_EVENT_STORAGE_KEY = "events:event:view-id";

export const SEED: Event[] = [
  {
    id: 1,
    eventCode: "EVT-001",
    title: "BioGrow Crop Care Training",
    type: "training",
    venue: "Anand Krishi Bhavan",
    district: "Anand",
    state: "Gujarat",
    startDate: "2024-01-25",
    endDate: "2024-01-25",
    organizer: "Rajesh Kumar",
    expectedAttendees: 80,
    actualAttendees: 72,
    status: "completed",
    userAttendeeIds: [1, 2, 3],
    farmerAttendeeIds: [1, 2, 3, 4],
    distributorAttendeeIds: [1, 2],
  },
  {
    id: 2,
    eventCode: "EVT-002",
    title: "New Pesticide Product Demo",
    type: "demo",
    venue: "Raipur Agriculture College",
    district: "Raipur",
    state: "Chhattisgarh",
    startDate: "2024-01-28",
    endDate: "2024-01-28",
    organizer: "Amit Sharma",
    expectedAttendees: 50,
    actualAttendees: 48,
    status: "completed",
    userAttendeeIds: [2, 6],
    farmerAttendeeIds: [5, 6, 7],
    distributorAttendeeIds: [3, 6, 100004],
  },
  {
    id: 3,
    eventCode: "EVT-003",
    title: "Farmer Producer Meet Q1",
    type: "conference",
    venue: "Solapur Town Hall",
    district: "Solapur",
    state: "Maharashtra",
    startDate: "2024-02-05",
    endDate: "2024-02-06",
    organizer: "Neha Patel",
    expectedAttendees: 200,
    actualAttendees: 0,
    status: "upcoming",
    userAttendeeIds: [1, 4, 5],
    farmerAttendeeIds: [8, 9, 10],
    distributorAttendeeIds: [5, 10, 100011],
  },
  {
    id: 4,
    eventCode: "EVT-004",
    title: "Precision Farming Workshop",
    type: "workshop",
    venue: "Vikarabad FPO Centre",
    district: "Vikarabad",
    state: "Telangana",
    startDate: "2024-02-10",
    endDate: "2024-02-11",
    organizer: "Priya Singh",
    expectedAttendees: 40,
    actualAttendees: 0,
    status: "upcoming",
    userAttendeeIds: [6, 9],
    farmerAttendeeIds: [11, 12, 13],
    distributorAttendeeIds: [12, 14],
  },
  {
    id: 5,
    eventCode: "EVT-005",
    title: "Agri Expo 2024 - Stall",
    type: "exhibition",
    venue: "Pragati Maidan",
    district: "New Delhi",
    state: "Delhi",
    startDate: "2024-02-15",
    endDate: "2024-02-18",
    organizer: "Vikram Das",
    expectedAttendees: 500,
    actualAttendees: 0,
    status: "upcoming",
    userAttendeeIds: [4, 5, 10],
    farmerAttendeeIds: [14, 15, 16],
    distributorAttendeeIds: [17, 100021, 100024],
  },
  {
    id: 6,
    eventCode: "EVT-006",
    title: "Village Level Demonstration",
    type: "demo",
    venue: "Kheralu Village Ground",
    district: "Mehsana",
    state: "Gujarat",
    startDate: "2024-01-20",
    endDate: "2024-01-20",
    organizer: "Rajesh Kumar",
    expectedAttendees: 30,
    actualAttendees: 28,
    status: "completed",
    userAttendeeIds: [3, 7],
    farmerAttendeeIds: [17, 18, 19, 20],
    distributorAttendeeIds: [18, 20, 100006],
  },
];

export const STATUS_CFG = {
  upcoming: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  ongoing: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-400" },
  completed: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
  cancelled: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400" },
} as const;

export const TYPE_COLORS: Record<Event["type"], string> = {
  training: "bg-purple-100 text-purple-700",
  demo: "bg-blue-100 text-blue-700",
  conference: "bg-amber-100 text-amber-700",
  workshop: "bg-emerald-100 text-emerald-700",
  exhibition: "bg-rose-100 text-rose-700",
};

export function formatDateRange(startDate: string, endDate: string) {
  if (!startDate) return "Date not set";
  return startDate === endDate ? startDate : `${startDate} -> ${endDate}`;
}

export function formatTimeDisplay(value?: string) {
  if (!value) return "";

  const [hours, minutes] = value.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return value;

  const suffix = hours >= 12 ? "PM" : "AM";
  const displayHour = hours % 12 || 12;
  return `${String(displayHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")} ${suffix}`;
}
