/**
 * Geography module storage reset — clears demo localStorage and reloads postal from file.
 */

import { clearPostalMasterCache, hydratePostalMaster, purgeOversizedPostalStorage } from "@/lib/geography/postal-master-store";
import { GEOGRAPHY_WORKFLOW_SCHEMA } from "./geography-demo-seed";

export const GEOGRAPHY_STORAGE_KEYS = [
  "ds_pincode_master_v3",
  "ds_pincode_master_schema",
  "ds_pincode_master_source",
  "ds_pincode_master_overrides_v1",
  "ds_pincode_master_v2",
  "ds_pincode_master_v1",
  "ds_pincode_upload_errors",
  "ds_geography_master_v1",
  "ds_geography_master_schema",
  "ds_geography_coverage_definitions_v1",
  "ds_geography_coverage_definitions_schema",
  "ds_geography_coverage_mappings_v2",
  "ds_geography_workflow_data_schema",
  "ds_geography_user_assignments_v2",
  "ds_geography_audit_v1",
  "ds_geography_audit_schema",
  "ds_distributor_territory_overrides_v1",
] as const;

export function clearGeographyLocalStorage(): void {
  if (typeof window === "undefined") return;
  for (const key of GEOGRAPHY_STORAGE_KEYS) {
    localStorage.removeItem(key);
  }
  clearPostalMasterCache();
}

export function stampEmptyGeographySchemas(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("ds_pincode_master_schema", GEOGRAPHY_WORKFLOW_SCHEMA);
  localStorage.setItem("ds_geography_master_schema", GEOGRAPHY_WORKFLOW_SCHEMA);
  localStorage.setItem("ds_geography_coverage_definitions_schema", GEOGRAPHY_WORKFLOW_SCHEMA);
  localStorage.setItem("ds_geography_workflow_data_schema", GEOGRAPHY_WORKFLOW_SCHEMA);
  localStorage.setItem("ds_geography_audit_schema", GEOGRAPHY_WORKFLOW_SCHEMA);
  localStorage.setItem("ds_geography_master_v1", JSON.stringify([]));
  localStorage.setItem("ds_geography_coverage_definitions_v1", JSON.stringify([]));
  localStorage.setItem("ds_geography_coverage_mappings_v2", JSON.stringify([]));
  localStorage.setItem("ds_geography_user_assignments_v2", JSON.stringify([]));
  localStorage.setItem("ds_geography_audit_v1", JSON.stringify([]));
}

export function migrateGeographyStorageIfNeeded(): boolean {
  if (typeof window === "undefined") return false;

  purgeOversizedPostalStorage();

  const pincodeSchema = localStorage.getItem("ds_pincode_master_schema");
  const geoSchema = localStorage.getItem("ds_geography_master_schema");
  if (pincodeSchema === GEOGRAPHY_WORKFLOW_SCHEMA && geoSchema === GEOGRAPHY_WORKFLOW_SCHEMA) {
    return false;
  }
  clearGeographyLocalStorage();
  stampEmptyGeographySchemas();
  return true;
}

/** Dev-only: wipe demo data and reload postal master from normalized JSON file. */
export async function resetGeographyDemoData(): Promise<number> {
  clearGeographyLocalStorage();
  stampEmptyGeographySchemas();
  const records = await hydratePostalMaster({ forceFile: true });
  return records.length;
}
