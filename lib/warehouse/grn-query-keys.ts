export const grnKeys = {
  all: ["warehouse", "grn"] as const,
  lists: () => [...grnKeys.all, "list"] as const,
  previewNumber: () => [...grnKeys.all, "preview-number"] as const,
  details: () => [...grnKeys.all, "detail"] as const,
  detail: (id: string) => [...grnKeys.details(), id] as const,
} as const;
