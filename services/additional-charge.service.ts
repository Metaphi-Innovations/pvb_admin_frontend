import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

function asString(value: unknown): string {
  if (value == null) return "";
  return String(value);
}

function asNumber(value: unknown): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function extractErrorMessage(error: unknown, fallback: string): string {
  const err = error as {
    response?: { data?: { message?: string; error?: string } };
    message?: string;
  };
  return (
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    fallback
  );
}

export type AdditionalChargeDropdownItem = {
  additional_charge_id: string;
  charge_code: string;
  charge_name: string;
  ledger_id: string;
  ledger_code: string;
  ledger_name: string;
  gst_applicable: boolean;
  default_gst_rate_id: string | null;
  /** GST % as string from API, e.g. "18.00" */
  default_gst_rate: string | null;
  hsn_sac_code: string | null;
  description: string | null;
};

/** Shape used by Goods / Service invoice charge editors. */
export type ResolvedAdditionalChargeOption = {
  chargeId: string;
  chargeCode: string;
  chargeName: string;
  ledgerId: string;
  ledgerCode: string;
  ledgerName: string;
  gstApplicable: boolean;
  gstRate: number;
  isMapped: boolean;
};

function mapDropdownItem(
  raw: Record<string, unknown>,
): AdditionalChargeDropdownItem {
  return {
    additional_charge_id: asString(raw.additional_charge_id),
    charge_code: asString(raw.charge_code),
    charge_name: asString(raw.charge_name),
    ledger_id: asString(raw.ledger_id),
    ledger_code: asString(raw.ledger_code),
    ledger_name: asString(raw.ledger_name),
    gst_applicable: Boolean(raw.gst_applicable),
    default_gst_rate_id: raw.default_gst_rate_id
      ? asString(raw.default_gst_rate_id)
      : null,
    default_gst_rate: raw.default_gst_rate != null ? asString(raw.default_gst_rate) : null,
    hsn_sac_code: raw.hsn_sac_code ? asString(raw.hsn_sac_code) : null,
    description: raw.description ? asString(raw.description) : null,
  };
}

export function toResolvedAdditionalChargeOption(
  item: AdditionalChargeDropdownItem,
): ResolvedAdditionalChargeOption {
  const gstRate = asNumber(item.default_gst_rate);
  return {
    chargeId: item.additional_charge_id,
    chargeCode: item.charge_code,
    chargeName: item.charge_name,
    ledgerId: item.ledger_id,
    ledgerCode: item.ledger_code,
    ledgerName: item.ledger_name,
    gstApplicable: item.gst_applicable,
    gstRate: item.gst_applicable ? gstRate : 0,
    isMapped: Boolean(
      item.ledger_id && item.ledger_code?.trim() && item.ledger_name?.trim(),
    ),
  };
}

export const AdditionalChargeService = {
  async dropdown(signal?: AbortSignal): Promise<AdditionalChargeDropdownItem[]> {
    try {
      const response = await axiosInstance.get(
        API_ENDPOINTS.MASTER.ADDITIONAL_CHARGE.DROPDOWN,
        { signal },
      );
      const payload = response.data as Record<string, unknown>;
      const data = payload.data;
      if (!Array.isArray(data)) {
        throw new Error("Unexpected response shape: 'data' must be an array.");
      }
      return data.map((row) =>
        mapDropdownItem((row ?? {}) as Record<string, unknown>),
      );
    } catch (error) {
      throw new Error(
        extractErrorMessage(error, "Failed to load additional charges."),
      );
    }
  },

  async dropdownResolved(
    signal?: AbortSignal,
  ): Promise<ResolvedAdditionalChargeOption[]> {
    const items = await this.dropdown(signal);
    return items
      .map(toResolvedAdditionalChargeOption)
      .filter((c) => c.isMapped);
  },
};
