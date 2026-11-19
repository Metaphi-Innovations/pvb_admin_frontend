"use client";

/**
 * Simplified HR Holiday Management.
 * Fields: Holiday Name · Year · Holiday Date · Holiday Type (Mandatory / Optional).
 * New holidays are stored on a company-wide calendar for that year.
 * Historical state/branch calendars remain in storage and still resolve for attendance;
 * their holidays appear in the year list without Applicable To UI.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, Copy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  buildCopiedCalendarDraft,
  countHolidayTypes,
  currentCalendarYear,
  ensureCompanyWideCalendar,
  getAvailableYears,
  getCalendarsForYear,
  holidayTypeHelper,
  holidayTypeLabel,
  isDateInCalendarYear,
  listHolidaysForYear,
  loadHolidayCalendars,
  nextCalendarId,
  nextHolidayRowId,
  normalizeHolidayName,
  saveHolidayCalendars,
  shiftHolidayDateToYear,
  withCalendarUpdateAudit,
  type HolidayCalendarRecord,
  type HolidayRow,
  type HolidayTypeId,
  type ListedHolidayRow,
} from "../../holiday-calendar-data";

type HolidayFormState = {
  /** Existing holiday id when editing */
  id?: number;
  /** Calendar that currently owns the row (edit only) */
  calendarId?: number;
  name: string;
  year: string;
  date: string;
  holidayType: HolidayTypeId;
};

const EMPTY_HOLIDAY: HolidayFormState = {
  name: "",
  year: String(currentCalendarYear()),
  date: "",
  holidayType: "public",
};

const HOLIDAY_COLUMNS = [
  { id: "name", label: "Holiday Name" },
  { id: "date", label: "Holiday Date" },
  { id: "holidayType", label: "Holiday Type" },
  { id: "actions", label: "Actions" },
];

type TypeFilter = "all" | HolidayTypeId;

type DeleteState = {
  holiday: ListedHolidayRow;
} & HrSettingsDeleteTarget;

function HolidayTypePill({ type }: { type: HolidayTypeId }) {
  const isMandatory = type === "public";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium",
        isMandatory ? "bg-navy-50 text-navy-700" : "bg-amber-50 text-amber-700",
      )}
      title={holidayTypeHelper(type)}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full flex-shrink-0",
          isMandatory ? "bg-navy-500" : "bg-amber-400",
        )}
      />
      {holidayTypeLabel(type)}
    </span>
  );
}

