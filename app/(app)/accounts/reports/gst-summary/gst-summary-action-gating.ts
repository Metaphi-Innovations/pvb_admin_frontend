/**
 * Frontend enable/disable rules for GSTR-2A / GSTR-2B Upload, Export,
 * and Import History. Branch and current-import are intentionally not required.
 */

export const GST_UPLOAD_DISABLED_HINT =
  "Select a GST registration and a specific GST Period to upload JSON.";

export const GST_EXPORT_DISABLED_HINT =
  "Select a GST registration and a specific GST Period to export this report.";

export const GST_HISTORY_DISABLED_HINT =
  "Select a financial year and GST registration to view import history.";

export const GST_UPLOAD_NO_PERMISSION_HINT =
  "You do not have permission to upload GST Summary files.";

export const GST_EXPORT_NO_PERMISSION_HINT =
  "You do not have permission to export GST Summary reports.";

export const GST_HISTORY_NO_PERMISSION_HINT =
  "You do not have permission to view GST Summary import history.";

/** Upload / period-specific recon Export: FY + one GSTIN + specific month. */
export function isGstPeriodScopeReady(params: {
  financialYearId: string;
  gstRegistration: string;
  gstPeriod: string;
}): boolean {
  return (
    !!params.financialYearId &&
    params.gstRegistration !== "all" &&
    params.gstPeriod !== "all" &&
    !!params.gstPeriod
  );
}

/** Import History: FY + GSTIN; return_period is optional on the backend list API. */
export function isGstHistoryScopeReady(params: {
  financialYearId: string;
  gstRegistration: string;
}): boolean {
  return !!params.financialYearId && params.gstRegistration !== "all";
}

export function gstUploadDisabledReason(params: {
  canCreate: boolean;
  financialYearId: string;
  gstRegistration: string;
  gstPeriod: string;
}): string | undefined {
  if (!params.canCreate) return GST_UPLOAD_NO_PERMISSION_HINT;
  if (!isGstPeriodScopeReady(params)) return GST_UPLOAD_DISABLED_HINT;
  return undefined;
}

export function gstExportDisabledReason(params: {
  canView: boolean;
  financialYearId: string;
  gstRegistration: string;
  gstPeriod: string;
}): string | undefined {
  if (!params.canView) return GST_EXPORT_NO_PERMISSION_HINT;
  if (!isGstPeriodScopeReady(params)) return GST_EXPORT_DISABLED_HINT;
  return undefined;
}

export function gstHistoryDisabledReason(params: {
  canView: boolean;
  financialYearId: string;
  gstRegistration: string;
}): string | undefined {
  if (!params.canView) return GST_HISTORY_NO_PERMISSION_HINT;
  if (!isGstHistoryScopeReady(params)) return GST_HISTORY_DISABLED_HINT;
  return undefined;
}

/** Build YYYY-MM options for a financial year date range. */
export function buildGstPeriodOptionsForRange(
  startDate: string,
  endDate: string,
): Array<{ value: string; label: string }> {
  const monthNames = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];
  const start = new Date(`${startDate}T00:00:00`);
  const end = new Date(`${endDate}T00:00:00`);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return [];

  const options: Array<{ value: string; label: string }> = [];
  const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
  const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
  while (cursor <= endMonth) {
    const y = cursor.getFullYear();
    const m = String(cursor.getMonth() + 1).padStart(2, "0");
    options.push({
      value: `${y}-${m}`,
      label: `${monthNames[cursor.getMonth()]} ${y}`,
    });
    cursor.setMonth(cursor.getMonth() + 1);
  }
  return options;
}
