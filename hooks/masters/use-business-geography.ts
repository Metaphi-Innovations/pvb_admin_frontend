"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  BusinessGeographyService,
  type BusinessGeoLevel,
  type BusinessGeoSaveInput,
} from "@/services/business-geography.service";
import { masterKeys } from "@/lib/masters/master-query-keys";

async function invalidateTree(queryClient: ReturnType<typeof useQueryClient>) {
  await queryClient.invalidateQueries({
    queryKey: masterKeys.businessGeography.tree(),
  });
}

export function useBusinessGeographyTree() {
  return useQuery({
    queryKey: masterKeys.businessGeography.tree(),
    queryFn: ({ signal }) => BusinessGeographyService.listAllForTree(signal),
  });
}

export function useToggleBusinessGeoStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ level, id }: { level: BusinessGeoLevel; id: string }) =>
      BusinessGeographyService.toggleStatus(level, id),
    onSuccess: async () => {
      await invalidateTree(queryClient);
    },
  });
}

export function useCreateBusinessGeo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: BusinessGeoSaveInput) => BusinessGeographyService.create(input),
    onSuccess: async () => {
      await invalidateTree(queryClient);
    },
  });
}

export function useUpdateBusinessGeo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, input }: { id: string; input: BusinessGeoSaveInput }) =>
      BusinessGeographyService.update(id, input),
    onSuccess: async () => {
      await invalidateTree(queryClient);
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
    staleTime: 5 * 60_000,
  });
}

export function useBgLookupLocations(areaId?: string | null) {
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupLocations(areaId ?? ""),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupLocations(areaId!, signal),
    enabled: Boolean(areaId),
    staleTime: 5 * 60_000,
  });
}

export function useBgLookupPincodes(
  locationIds: string[],
  excludeTerritoryId?: string,
) {
  const key = [...locationIds].sort().join(",");
  return useQuery({
    queryKey: masterKeys.businessGeography.lookupPincodes(
      key,
      excludeTerritoryId ?? "",
    ),
    queryFn: ({ signal }) =>
      BusinessGeographyService.lookupPincodes(
        locationIds,
        excludeTerritoryId,
        signal,
      ),
    enabled: locationIds.length > 0,
    staleTime: 5 * 60_000,
  });
}
