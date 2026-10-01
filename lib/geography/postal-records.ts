/**
 * Shared postal master read API — single source for Postal Master and Business Geography.
 */

import {
  getPostalMasterRecordCount,
  getPostalMasterRecords,
} from "./postal-master-store";

export interface PostalRecord {
  state: string;
  district: string;
  city: string;
  town: string;
  pincode: string;
  deliveryStatus: string;
  status: "active" | "inactive";
}

/** Count without mapping the full dataset. */
export function getPostalRecordCount(): number {
  return getPostalMasterRecordCount();
}

/** Normalized postal rows — avoid calling in hot paths over large datasets. */
export function getPostalRecords(): PostalRecord[] {
  return getPostalMasterRecords().map((r) => ({
    state: r.stateName,
    district: r.district,
    city: r.city,
    town: r.town,
    pincode: r.pincode,
    deliveryStatus: r.deliveryStatus ?? "Non-Delivery",
    status: r.status,
  }));
}

export function getActivePostalRecords(): PostalRecord[] {
  return getPostalRecords().filter((r) => r.status === "active");
}

export function isPostalDataAvailable(): boolean {
  return getPostalRecordCount() > 0;
}
