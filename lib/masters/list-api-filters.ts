import type {
  AuditFilterValue,
  DateRange,
  FilterState,
  FilterValue,
} from "@/components/listing/types";
import { toApiFilterValue, toFilterStringList } from "@/lib/listing/filter-values";

export type MasterListStatus = "all" | "active" | "inactive";

export type FieldMapper =
  | string
  | ((value: FilterValue) => Record<string, unknown> | null);

function isDateRange(value: FilterValue): value is DateRange {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    "fromDate" in value &&
    !("user" in value)
  );
}

function isAuditFilter(value: FilterValue): value is AuditFilterValue {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    ("user" in value || ("fromDate" in value && "toDate" in value))
  );
}

function isEmptyFilterValue(value: FilterValue | undefined): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  if (isAuditFilter(value)) {
    return !value.user?.trim() && !value.fromDate && !value.toDate;
  }
  if (isDateRange(value)) {
    return !value.fromDate && !value.toDate;
  }
  return false;
}

function coerceScalar(value: FilterValue): string | string[] {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  if (typeof value === "object" && value !== null) return "";
  return String(value).trim();
}

function normalizeStatusTokens(value: FilterValue | undefined): string[] {
  if (value === undefined || value === null) return [];
  const rawList = Array.isArray(value) ? value : [value];
  return rawList
    .map((raw) => (typeof raw === "string" ? raw.trim().toLowerCase() : ""))
    .filter(Boolean);
}

export function mapStatusToIsActive(value: FilterValue): boolean | null {
  const tokens = normalizeStatusTokens(value);
  const hasActive = tokens.includes("active");
  const hasInactive = tokens.includes("inactive");
  // Both selected → no is_active constraint (show all)
  if (hasActive && hasInactive) return null;
  if (hasActive) return true;
  if (hasInactive) return false;
  return null;
}

export function buildIsActiveFilter(status: MasterListStatus): Record<string, boolean> {
  return buildStatusFilter(status, "is_active");
}

export function buildStatusFilter(
  status: MasterListStatus,
  field: string = "is_active",
): Record<string, boolean> {
  if (status === "active") return { [field]: true };
  if (status === "inactive") return { [field]: false };
  return {};
}

/** Column status filter wins over status tab when set. Handles dropdown arrays. */
export function resolveListStatus(
  filters: FilterState,
  statusTab?: MasterListStatus,
): MasterListStatus {
  const tokens = normalizeStatusTokens(filters.status as FilterValue | undefined);
  const hasActive = tokens.includes("active");
  const hasInactive = tokens.includes("inactive");
  if (hasActive && hasInactive) return "all";
  if (hasActive) return "active";
  if (hasInactive) return "inactive";
  if (statusTab && statusTab !== "all") return statusTab;
  return "all";
}

function assignNested(target: Record<string, unknown>, path: string, value: unknown) {
  if (!path.includes(".")) {
    target[path] = value;
    return;
  }

  const parts = path.split(".");
  let current = target;
  for (let i = 0; i < parts.length; i++) {
    const part = parts[i];
    if (i === parts.length - 1) {
      current[part] = value;
    } else {
      const next = current[part];
      if (!next || typeof next !== "object" || Array.isArray(next)) {
        current[part] = {};
      }
      current = current[part] as Record<string, unknown>;
    }
  }
}

function deepMerge(
  target: Record<string, unknown>,
  source: Record<string, unknown>,
): Record<string, unknown> {
  for (const [key, value] of Object.entries(source)) {
    if (
      value &&
      typeof value === "object" &&
      !Array.isArray(value) &&
      target[key] &&
      typeof target[key] === "object" &&
      !Array.isArray(target[key])
    ) {
      deepMerge(target[key] as Record<string, unknown>, value as Record<string, unknown>);
    } else {
      target[key] = value;
    }
  }
  return target;
}

