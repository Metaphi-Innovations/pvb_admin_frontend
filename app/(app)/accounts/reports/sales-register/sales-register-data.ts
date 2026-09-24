/**
 * @deprecated Production Sales Register (`SalesRegisterPageClient`) uses backend APIs.
 * Local demo builders intentionally return empty so dummy rows never mix with API data.
 */

import {
  buildRegisterPartyOptions,
  buildSalesRegisterRows,
  findRegisterRow,
  isSalesRegisterSourceInvoice,
} from "../register-shared/register-live-data";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";

export { isSalesRegisterSourceInvoice, buildSalesRegisterRows };

/** @deprecated Empty — seed pipeline removed. */
export function buildSalesRegisterDemoRows(): RegisterReportRow[] {
  return buildSalesRegisterRows();
}

export function findSalesRegisterDemoRow(id: number): RegisterReportRow | undefined {
  return findRegisterRow(buildSalesRegisterRows(), id);
}

export function getSalesRegisterPartyOptions(): RegisterPartyOption[] {
  return buildRegisterPartyOptions(buildSalesRegisterRows());
}

/** @deprecated Use getSalesRegisterPartyOptions() */
export const SALES_REGISTER_PARTY_OPTIONS: RegisterPartyOption[] = [];
