import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";

export interface ExpenseCategory {
  id: number;
  name: string;
  description: string;
  status: "active" | "inactive";
  createdBy: string;
  updatedBy: string;
}

const STORAGE_KEY = "ds_accounts_expense_categories_v1";

export const DEFAULT_EXPENSE_CATEGORIES: Omit<ExpenseCategory, "id" | "createdBy" | "updatedBy">[] = [
  { name: "Miscellaneous", description: "General miscellaneous expenses", status: "active" },
  { name: "Transportation & Travel Expense", description: "Travel and conveyance", status: "active" },
  { name: "Telephone & Internet Bills", description: "Telecom and internet charges", status: "active" },
  { name: "Repair & Maintenance", description: "Repairs and upkeep", status: "active" },
  { name: "Rent Expense", description: "Office or facility rent", status: "active" },
  { name: "Food Expense", description: "Meals and refreshments", status: "active" },
  { name: "Office Expense", description: "Stationery and office supplies", status: "active" },
  { name: "Fuel Expense", description: "Fuel and vehicle running", status: "active" },
];

function seedCategories(): ExpenseCategory[] {
  return DEFAULT_EXPENSE_CATEGORIES.map((c, i) => ({
    id: i + 1,
    ...c,
    createdBy: ACCOUNTS_CURRENT_USER,
    updatedBy: ACCOUNTS_CURRENT_USER,
  }));
}

export function loadExpenseCategories(): ExpenseCategory[] {
  if (typeof window === "undefined") return seedCategories();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedCategories();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as ExpenseCategory[];
  } catch {
    return seedCategories();
  }
}

export function saveExpenseCategories(categories: ExpenseCategory[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(categories));
}

export function getActiveCategories(categories: ExpenseCategory[]): ExpenseCategory[] {
  return categories.filter((c) => c.status === "active");
}

export function nextCategoryId(categories: ExpenseCategory[]): number {
  return categories.length ? Math.max(...categories.map((c) => c.id)) + 1 : 1;
}
