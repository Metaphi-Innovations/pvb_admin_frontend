import {
  buildRegisterPartyOptions,
  buildSalesRegisterRows,
  findRegisterRow,
  isSalesRegisterSourceInvoice,
} from "../register-shared/register-live-data";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";

export { isSalesRegisterSourceInvoice, buildSalesRegisterRows };

/**
 * @deprecated Production Sales Register (`SalesRegisterPageClient`) uses backend APIs.
 * Kept for legacy helpers / tests that still read local invoice-shaped rows.
 */
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