function normalizeAuditFilter(value: FilterValue): AuditFilterValue | null {
  if (typeof value === "string") {
    const user = value.trim();
    return user ? { user } : null;
  }
  if (isDateRange(value)) {
    if (!value.fromDate && !value.toDate) return null;
    return {
      fromDate: value.fromDate || undefined,
      toDate: value.toDate || undefined,
    };
  }
  if (isAuditFilter(value)) {
    const user = value.user?.trim();
    const fromDate = value.fromDate || undefined;
    const toDate = value.toDate || undefined;
    if (!user && !fromDate && !toDate) return null;
    return { user: user || undefined, fromDate, toDate };
  }
  return null;
}

/** Maps Created/Updated filters to flat created_at_from / created_at_to keys (date only). */
export function createFlatDateAuditFieldMapper(options: {
  fromKey: string;
  toKey: string;
}): FieldMapper {
  return (value) => {
    const audit = normalizeAuditFilter(value as FilterValue);
    if (!audit) return null;

    const result: Record<string, unknown> = {};

    if (audit.fromDate) {
      result[options.fromKey] = audit.fromDate;
    }
    if (audit.toDate) {
      result[options.toKey] = audit.toDate;
    }

    return Object.keys(result).length > 0 ? result : null;
  };
}

/** Maps Created/Updated filters to date range fields (name is display-only). */
export function createAuditFieldMapper(options: {
  dateField: string;
}): FieldMapper {
  return (value) => {
    const audit = normalizeAuditFilter(value);
    if (!audit) return null;
    if (!audit.fromDate && !audit.toDate) return null;

    return {
      range: {
        [options.dateField]: {
          from: audit.fromDate || undefined,
          to: audit.toDate || undefined,
        },
      },
    };
  };
}

/** Created/Updated columns filter by date only (name is display-only). */
const createdDateFilterMapper: FieldMapper = "created_at";
const updatedDateFilterMapper: FieldMapper = "updated_at";

export function buildListApiFilters(
  filters: FilterState,
  fieldMap: Record<string, FieldMapper>,
  excludeKeys: string[] = ["search", "status"],
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(filters)) {
    if (excludeKeys.includes(key)) continue;
    if (isEmptyFilterValue(rawValue)) continue;

    const mapper = fieldMap[key];
    if (!mapper) continue;

    if (typeof mapper === "function") {
      const mapped = mapper(rawValue as FilterValue);
      if (mapped) deepMerge(result, mapped);
      continue;
    }

    if (isDateRange(rawValue as FilterValue)) {
      const range = rawValue as DateRange;
      result.range = result.range ?? {};
      (result.range as Record<string, unknown>)[mapper] = {
        from: range.fromDate || undefined,
        to: range.toDate || undefined,
      };
      continue;
    }

    const coerced = coerceScalar(rawValue as FilterValue);
    if (Array.isArray(coerced)) {
      if (coerced.length === 1) assignNested(result, mapper, coerced[0]);
      else if (coerced.length > 1) assignNested(result, mapper, coerced);
    } else if (coerced) {
      assignNested(result, mapper, coerced);
    }
  }

  return result;
}

export function mergeListRequestFilters(
  filters: FilterState,
  fieldMap: Record<string, FieldMapper>,
  options?: { statusTab?: MasterListStatus; statusField?: string },
): Record<string, unknown> {
  const status = resolveListStatus(filters, options?.statusTab);
  const columnFilters = buildListApiFilters(filters, fieldMap);
  return {
    ...columnFilters,
    ...buildStatusFilter(status, options?.statusField ?? "is_active"),
  };
}

const cfuStatusColumnMapper: FieldMapper = (value) => {
  const active = mapStatusToIsActive(value);
  return active === null ? null : { status: active };
};


export const statusColumnMapper: FieldMapper = (value) => {
  const isActive = mapStatusToIsActive(value);
  return isActive === null ? null : { is_active: isActive };
};

const AUDIT_FILTER_FIELDS = {
  createdBy: createdDateFilterMapper,
  updatedBy: updatedDateFilterMapper,
  createdDate: createdDateFilterMapper,
  updatedDate: updatedDateFilterMapper,
  createdAt: createdDateFilterMapper,
  updatedAt: updatedDateFilterMapper,
} as const;

