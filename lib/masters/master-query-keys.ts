/** Stable TanStack Query keys for integrated master modules. */

export type MasterListStatus = "all" | "active" | "inactive";

export type MasterListKeyParams = {
  page: number;
  pageSize: number;
  search: string;
  status: MasterListStatus;
  apiFilters: Record<string, unknown>;
  ordering?: string;
};

export const masterKeys = {
  all: ["masters"] as const,

  categories: {
    all: () => [...masterKeys.all, "categories"] as const,
    lists: () => [...masterKeys.categories.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.categories.lists(), params] as const,
    details: () => [...masterKeys.categories.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.categories.details(), id] as const,
  },

  gst: {
    all: () => [...masterKeys.all, "gst"] as const,
    lists: () => [...masterKeys.gst.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.gst.lists(), params] as const,
    details: () => [...masterKeys.gst.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.gst.details(), id] as const,
    dropdown: () => [...masterKeys.gst.all(), "dropdown"] as const,
  },

  hsn: {
    all: () => [...masterKeys.all, "hsn"] as const,
    lists: () => [...masterKeys.hsn.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.hsn.lists(), params] as const,
    details: () => [...masterKeys.hsn.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.hsn.details(), id] as const,
  },

  segments: {
    all: () => [...masterKeys.all, "segments"] as const,
    lists: () => [...masterKeys.segments.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.segments.lists(), params] as const,
    details: () => [...masterKeys.segments.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.segments.details(), id] as const,
  },

  documentTypes: {
    all: () => [...masterKeys.all, "document-types"] as const,
    lists: () => [...masterKeys.documentTypes.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.documentTypes.lists(), params] as const,
    details: () => [...masterKeys.documentTypes.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.documentTypes.details(), id] as const,
    dropdown: () => [...masterKeys.documentTypes.all(), "dropdown"] as const,
  },

  customerTypes: {
    all: () => [...masterKeys.all, "customer-types"] as const,
    lists: () => [...masterKeys.customerTypes.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.customerTypes.lists(), params] as const,
    details: () => [...masterKeys.customerTypes.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.customerTypes.details(), id] as const,
  },

  products: {
    all: () => [...masterKeys.all, "products"] as const,
    lists: () => [...masterKeys.products.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.products.lists(), params] as const,
    details: () => [...masterKeys.products.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.products.details(), id] as const,
  },
} as const;