export default function HolidayCalendarClient() {
  const [calendars, setCalendars] = useState<HolidayCalendarRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedYear, setSelectedYear] = useState(String(currentCalendarYear()));

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(HOLIDAY_COLUMNS.map((c) => c.id));

  const [holidaySheetOpen, setHolidaySheetOpen] = useState(false);
  const [holidayForm, setHolidayForm] = useState<HolidayFormState>(EMPTY_HOLIDAY);
  const [holidayErrors, setHolidayErrors] = useState<Record<string, string>>({});

  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceYear, setCopySourceYear] = useState("");
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

  const yearHolidays = useMemo(
    () => listHolidaysForYear(yearNum, calendars),
    [calendars, yearNum],
  );

  const filteredHolidays = useMemo(() => {
    let list = yearHolidays;
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
  }, [yearHolidays, typeFilter, search]);

  const typeCounts = useMemo(() => countHolidayTypes(yearHolidays), [yearHolidays]);

  const persistCalendars = (next: HolidayCalendarRecord[]) => {
    saveHolidayCalendars(next);
    setCalendars(next);
  };

  const openAddHoliday = () => {
    setHolidayForm({
      ...EMPTY_HOLIDAY,
      year: selectedYear,
      date: `${yearNum}-01-01`,
      holidayType: "public",
    });
    setHolidayErrors({});
    setHolidaySheetOpen(true);
  };

  const openEditHoliday = (row: ListedHolidayRow) => {
    setHolidayForm({
      id: row.id,
      calendarId: row.calendarId,
      name: row.name,
      year: String(row.year),
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
    setHolidayForm((f) => {
      if (key === "year") {
        const y = String(value);
        const yn = Number(y) || currentCalendarYear();
        return {
          ...f,
          year: y,
          date: f.date ? shiftHolidayDateToYear(f.date, yn) : `${yn}-01-01`,
        };
      }
      return { ...f, [key]: value };
    });
    setHolidayErrors((e) => {
      const n = { ...e };
      delete n[key as string];
      if (key === "year") delete n.date;
      return n;
    });
  };

  const validateHolidayForm = (): boolean => {
    const e: Record<string, string> = {};
    const year = Number(holidayForm.year);
    if (!holidayForm.name.trim()) e.name = "Holiday name is required";
    if (!holidayForm.year.trim() || !year) e.year = "Year is required";
    if (!holidayForm.date.trim()) e.date = "Holiday date is required";
    else if (!/^\d{4}-\d{2}-\d{2}$/.test(holidayForm.date.trim())) e.date = "Enter a valid date";
    else if (year && !isDateInCalendarYear(holidayForm.date.trim(), year)) {
      e.date = `Date must fall in year ${year}`;
    }

    if (holidayForm.name.trim() && holidayForm.date.trim() && year) {
      const date = holidayForm.date.trim().slice(0, 10);
      const nameKey = normalizeHolidayName(holidayForm.name);
      const dup = listHolidaysForYear(year, calendars).some(
        (h) =>
          !(
            holidayForm.id != null &&
            holidayForm.calendarId != null &&
            h.id === holidayForm.id &&
            h.calendarId === holidayForm.calendarId
          ) &&
          normalizeHolidayName(h.name) === nameKey &&
          h.date === date,
      );
      if (dup) e.name = "A holiday with this name and date already exists for this year";
    }

    setHolidayErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveHoliday = () => {
    if (!validateHolidayForm()) return;
    const year = Number(holidayForm.year);
    const payload: HolidayRow = {
      id: holidayForm.id ?? 0,
      name: holidayForm.name.trim(),
      date: holidayForm.date.trim().slice(0, 10),
      holidayType: holidayForm.holidayType,
    };

    let next = [...calendars];

    // Edit existing row
    if (holidayForm.id != null && holidayForm.calendarId != null) {
      const sourceCal = next.find((c) => c.id === holidayForm.calendarId);
      if (!sourceCal) return;

      const sameYear = sourceCal.year === year;
      if (sameYear) {
        // Keep holiday on its existing calendar (preserves historical scope)
        next = next.map((c) =>
          c.id === sourceCal.id
            ? withCalendarUpdateAudit({
                ...c,
                holidays: c.holidays.map((h) =>
                  h.id === holidayForm.id ? { ...payload, id: h.id } : h,
                ),
              })
            : c,
        );
      } else {
        // Year changed → remove from old calendar; add to company-wide for new year
        next = next.map((c) =>
          c.id === sourceCal.id
            ? withCalendarUpdateAudit({
                ...c,
                holidays: c.holidays.filter((h) => h.id !== holidayForm.id),
              })
            : c,
        );
        const ensured = ensureCompanyWideCalendar(next, year);
        next = ensured.list;
        const target = ensured.calendar;
        const row: HolidayRow = {
          ...payload,
          id: nextHolidayRowId(target.holidays),
        };
        next = next.map((c) =>
          c.id === target.id
            ? withCalendarUpdateAudit({ ...c, holidays: [...c.holidays, row] })
            : c,
        );
      }
      persistCalendars(next);
      setSelectedYear(String(year));
      setHolidaySheetOpen(false);
      setToast(`Updated ${payload.name}`);
      return;
    }

    // Create → always company-wide for the year
    const ensured = ensureCompanyWideCalendar(next, year);
    next = ensured.list;
    const target = ensured.calendar;
    const row: HolidayRow = {
      ...payload,
      id: nextHolidayRowId(target.holidays),
    };
    next = next.map((c) =>
      c.id === target.id
        ? withCalendarUpdateAudit({ ...c, holidays: [...c.holidays, row] })
        : c,
    );
    persistCalendars(next);
    setSelectedYear(String(year));
    setHolidaySheetOpen(false);
    setToast(`Added ${payload.name}`);
  };

  const requestDeleteHoliday = (row: ListedHolidayRow) => {
    setDeleteTarget({
      holiday: row,
      entityLabel: "Holiday",
      usageCount: 0,
      isActive: true,
    });
  };

  const handleDeleteHoliday = () => {
    if (!deleteTarget) return;
    const { holiday } = deleteTarget;
    const next = calendars.map((c) =>
      c.id === holiday.calendarId
        ? withCalendarUpdateAudit({
            ...c,
            holidays: c.holidays.filter((h) => h.id !== holiday.id),
          })
        : c,
    );
    persistCalendars(next);
    setToast(`${holiday.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const openCopyDialog = () => {
    setCopySourceYear(String(yearNum - 1));
    setCopyErrors({});
    setCopyOpen(true);
  };

  /**
   * Copy holidays from the previous year's company-wide calendar into this year's
   * company-wide calendar. Does not create or alter state/branch calendars.
   */
  const handleCopyFromYear = () => {
    const e: Record<string, string> = {};
    const sourceYear = Number(copySourceYear);
    if (!sourceYear) e.copySourceYear = "Select source year";
    if (sourceYear >= yearNum) e.copySourceYear = "Source year must be before the target year";

    const sourceCw = getCalendarsForYear(sourceYear, calendars).find(
      (c) => c.applicableTo === "company_wide",
    );
    if (!e.copySourceYear && (!sourceCw || sourceCw.holidays.length === 0)) {
      e.copySourceYear = `No company-wide holidays found for ${sourceYear}`;
    }

    setCopyErrors(e);
    if (Object.keys(e).length > 0 || !sourceCw) return;

    let next = [...calendars];
    const ensured = ensureCompanyWideCalendar(next, yearNum);
    next = ensured.list;
    const target = ensured.calendar;

    // Avoid duplicate name+date when merging
    const existingKeys = new Set(
      target.holidays.map((h) => `${normalizeHolidayName(h.name)}|${h.date}`),
    );
    const draft = buildCopiedCalendarDraft(
      sourceCw,
      yearNum,
      nextCalendarId(next),
    );
    let nextId = nextHolidayRowId(target.holidays);
    const toAdd: HolidayRow[] = [];
    for (const h of draft.holidays) {
      const key = `${normalizeHolidayName(h.name)}|${h.date}`;
      if (existingKeys.has(key)) continue;
      existingKeys.add(key);
      toAdd.push({ ...h, id: nextId++ });
    }

    if (toAdd.length === 0) {
      setCopyErrors({ copySourceYear: "All holidays from that year already exist" });
      return;
    }

    next = next.map((c) =>
      c.id === target.id
        ? withCalendarUpdateAudit({ ...c, holidays: [...c.holidays, ...toAdd] })
        : c,
    );
    persistCalendars(next);
    setCopyOpen(false);
    setToast(`Copied ${toAdd.length} holiday${toAdd.length === 1 ? "" : "s"} from ${sourceYear}`);
  };

  const holidayColumns: HrDataGridColumn<ListedHolidayRow>[] = [
    {
      id: "name",
      label: "Holiday Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => <span className="font-semibold text-foreground">{r.name}</span>,
    },
    {
      id: "date",
      label: "Holiday Date",
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
        <HrRowActions
          onEdit={() => openEditHoliday(r)}
          onDelete={() => requestDeleteHoliday(r)}
        />
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
          setSearch("");
          setTypeFilter("all");
        }}
        fromYear={Math.min(...availableYears, 2020)}
        toYear={Math.max(...availableYears, currentCalendarYear() + 3)}
        className="h-8 w-[7rem] text-xs"
        aria-label="Holiday year"
      />
    </div>
  );

  const typeFilterPills = (
    <div className="flex items-center gap-1.5 flex-wrap">
      {(
        [
          { id: "all" as const, label: "All" },
          { id: "public" as const, label: "Mandatory" },
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

  return (
    <HrOrgPageHeader
      title="Holiday Setup"
      description="Organization holidays by year. Mandatory holidays appear in attendance automatically; optional holidays can be requested under Optional Leave rules."
      icon={CalendarDays}
      sectionLabel="Attendance Settings"
      actions={
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" className={hrBtn("gap-1.5")} onClick={openCopyDialog}>
            <Copy className="w-3.5 h-3.5" /> Copy Previous Year
          </Button>
          <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAddHoliday}>
            <Plus className="w-3.5 h-3.5" /> Add Holiday
          </Button>
        </div>
      }
    >
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          {yearSelector}
          <p className="text-[11px] text-muted-foreground">
            {yearHolidays.length} holiday{yearHolidays.length === 1 ? "" : "s"} for {yearNum}
          </p>
        </div>

        <div className="rounded-lg border border-border bg-muted/20 px-3.5 py-2.5 text-[11px] text-muted-foreground leading-relaxed">
          <span className="font-semibold text-foreground">Mandatory</span>
          {" — "}auto holiday in attendance; no leave request.
          <span className="mx-2 text-border">|</span>
          <span className="font-semibold text-foreground">Optional</span>
          {" — "}employees may request under Optional Leave rules. New holidays apply across the
          organization.
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <MiniStat label="Total holidays" value={String(yearHolidays.length)} />
          <MiniStat label="Mandatory" value={String(typeCounts.public)} accent="navy" />
          <MiniStat label="Optional" value={String(typeCounts.optional)} accent="amber" />
        </div>

        {typeFilterPills}

        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search holidays…"
          statusFilter="all"
          onStatusFilterChange={() => {}}
          density={density}
          onDensityChange={setDensity}
          columns={HOLIDAY_COLUMNS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          selectedCount={0}
          onRefresh={refresh}
          onExport={() =>
            exportOrgCsv(
              `hr-holidays-${yearNum}.csv`,
              ["Holiday Name", "Holiday Date", "Holiday Type"],
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
          visibleColumnIds={visibleColumns}
          density={density}
          loading={loading}
          isEmptyStore={yearHolidays.length === 0}
          emptyTitle={`No holidays for ${yearNum}`}
          emptyDescription="Add a holiday or copy from a previous year."
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

      <HolidayFormDrawer
        open={holidaySheetOpen}
        onOpenChange={setHolidaySheetOpen}
        form={holidayForm}
        errors={holidayErrors}
        onFieldChange={setHolidayField}
        onSave={handleSaveHoliday}
      />

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md rounded-[16px] p-4 gap-3">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-sm font-semibold">Copy Previous Year</DialogTitle>
            <DialogDescription className="text-[11px] leading-snug">
              Copies company-wide holidays into {yearNum}. Dates shift to {yearNum} (month/day
              preserved). Historical state-specific calendars are left unchanged.
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
                  setCopyErrors((err) => {
                    const n = { ...err };
                    delete n.copySourceYear;
                    return n;
                  });
                }}
                fromYear={2020}
                toYear={yearNum - 1}
                aria-invalid={!!copyErrors.copySourceYear}
              />
            </HrOrgField>
            <p className="text-[11px] text-muted-foreground leading-snug">
              Please review festival dates after copying — they may change each year.
            </p>
          </div>
          <div className="flex justify-end gap-2 pt-1">
            <Button variant="outline" size="sm" className={hrBtn()} onClick={() => setCopyOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={handleCopyFromYear}>
              <Copy className="w-3.5 h-3.5" /> Copy Holidays
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onDelete={handleDeleteHoliday}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}

function HolidayFormDrawer({
  open,
  onOpenChange,
  form,
  errors,
  onFieldChange,
  onSave,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  form: HolidayFormState;
  errors: Record<string, string>;
  onFieldChange: <K extends keyof HolidayFormState>(key: K, value: HolidayFormState[K]) => void;
  onSave: () => void;
}) {
  const year = Number(form.year) || currentCalendarYear();
  const isMandatory = form.holidayType !== "optional";
  const isOptional = form.holidayType === "optional";

  const selectMandatory = () => onFieldChange("holidayType", "public");
  const selectOptional = () => onFieldChange("holidayType", "optional");

  return (
    <HrFormDrawer
      open={open}
      onOpenChange={onOpenChange}
      title={form.id ? "Edit Holiday" : "Add Holiday"}
      description="New holidays apply across the organization. Mandatory holidays appear in attendance automatically."
      onSave={onSave}
      saveLabel={form.id ? "Update" : "Create"}
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

        <HrOrgField label="Year" required size="full" error={errors.year}>
          <HrYearSelect
            value={form.year}
            onChange={(v) => onFieldChange("year", v)}
            fromYear={2020}
            toYear={currentCalendarYear() + 5}
            aria-invalid={!!errors.year}
          />
        </HrOrgField>

        <HrOrgField label="Holiday Date" required size="full" error={errors.date}>
          <HrDateInput
            value={form.date}
            onChange={(v) => onFieldChange("date", v)}
            aria-invalid={!!errors.date}
            aria-label="Holiday date"
            min={`${year}-01-01`}
            max={`${year}-12-31`}
            className={cn(errors.date && "border-red-400")}
          />
        </HrOrgField>

        <HrOrgField label="Holiday Type" required size="full" error={errors.holidayType}>
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 min-h-9">
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                id="holiday-type-mandatory"
                checked={isMandatory}
                onCheckedChange={(checked) => {
                  if (checked === true) selectMandatory();
                  // Do not allow both unchecked — ignore uncheck while selected
                }}
              />
              <span className="text-xs font-medium text-foreground">Mandatory</span>
            </label>
            <label className="inline-flex items-center gap-2 cursor-pointer select-none">
              <Checkbox
                id="holiday-type-optional"
                checked={isOptional}
                onCheckedChange={(checked) => {
                  if (checked === true) selectOptional();
                  // Do not allow both unchecked — ignore uncheck while selected
                }}
              />
              <span className="text-xs font-medium text-foreground">Optional</span>
            </label>
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
