import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import { nextId } from "@/app/(app)/accounts/data";

export interface BankAccountMaster {
  id: number;
  coaLedgerId: number | null;
  bankName: string;
  accountNumber: string;
  ifsc: string;
  branch: string;
  accountType: "Current" | "Savings" | "OD" | "CC";
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
}

const STORAGE_KEY = "ds_accounts_bank_accounts_v1";

const SEED: BankAccountMaster[] = [
  {
    id: 1,
    coaLedgerId: null,
    bankName: "HDFC Bank",
    accountNumber: "50200012345678",
    ifsc: "HDFC0001234",
    branch: "Mumbai Main",
    accountType: "Current",
    status: "active",
    createdBy: "System",
    updatedBy: "System",
  },
];

export function loadBankAccounts(): BankAccountMaster[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as BankAccountMaster[];
  } catch {
    return SEED;
  }
}

export function saveBankAccounts(list: BankAccountMaster[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function addBankAccount(
  input: Omit<BankAccountMaster, "id" | "createdBy" | "updatedBy" | "status">,
): BankAccountMaster {
  const list = loadBankAccounts();
  const row: BankAccountMaster = {
    ...input,
    id: nextId(list),
    status: "active",
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  };
  list.push(row);
  saveBankAccounts(list);
  return row;
}
