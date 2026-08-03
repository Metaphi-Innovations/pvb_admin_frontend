"use client";

import { useQuery } from "@tanstack/react-query";
import { PincodeService } from "@/services/pincode.service";

export function usePincodes() {
    return useQuery({
        queryKey: ["pincodes"],
        queryFn: () => PincodeService.list(),
        staleTime: 5 * 60 * 1000,
    });
}

export function usePincode(pincode: string | null | undefined) {
    return useQuery({
        queryKey: ["pincode", pincode],
        queryFn: () => PincodeService.getByPincode(pincode!),
        enabled: Boolean(pincode),
        staleTime: 5 * 60 * 1000,
    });
}