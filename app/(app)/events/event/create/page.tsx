"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { AuthService } from "@/services/auth.service";
import {
  CalendarRange,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Save,
  X,
} from "lucide-react";
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
  type LocationSelection,
  EVENTS_STORAGE_KEY,
  SEED,
  formatTimeDisplay,
} from "../event-data";

interface MultiSelectOption {
  id: number;
  label: string;
  helper?: string;
}

interface EventFormState {
  title: string;
  selectedDates: string[];
  time: string;
  selectedUserIds: number[];
  selectedFarmerIds: number[];
  selectedDistributorIds: number[];
  location: LocationSelection;
}

type EventFormErrors = Partial<
  Record<"title" | "selectedDates" | "time" | "attendees" | GeoLevel, string>
>;

interface ToastState {
  msg: string;
  type: "success" | "error";
}

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

const FARMER_OPTIONS: MultiSelectOption[] = FARMER_NAMES.map((label, index) => ({
  id: index + 1,
  label,
  helper: `FMR-${String(index + 1).padStart(3, "0")}`,
}));

const CUSTOMER_DISTRIBUTOR_ID_OFFSET = 100000;

const LOCATION_LEVELS: GeoLevel[] = [
  "Zone",
  "State",
  "Region",
  "Area",
  "Territory",
  "Locality",
  "City",
];

const LOCATION_PARENT: Record<GeoLevel, GeoLevel | null> = {
  Zone: null,
  State: "Zone",
  Region: "State",
  Area: "Region",
  Territory: "Area",
  Locality: "Territory",
  City: "Locality",
};

function handleScrollableWheel(event: React.WheelEvent<HTMLElement>) {
  const current = event.currentTarget;
  if (current.scrollHeight <= current.clientHeight) return;

  const atTop = current.scrollTop <= 0;
  const atBottom =
    current.scrollTop + current.clientHeight >= current.scrollHeight - 1;
  const scrollingUp = event.deltaY < 0;
  const scrollingDown = event.deltaY > 0;

  if ((scrollingUp && atTop) || (scrollingDown && atBottom)) return;

  event.preventDefault();
  event.stopPropagation();
  current.scrollTop += event.deltaY;
}

function todayIso() {
  return toIsoDate(new Date());
}

function getInitialFormState(): EventFormState {
  return {
    title: "",
    selectedDates: [],
    time: "",
    selectedUserIds: [],
    selectedFarmerIds: [],
    selectedDistributorIds: [],
    location: {},
  };
}

function loadEvents() {
  if (typeof window === "undefined") {
    return SEED;
  }

  const storedEvents = window.sessionStorage.getItem(EVENTS_STORAGE_KEY);
  if (!storedEvents) {
    return SEED;
  }

  try {
    const parsed = JSON.parse(storedEvents) as Event[];
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : SEED;
  } catch {
    window.sessionStorage.removeItem(EVENTS_STORAGE_KEY);
    return SEED;
  }
}