export const MASTER_FILTER_FIELD_MAPS = {
  category: {
    categoryName: "categoryName",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  gst: {
    gstPercentage: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace(/%/g, "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { gstPercentage: nums.length === 1 ? nums[0] : nums };
    },
    remarks: "remark",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  hsn: {
    hsnCode: "hsnCode",
    hsnDescription: "hsnDescription",
    codeType: "codeType",
    gstRate: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => {
          const label = String(raw ?? "").split(" — ")[0];
          return Number(label.replace(/%/g, "").trim());
        })
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { gst: { gstPercentage: nums.length === 1 ? nums[0] : nums } };
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  segment: {
    segmentCode: "segment_code",
    segmentName: "segment_name",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  crop: {
    cropName: "crop_name",
    fieldType: "field_type",
    category: "category",
    season: (value) => {
      const values = (Array.isArray(value) ? value : [value])
        .map((item) => String(item ?? "").trim())
        .filter(Boolean);
      if (values.length === 0) return null;
      return { season: values.length === 1 ? values[0] : values };
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  eventType: {
    eventTypeName: "event_type_name",
    remark: "remark",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  brand: {
    brandName: "brand_name",
    brandType: "brand_type",
    remark: "remark",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  cfu: {
    cfuName: "cfu_name",
    description: "description",
    status: cfuStatusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  department: {
    name: "department_name",
    remarks: "remark",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  role: {
    roleName: "role_name",
    department: (value) => {
      const name = toApiFilterValue(value);
      return name !== undefined ? { department: { department_name: name } } : null;
    },
    geoLevel: "geography_level",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  tds: {
    sectionName: "tds_section_name",
    tdsRate: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace(/%/g, "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { tds_rate: nums.length === 1 ? nums[0] : nums };
    },
    applicableTo: "applicable_to",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  tcs: {
    sectionName: "tcs_section_name",
    tcsRate: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace(/%/g, "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { tcs_rate: nums.length === 1 ? nums[0] : nums };
    },
    applicableTo: "applicable_to",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  documentType: {
    title: "title",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  additionalCharge: {
    chargeCode: "charge_code",
    chargeName: "charge_name",
    hsnSacCode: "hsn_sac_code",
    description: "description",
    defaultGstRate: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace("%", "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return {
        default_gst_rate: { gstPercentage: nums.length === 1 ? nums[0] : nums },
      };
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  scheme: {
    schemeCode: "scheme_code",
    schemeName: "scheme_name",
    schemeType: "scheme_type",
    settlementType: "settlement_type",
    approvalStatus: "approval_status",
    startDate: "start_date",
    endDate: "end_date",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  customerType: {
    customerType: "customer_type_name",
    initialCode: "customer_initial_code",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  unit: {
    unitName: "unit_name",
    shortName: "short_name",
    parentUomName: "uom.unit_name",
    conversionFactor: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { conversion_factor: nums.length === 1 ? nums[0] : nums };
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  formulation: {
    formulationName: "formulation_name",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  user: {
    employeeId: "employee_id",
    fullName: "first_name",
    email: "email",
    mobile: "mobile_number",
    role: (value) => {
      const name = toApiFilterValue(value);
      return name !== undefined ? { role: { role_name: name } } : null;
    },
    department: (value) => {
      const name = toApiFilterValue(value);
      return name !== undefined ? { department: { department_name: name } } : null;
    },
    employeeType: "employee_type",
    roleType: "role_type",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  product: {
    productCode: "product_code",
    productName: "product_name",
    sku: "sku",
    supplierCode: "supplier_code",
    supplier: "supplier.supplier_name",
    hsnCode: "hsn.hsnCode",
    category: "category.categoryName",
    packSize: "pack_size",
    baseUnit: "unit",
    mrp: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace(/[₹,\s]/g, "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { mrp: nums.length === 1 ? nums[0] : nums };
    },
    costPrice: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace(/[₹,\s]/g, "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { cost_price: nums.length === 1 ? nums[0] : nums };
    },
    status: (value) => {
      const list = toFilterStringList(value);
      if (list.length === 0) return null;
      const lower = list.map((s) => s.toLowerCase());
      const hasActive = lower.includes("active");
      const hasInactive = lower.includes("inactive");
      if (hasActive && hasInactive && lower.every((t) => t === "active" || t === "inactive")) {
        return null;
      }
      const mapped = list.map((raw) => {
        const token = raw.trim().toLowerCase();
        if (token === "active") return "Active";
        if (token === "inactive") return "Inactive";
        return raw.trim();
      });
      const status = toApiFilterValue(mapped);
      return status !== undefined ? { status } : null;
    },
    ...AUDIT_FILTER_FIELDS,
  },
  supplierType: {
    supplierTypeName: "supplier_type_name",
    initialCode: "initial_code",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  supplier: {
    supplierCode: "supplier_code",
    supplierName: "supplier_name",
    supplierType: "supplier_type.supplier_type_name",
    contactPerson: "contact_person",
    mobile: "mobile_number",
    gstNumber: "gstin_number",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },

  pricing: {
    productCode: "product.product_code",
    productName: "product.product_name",
    sku: "product.sku",
    supplierName: "product.supplier.supplier_name",
    supplierCode: "product.supplier_code",
    state: "state_name",
    customerType: "customer_type.customer_type_name",
    category: "product.category.categoryName",
    segment: "product.segment.segment_name",
    packSize: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { product: { pack_size: nums.length === 1 ? nums[0] : nums } };
    },
    unit: "product.unit",
    gstPct: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").replace(/%/g, "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return {
        product: { gst_rate: { gstPercentage: nums.length === 1 ? nums[0] : nums } },
      };
    },
    dealerPrice: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { dealer_price: nums.length === 1 ? nums[0] : nums };
    },
    mrp: (value) => {
      const nums = (Array.isArray(value) ? value : [value])
        .map((raw) => Number(String(raw ?? "").trim()))
        .filter((num) => Number.isFinite(num));
      if (nums.length === 0) return null;
      return { product: { mrp: nums.length === 1 ? nums[0] : nums } };
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },

  warehouse: {
    warehouseName: "warehouse_name",
    operatedBy: "operated_by",
    gstNumber: "gst_number",
    state: "state",
    district: "district",
    city: "city",
    pincode: "pincode",
    status: (value) => {
      const list = toFilterStringList(value);
      if (list.length === 0) return null;
      const lower = list.map((s) => s.toLowerCase());
      if (lower.includes("all")) return null;

      const hasActive = lower.includes("active");
      const hasInactive = lower.includes("inactive");
      const otherTokens = list.filter((raw) => {
        const token = raw.trim().toLowerCase();
        return token !== "active" && token !== "inactive" && token !== "all";
      });

      if (hasActive && hasInactive && otherTokens.length === 0) return null;

      const mapped: string[] = [];
      if (!(hasActive && hasInactive)) {
        if (hasActive) mapped.push("Active");
        if (hasInactive) mapped.push("Inactive");
      }
      for (const raw of otherTokens) {
        const token = raw.trim().toLowerCase();
        if (token === "under maintenance" || token === "under_maintenance") {
          mapped.push("Under Maintenance");
        } else if (token === "closed") {
          mapped.push("Closed");
        } else {
          mapped.push(raw.trim());
        }
      }

      const status = toApiFilterValue(mapped);
      return status !== undefined ? { status } : null;
    },
    ...AUDIT_FILTER_FIELDS,
  },

  warehouseType: {
    warehouseTypeName: "warehouse_type_name",
    initialCode: "initial_code",
    description: "description",
    status: "status",
    ...AUDIT_FILTER_FIELDS,
  },
} as const satisfies Record<string, Record<string, FieldMapper>>;

