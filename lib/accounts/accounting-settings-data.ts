import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export interface AccountingSettings {
  defaultCashLedgerId: number | null;
  defaultBankLedgerId: number | null;
  roundOffLedgerId: number | null;
  autoPostSales: boolean;
  autoPostPurchase: boolean;
  autoPostHrClaims: boolean;
  autoPostStockAdj: boolean;
  requireVoucherApproval: boolean;
  updatedBy: string;
}

const STORAGE_KEY = "ds_accounts_settings_v1";

const DEFAULT_SETTINGS: AccountingSettings = {
  defaultCashLedgerId: null,
  defaultBankLedgerId: null,
  roundOffLedgerId: null,
  autoPostSales: true,
  autoPostPurchase: true,
  autoPostHrClaims: true,
  autoPostStockAdj: true,
  requireVoucherApproval: false,
  updatedBy: "System",
};

export function loadAccountingSettings(): AccountingSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_SETTINGS));
      return DEFAULT_SETTINGS;
    }
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveAccountingSettings(settings: AccountingSettings) {
  if (typeof window === "undefined") return;
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({ ...settings, updatedBy: ACCOUNTS_CURRENT_USER }),
  );
}
