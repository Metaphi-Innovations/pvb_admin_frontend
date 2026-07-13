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
    dropdown: () => [...masterKeys.categories.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.categories.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.categories.filterDropdowns(), fieldName] as const,
  },

  gst: {
    all: () => [...masterKeys.all, "gst"] as const,
    lists: () => [...masterKeys.gst.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.gst.lists(), params] as const,
    details: () => [...masterKeys.gst.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.gst.details(), id] as const,
    dropdown: () => [...masterKeys.gst.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.gst.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.gst.filterDropdowns(), fieldName] as const,
  },

  hsn: {
    all: () => [...masterKeys.all, "hsn"] as const,
    lists: () => [...masterKeys.hsn.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.hsn.lists(), params] as const,
    details: () => [...masterKeys.hsn.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.hsn.details(), id] as const,
    dropdown: () => [...masterKeys.hsn.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.hsn.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.hsn.filterDropdowns(), fieldName] as const,
  },

  crops: {
    all: () => [...masterKeys.all, "crops"] as const,
    lists: () => [...masterKeys.crops.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.crops.lists(), params] as const,
    details: () => [...masterKeys.crops.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.crops.details(), id] as const,
    dropdown: () => [...masterKeys.crops.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.crops.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.crops.filterDropdowns(), fieldName] as const,
  },

  eventTypes: {
    all: () => [...masterKeys.all, "event-types"] as const,
    lists: () => [...masterKeys.eventTypes.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.eventTypes.lists(), params] as const,
    details: () => [...masterKeys.eventTypes.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.eventTypes.details(), id] as const,
    dropdown: () => [...masterKeys.eventTypes.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.eventTypes.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.eventTypes.filterDropdowns(), fieldName] as const,
    summary: () => [...masterKeys.eventTypes.all(), "summary"] as const,
  },

  brands: {
    all: () => [...masterKeys.all, "brands"] as const,
    lists: () => [...masterKeys.brands.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.brands.lists(), params] as const,
    details: () => [...masterKeys.brands.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.brands.details(), id] as const,
    dropdown: () => [...masterKeys.brands.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.brands.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.brands.filterDropdowns(), fieldName] as const,
  },

  cfu: {
    all: () => [...masterKeys.all, "cfu"] as const,
    lists: () => [...masterKeys.cfu.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.cfu.lists(), params] as const,
    details: () => [...masterKeys.cfu.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.cfu.details(), id] as const,
    dropdown: () => [...masterKeys.cfu.all(), "dropdown"] as const,
    filterDropdowns: () => [...masterKeys.cfu.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.cfu.filterDropdowns(), fieldName] as const,
    summary: () => [...masterKeys.cfu.all(), "summary"] as const,
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
    filterDropdowns: () => [...masterKeys.documentTypes.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.documentTypes.filterDropdowns(), fieldName] as const,
  },

  customerTypes: {
    all: () => [...masterKeys.all, "customer-types"] as const,
    lists: () => [...masterKeys.customerTypes.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.customerTypes.lists(), params] as const,
    details: () => [...masterKeys.customerTypes.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.customerTypes.details(), id] as const,
    filterDropdowns: () => [...masterKeys.customerTypes.all(), "filter-dropdown"] as const,
    filterDropdown: (fieldName: string) =>
      [...masterKeys.customerTypes.filterDropdowns(), fieldName] as const,
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
    dropdown: () => [...masterKeys.formulations.all(), "dropdown"] as const,
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
    previewNumber: (supplierTypeId?: string) => [...masterKeys.suppliers.all(), "preview-number", supplierTypeId] as const,
    export: () => [...masterKeys.suppliers.all(), "export"] as const,
  },

  customers: {
    all: () => [...masterKeys.all, "customers"] as const,
    lists: () => [...masterKeys.customers.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.customers.lists(), params] as const,
    details: () => [...masterKeys.customers.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.customers.details(), id] as const,
    dropdown: () => [...masterKeys.customers.all(), "dropdown"] as const,
    previewNumber: () => [...masterKeys.customers.all(), "preview-number"] as const,
    export: () => [...masterKeys.customers.all(), "export"] as const,
    cfDropdown: () => [...masterKeys.customers.all(), "cf-dropdown"] as const,
  },

  warehouses: {
    all: () => [...masterKeys.all, "warehouses"] as const,
    lists: () => [...masterKeys.warehouses.all(), "list"] as const,
    list: (params: MasterListKeyParams) => [...masterKeys.warehouses.lists(), params] as const,
    details: () => [...masterKeys.warehouses.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.warehouses.details(), id] as const,
    dropdown: () => [...masterKeys.warehouses.all(), "dropdown"] as const,
    previewNumber: () => [...masterKeys.warehouses.all(), "preview-number"] as const,
    export: () => [...masterKeys.warehouses.all(), "export"] as const,
  },

  supplierTypes: {
    all: () => [...masterKeys.all, "supplier-types"] as const,
    lists: () => [...masterKeys.supplierTypes.all(), "list"] as const,
    list: (params: MasterListKeyParams) =>
      [...masterKeys.supplierTypes.lists(), params] as const,
    details: () => [...masterKeys.supplierTypes.all(), "detail"] as const,
    detail: (id: string) => [...masterKeys.supplierTypes.details(), id] as const,
    dropdown: () => [...masterKeys.supplierTypes.all(), "dropdown"] as const,
    previewNumber: () => [...masterKeys.supplierTypes.all(), "preview-number"] as const,
    export: () => [...masterKeys.supplierTypes.all(), "export"] as const,
  },
} as const;
