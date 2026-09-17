import type { LedgerDropdownItem } from "@/services/ledger.service";
import {
  formatMoneyString,
  formatMoneyStringOrDash,
} from "@/lib/accounts/money-format";
import type { GeneralLedgerLedgerType } from "@/types/general-ledger.types";

const MONTHS = [
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

const SUBGROUP_TYPE: Record<string, GeneralLedgerLedgerType> = {
  "AST-CA-DEBTOR": "Customer",
  "LIA-CL-CREDITOR": "Vendor",
  "AST-CA-BANK": "Bank",
  "AST-CA-CASH": "Cash",
  "AST-CA-STOCK": "Inventory",
  "INC-DIR-SALES": "Sales",
  "EXP-DIR-PUR": "Purchase",
  "AST-CA-DUTIES": "GST",
  "LIA-CL-DUTY": "GST",
  "LIA-CL-SALARY": "Employee",
  "LIA-CL-PFESIC": "Employee",
};

/** Display date DD-Mmm-YYYY. Does not interpret balances. */
export function formatGlDisplayDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const monthIndex = Number(m) - 1;
  const month = MONTHS[monthIndex];
  if (!y || !month || !d) return iso;
  return `${d}-${month}-${y}`;
}

export function formatGlPeriod(dateFrom: string, dateTo: string): string {
  return `${formatGlDisplayDate(dateFrom)} to ${formatGlDisplayDate(dateTo)}`;
}

/** Renders a backend amount + side. Does not recompute the amount. */
export function formatApiRunningBalance(
  amount: string,
  side: "DEBIT" | "CREDIT",
): string {
  const label = side === "CREDIT" ? "Cr" : "Dr";
  return `${formatMoneyString(amount)} ${label}`;
}

export function formatApiMoneyOrDash(amount: string | null | undefined): string {
  return formatMoneyStringOrDash(amount);
}

export interface GeneralLedgerPickerOption {
  id: string;
  code: string;
  name: string;
  ledgerType: GeneralLedgerLedgerType;
  parentGroup: string;
}

/**
 * Picker label only. Statement ledger_type and special_view always come from the report API.
 * Dropdown does not include system ledger type, so GST/Stock/COGS system ledgers may show as General
 * until the statement returns the authoritative type.
 */
export function inferPickerLedgerType(item: LedgerDropdownItem): GeneralLedgerLedgerType {
  const source = (item.sourceType ?? "").toUpperCase();
  if (source === "CUSTOMER") return "Customer";
  if (source === "SUPPLIER") return "Vendor";
  if (source === "BANK") return "Bank";
  if (source === "EMPLOYEE" || source === "CF_AGENT") return "Employee";
  const sub = item.accountSubGroup?.code ?? "";
  if (SUBGROUP_TYPE[sub]) return SUBGROUP_TYPE[sub];
  if (sub.startsWith("EXP-")) return "Expense";
  if (sub.startsWith("INC-")) return "Income";
  const head = item.primaryHead?.code ?? "";
  if (head === "EXP") return "Expense";
  if (head === "INC") return "Income";
  return "General";
}

export function mapDropdownLedger(item: LedgerDropdownItem): GeneralLedgerPickerOption {
  return {
    id: item.ledgerId,
    code: item.ledgerCode,
    name: item.ledgerName,
    ledgerType: inferPickerLedgerType(item),
    parentGroup: item.parentPath || item.accountGroup?.name || "",
  };
}
