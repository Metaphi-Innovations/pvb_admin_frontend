// HSN Master Data & Helpers

export interface HSNMaster {
	id: number;
	hsnCode: string; // Auto Generated, e.g., "HSN-0001"
	hsnDescription: string; // Text Area description
	gstRate: string; // Lookup / dropdown, e.g. "18%" or "0%"
	status: "active" | "inactive";
	createdBy: string;
	createdDate: string; // YYYY-MM-DD
	updatedBy: string;
	updatedDate: string; // YYYY-MM-DD
}

const SEED_HSN: HSNMaster[] = [
	{
		id: 1,
		hsnCode: "HSN-0001",
		hsnDescription: "Vegetable seeds for planting/sowing",
		gstRate: "0%",
		status: "active",
		createdBy: "Admin",
		createdDate: "2026-01-10",
		updatedBy: "Admin",
		updatedDate: "2026-01-10",
	},
	{
		id: 2,
		hsnCode: "HSN-0002",
		hsnDescription:
			"Animal or vegetable fertilizers, whether or not mixed together",
		gstRate: "5%",
		status: "active",
		createdBy: "Admin",
		createdDate: "2026-01-12",
		updatedBy: "Admin",
		updatedDate: "2026-01-12",
	},
	{
		id: 3,
		hsnCode: "HSN-0003",
		hsnDescription:
			"Insecticides, fungicides, herbicides, put up in forms or packings",
		gstRate: "18%",
		status: "active",
		createdBy: "Admin",
		createdDate: "2026-01-15",
		updatedBy: "Admin",
		updatedDate: "2026-01-15",
	},
];

const STORAGE_KEY = "ds_hsn_masters";

export function loadHSNMasters(): HSNMaster[] {
	if (typeof window === "undefined") return SEED_HSN;
	try {
		const raw = localStorage.getItem(STORAGE_KEY);
		return raw ? JSON.parse(raw) : SEED_HSN;
	} catch {
		return SEED_HSN;
	}
}

export function saveHSNMasters(data: HSNMaster[]): void {
	if (typeof window !== "undefined") {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
	}
}

export function nextHSNId(list: HSNMaster[]): number {
	return Math.max(0, ...list.map((h) => h.id)) + 1;
}

export function generateHSNCode(id: number): string {
	return `HSN-${String(id).padStart(4, "0")}`;
}

export function todayStr(): string {
	return new Date().toISOString().slice(0, 10);
}
