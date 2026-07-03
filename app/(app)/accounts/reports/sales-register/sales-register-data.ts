import {
  buildRegisterPartyOptions,
  buildSalesRegisterRows,
  findRegisterRow,
} from "../register-shared/register-live-data";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";

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
