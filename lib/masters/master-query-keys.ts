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
    dropdown: () => [...masterKeys.categories.all(), "dropdown"] as const
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
    dropdown: () => [...masterKeys.hsn.all(), "dropdown"] as const
  },

  segments: {
    all: () => [...masterKeys.all, "segments"] as const,
    lists: () => [...masterKeys.segments.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.segments.lists(), params] as const,
    details: () => [...masterKeys.segments.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.segments.details(), id] as const,
    dropdown: () => [...masterKeys.segments.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.segments.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.segments.filterDropdowns(), fieldName] as const,
  },

  tds: {
    all: () => [...masterKeys.all, "tds"] as const,
    lists: () => [...masterKeys.tds.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.tds.lists(), params] as const,
    details: () => [...masterKeys.tds.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.tds.details(), id] as const,
    filterDropdowns: () => [...masterKeys.tds.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.tds.filterDropdowns(), fieldName] as const,
    dropdown: () => [...masterKeys.tds.all(), "dropdown"] as const,
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

  units: {
    all: () => [...masterKeys.all, "units"] as const,
    lists: () => [...masterKeys.units.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.units.lists(), params] as const,
    details: () => [...masterKeys.units.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.units.details(), id] as const,
    filterDropdowns: () => [...masterKeys.units.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.units.filterDropdowns(), fieldName] as const,
    parentUomDropdowns: () => [...masterKeys.units.all(), "parent-uom-dropdown"] as const,
    parentUomDropdown: (excludeId: string) =>
      [...masterKeys.units.parentUomDropdowns(), excludeId] as const,
  },

  formulations: {
    all: () => [...masterKeys.all, "formulations"] as const,
    lists: () => [...masterKeys.formulations.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.formulations.lists(), params] as const,
    details: () => [...masterKeys.formulations.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.formulations.details(), id] as const,
    filterDropdowns: () => [...masterKeys.formulations.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.formulations.filterDropdowns(), fieldName] as const,
  },

  products: {
    all: () => [...masterKeys.all, "products"] as const,
    lists: () => [...masterKeys.products.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.products.lists(), params] as const,
    details: () => [...masterKeys.products.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.products.details(), id] as const,
  },

  suppliers: {
    all: () => [...masterKeys.all, "suppliers"] as const,
    lists: () => [...masterKeys.suppliers.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.suppliers.lists(), params] as const,
    details: () => [...masterKeys.suppliers.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.suppliers.details(), id] as const,
    dropdown: () => [...masterKeys.suppliers.all(), "dropdown"] as const,
    previewNumber: () => [...masterKeys.suppliers.all(), "preview-number"] as const,
    export: () => [...masterKeys.suppliers.all(), "export"] as const,
  }
} as const;
