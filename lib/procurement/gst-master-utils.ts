import { loadGSTMasters, type GSTMaster } from "@/app/(app)/masters/gst/gst-data";
import { applyTaxSupplyToRates, type TaxSupplyType } from "@/lib/procurement/utils";

export interface GstMasterSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

export function getActiveGstMasterOptions(): GstMasterSelectOption[] {
  return loadGSTMasters()
    .filter((g) => g.status === "active")
    .sort((a, b) => a.gstPercentage - b.gstPercentage)
    .map((g) => ({
      value: String(g.id),
      label: `${g.gstPercentage}%`,
      sublabel: g.gstName ?? g.gstId,
    }));
}

export function getGstMasterById(id: number): GSTMaster | undefined {
  return loadGSTMasters().find((g) => g.id === id);
}

export function findGstMasterIdByTotalPct(totalPct: number): number | undefined {
  if (!Number.isFinite(totalPct)) return undefined;
  return loadGSTMasters().find(
    (g) => g.status === "active" && Math.abs(g.gstPercentage - totalPct) < 0.001,
  )?.id;
}

export function getDefaultGstMasterId(): number {
  const active = loadGSTMasters().filter((g) => g.status === "active");
  return (
    active.find((g) => g.gstPercentage === 18)?.id ??
    active[0]?.id ??
    4
  );
}

export function applyGstMasterToTaxRates(
  gstMasterId: number,
  taxSupplyType: TaxSupplyType,
): { cgstPct: number; sgstPct: number; igstPct: number; gstMasterId: number } {
  const gst = getGstMasterById(gstMasterId);
  if (!gst) {
    return { cgstPct: 0, sgstPct: 0, igstPct: 0, gstMasterId };
  }
  return {
    gstMasterId,
    ...applyTaxSupplyToRates(gst.gstPercentage, taxSupplyType),
  };
}

export function totalGstPctFromRates(cgstPct: number, sgstPct: number, igstPct: number): number {
  return cgstPct + sgstPct + igstPct;
}
