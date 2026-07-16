import type { BackendGrnSourceType } from "@/lib/warehouse/grn-status";

export const grnKeys = {
  all: ["warehouse", "grn"] as const,
  lists: () => [...grnKeys.all, "list"] as const,
  summaries: () => [...grnKeys.all, "summary"] as const,
  summary: (sourceType: BackendGrnSourceType, warehouseId?: string) =>
    [...grnKeys.summaries(), sourceType, warehouseId ?? "all"] as const,
  previewNumber: () => [...grnKeys.all, "preview-number"] as const,
  details: () => [...grnKeys.all, "detail"] as const,
  detail: (id: string) => [...grnKeys.details(), id] as const,
} as const;
