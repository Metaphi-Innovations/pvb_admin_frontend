import { CURRENT_USER } from "@/lib/hr/config";

export interface TravelAllowanceRow {
  id: string;
  vehicleType: string;
  ratePerKm: number;
}

export interface DailyAllowanceRow {
  id: string;
  cityCategory: string;
  dailyAllowanceAmount: number;
}

export interface AccommodationRow {
  id: string;
  cityCategory: string;
  accommodationLimit: number;
}

export interface TadaPolicy {
  id: number;
  policyName: string;
  policyCode: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: "active" | "inactive";
  travelAllowance: TravelAllowanceRow[];
  dailyAllowance: DailyAllowanceRow[];
  accommodation: AccommodationRow[];
  createdBy: string;
  updatedBy: string;
}

export interface TadaPolicyFormValues {
  policyName: string;
  policyCode: string;
  effectiveFrom: string;
  effectiveTo: string;
  status: "active" | "inactive";
  travelAllowance: TravelAllowanceRow[];
  dailyAllowance: DailyAllowanceRow[];
  accommodation: AccommodationRow[];
}

const STORAGE_KEY = "ds_hr_tada_policy_v1";

export const DEFAULT_POLICY_FORM: TadaPolicyFormValues = {
  policyName: "",
  policyCode: "",
  effectiveFrom: "",
  effectiveTo: "",
  status: "active",
  travelAllowance: [{ id: "t1", vehicleType: "Two Wheeler", ratePerKm: 5 }],
  dailyAllowance: [{ id: "d1", cityCategory: "Metro", dailyAllowanceAmount: 800 }],
  accommodation: [{ id: "a1", cityCategory: "Metro", accommodationLimit: 2500 }],
};

const SEED: TadaPolicy[] = [
  {
    id: 1,
    policyName: "Field Force TA/DA 2025",
    policyCode: "TADA-2025-01",
    effectiveFrom: "2025-04-01",
    effectiveTo: "2026-03-31",
    status: "active",
    travelAllowance: [
      { id: "t1", vehicleType: "Two Wheeler", ratePerKm: 5 },
      { id: "t2", vehicleType: "Four Wheeler", ratePerKm: 12 },
    ],
    dailyAllowance: [
      { id: "d1", cityCategory: "Metro", dailyAllowanceAmount: 800 },
      { id: "d2", cityCategory: "Tier-2", dailyAllowanceAmount: 500 },
    ],
    accommodation: [
      { id: "a1", cityCategory: "Metro", accommodationLimit: 2500 },
      { id: "a2", cityCategory: "Rural", accommodationLimit: 1200 },
    ],
    createdBy: "Admin",
    updatedBy: "Admin",
  },
];

export function loadTadaPolicies(): TadaPolicy[] {
  if (typeof window === "undefined") return SEED;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED));
      return SEED;
    }
    return JSON.parse(raw) as TadaPolicy[];
  } catch {
    return SEED;
  }
}

export function saveTadaPolicies(list: TadaPolicy[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

export function getTadaPolicyById(id: number): TadaPolicy | undefined {
  return loadTadaPolicies().find((p) => p.id === id);
}

export function generatePolicyCode(): string {
  const list = loadTadaPolicies();
  return `TADA-${String(list.length + 1).padStart(3, "0")}`;
}

export function validatePolicyForm(f: TadaPolicyFormValues): string | null {
  if (!f.policyName.trim()) return "Policy name is required.";
  if (!f.policyCode.trim()) return "Policy code is required.";
  if (!f.effectiveFrom) return "Effective from date is required.";
  if (!f.effectiveTo) return "Effective to date is required.";
  if (f.effectiveFrom > f.effectiveTo) return "Effective to must be after effective from.";
  return null;
}

export function formToPolicy(f: TadaPolicyFormValues, id: number, existing?: TadaPolicy): TadaPolicy {
  return {
    id,
    policyName: f.policyName.trim(),
    policyCode: f.policyCode.trim(),
    effectiveFrom: f.effectiveFrom,
    effectiveTo: f.effectiveTo,
    status: f.status,
    travelAllowance: f.travelAllowance,
    dailyAllowance: f.dailyAllowance,
    accommodation: f.accommodation,
    createdBy: existing?.createdBy ?? CURRENT_USER,
    updatedBy: CURRENT_USER,
  };
}

export function policyToForm(p: TadaPolicy): TadaPolicyFormValues {
  return {
    policyName: p.policyName,
    policyCode: p.policyCode,
    effectiveFrom: p.effectiveFrom,
    effectiveTo: p.effectiveTo,
    status: p.status,
    travelAllowance: p.travelAllowance.length ? p.travelAllowance : DEFAULT_POLICY_FORM.travelAllowance,
    dailyAllowance: p.dailyAllowance.length ? p.dailyAllowance : DEFAULT_POLICY_FORM.dailyAllowance,
    accommodation: p.accommodation.length ? p.accommodation : DEFAULT_POLICY_FORM.accommodation,
  };
}

export function formatEffectiveDate(p: TadaPolicy): string {
  return `${p.effectiveFrom} – ${p.effectiveTo}`;
}
