import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export interface ApiPincodeRecord {
    id: string;
    circlename: string;
    regionname: string;
    divisionname: string;
    officename: string;
    pincode: string;
    officetype: string;
    delivery: string;
    district: string;
    statename: string;
    latitude: string;
    longitude: string;
}

function asString(value: unknown): string {
    return typeof value === "string" ? value : String(value ?? "");
}

function mapPincode(
    raw: Record<string, unknown>,
): ApiPincodeRecord {
    return {
        id: asString(raw.id),
        circlename: asString(raw.circlename),
        regionname: asString(raw.regionname),
        divisionname: asString(raw.divisionname),
        officename: asString(raw.officename),
        pincode: asString(raw.pincode),
        officetype: asString(raw.officetype),
        delivery: asString(raw.delivery),
        district: asString(raw.district),
        statename: asString(raw.statename),
        latitude: asString(raw.latitude),
        longitude: asString(raw.longitude),
    };
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

export const PincodeService = {
    async list(): Promise<ApiPincodeRecord[]> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.COMMON.PINCODE.LIST,
        );

        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data.map((item) =>
            mapPincode(item as Record<string, unknown>),
        );
    },

    async getByPincode(pincode: string): Promise<ApiPincodeRecord[]> {
        const response = await axiosInstance.get(
            API_ENDPOINTS.COMMON.PINCODE.VIEW(pincode),
        );

        const payload = response.data as Record<string, unknown>;
        const data = payload.data;

        if (!Array.isArray(data)) {
            throw new Error("Unexpected response shape: 'data' must be an array.");
        }

        return data.map((item) =>
            mapPincode(item as Record<string, unknown>),
        );
    },

    extractErrorMessage,
};