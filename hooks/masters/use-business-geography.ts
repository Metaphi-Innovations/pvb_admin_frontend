"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BusinessGeographyService,
  type BusinessGeoLevel,
  type BusinessGeoSaveInput,
} from "@/services/business-geography.service";
import { masterKeys } from "@/lib/masters/master-query-keys";

async function invalidateBusinessGeography(
  queryClient: ReturnType<typeof useQueryClient>,
) {
  // Tree + all parent/scope lookups (zones/regions/areas/districts/locations/pincodes)
  await queryClient.invalidateQueries({
    queryKey: masterKeys.businessGeography.all(),
  });
}

export function useBusinessGeographyTree(search = "") {
  const normalized = search.trim();
  return useQuery({
    queryKey: masterKeys.businessGeography.tree(normalized),
    queryFn: ({ signal }) =>
      BusinessGeographyService.listAllForTree(signal, {
        search: normalized || undefined,
      }),
  });
}

export function useToggleBusinessGeoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ level, id }: { level: BusinessGeoLevel; id: string }) =>
      BusinessGeographyService.toggleStatus(level, id),
    onSuccess: async () => {
      await invalidateBusinessGeography(queryClient);
    },
  });
}

export function useCreateBusinessGeo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessGeoSaveInput) => BusinessGeographyService.create(input),
    onSuccess: async () => {
      await invalidateBusinessGeography(queryClient);
    },
  });
}

export function useUpdateBusinessGeo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BusinessGeoSaveInput }) =>
      BusinessGeographyService.update(id, input),
    onSuccess: async () => {
      await invalidateBusinessGeography(queryClient);
    },
  });
}

export function useBgLookupZones(enabled = true) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupZones(),
    queryFn: ({ signal }) => BusinessGeographyService.lookupZones(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useBgLookupRegions(zoneId?: string | null, enabled = true) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupRegions(zoneId ?? ""),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupRegions(zoneId || undefined, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useBgLookupAreas(regionId?: string | null, enabled = true) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupAreas(regionId ?? ""),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupAreas(regionId || undefined, signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useBgLookupStates(enabled = true) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupStates(),
    queryFn: ({ signal }) => BusinessGeographyService.lookupStates(signal),
    enabled,
    staleTime: 5 * 60_000,
  });
}

export function useBgLookupDistricts(regionId?: string | null) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupDistricts(regionId ?? ""),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupDistricts(regionId!, signal),
    enabled: Boolean(regionId),
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

export function useBgLookupLocations(areaId?: string | null) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupLocations(areaId ?? ""),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupLocations(areaId!, signal),
    enabled: Boolean(areaId),
    staleTime: 30_000,
    refetchOnMount: "always",
  });
}

export function useBgLookupPincodes(
  locationIds: string[],
  excludeTerritoryId?: string,
) {
  const locationIdsKey = useMemo(
    () => [...locationIds].sort().join(","),
    [locationIds],
  );

  // Debounce large Select All bursts so we don't fire a POST on every checkbox tick.
  // Clear immediately when selection is empty so stale pincodes never linger.
  const [debouncedKey, setDebouncedKey] = useState(locationIdsKey);
  useEffect(() => {
    if (!locationIdsKey) {
      setDebouncedKey("");
      return;
    }
    const delayMs =
      locationIdsKey.split(",").filter(Boolean).length > 50 ? 400 : 150;
    const timer = window.setTimeout(
      () => setDebouncedKey(locationIdsKey),
      delayMs,
    );
    return () => window.clearTimeout(timer);
  }, [locationIdsKey]);

  const debouncedLocationIds = useMemo(
    () => (debouncedKey ? debouncedKey.split(",").filter(Boolean) : []),
    [debouncedKey],
  );

  const isDebouncing = locationIdsKey !== debouncedKey;

  const query = useQuery({
    queryKey: masterKeys.businessGeography.lookupPincodes(
      debouncedKey,
      excludeTerritoryId ?? "",
    ),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupPincodes(
        debouncedLocationIds,
        excludeTerritoryId,
        signal,
      ),
    enabled: debouncedLocationIds.length > 0,
    staleTime: 30_000,
    refetchOnMount: "always",
  });

  // When nothing is selected, never surface cached rows from a prior lookup
  const data =
    locationIds.length === 0 || debouncedLocationIds.length === 0
      ? undefined
      : query.data;

  return {
    ...query,
    data,
    isLoading: query.isLoading || (locationIds.length > 0 && isDebouncing),
    isFetching: query.isFetching || isDebouncing,
  };
}
