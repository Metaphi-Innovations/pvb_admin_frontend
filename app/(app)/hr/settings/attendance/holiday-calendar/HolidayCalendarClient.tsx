"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarDays,
  Copy,
  Plus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { HolidayScopeCombobox } from "./HolidayScopeCombobox";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import { HrDateInput, formatHrDateDisplay, HrYearSelect } from "../../../components/HrDateInput";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrListingToolbar,
  HrDataGrid,
  HrRowActions,
  HrStatusToggle,
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  APPLICABLE_TO_OPTIONS,
  applicableToLabel,
  buildCopiedCalendarDraft,
  countHolidayTypes,
  currentCalendarYear,
  findDuplicateCalendarScope,
  getActiveBranchOptions,
  getAvailableYears,
  getCalendarLocationLabel,
  getCalendarsForYear,
  getHolidayStateOptions,
  HOLIDAY_TYPE_OPTIONS,
  holidayTypeHelper,
  holidayTypeLabel,
  loadHolidayCalendars,
  nextCalendarId,
  nextHolidayRowId,
  normalizeHolidayName,
  saveHolidayCalendars,
  isDateInCalendarYear,
  withCalendarNewAudit,
  withCalendarUpdateAudit,
  type HolidayApplicableTo,
  type HolidayCalendarRecord,
  type HolidayRow,
  type HolidayTypeId,
} from "../../holiday-calendar-data";

type PageMode = "list" | "detail";

type CalendarFormState = {
  id?: number;
  name: string;
  year: string;
  applicableTo: HolidayApplicableTo;
  state: string;
  branchId: number | null;
  branchName: string;
  status: HolidayCalendarRecord["status"];
};

type HolidayFormState = {
  id?: number;
  name: string;
  date: string;
  holidayType: HolidayTypeId;
};

const EMPTY_CALENDAR: CalendarFormState = {
  name: "",
  year: String(currentCalendarYear()),
  applicableTo: "company_wide",
  state: "",
  branchId: null,
  branchName: "",
  status: "active",
};

const EMPTY_HOLIDAY: HolidayFormState = {
  name: "",
  date: "",
  holidayType: "public",
};

const LIST_COLUMNS = [
  { id: "name", label: "Calendar Name" },
  { id: "applicableTo", label: "Applicable To" },
  { id: "location", label: "Location" },
  { id: "publicCount", label: "Public Holidays" },
  { id: "optionalCount", label: "Optional Holidays" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

const HOLIDAY_COLUMNS = [
  { id: "name", label: "Holiday Name" },
  { id: "date", label: "Date" },
  { id: "holidayType", label: "Holiday Type" },
  { id: "actions", label: "Actions" },
];

type TypeFilter = "all" | HolidayTypeId;

function HolidayTypePill({ type }: { type: HolidayTypeId }) {
  const isPublic = type === "public";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
        isPublic ? "bg-navy-50 text-navy-700" : "bg-amber-50 text-amber-700",
      )}
      title={holidayTypeHelper(type)}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isPublic ? "bg-navy-500" : "bg-amber-400",
        )}
      />
      {holidayTypeLabel(type)}
    </span>
  );
}

type DeleteState = { record: HolidayCalendarRecord } & HrSettingsDeleteTarget;

