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
  if (status === "active") return { is_active: true };
  if (status === "inactive") return { is_active: false };
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
  options?: { statusTab?: MasterListStatus },
): Record<string, unknown> {
  const status = resolveListStatus(filters, options?.statusTab);
  const columnFilters = buildListApiFilters(filters, fieldMap);
  return {
    ...columnFilters,
    ...buildIsActiveFilter(status),
  };
}

export const statusColumnMapper: FieldMapper = (value) => {
  const isActive = mapStatusToIsActive(value);
  return isActive === null ? null : { is_active: isActive };
};

const AUDIT_FILTER_FIELDS = {
  createdBy: createdAuditMapper,
  updatedBy: updatedAuditMapper,
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
} as const satisfies Record<string, Record<string, FieldMapper>>;
