import { FilterState } from "./types";

export function applyFilters<T = any>(records: T[], filters: FilterState): T[] {
  let result = [...records];

  Object.keys(filters).forEach((key) => {
    const val = filters[key];
    if (val === undefined || val === null) return;

    if (key === "search") {
      // Global search is handled customly on each page
      return;
    }

    if (Array.isArray(val)) {
      if (val.length > 0) {
        result = result.filter((row: any) => {
          const rowVal = String(row[key] ?? "").toLowerCase();
          return val.some(v => String(v).toLowerCase() === rowVal);
        });
      }
    } else if (typeof val === "object" && "fromDate" in val && "toDate" in val) {
      const { fromDate, toDate } = val as { fromDate: string; toDate: string };
      result = result.filter((row: any) => {
        const rowVal = row[key];
        if (!rowVal) return false;
        const passFrom = !fromDate || rowVal >= fromDate;
        const passTo = !toDate || rowVal <= toDate;
        return passFrom && passTo;
      });
    } else {
      const q = String(val).trim().toLowerCase();
      if (q) {
        result = result.filter((row: any) =>
          String(row[key] ?? "").toLowerCase().includes(q)
        );
      }
    }
  });

  return result;
}
