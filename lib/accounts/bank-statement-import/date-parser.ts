import { sanitizeCellValue } from "./sanitize";
import type { StatementFileType } from "./types";

const MONTH_MAP: Record<string, string> = {
  jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
  jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
};

export interface ParsedDateResult {
  iso: string | null;
  ambiguous: boolean;
  error?: string;
}

export function parseStatementDate(raw: string, format: string): ParsedDateResult {
  const s = sanitizeCellValue(raw);
  if (!s) return { iso: null, ambiguous: false, error: "Missing date" };

  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    return { iso: s, ambiguous: false };
  }

  const fmt = format.toUpperCase();

  if (fmt === "DD-MMM-YYYY" || fmt === "DD-MMM-YY") {
    const m = s.match(/^(\d{1,2})[-/]([A-Za-z]{3})[-/](\d{2,4})$/);
    if (m) {
      const mon = MONTH_MAP[m[2].toLowerCase().slice(0, 3)];
      if (mon) {
        let y = m[3];
        if (y.length === 2) y = `20${y}`;
        const iso = `${y}-${mon}-${m[1].padStart(2, "0")}`;
        return { iso, ambiguous: false };
      }
    }
  }

  const sep = fmt.includes("/") ? "/" : "-";
  const parts = s.split(/[-/.]/).map((p) => p.trim());
  if (parts.length !== 3) {
    const excelSerial = Number(s);
    if (Number.isFinite(excelSerial) && excelSerial > 30000 && excelSerial < 60000) {
      const d = excelDateToIso(excelSerial);
      return d ? { iso: d, ambiguous: false } : { iso: null, ambiguous: false, error: "Invalid Excel date" };
    }
    return { iso: null, ambiguous: false, error: `Unrecognized date: ${s}` };
  }

  let day: string;
  let month: string;
  let year: string;
  let ambiguous = false;

  if (fmt.startsWith("YYYY")) {
    [year, month, day] = parts;
  } else if (fmt.startsWith("MM")) {
    [month, day, year] = parts;
    ambiguous = Number(day) <= 12 && Number(month) <= 12 && day !== month;
  } else {
    [day, month, year] = parts;
    ambiguous = Number(day) <= 12 && Number(month) <= 12 && day !== month;
  }

  if (year.length === 2) year = `20${year}`;
  month = month.padStart(2, "0");
  day = day.padStart(2, "0");

  const iso = `${year}-${month}-${day}`;
  if (!isValidIsoDate(iso)) {
    return { iso: null, ambiguous, error: `Invalid date: ${s}` };
  }
  return { iso, ambiguous };
}

function isValidIsoDate(iso: string): boolean {
  const d = new Date(`${iso}T00:00:00`);
  return !Number.isNaN(d.getTime()) && iso === d.toISOString().slice(0, 10);
}

function excelDateToIso(serial: number): string | null {
  const utc = new Date(Date.UTC(1899, 11, 30 + serial));
  if (Number.isNaN(utc.getTime())) return null;
  return utc.toISOString().slice(0, 10);
}

export function autoDetectDateFormat(samples: string[]): string {
  for (const s of samples) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(s.trim())) return "YYYY-MM-DD";
    if (/^\d{1,2}-[A-Za-z]{3}-\d{2,4}$/.test(s.trim())) return "DD-MMM-YYYY";
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(s.trim())) {
      const [a, b] = s.split("/").map(Number);
      if (a > 12) return "DD/MM/YYYY";
      if (b > 12) return "MM/DD/YYYY";
      return "DD/MM/YYYY";
    }
    if (/^\d{1,2}-\d{1,2}-\d{4}$/.test(s.trim())) return "DD-MM-YYYY";
  }
  return "DD-MM-YYYY";
}

export function formatIsoForDisplay(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}-${m}-${y}`;
}

export function compareIsoDates(a: string, b: string): number {
  return a.localeCompare(b);
}

export function minMaxDates(dates: string[]): { min: string | null; max: string | null } {
  const valid = dates.filter(Boolean).sort();
  if (!valid.length) return { min: null, max: null };
  return { min: valid[0], max: valid[valid.length - 1] };
}

export function isDateInRange(date: string, from: string, to: string): boolean {
  if (!from || !to) return true;
  return date >= from && date <= to;
}

export type { StatementFileType };
