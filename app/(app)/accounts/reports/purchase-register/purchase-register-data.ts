import {
  buildPurchaseRegisterRows,
  buildRegisterPartyOptions,
  findRegisterRow,
} from "../register-shared/register-live-data";
import type { RegisterPartyOption, RegisterReportRow } from "../register-shared/register-types";

export function buildPurchaseRegisterDemoRows(): RegisterReportRow[] {
  return buildPurchaseRegisterRows();
}

export function findPurchaseRegisterDemoRow(id: number): RegisterReportRow | undefined {
  return findRegisterRow(buildPurchaseRegisterRows(), id);
}

export function getPurchaseRegisterPartyOptions(): RegisterPartyOption[] {
  return buildRegisterPartyOptions(buildPurchaseRegisterRows());
}

/** @deprecated Use getPurchaseRegisterPartyOptions() */
export const PURCHASE_REGISTER_PARTY_OPTIONS: RegisterPartyOption[] = [];
