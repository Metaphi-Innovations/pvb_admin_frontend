import type {
  AuditFilterValue,
  DateRange,
  FilterState,
  FilterValue,
} from "@/components/listing/types";

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

function normalizeStatusToken(value: FilterValue | undefined): string {
  if (value === undefined || value === null) return "";
  const raw = Array.isArray(value) ? value[0] : value;
  if (typeof raw !== "string") return "";
  return raw.trim().toLowerCase();
}

export function mapStatusToIsActive(value: FilterValue): boolean | null {
  const token = normalizeStatusToken(value);
  if (token === "active") return true;
  if (token === "inactive") return false;
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
  const token = normalizeStatusToken(filters.status);
  if (token === "active" || token === "inactive") return token;
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

/** Brand API uses flat created_at_from / created_at_to keys instead of range.* */
export function createFlatDateAuditFieldMapper(options: {
  userField: string;
  fromKey: string;
  toKey: string;
}): FieldMapper {
  return (value) => {
    const audit = normalizeAuditFilter(value as FilterValue);
    if (!audit) return null;

    const result: Record<string, unknown> = {};

    if (audit.user) {
      assignNested(result, options.userField, audit.user);
    }

    if (audit.fromDate) {
      result[options.fromKey] = audit.fromDate;
    }
    if (audit.toDate) {
      result[options.toKey] = audit.toDate;
    }

    return Object.keys(result).length > 0 ? result : null;
  };
}

const brandCreatedAuditMapper = createFlatDateAuditFieldMapper({
  userField: "created_by_user.username",
  fromKey: "created_at_from",
  toKey: "created_at_to",
});

const brandUpdatedAuditMapper = createFlatDateAuditFieldMapper({
  userField: "updated_by_user.username",
  fromKey: "updated_at_from",
  toKey: "updated_at_to",
});

/** Maps Created/Updated audit column filters to API user + date range fields. */
export function createAuditFieldMapper(options: {
  userField: string;
  dateField: string;
}): FieldMapper {
  return (value) => {
    const audit = normalizeAuditFilter(value);
    if (!audit) return null;

    const result: Record<string, unknown> = {};

    if (audit.user) {
      assignNested(result, options.userField, audit.user);
    }

    if (audit.fromDate || audit.toDate) {
      result.range = {
        [options.dateField]: {
          from: audit.fromDate || undefined,
          to: audit.toDate || undefined,
        },
      };
    }

    return result;
  };
}

const createdAuditMapper = createAuditFieldMapper({
  userField: "created_by_user.username",
  dateField: "created_at",
});

const updatedAuditMapper = createAuditFieldMapper({
  userField: "updated_by_user.username",
  dateField: "updated_at",
});

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

const cfuCreatedAuditMapper = createAuditFieldMapper({
  userField: "created_by.username",
  dateField: "created_at",
});

const cfuUpdatedAuditMapper = createAuditFieldMapper({
  userField: "updated_by.username",
  dateField: "updated_at",
});

export const statusColumnMapper: FieldMapper = (value) => {
  const isActive = mapStatusToIsActive(value);
  return isActive === null ? null : { is_active: isActive };
};

const AUDIT_FILTER_FIELDS = {
  createdBy: createdAuditMapper,
  updatedBy: updatedAuditMapper,
  createdDate: createdAuditMapper,
  updatedDate: updatedAuditMapper,
  createdAt: createdAuditMapper,
  updatedAt: updatedAuditMapper,
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
      const raw = Array.isArray(value) ? value[0] : value;
      const num = Number(String(raw).replace(/%/g, "").trim());
      return Number.isFinite(num) ? { gstPercentage: num } : null;
    },
    remarks: "remark",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  hsn: {
    hsnCode: "hsnCode",
    hsnDescription: "hsnDescription",
    gstRate: (value) => {
      const raw = Array.isArray(value) ? value[0] : value;
      const label = String(raw).split(" — ")[0];
      const num = Number(label.replace(/%/g, "").trim());
      return Number.isFinite(num) ? { gst: { gstPercentage: num } } : null;
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  segment: {
    segmentName: "segment_name",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  crop: {
    cropName: "crop_name",
    fieldType: "field_type",
    categoryName: "category.categoryName",
    season: (value) => {
      const raw = Array.isArray(value) ? value.join(", ") : value;
      const trimmed = String(raw ?? "").trim();
      return trimmed ? { season: trimmed } : null;
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
    createdBy: brandCreatedAuditMapper,
    updatedBy: brandUpdatedAuditMapper,
  },
  cfu: {
    cfuName: "cfu_name",
    description: "description",
    status: cfuStatusColumnMapper,
    createdBy: cfuCreatedAuditMapper,
    updatedBy: cfuUpdatedAuditMapper,
  },
  department: {
    name: "department_name",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  role: {
    roleName: "role_name",
    department: (value) => {
      const raw = Array.isArray(value) ? value[0] : value;
      const name = String(raw ?? "").trim();
      return name ? { department: { department_name: name } } : null;
    },
    geoLevel: "geography_level",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  tds: {
    sectionCode: "tds_code",
    sectionName: "tds_section_name",
    tdsRate: (value) => {
      const raw = Array.isArray(value) ? value[0] : value;
      const num = Number(String(raw).replace(/%/g, "").trim());
      return Number.isFinite(num) ? { tds_rate: num } : null;
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
  customerType: {
    customerType: "customer_type_name",
    initialCode: "customer_initial_code",
    description: "description",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  unit: {
    unitCode: "unit_code",
    unitName: "unit_name",
    shortName: "short_name",
    parentUomName: "uom.unit_name",
    conversionFactor: (value) => {
      const raw = Array.isArray(value) ? value[0] : value;
      const num = Number(String(raw).trim());
      return Number.isFinite(num) ? { conversion_factor: num } : null;
    },
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  formulation: {
    formulationName: "formulation_name",
    formulationCode: "formulation_code",
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
      const raw = Array.isArray(value) ? value[0] : value;
      const name = String(raw ?? "").trim();
      return name ? { role: { role_name: name } } : null;
    },
    department: (value) => {
      const raw = Array.isArray(value) ? value[0] : value;
      const name = String(raw ?? "").trim();
      return name ? { department: { department_name: name } } : null;
    },
    employeeType: "employee_type",
    roleType: "role_type",
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  product: {
    status: statusColumnMapper,
    ...AUDIT_FILTER_FIELDS,
  },
  supplierType: {
    supplierTypeName: "supplier_type_name",
    initialCode: "initial_code",
    description: "description",
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
      const token = normalizeStatusToken(value);
      if (!token || token === "all") return null;
      if (token === "active") return { status: "Active" };
      if (token === "inactive") return { status: "Inactive" };
      if (token === "under maintenance" || token === "under_maintenance") {
        return { status: "Under Maintenance" };
      }
      if (token === "closed") return { status: "Closed" };
      const raw = Array.isArray(value) ? value[0] : value;
      const label = String(raw ?? "").trim();
      return label ? { status: label } : null;
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