function saveEvents(events: Event[]) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(EVENTS_STORAGE_KEY, JSON.stringify(events));
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function toIsoDate(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftMonth(value: Date, delta: number) {
  return new Date(value.getFullYear(), value.getMonth() + delta, 1);
}

function formatMonthLabel(value: Date) {
  return value.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

function formatDisplayDate(value: string) {
  return parseIsoDate(value).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function sortIsoDates(values: string[]) {
  return [...new Set(values)].sort((a, b) => a.localeCompare(b));
}

function resolveScheduledDates(selectedDates: string[]) {
  return sortIsoDates(selectedDates);
}

function getDateSelectionSummary(selectedDates: string[]) {
  const sortedDates = sortIsoDates(selectedDates);
  if (sortedDates.length === 0) return "Select event dates";
  if (sortedDates.length === 1) return formatDisplayDate(sortedDates[0]);
  return `${sortedDates.length} dates selected`;
}

function getScheduledDateSummary(selectedDates: string[]) {
  const scheduledDates = resolveScheduledDates(selectedDates);
  if (scheduledDates.length === 0) return "Select one or more event dates.";
  if (scheduledDates.length === 1) return "1 event day selected";
  return `${scheduledDates.length} event days selected`;
}

function getCalendarGrid(viewMonth: Date, minDate: string) {
  const monthStart = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const monthEnd = new Date(
    viewMonth.getFullYear(),
    viewMonth.getMonth() + 1,
    0,
  );
  const startOffset = monthStart.getDay();
  const totalDays = monthEnd.getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const dayNumber = index - startOffset + 1;
    if (dayNumber < 1 || dayNumber > totalDays) return null;

    const date = new Date(
      viewMonth.getFullYear(),
      viewMonth.getMonth(),
      dayNumber,
    );
    const isoDate = toIsoDate(date);
    return {
      isoDate,
      dayNumber,
      disabled: isoDate < minDate,
    };
  });
}

function parseTimeValue(value?: string) {
  if (!value) {
    return { hour: "09", minute: "00", meridiem: "AM" as const };
  }

  const [rawHours, rawMinutes] = value.split(":").map(Number);
  if (Number.isNaN(rawHours) || Number.isNaN(rawMinutes)) {
    return { hour: "09", minute: "00", meridiem: "AM" as const };
  }

  const meridiem = rawHours >= 12 ? "PM" : "AM";
  const twelveHour = rawHours % 12 || 12;
  return {
    hour: String(twelveHour).padStart(2, "0"),
    minute: String(rawMinutes).padStart(2, "0"),
    meridiem,
  };
}

function buildTimeValue(hour: string, minute: string, meridiem: "AM" | "PM") {
  const hourNumber = Number(hour);
  const minuteNumber = Number(minute);
  if (Number.isNaN(hourNumber) || Number.isNaN(minuteNumber)) return "";

  let hours24 = hourNumber % 12;
  if (meridiem === "PM") hours24 += 12;

  return `${String(hours24).padStart(2, "0")}:${String(minuteNumber).padStart(
    2,
    "0",
  )}`;
}

function sortByLabel<T extends { label: string }>(items: T[]) {
  return [...items].sort((a, b) =>
    a.label.localeCompare(b.label, undefined, { sensitivity: "base" }),
  );
}

function Toast({
  toast,
  onDismiss,
}: {
  toast: ToastState;
  onDismiss: () => void;
}) {
  return (
    <div
      className={cn(
        "fixed right-5 top-5 z-[100] flex items-center gap-2.5 rounded-xl px-4 py-3 text-sm font-medium text-white shadow-xl",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
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

function MultiSelectPopover({
  label,
  placeholder,
  options,
  selectedIds,
  onToggle,
  onClear,
  error,
}: {
  label: string;
  placeholder: string;
  options: MultiSelectOption[];
  selectedIds: number[];
  onToggle: (id: number) => void;
  onClear: () => void;
  error?: string;
}) {
  const selectedOptions = options.filter((option) =>
    selectedIds.includes(option.id),
  );
  const summary =
    selectedOptions.length === 0
      ? placeholder
      : selectedOptions.length === 1
        ? selectedOptions[0].label
        : `${selectedOptions.length} selected`;

  return (
    <div className="w-full space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-white px-3 text-left text-xs",
              "transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-brand-300",
              error && "border-red-400 focus:ring-red-300",
            )}
          >
            <span
              className={cn(
                selectedOptions.length === 0 && "text-muted-foreground",
              )}
            >
              {summary}
            </span>
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-[min(320px,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-[var(--radix-popover-trigger-width)] max-w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-border bg-white p-0 shadow-lg"
        >
          <div className="border-b border-border px-3 py-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {selectedOptions.length} selected
                </p>
              </div>
              {selectedOptions.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>
          <div
            className="max-h-[min(255px,calc(var(--radix-popover-content-available-height)-72px))] overflow-y-auto overscroll-contain p-1.5 pr-1"
            onWheelCapture={handleScrollableWheel}
          >
            {options.length === 0 ? (
              <div className="px-2 py-3 text-xs text-muted-foreground">
                No options available
              </div>
            ) : (
              options.map((option) => {
                const checked = selectedIds.includes(option.id);

                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => onToggle(option.id)}
                    className="flex w-full items-start gap-2 rounded-md px-2 py-2 text-left transition-colors hover:bg-muted"
                  >
                    <span
                      className={cn(
                        "mt-0.5 inline-flex h-4 w-4 flex-shrink-0 items-center justify-center rounded border",
                        checked
                          ? "border-brand-600 bg-brand-600 text-white"
                          : "border-border bg-white text-transparent",
                      )}
                    >
                      <Check className="h-3 w-3" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-xs font-medium text-foreground">
                        {option.label}
                      </span>
                      {option.helper && (
                        <span className="block text-[11px] text-muted-foreground">
                          {option.helper}
                        </span>
                      )}
                    </span>
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function MultiDatePopover({
  label,
  selectedDates,
  onToggleDate,
  onClear,
  error,
}: {
  label: string;
  selectedDates: string[];
  onToggleDate: (value: string) => void;
  onClear: () => void;
  error?: string;
}) {
  const [viewMonth, setViewMonth] = useState(() => {
    const firstSelectedDate = sortIsoDates(selectedDates)[0];
    return firstSelectedDate
      ? new Date(
          parseIsoDate(firstSelectedDate).getFullYear(),
          parseIsoDate(firstSelectedDate).getMonth(),
          1,
        )
      : new Date();
  });

  useEffect(() => {
    if (selectedDates.length === 0) {
      setViewMonth(new Date());
      return;
    }

    if (selectedDates.length === 1) {
      const selectedMonth = parseIsoDate(selectedDates[0]);
      setViewMonth(
        new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1),
      );
    }
  }, [selectedDates]);

  const scheduledDates = resolveScheduledDates(selectedDates);
  const anchorDates = sortIsoDates(selectedDates);
  const scheduledSet = new Set(scheduledDates);
  const anchorSet = new Set(anchorDates);
  const minDate = todayIso();
  const summary = getDateSelectionSummary(selectedDates);
  const calendarDays = getCalendarGrid(viewMonth, minDate);

  return (
    <div className="w-full space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label} <span className="text-red-500">*</span>
      </Label>
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-white px-3 text-left text-xs",
              "transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-brand-300",
              error && "border-red-400 focus:ring-red-300",
            )}
          >
            <span
              className={cn(
                "truncate",
                selectedDates.length === 0 && "text-muted-foreground",
              )}
            >
              {summary}
            </span>
            <CalendarRange className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[320px] p-0"
        >
          <div className="border-b border-border px-3 py-3">
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <p className="text-[11px] text-muted-foreground">
                  {getScheduledDateSummary(selectedDates)}
                </p>
              </div>
              {selectedDates.length > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="p-3">
            <div className="mb-3 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewMonth((current) => shiftMonth(current, -1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <p className="text-xs font-semibold text-foreground">
                {formatMonthLabel(viewMonth)}
              </p>
              <button
                type="button"
                onClick={() => setViewMonth((current) => shiftMonth(current, 1))}
                className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-border bg-white text-muted-foreground transition-colors hover:bg-muted"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="mb-2 grid grid-cols-7 gap-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((labelValue) => (
                <div
                  key={labelValue}
                  className="py-1 text-center text-[11px] font-medium text-muted-foreground"
                >
                  {labelValue}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) =>
                day ? (
                  <button
                    key={day.isoDate}
                    type="button"
                    disabled={day.disabled}
                    onClick={() => onToggleDate(day.isoDate)}
                    className={cn(
                      "inline-flex h-9 items-center justify-center rounded-md border text-xs font-medium transition-colors",
                      day.disabled &&
                        "cursor-not-allowed border-transparent text-muted-foreground/50",
                      !day.disabled &&
                        !scheduledSet.has(day.isoDate) &&
                        "border-transparent text-foreground hover:border-border hover:bg-muted/30",
                      scheduledSet.has(day.isoDate) &&
                        !anchorSet.has(day.isoDate) &&
                        "border-brand-200 bg-brand-50 text-brand-700",
                      anchorSet.has(day.isoDate) &&
                        "border-brand-600 bg-brand-600 text-white hover:bg-brand-700",
                    )}
                  >
                    {day.dayNumber}
                  </button>
                ) : (
                  <div key={`empty-${index}`} className="h-9" />
                ),
              )}
            </div>

            <div className="mt-3 space-y-2">
              <p className="text-[11px] text-muted-foreground">
                Only the dates you select will be used for the event schedule.
              </p>
              {scheduledDates.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {scheduledDates.slice(0, 8).map((date) => (
                    <span
                      key={date}
                      className={cn(
                        "inline-flex items-center rounded-full border px-2 py-1 text-[11px] font-medium",
                        anchorSet.has(date)
                          ? "border-brand-200 bg-brand-50 text-brand-700"
                          : "border-border bg-muted/30 text-foreground",
                      )}
                    >
                      {formatDisplayDate(date)}
                    </span>
                  ))}
                  {scheduledDates.length > 8 && (
                    <span className="inline-flex items-center rounded-full border border-border bg-muted/30 px-2 py-1 text-[11px] font-medium text-muted-foreground">
                      +{scheduledDates.length - 8} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function TimeSelectField({
  label,
  value,
  error,
  onChange,
}: {
  label: string;
  value: string;
  error?: string;
  onChange: (value: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const currentParts = useMemo(() => parseTimeValue(value), [value]);
  const hourOptions = useMemo(
    () =>
      Array.from({ length: 12 }, (_, index) =>
        String(index + 1).padStart(2, "0"),
      ),
    [],
  );
  const minuteOptions = useMemo(
    () =>
      Array.from({ length: 60 }, (_, index) =>
        String(index).padStart(2, "0"),
      ),
    [],
  );

  const updateTime = (next: Partial<typeof currentParts>) => {
    const merged = {
      hour: next.hour ?? currentParts.hour,
      minute: next.minute ?? currentParts.minute,
      meridiem: (next.meridiem ?? currentParts.meridiem) as "AM" | "PM",
    };

    onChange(buildTimeValue(merged.hour, merged.minute, merged.meridiem));
  };

  return (
    <div className="w-full space-y-1.5">
      <Label className="text-xs font-medium text-foreground">
        {label} <span className="text-red-500">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-white px-3 text-left text-xs shadow-sm",
              "transition-colors hover:bg-muted/20 focus:outline-none focus:ring-2 focus:ring-brand-300",
              "data-[state=open]:border-brand-500 data-[state=open]:ring-2 data-[state=open]:ring-brand-200",
              error && "border-red-400 focus:ring-red-300",
            )}
          >
            <span className={cn(!value && "text-muted-foreground")}>
              {value ? formatTimeDisplay(value) : "Select time"}
            </span>
            <Clock className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="max-h-[min(360px,var(--radix-popover-content-available-height))] w-[300px] overflow-hidden rounded-xl border border-border bg-white p-0 shadow-lg"
        >
          <div className="border-b border-border px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[11px] font-medium text-foreground">{label}</p>
                <p className="mt-1 text-sm font-medium text-brand-700">
                  {formatTimeDisplay(value || "09:00")}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {value && (
                  <button
                    type="button"
                    onClick={() => onChange("")}
                    className="text-[11px] font-medium text-brand-600 hover:text-brand-700"
                  >
                    Clear
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground"
                  aria-label="Close time picker"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-[1fr_1fr_88px] gap-3 px-4 py-4">
            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Hour
              </p>
              <div
                className="max-h-[min(11rem,calc(var(--radix-popover-content-available-height)-150px))] space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-border bg-muted/10 p-1 pr-1"
                onWheelCapture={handleScrollableWheel}
              >
                {hourOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime({ hour: option })}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-md text-[11px] font-medium transition-colors",
                      currentParts.hour === option
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-foreground hover:bg-muted/40",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Minute
              </p>
              <div
                className="max-h-[min(11rem,calc(var(--radix-popover-content-available-height)-150px))] space-y-1 overflow-y-auto overscroll-contain rounded-lg border border-border bg-muted/10 p-1 pr-1"
                onWheelCapture={handleScrollableWheel}
              >
                {minuteOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime({ minute: option })}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-md text-[11px] font-medium transition-colors",
                      currentParts.minute === option
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-foreground hover:bg-muted/40",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Period
              </p>
              <div className="space-y-1 rounded-lg border border-border bg-muted/10 p-1">
                {(["AM", "PM"] as const).map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => updateTime({ meridiem: option })}
                    className={cn(
                      "flex h-8 w-full items-center justify-center rounded-md text-[11px] font-medium transition-colors",
                      currentParts.meridiem === option
                        ? "bg-brand-600 text-white shadow-sm"
                        : "text-foreground hover:bg-muted/40",
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex items-center justify-end border-t border-border px-4 py-3">
            <Button
              type="button"
              size="sm"
              className="h-8 px-3 text-[11px]"
              onClick={() => setOpen(false)}
            >
              Done
            </Button>
          </div>
        </PopoverContent>
      </Popover>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

function LocationSelectField({
  label,
  value,
  options,
  placeholder,
  disabled,
  error,
  onChange,
}: {
  label: string;
  value?: number;
  options: { id: number; label: string }[];
  placeholder: string;
  disabled?: boolean;
  error?: string;
  onChange: (value?: number) => void;
}) {
  return (
    <div className="w-full space-y-1.5">
      <Label className="text-xs font-medium text-foreground">{label}</Label>
      <Select
        value={value ? String(value) : undefined}
        disabled={disabled}
        onValueChange={(nextValue) =>
          onChange(nextValue ? Number(nextValue) : undefined)
        }
      >
        <SelectTrigger
          className={cn(
            "h-9 rounded-lg border-border bg-white text-xs shadow-sm",
            "data-[state=open]:border-brand-500 data-[state=open]:ring-2 data-[state=open]:ring-brand-200",
            disabled && "cursor-not-allowed bg-muted/40 text-muted-foreground",
            error && "border-red-400 focus:ring-red-300",
          )}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.id} value={String(option.id)}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export default function CreateEventPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>(SEED);
  const [form, setForm] = useState<EventFormState>(getInitialFormState);
  const [errors, setErrors] = useState<EventFormErrors>({});
  const [toast, setToast] = useState<ToastState | null>(null);
  const [geoNodes, setGeoNodes] = useState<GeoNode[]>([]);
  const [users, setUsers] = useState<Employee[]>([]);
  const [distributors, setDistributors] = useState<Distributor[]>([]);
  const [customerDistributors, setCustomerDistributors] = useState<Customer[]>(
    [],
  );

  useEffect(() => {
    setEvents(loadEvents());
    setGeoNodes(loadGeoNodes().filter((node) => node.status === "active"));
    setUsers(
      loadEmployees().filter((employee) => employee.status !== "archived"),
    );
    setDistributors(loadDistributors());
    setCustomerDistributors(loadCustomers());
  }, []);

  const userOptions = useMemo(
    () =>
      [...users]
        .sort((a, b) =>
          a.fullName.localeCompare(b.fullName, undefined, {
            sensitivity: "base",
          }),
        )
        .map((user) => ({
          id: user.id,
          label: user.fullName,
          helper: `${user.employeeId} · ${user.role}`,
        })),
    [users],
  );

  const farmerOptions = useMemo(() => sortByLabel(FARMER_OPTIONS), []);
  const distributorOptions = useMemo(
    () =>
      sortByLabel([
        ...distributors.map((distributor) => ({
          id: distributor.id,
          label: distributor.firmName,
          helper: `${distributor.contactPersonName} - ${distributor.phoneNumber} - Distributor Listing`,
        })),
        ...customerDistributors.map((customer) => ({
          id: CUSTOMER_DISTRIBUTOR_ID_OFFSET + customer.id,
          label: customer.customerName,
          helper: `${customer.customerCode} - ${customer.mobile} - Customer Master`,
        })),
      ]),
    [customerDistributors, distributors],
  );

  const attendeeCount =
    form.selectedUserIds.length +
    form.selectedFarmerIds.length +
    form.selectedDistributorIds.length;
  const scheduledDates = useMemo(
    () => resolveScheduledDates(form.selectedDates),
    [form.selectedDates],
  );

  const selectedLocationNodes = useMemo(() => {
    const result: Partial<Record<GeoLevel, GeoNode>> = {};

    LOCATION_LEVELS.forEach((level) => {
      const nodeId = form.location[level];
      if (!nodeId) return;
      const foundNode = geoNodes.find((node) => node.id === nodeId);
      if (foundNode) result[level] = foundNode;
    });

    return result;
  }, [form.location, geoNodes]);

  const nextEventCode = useMemo(() => {
    const nextId = Math.max(0, ...events.map((event) => event.id)) + 1;
    return `EVT-${String(nextId).padStart(3, "0")}`;
  }, [events]);

  const getOptionsForLevel = (level: GeoLevel) => {
    const parentLevel = LOCATION_PARENT[level];

    return geoNodes
      .filter((node) => {
        if (node.level !== level) return false;
        if (!parentLevel) return true;

        const selectedParentId = form.location[parentLevel];
        if (!selectedParentId) return false;

        return node.parentId === selectedParentId;
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" }),
      )
      .map((node) => ({ id: node.id, label: node.name }));
  };

  const setField = <K extends keyof EventFormState>(
    key: K,
    value: EventFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (key in errors) {
      setErrors((current) => ({ ...current, [key]: undefined }));
    }
  };

  const handleToggleDate = (value: string) => {
    setForm((current) => ({
      ...current,
      selectedDates: current.selectedDates.includes(value)
        ? current.selectedDates.filter((item) => item !== value)
        : sortIsoDates([...current.selectedDates, value]),
    }));
    setErrors((current) => ({ ...current, selectedDates: undefined }));
  };

  const handleToggleUser = (id: number) => {
    setForm((current) => ({
      ...current,
      selectedUserIds: current.selectedUserIds.includes(id)
        ? current.selectedUserIds.filter((item) => item !== id)
        : [...current.selectedUserIds, id],
    }));
    setErrors((current) => ({ ...current, attendees: undefined }));
  };

  const handleToggleFarmer = (id: number) => {
    setForm((current) => ({
      ...current,
      selectedFarmerIds: current.selectedFarmerIds.includes(id)
        ? current.selectedFarmerIds.filter((item) => item !== id)
        : [...current.selectedFarmerIds, id],
    }));
    setErrors((current) => ({ ...current, attendees: undefined }));
  };

  const handleToggleDistributor = (id: number) => {
    setForm((current) => ({
      ...current,
      selectedDistributorIds: current.selectedDistributorIds.includes(id)
        ? current.selectedDistributorIds.filter((item) => item !== id)
        : [...current.selectedDistributorIds, id],
    }));
    setErrors((current) => ({ ...current, attendees: undefined }));
  };

  const handleLocationChange = (level: GeoLevel, value?: number) => {
    setForm((current) => {
      const nextLocation: LocationSelection = { ...current.location };
      const levelIndex = LOCATION_LEVELS.indexOf(level);

      if (value) nextLocation[level] = value;
      else delete nextLocation[level];

      LOCATION_LEVELS.slice(levelIndex + 1).forEach((childLevel) => {
        delete nextLocation[childLevel];
      });

      return { ...current, location: nextLocation };
    });

    setErrors((current) => {
      const nextErrors = { ...current, [level]: undefined };
      const levelIndex = LOCATION_LEVELS.indexOf(level);
      LOCATION_LEVELS.slice(levelIndex + 1).forEach((childLevel) => {
        nextErrors[childLevel] = undefined;
      });
      return nextErrors;
    });
  };

  const validateForm = () => {
    const nextErrors: EventFormErrors = {};
    const today = todayIso();

    if (!form.title.trim()) nextErrors.title = "Event name is required.";
    if (form.selectedDates.length === 0) {
      nextErrors.selectedDates = "Select at least one event date.";
    } else if (
      sortIsoDates(form.selectedDates).some((date) => date < today)
    ) {
      nextErrors.selectedDates = "Past dates are not allowed.";
    }

    if (!form.time) nextErrors.time = "Time is required.";
    if (attendeeCount === 0) {
      nextErrors.attendees = "Select at least one attendee.";
    }

    LOCATION_LEVELS.forEach((level) => {
      if (!form.location[level]) nextErrors[level] = `${level} is required.`;
    });

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleCreateEvent = () => {
    if (!validateForm()) return;

    const eventDates = scheduledDates;
    const startDate = eventDates[0];
    const endDate = eventDates[eventDates.length - 1];
    const nextId = Math.max(0, ...events.map((event) => event.id)) + 1;
    const eventCode = `EVT-${String(nextId).padStart(3, "0")}`;
    const zone = selectedLocationNodes.Zone;
    const state = selectedLocationNodes.State;
    const region = selectedLocationNodes.Region;
    const area = selectedLocationNodes.Area;
    const territory = selectedLocationNodes.Territory;
    const locality = selectedLocationNodes.Locality;
    const city = selectedLocationNodes.City;
    const currentUser = AuthService.getUserData();
    const organizerName = currentUser?.username || currentUser?.email || "Admin";
    const locationSummary = [
      city?.name,
      locality?.name,
      territory?.name,
      area?.name,
      region?.name,
      state?.name,
      zone?.name,
    ]
      .filter(Boolean)
      .join(", ");

    const nextEvent: Event = {
      id: nextId,
      eventCode,
      title: form.title.trim(),
      type: "training",
      venue:
        city?.name ||
        locality?.name ||
        territory?.name ||
        area?.name ||
        region?.name ||
        "Location TBD",
      district:
        region?.name ||
        area?.name ||
        territory?.name ||
        locality?.name ||
        "",
      state: state?.name || "",
      startDate,
      endDate,
      time: form.time,
      organizer: organizerName,
      expectedAttendees: attendeeCount,
      actualAttendees: 0,
      status: startDate === todayIso() ? "ongoing" : "upcoming",
      scheduledDates: eventDates,
      locationSummary,
      location: { ...form.location },
      userAttendeeIds: [...form.selectedUserIds],
      farmerAttendeeIds: [...form.selectedFarmerIds],
      distributorAttendeeIds: [...form.selectedDistributorIds],
    };

    const updatedEvents = [nextEvent, ...events];
    setEvents(updatedEvents);
    saveEvents(updatedEvents);
    setToast({ msg: "Event created successfully.", type: "success" });
    window.setTimeout(() => router.push("/events/event"), 900);
  };

  return (
    <FormContainer
      title="Create Event"
      description="Events → Event → Create"
      onBack={() => router.push("/events/event")}
      noCard
      actions={
        <div className="flex items-center gap-2">
          <span className="rounded bg-brand-50 px-2 py-1.5 font-mono text-[11px] font-semibold text-brand-700">
            {nextEventCode}
          </span>
          <Button
            variant="outline"
            className="h-9 rounded-lg text-xs font-semibold"
            onClick={() => router.push("/events/event")}
          >
            Discard
          </Button>
          <Button
            className="h-9 gap-1.5 rounded-lg bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700"
            onClick={handleCreateEvent}
          >
            <Save className="h-4 w-4" /> Create Event
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        <SectionCard title="Event Information">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <div className="w-full space-y-1.5">
              <Label className="text-xs font-medium text-foreground">
                Event Name <span className="text-red-500">*</span>
              </Label>
              <Input
                value={form.title}
                onChange={(event) => setField("title", event.target.value)}
                placeholder="Enter event name"
                className={cn(
                  "h-9 text-xs",
                  errors.title && "border-red-400 focus-visible:ring-red-300",
                )}
              />
              {errors.title && (
                <p className="text-[11px] text-red-500">{errors.title}</p>
              )}
            </div>

            <MultiDatePopover
              label="Event Dates"
              selectedDates={form.selectedDates}
              onToggleDate={handleToggleDate}
              onClear={() => setField("selectedDates", [])}
              error={errors.selectedDates}
            />

            <TimeSelectField
              label="Time"
              value={form.time}
              error={errors.time}
              onChange={(value) => setField("time", value)}
            />
          </div>
        </SectionCard>

        <SectionCard title="Attendees">
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <MultiSelectPopover
              label="Users"
              placeholder="Select users"
              options={userOptions}
              selectedIds={form.selectedUserIds}
              onToggle={handleToggleUser}
              onClear={() => setField("selectedUserIds", [])}
            />

            <MultiSelectPopover
              label="Farmers"
              placeholder="Select farmers"
              options={farmerOptions}
              selectedIds={form.selectedFarmerIds}
              onToggle={handleToggleFarmer}
              onClear={() => setField("selectedFarmerIds", [])}
            />

            <MultiSelectPopover
              label="Distributor"
              placeholder="Select distributors"
              options={distributorOptions}
              selectedIds={form.selectedDistributorIds}
              onToggle={handleToggleDistributor}
              onClear={() => setField("selectedDistributorIds", [])}
            />
          </div>
          {errors.attendees && (
            <p className="text-[11px] text-red-500">{errors.attendees}</p>
          )}
        </SectionCard>

        <SectionCard title="Location">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
            {LOCATION_LEVELS.map((level) => {
              const options = getOptionsForLevel(level);
              const parentLevel = LOCATION_PARENT[level];
              const isDisabled = parentLevel ? !form.location[parentLevel] : false;

              return (
                <LocationSelectField
                  key={level}
                  label={level}
                  value={form.location[level]}
                  options={options}
                  placeholder={
                    parentLevel && !form.location[parentLevel]
                      ? `Select ${parentLevel} first`
                      : `Select ${level}`
                  }
                  disabled={isDisabled}
                  error={errors[level]}
                  onChange={(value) => handleLocationChange(level, value)}
                />
              );
            })}
          </div>
        </SectionCard>
      </div>

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </FormContainer>
  );
}
