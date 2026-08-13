"use client";

import { useQuery } from "@tanstack/react-query";
import {
  AdditionalChargeService,
  type ResolvedAdditionalChargeOption,
} from "@/services/additional-charge.service";
import { masterKeys } from "@/lib/masters/master-query-keys";

export function useAdditionalChargeDropdown() {
  return useQuery({
    queryKey: masterKeys.additionalCharges.dropdown(),
    queryFn: ({ signal }) => AdditionalChargeService.dropdown(signal),
    staleTime: 5 * 60 * 1000,
  });
}

export function useAdditionalChargeDropdownResolved() {
  return useQuery({
    queryKey: [...masterKeys.additionalCharges.dropdown(), "resolved"] as const,
    queryFn: ({ signal }): Promise<ResolvedAdditionalChargeOption[]> =>
      AdditionalChargeService.dropdownResolved(signal),
    staleTime: 5 * 60 * 1000,
  });
}