export default function HolidayCalendarClient() {
  const [calendars, setCalendars] = useState<HolidayCalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(currentCalendarYear()));
  const [pageMode, setPageMode] = useState<PageMode>("list");
  const [activeCalendarId, setActiveCalendarId] = useState<number | null>(null);
  const [draftCalendar, setDraftCalendar] = useState<HolidayCalendarRecord | null>(null);
  const [isDraftDirty, setIsDraftDirty] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [listVisibleColumns, setListVisibleColumns] = useState(LIST_COLUMNS.map((c) => c.id));
  const [holidayVisibleColumns, setHolidayVisibleColumns] = useState(
    HOLIDAY_COLUMNS.map((c) => c.id),
  );
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [calendarSheetOpen, setCalendarSheetOpen] = useState(false);
  const [calendarForm, setCalendarForm] = useState<CalendarFormState>(EMPTY_CALENDAR);
  const [calendarErrors, setCalendarErrors] = useState<Record<string, string>>({});

  const [holidaySheetOpen, setHolidaySheetOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState<HolidayFormState>(EMPTY_HOLIDAY);
  const [holidayErrors, setHolidayErrors] = useState<Record<string, string>>({});

  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState("");
  const [copySourceCalendarId, setCopySourceCalendarId] = useState("");
  const [copyTargetName, setCopyTargetName] = useState("");
  const [copyErrors, setCopyErrors] = useState<Record<string, string>>({});

  const [toast, setToast] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setCalendars(loadHolidayCalendars());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const yearNum = Number(selectedYear) || currentCalendarYear();
  const availableYears = useMemo(() => getAvailableYears(calendars), [calendars]);
  const yearCalendars = useMemo(
    () => getCalendarsForYear(yearNum, calendars),
    [calendars, yearNum],
  );

  const activeCalendar = useMemo(() => {
    if (draftCalendar) return draftCalendar;
    if (activeCalendarId == null) return null;
    return calendars.find((c) => c.id === activeCalendarId) ?? null;
  }, [calendars, activeCalendarId, draftCalendar]);

  const stateOptions = useMemo(() => getHolidayStateOptions(), []);
  const branchOptions = useMemo(() => getActiveBranchOptions(), []);

  const filteredCalendars = useMemo(() => {
    let list = yearCalendars;
    if (statusFilter !== "all") list = list.filter((c) => c.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        applicableToLabel(c.applicableTo).toLowerCase().includes(q) ||
        getCalendarLocationLabel(c).toLowerCase().includes(q),
    );
  }, [yearCalendars, search, statusFilter]);

  const filteredHolidays = useMemo(() => {
    if (!activeCalendar) return [];
    let list = activeCalendar.holidays;
    if (typeFilter !== "all") list = list.filter((h) => h.holidayType === typeFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (h) =>
        h.name.toLowerCase().includes(q) ||
        holidayTypeLabel(h.holidayType).toLowerCase().includes(q) ||
        formatHrDateDisplay(h.date).toLowerCase().includes(q) ||
        h.date.includes(q),
    );
  }, [activeCalendar, typeFilter, search]);

  const copySourceCalendars = useMemo(() => {
    const y = Number(copySourceYear);
    if (!y) return [];
    return getCalendarsForYear(y, calendars);
  }, [calendars, copySourceYear]);

  const openList = () => {
    setPageMode("list");
    setActiveCalendarId(null);
    setDraftCalendar(null);
    setIsDraftDirty(false);
    setSearch("");
    setTypeFilter("all");
  };

  const openDetail = (calendar: HolidayCalendarRecord) => {
    setActiveCalendarId(calendar.id);
    setDraftCalendar(null);
    setIsDraftDirty(false);
    setPageMode("detail");
    setSearch("");
    setTypeFilter("all");
  };

  const openAddCalendar = () => {
    setCalendarForm({ ...EMPTY_CALENDAR, year: selectedYear });
    setCalendarErrors({});
    setCalendarSheetOpen(true);
  };

  const openEditCalendarMeta = (calendar: HolidayCalendarRecord) => {
    setCalendarForm({
      id: calendar.id,
      name: calendar.name,
      year: String(calendar.year),
      applicableTo: calendar.applicableTo,
      state: calendar.state,
      branchId: calendar.branchId,
      branchName: calendar.branchName,
      status: calendar.status,
    });
    setCalendarErrors({});
    setCalendarSheetOpen(true);
  };

  const setCalendarField = <K extends keyof CalendarFormState>(
    key: K,
    value: CalendarFormState[K],
  ) => {
    setCalendarForm((f) => ({ ...f, [key]: value }));
    setCalendarErrors((e) => {
      const n = { ...e };
      delete n[key];
      return n;
    });
  };

  const validateCalendarForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!calendarForm.name.trim()) e.name = "Calendar name is required";
    if (!calendarForm.year.trim()) e.year = "Year is required";
    if (calendarForm.applicableTo === "state" && !calendarForm.state.trim()) {
      e.state = "State is required";
    }
    if (calendarForm.applicableTo === "branch" && calendarForm.branchId == null) {
      e.branchId = "Branch is required";
    }

    const year = Number(calendarForm.year);
    const candidate = {
      id: calendarForm.id ?? 0,
      year,
      applicableTo: calendarForm.applicableTo,
      state: calendarForm.state.trim(),
      branchId: calendarForm.branchId,
    };
    const dup = findDuplicateCalendarScope(calendars, candidate);
    if (dup) e.applicableTo = "A calendar with this scope already exists for this year";

    setCalendarErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveCalendarMeta = () => {
    if (!validateCalendarForm()) return;
    const year = Number(calendarForm.year);
    const payload = {
      name: calendarForm.name.trim(),
      year,
      applicableTo: calendarForm.applicableTo,
      state: calendarForm.applicableTo === "state" ? calendarForm.state.trim() : "",
      branchId: calendarForm.applicableTo === "branch" ? calendarForm.branchId : null,
      branchName: calendarForm.applicableTo === "branch" ? calendarForm.branchName : "",
      status: calendarForm.status,
    };

    if (calendarForm.id) {
      saveHolidayCalendars(
        calendars.map((c) =>
          c.id === calendarForm.id
            ? withCalendarUpdateAudit({ ...c, ...payload })
            : c,
        ),
      );
      setToast(`Updated ${payload.name}`);
    } else {
      const created = withCalendarNewAudit({
        id: nextCalendarId(calendars),
        ...payload,
        holidays: [],
      });
      saveHolidayCalendars([...calendars, created]);
      setToast(`Created ${payload.name}`);
      setSelectedYear(String(year));
      setCalendarSheetOpen(false);
      refresh();
      openDetail(created);
      return;
    }
    setCalendarSheetOpen(false);
    refresh();
  };

  const persistDraftCalendar = () => {
    if (!draftCalendar) return;
    const saved = draftCalendar;
    const next = [...calendars, saved];
    saveHolidayCalendars(next);
    setCalendars(next);
    setDraftCalendar(null);
    setIsDraftDirty(false);
    setSelectedYear(String(saved.year));
    setActiveCalendarId(saved.id);
    setPageMode("detail");
    setToast(`Created ${saved.name} — review dates and activate when ready`);
  };

  const updateActiveCalendarHolidays = (holidays: HolidayRow[]) => {
    if (draftCalendar) {
      setDraftCalendar({ ...draftCalendar, holidays });
      setIsDraftDirty(true);
      return;
    }
    if (activeCalendarId == null) return;
    const updated = calendars.map((c) =>
      c.id === activeCalendarId ? withCalendarUpdateAudit({ ...c, holidays }) : c,
    );
    saveHolidayCalendars(updated);
    refresh();
  };

  const openAddHoliday = () => {
    setHolidayForm({ ...EMPTY_HOLIDAY, date: `${yearNum}-01-01` });
    setHolidayErrors({});
    setHolidaySheetOpen(true);
  };

  const openEditHoliday = (row: HolidayRow) => {
    setHolidayForm({
      id: row.id,
      name: row.name,
      date: row.date,
      holidayType: row.holidayType,
    });
    setHolidayErrors({});
    setHolidaySheetOpen(true);
  };

  const setHolidayField = <K extends keyof HolidayFormState>(
    key: K,
    value: HolidayFormState[K],
  ) => {
    setHolidayForm((f) => ({ ...f, [key]: value }));
    setHolidayErrors((e) => {
      const n = { ...e };
      delete n[key];
      return n;
    });
  };

  const validateHolidayForm = (): boolean => {
    const e: Record<string, string> = {};
    if (!holidayForm.name.trim()) e.name = "Holiday name is required";
    if (!holidayForm.date.trim()) e.date = "Date is required";
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayForm.date.trim())) e.date = "Enter a valid date";
    else if (activeCalendar && !isDateInCalendarYear(holidayForm.date.trim(), activeCalendar.year)) {
      e.date = `Date must fall in calendar year ${activeCalendar.year}`;
    }

    if (activeCalendar && holidayForm.name.trim() && holidayForm.date.trim()) {
      const dup = activeCalendar.holidays.some(
        (h) =>
          h.id !== holidayForm.id &&
          normalizeHolidayName(h.name) === normalizeHolidayName(holidayForm.name) &&
          h.date === holidayForm.date.trim(),
      );
      if (dup) e.name = "A holiday with this name and date already exists in this calendar";
    }

    setHolidayErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveHoliday = () => {
    if (!activeCalendar || !validateHolidayForm()) return;
    const payload: HolidayRow = {
      id: holidayForm.id ?? nextHolidayRowId(activeCalendar.holidays),
      name: holidayForm.name.trim(),
      date: holidayForm.date.trim().slice(0, 10),
      holidayType: holidayForm.holidayType,
    };
    const next = holidayForm.id
      ? activeCalendar.holidays.map((h) => (h.id === holidayForm.id ? payload : h))
      : [...activeCalendar.holidays, payload];
    updateActiveCalendarHolidays(next);
    setHolidaySheetOpen(false);
    setToast(holidayForm.id ? `Updated ${payload.name}` : `Added ${payload.name}`);
  };

  const handleDeleteHoliday = (row: HolidayRow) => {
    if (!activeCalendar) return;
    updateActiveCalendarHolidays(activeCalendar.holidays.filter((h) => h.id !== row.id));
    setToast(`Removed ${row.name}`);
  };

  const applyCalendarStatus = (record: HolidayCalendarRecord, nextActive: boolean) => {
    if (draftCalendar) return;
    const nextStatus = nextActive ? "active" : "inactive";
    saveHolidayCalendars(
      calendars.map((c) =>
        c.id === record.id ? withCalendarUpdateAudit({ ...c, status: nextStatus }) : c,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const requestDeleteCalendar = (record: HolidayCalendarRecord) => {
    setDeleteTarget({
      record,
      entityLabel: "Holiday Calendar",
      usageCount: 0,
      isActive: record.status === "active",
    });
  };

  const handleDeleteCalendar = () => {
    if (!deleteTarget) return;
    saveHolidayCalendars(calendars.filter((c) => c.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const openCopyDialog = () => {
    const prev = yearNum - 1;
    setCopySourceYear(String(prev));
    setCopySourceCalendarId("");
    setCopyTargetName("");
    setCopyErrors({});
    setCopyOpen(true);
  };

  const handleStartCopy = () => {
    const e: Record<string, string> = {};
    const sourceYear = Number(copySourceYear);
    const sourceId = Number(copySourceCalendarId);
    if (!sourceYear) e.copySourceYear = "Select source year";
    if (!sourceId) e.copySourceCalendarId = "Select source calendar";
    const source = calendars.find((c) => c.id === sourceId && c.year === sourceYear);
    if (!source && sourceId) e.copySourceCalendarId = "Source calendar not found";

    const existing = source
      ? findDuplicateCalendarScope(calendars, {
          id: 0,
          year: yearNum,
          applicableTo: source.applicableTo,
          state: source.state,
          branchId: source.branchId,
        })
      : undefined;
    if (existing) {
      e.copySourceCalendarId = `A ${yearNum} calendar already exists for this scope (${existing.name})`;
    }

    setCopyErrors(e);
    if (Object.keys(e).length > 0 || !source) return;

    const name = copyTargetName.trim() || undefined;
    const draft = buildCopiedCalendarDraft(
      source,
      yearNum,
      nextCalendarId(calendars),
      name,
    );
    setCopyOpen(false);
    setDraftCalendar(draft);
    setIsDraftDirty(true);
    setActiveCalendarId(null);
    setPageMode("detail");
    setSearch("");
    setTypeFilter("all");
    setToast("Draft calendar created — review dates before saving");
  };

  const listColumns: HrDataGridColumn<HolidayCalendarRecord>[] = [
    {
      id: "name",
      label: "Calendar Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <button
          type="button"
          className="font-semibold text-foreground text-left hover:text-brand-700"
          onClick={() => openDetail(r)}
        >
          {r.name}
        </button>
      ),
    },
    {
      id: "applicableTo",
      label: "Applicable To",
      sortable: true,
      sortValue: (r) => r.applicableTo,
      render: (r) => (
        <span className="text-foreground">{applicableToLabel(r.applicableTo)}</span>
      ),
    },
    {
      id: "location",
      label: "Location",
      sortable: true,
      sortValue: (r) => getCalendarLocationLabel(r),
      render: (r) => (
        <span className="text-muted-foreground">{getCalendarLocationLabel(r)}</span>
      ),
    },
    {
      id: "publicCount",
      label: "Public Holidays",
      sortable: true,
      sortValue: (r) => countHolidayTypes(r.holidays).public,
      render: (r) => {
        const n = countHolidayTypes(r.holidays).public;
        return <span className="tabular-nums">{n} Public</span>;
      },
    },
    {
      id: "optionalCount",
      label: "Optional Holidays",
      sortable: true,
      sortValue: (r) => countHolidayTypes(r.holidays).optional,
      render: (r) => {
        const n = countHolidayTypes(r.holidays).optional;
        return <span className="tabular-nums">{n} Optional</span>;
      },
    },
    {
      id: "status",
      label: "Active",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <HrActiveStatusSwitch
          checked={r.status === "active"}
          onCheckedChange={(active) => applyCalendarStatus(r, active)}
        />
      ),
    },
    {
      id: "actions",
      label: "",
      className: "w-[5.5rem]",
      render: (r) => (
        <HrRowActions
          onView={() => openDetail(r)}
          onEdit={() => openEditCalendarMeta(r)}
          onDelete={() => requestDeleteCalendar(r)}
        />
      ),
    },
  ];

  const holidayColumns: HrDataGridColumn<HolidayRow>[] = [
    {
      id: "name",
      label: "Holiday Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "date",
      label: "Date",
      sortable: true,
      sortValue: (r) => r.date,
      render: (r) => (
        <span className="tabular-nums text-foreground">
          {formatHrDateDisplay(r.date) || r.date}
        </span>
      ),
    },
    {
      id: "holidayType",
      label: "Holiday Type",
      sortable: true,
      sortValue: (r) => r.holidayType,
      render: (r) => <HolidayTypePill type={r.holidayType} />,
    },
    {
      id: "actions",
      label: "",
      className: "w-[4.75rem]",
      render: (r) => (
        <HrRowActions onEdit={() => openEditHoliday(r)} onDelete={() => handleDeleteHoliday(r)} />
      ),
    },
  ];

  const yearSelector = (
    <div className="flex items-center gap-2">
      <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">Year</span>
      <HrYearSelect
        value={selectedYear}
        onChange={(v) => {
          setSelectedYear(v);
          openList();
        }}
        fromYear={Math.min(...availableYears, 2020)}
        toYear={Math.max(...availableYears, currentCalendarYear() + 3)}
        className="h-8 w-[7rem] text-xs"
        aria-label="Holiday calendar year"
      />
    </div>
  );

  const typeFilterPills = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(
        [
          { id: "all" as const, label: "All" },
          { id: "public" as const, label: "Public" },
          { id: "optional" as const, label: "Optional" },
        ] as const
      ).map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => setTypeFilter(opt.id)}
          className={cn(
            "h-7 px-2.5 text-[11px] rounded-lg border font-medium transition-colors",
            typeFilter === opt.id
              ? "bg-brand-600 text-white border-brand-600"
              : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );

  if (pageMode === "detail" && activeCalendar) {
    const counts = countHolidayTypes(activeCalendar.holidays);
    return (
      <HrOrgPageHeader
        title={activeCalendar.name}
        description={`${activeCalendar.year} · ${applicableToLabel(activeCalendar.applicableTo)} · ${getCalendarLocationLabel(activeCalendar) === "—" ? "All locations" : getCalendarLocationLabel(activeCalendar)}`}
        icon={CalendarDays}
        sectionLabel="Attendance Settings"
        actions={
          <div className="flex items-center gap-2">
            {draftCalendar && isDraftDirty ? (
              <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={persistDraftCalendar}>
                Save Calendar
              </Button>
            ) : (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  className={hrBtn()}
                  onClick={() => openEditCalendarMeta(activeCalendar)}
                >
                  Edit Calendar
                </Button>
                <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAddHoliday}>
                  <Plus className="w-3.5 h-3.5" /> Add Holiday
                </Button>
              </>
            )}
          </div>
        }
      >
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <button
              type="button"
              onClick={openList}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 hover:underline"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to {yearNum} calendars
            </button>
            {yearSelector}
          </div>

          {draftCalendar && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[11px] text-amber-800 leading-relaxed">
              <span className="font-semibold">Draft — not saved yet.</span> Please review holiday
              dates before saving. Festival dates may change each year. Click{" "}
              <span className="font-semibold">Save Calendar</span> when ready.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <MiniStat label="Total holidays" value={String(activeCalendar.holidays.length)} />
            <MiniStat label="Public (auto)" value={String(counts.public)} accent="navy" />
            <MiniStat label="Optional (apply)" value={String(counts.optional)} accent="amber" />
          </div>

          {typeFilterPills}

          <HrListingToolbar
            search={search}
            onSearchChange={setSearch}
            searchPlaceholder="Search holidays in this calendar…"
            statusFilter="all"
            onStatusFilterChange={() => {}}
            density={density}
            onDensityChange={setDensity}
            columns={HOLIDAY_COLUMNS}
            visibleColumns={holidayVisibleColumns}
            onVisibleColumnsChange={setHolidayVisibleColumns}
            selectedCount={0}
            onRefresh={refresh}
            onExport={() =>
              exportOrgCsv(
                `hr-holiday-calendar-${activeCalendar.id}.csv`,
                ["Holiday Name", "Date", "Holiday Type"],
                filteredHolidays.map((h) => [
                  h.name,
                  h.date,
                  holidayTypeLabel(h.holidayType),
                ]),
              )
            }
          />

          <HrDataGrid
            rows={filteredHolidays}
            columns={holidayColumns}
            visibleColumnIds={holidayVisibleColumns}
            density={density}
            loading={loading}
            isEmptyStore={activeCalendar.holidays.length === 0}
            emptyTitle="No holidays in this calendar"
            emptyDescription="Add public and optional holidays for this scope."
            emptyActionLabel="+ Add Holiday"
            onEmptyAction={openAddHoliday}
            onClearFilters={() => {
              setSearch("");
              setTypeFilter("all");
            }}
            selectedIds={[]}
            onSelectedIdsChange={() => {}}
          />
        </div>

        <HolidayRowDrawer
          open={holidaySheetOpen}
          onOpenChange={setHolidaySheetOpen}
          form={holidayForm}
          errors={holidayErrors}
          calendarYear={activeCalendar.year}
          onFieldChange={setHolidayField}
          onSave={handleSaveHoliday}
        />

        <HrSettingsDeleteDialog
          open={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          target={deleteTarget}
          onDelete={handleDeleteCalendar}
          onMakeInactive={() => {
            if (!deleteTarget) return;
            applyCalendarStatus(deleteTarget.record, false);
            setDeleteTarget(null);
          }}
        />

        <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
      </HrOrgPageHeader>
    );
  }

  return (
    <HrOrgPageHeader
      title="Holiday Calendar"
      description="Year-wise calendars by company, state, or branch. Public holidays apply automatically; optional holidays are eligible request dates."
      icon={CalendarDays}
      sectionLabel="Attendance Settings"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className={hrBtn("gap-1.5")} onClick={openCopyDialog}>
            <Copy className="w-3.5 h-3.5" /> Copy Previous Year
          </Button>
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAddCalendar}>
            <Plus className="w-3.5 h-3.5" /> Add Holiday Calendar
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {yearSelector}
          <p className="text-[11px] text-muted-foreground">
            {yearCalendars.length} calendar{yearCalendars.length === 1 ? "" : "s"} for {yearNum}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Public Holiday</span>
          {" — "}closed for covered employees; no leave request; no balance deduction.
          <span className="mx-2 text-border">|</span>
          <span className="font-semibold text-foreground">Optional Holiday</span>
          {" — "}employee may apply; entitlement from Leave Policy. Company-wide public holidays
          stack with state/branch calendars (future attendance resolution).
        </div>

        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search calendars…"
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          density={density}
          onDensityChange={setDensity}
          columns={LIST_COLUMNS}
          visibleColumns={listVisibleColumns}
          onVisibleColumnsChange={setListVisibleColumns}
          selectedCount={selectedIds.length}
          onRefresh={refresh}
          onExport={() =>
            exportOrgCsv(
              `hr-holiday-calendars-${yearNum}.csv`,
              [
                "Calendar Name",
                "Applicable To",
                "Location",
                "Public Holidays",
                "Optional Holidays",
                "Status",
              ],
              filteredCalendars.map((c) => {
                const t = countHolidayTypes(c.holidays);
                return [
                  c.name,
                  applicableToLabel(c.applicableTo),
                  getCalendarLocationLabel(c),
                  String(t.public),
                  String(t.optional),
                  c.status,
                ];
              }),
            )
          }
        />

        <HrDataGrid
          rows={filteredCalendars}
          columns={listColumns}
          visibleColumnIds={listVisibleColumns}
          density={density}
          loading={loading}
          isEmptyStore={yearCalendars.length === 0}
          emptyTitle={`No holiday calendars for ${yearNum}`}
          emptyDescription="Add a calendar or copy from a previous year."
          emptyActionLabel="+ Add Holiday Calendar"
          onEmptyAction={openAddCalendar}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <HrFormDrawer
        open={calendarSheetOpen}
        onOpenChange={setCalendarSheetOpen}
        title={calendarForm.id ? "Edit Holiday Calendar" : "Add Holiday Calendar"}
        description="Applicability is set at calendar level — not on individual holiday rows."
        onSave={handleSaveCalendarMeta}
        saveLabel={calendarForm.id ? "Update" : "Create"}
      >
        <div className="grid grid-cols-1 gap-y-3.5">
          <HrOrgField label="Calendar Name" required size="full" error={calendarErrors.name}>
            <Input
              value={calendarForm.name}
              onChange={(e) => setCalendarField("name", e.target.value)}
              className={hrInput(undefined, calendarErrors.name ? "error" : "default")}
              placeholder="Maharashtra Holiday Calendar 2026"
            />
          </HrOrgField>

          <HrOrgField label="Year" required size="full" error={calendarErrors.year}>
            <HrYearSelect
              value={calendarForm.year}
              onChange={(v) => setCalendarField("year", v)}
              fromYear={2020}
              toYear={currentCalendarYear() + 5}
              aria-invalid={!!calendarErrors.year}
            />
          </HrOrgField>

          <HrOrgField label="Applicable To" required size="full" error={calendarErrors.applicableTo}>
            <div className="flex flex-wrap gap-1.5">
              {APPLICABLE_TO_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    setCalendarForm((f) => ({
                      ...f,
                      applicableTo: opt.value,
                      state: opt.value === "state" ? f.state : "",
                      branchId: opt.value === "branch" ? f.branchId : null,
                      branchName: opt.value === "branch" ? f.branchName : "",
                    }));
                    setCalendarErrors((e) => {
                      const n = { ...e };
                      delete n.applicableTo;
                      delete n.state;
                      delete n.branchId;
                      return n;
                    });
                  }}
                  className={cn(
                    "h-8 px-3 text-xs rounded-lg border font-medium transition-colors",
                    calendarForm.applicableTo === opt.value
                      ? "bg-brand-600 text-white border-brand-600"
                      : "border-border text-muted-foreground hover:bg-muted",
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </HrOrgField>

          {calendarForm.applicableTo === "state" && (
            <HrOrgField label="State" required size="full" error={calendarErrors.state}>
              <HolidayScopeCombobox
                options={stateOptions.map((s) => ({ value: s, label: s }))}
                value={calendarForm.state || null}
                onChange={(v) => setCalendarField("state", v)}
                placeholder="Select state…"
                searchPlaceholder="Search state…"
                error={!!calendarErrors.state}
                aria-label="State"
              />
            </HrOrgField>
          )}

          {calendarForm.applicableTo === "branch" && (
            <HrOrgField label="Branch" required size="full" error={calendarErrors.branchId}>
              <HolidayScopeCombobox
                options={branchOptions.map((b) => ({
                  value: String(b.id),
                  label: b.name,
                  hint: b.state,
                }))}
                value={calendarForm.branchId != null ? String(calendarForm.branchId) : null}
                onChange={(id) => {
                  const branch = branchOptions.find((b) => b.id === Number(id));
                  setCalendarForm((f) => ({
                    ...f,
                    branchId: branch ? branch.id : null,
                    branchName: branch?.name ?? "",
                  }));
                  setCalendarErrors((e) => {
                    const n = { ...e };
                    delete n.branchId;
                    return n;
                  });
                }}
                placeholder="Select branch…"
                searchPlaceholder="Search branch…"
                error={!!calendarErrors.branchId}
                aria-label="Branch"
              />
            </HrOrgField>
          )}

          <HrStatusToggle
            checked={calendarForm.status === "active"}
            onCheckedChange={(v) => setCalendarField("status", v ? "active" : "inactive")}
            size="sm"
            helper={
              calendarForm.status === "active"
                ? "Active calendars are used for attendance and leave eligibility"
                : "Inactive calendars are kept as history but not applied"
            }
          />
        </div>
      </HrFormDrawer>

      <HolidayRowDrawer
        open={holidaySheetOpen}
        onOpenChange={setHolidaySheetOpen}
        form={holidayForm}
        errors={holidayErrors}
        calendarYear={yearNum}
        onFieldChange={setHolidayField}
        onSave={handleSaveHoliday}
      />

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md rounded-[16px] p-4 gap-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-semibold">Copy Previous Year</DialogTitle>
            <DialogDescription className="text-[11px] leading-snug">
              Creates an editable draft for {yearNum}. Holiday names and types are copied; dates
              shift to {yearNum} (month/day preserved). Please review festival dates before saving.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 pt-1">
            <HrOrgField label="Target Year" size="full">
              <Input value={String(yearNum)} readOnly className={hrInput()} />
            </HrOrgField>
            <HrOrgField label="Source Year" required size="full" error={copyErrors.copySourceYear}>
              <HrYearSelect
                value={copySourceYear}
                onChange={(v) => {
                  setCopySourceYear(v);
                  setCopySourceCalendarId("");
                  setCopyTargetName("");
                  setCopyErrors((e) => {
                    const n = { ...e };
                    delete n.copySourceYear;
                    delete n.copySourceCalendarId;
                    return n;
                  });
                }}
                fromYear={2020}
                toYear={yearNum - 1}
                aria-invalid={!!copyErrors.copySourceYear}
              />
            </HrOrgField>
            <HrOrgField
              label="Source Calendar"
              required
              size="full"
              error={copyErrors.copySourceCalendarId}
            >
              <HolidayScopeCombobox
                options={copySourceCalendars.map((c) => ({
                  value: String(c.id),
                  label: c.name,
                }))}
                value={copySourceCalendarId || null}
                onChange={(id) => {
                  setCopySourceCalendarId(id);
                  const src = copySourceCalendars.find((c) => c.id === Number(id));
                  if (src) {
                    setCopyTargetName(
                      src.name.replace(/\s+\d{4}\s*$/, "").trim() + ` ${yearNum}`,
                    );
                  }
                  setCopyErrors((e) => {
                    const n = { ...e };
                    delete n.copySourceCalendarId;
                    return n;
                  });
                }}
                placeholder={
                  copySourceCalendars.length ? "Select source calendar…" : "No calendars in source year"
                }
                searchPlaceholder="Search calendar…"
                error={!!copyErrors.copySourceCalendarId}
                disabled={!copySourceCalendars.length}
                aria-label="Source calendar"
              />
            </HrOrgField>
            <HrOrgField label="Target Calendar Name" size="full">
              <Input
                value={copyTargetName}
                onChange={(e) => setCopyTargetName(e.target.value)}
                className={hrInput()}
                placeholder={`Maharashtra Holiday Calendar ${yearNum}`}
              />
            </HrOrgField>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Please review holiday dates before saving. Festival dates may change each year.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" className={hrBtn()} onClick={() => setCopyOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className={hrBtn("gap-1.5", true)}
              onClick={handleStartCopy}
              disabled={!copySourceCalendars.length}
            >
              <Copy className="w-3.5 h-3.5" /> Create Draft
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onDelete={handleDeleteCalendar}
        onMakeInactive={() => {
          if (!deleteTarget) return;
          applyCalendarStatus(deleteTarget.record, false);
          setDeleteTarget(null);
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}

function HolidayRowDrawer({
  open,
  onOpenChange,
  form,
  errors,
  calendarYear,
  onFieldChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: HolidayFormState;
  errors: Record<string, string>;
  calendarYear: number;
  onFieldChange: <K extends keyof HolidayFormState>(key: K, value: HolidayFormState[K]) => void;
  onSave: () => void;
}) {
  return (
    <HrFormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit Holiday" : "Add Holiday"}
      description={`Holiday row for calendar year ${calendarYear}. Type defines Public vs Optional behavior.`}
      onSave={onSave}
      saveLabel={form.id ? "Update" : "Add"}
    >
      <div className="grid grid-cols-1 gap-y-3.5">
        <HrOrgField label="Holiday Name" required size="full" error={errors.name}>
          <Input
            value={form.name}
            onChange={(e) => onFieldChange("name", e.target.value)}
            className={hrInput(undefined, errors.name ? "error" : "default")}
            placeholder="Republic Day"
          />
        </HrOrgField>

        <HrOrgField label="Date" required size="full" error={errors.date}>
          <HrDateInput
            value={form.date}
            onChange={(v) => onFieldChange("date", v)}
            aria-invalid={!!errors.date}
            aria-label="Holiday date"
            min={`${calendarYear}-01-01`}
            max={`${calendarYear}-12-31`}
            className={cn(errors.date && "border-red-400")}
          />
        </HrOrgField>

        <HrOrgField label="Holiday Type" required size="full" error={errors.holidayType}>
          <div className="grid grid-cols-1 gap-2">
            {HOLIDAY_TYPE_OPTIONS.map((opt) => {
              const selected = form.holidayType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => onFieldChange("holidayType", opt.value)}
                  className={cn(
                    "w-full text-left rounded-[10px] border px-3 py-2.5 transition-colors",
                    selected
                      ? "border-brand-400 bg-brand-50/80"
                      : "border-border bg-white hover:bg-muted/30",
                  )}
                >
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      selected ? "text-brand-700" : "text-foreground",
                    )}
                  >
                    {opt.label}
                  </p>
                  <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                    {opt.helper}
                  </p>
                </button>
              );
            })}
          </div>
        </HrOrgField>
      </div>
    </HrFormDrawer>
  );
}

function MiniStat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: "navy" | "amber";
}) {
  return (
    <div className="bg-white rounded-xl border border-border p-3 flex items-center gap-3 shadow-sm">
      <div
        className={cn(
          "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
          accent === "navy"
            ? "bg-navy-50"
            : accent === "amber"
              ? "bg-amber-50"
              : "bg-brand-600",
        )}
      >
        <CalendarDays
          className={cn(
            "w-4 h-4",
            accent === "navy"
              ? "text-navy-600"
              : accent === "amber"
                ? "text-amber-600"
                : "text-white",
          )}
        />
      </div>
      <div className="min-w-0">
        <p className="text-lg font-bold text-foreground leading-none">{value}</p>
        <p className="text-[11px] text-muted-foreground mt-0.5 leading-tight truncate">{label}</p>
      </div>
    </div>
  );
}
