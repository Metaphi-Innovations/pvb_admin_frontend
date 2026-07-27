import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";

export type TemplateAccessType = "web" | "mobile";

export interface TemplateListParams {
  page: number;
  pageSize: number;
  search: string;
  ordering?: string;
  status: "all" | "active" | "inactive";
  apiFilters?: Record<string, unknown>;
  signal?: AbortSignal;
}

export interface TemplatePermissionFlat {
  moduleKey: string;
  actionKey: string;
}

export interface TemplateListRecord {
  id: number;
  templateUuid: string;
  templateName: string;
  description: string;
  accessType: TemplateAccessType;
  webPermissions: TemplatePermissionFlat[];
  mobilePermissions: TemplatePermissionFlat[];
  status: "active" | "inactive";
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}

export interface TemplateListResult {
  items: TemplateListRecord[];
  total: number;
}

export interface TemplateCreatePayload {
  name: string;
  description?: string | null;
  accessType: TemplateAccessType;
  webPermissions?: TemplatePermissionFlat[];
  mobilePermissions?: TemplatePermissionFlat[];
}

export interface TemplateUpdatePayload extends Partial<TemplateCreatePayload> {}

export interface TemplateExportParams {
  search: string;
  status: "all" | "active" | "inactive";
  ordering?: string;
  apiFilters?: Record<string, unknown>;
}

const SORT_KEY_TO_ORDERING: Record<string, string> = {
  templateName: "name",
  accessType: "name",
  status: "is_active",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

export function templateSortStateToOrdering(
  key: string,
  direction: "asc" | "desc" | "none",
): string {
  if (!key || direction === "none") return "";
  const field = SORT_KEY_TO_ORDERING[key];
  if (!field) return "";
  return direction === "desc" ? `-${field}` : field;
}

function asString(value: unknown): string {
  return typeof value === "string" ? value : String(value ?? "");
}

function toStatus(value: unknown): "active" | "inactive" {
  return value === true ? "active" : "inactive";
}

function toDisplayName(user: unknown): string {
  if (!user || typeof user !== "object") return "";
  const record = user as Record<string, unknown>;
  const username = asString(record.username).trim();
  if (username) return username;
  const first = asString(record.first_name).trim();
  const last = asString(record.last_name).trim();
  return `${first} ${last}`.trim();
}

function formatDate(value: unknown): string {
  const raw = asString(value);
  return raw ? raw.slice(0, 10) : "";
}

function flattenPermissionTree(tree: unknown): TemplatePermissionFlat[] {
  if (!tree || typeof tree !== "object") return [];
  const out: TemplatePermissionFlat[] = [];
  const root = tree as Record<string, unknown>;

  for (const [moduleName, submodules] of Object.entries(root)) {
    if (!submodules || typeof submodules !== "object") continue;
    for (const [submoduleName, actionsRaw] of Object.entries(
      submodules as Record<string, unknown>,
    )) {
      if (!Array.isArray(actionsRaw)) continue;
      for (const action of actionsRaw) {
        const actionKey = asString(action).trim();
        if (!actionKey) continue;
        out.push({
          moduleKey: `${moduleName}.${submoduleName}`,
          actionKey,
        });
      }
    }
  }

  return out;
}

function buildPermissionTree(flat: TemplatePermissionFlat[]): Record<string, unknown> {
  const tree: Record<string, Record<string, string[]>> = {};

  for (const row of flat) {
    const moduleKey = asString(row.moduleKey).trim();
    const actionKey = asString(row.actionKey).trim();
    if (!moduleKey || !actionKey) continue;

    const [moduleName, submoduleName] = moduleKey.split(".");
    if (!moduleName || !submoduleName) continue;

    if (!tree[moduleName]) tree[moduleName] = {};
    if (!Array.isArray(tree[moduleName][submoduleName])) {
      tree[moduleName][submoduleName] = [];
    }
    if (!tree[moduleName][submoduleName].includes(actionKey)) {
      tree[moduleName][submoduleName].push(actionKey);
    }
  }

  return tree;
}

function inferAccessType(
  webPermissions: TemplatePermissionFlat[],
  mobilePermissions: TemplatePermissionFlat[],
): TemplateAccessType {
  if (mobilePermissions.length > 0 && webPermissions.length === 0) return "mobile";
  return "web";
}

function mapItem(raw: Record<string, unknown>, fallbackIndex: number): TemplateListRecord {
  const srNo = Number(raw.sr_no);
  const webPermissions = flattenPermissionTree(raw.web_permission);
  const mobilePermissions = flattenPermissionTree(raw.mobile_permission);

  return {
    id: Number.isFinite(srNo) && srNo > 0 ? srNo : fallbackIndex + 1,
    templateUuid: asString(raw.template_id),
    templateName: asString(raw.name),
    description: asString(raw.description),
    accessType: inferAccessType(webPermissions, mobilePermissions),
    webPermissions,
    mobilePermissions,
    status: toStatus(raw.is_active),
    createdAt: formatDate(raw.created_at),
    updatedAt: formatDate(raw.updated_at),
    createdBy: toDisplayName(raw.created_by_user),
    updatedBy: toDisplayName(raw.updated_by_user),
  };
}

function buildTemplateCsv(rows: TemplateListRecord[]): string {
  const headers = [
    "Template Name",
    "Access Type",
    "Status",
    "Description",
    "Created By",
    "Created Date",
    "Updated By",
    "Updated Date",
  ];

  const escape = (v: string) => `"${v.replace(/"/g, '""')}"`;

  const body = rows.map((row) =>
    [
      row.templateName,
      row.accessType === "web" ? "Web" : "Mobile",
      row.status,
      row.description,
      row.createdBy,
      row.createdAt,
      row.updatedBy,
      row.updatedAt,
    ]
      .map((cell) => escape(cell))
      .join(","),
  );

  return [headers.join(","), ...body].join("\n");
}

export const TemplateListService = {
  async list(params: TemplateListParams): Promise<TemplateListResult> {
    const ordering = encodeURIComponent(params.ordering ?? "");

    const response = await axiosInstance.post(
      `${API_ENDPOINTS.USER_MANAGEMENT.TEMPLATE.LIST}?page=${params.page}&page_size=${params.pageSize}&search=${encodeURIComponent(params.search)}&ordering=${ordering}`,
      { filters: params.apiFilters ?? {} },
      { signal: params.signal },
    );

    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    const items = data.map((row, idx) => mapItem((row ?? {}) as Record<string, unknown>, idx));
    const totalRecords = Number(payload.totalRecords ?? payload.count);
    const total = Number.isFinite(totalRecords) ? totalRecords : items.length;
    return { items, total };
  },

  async view(id: string): Promise<TemplateListRecord> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.TEMPLATE.VIEW(id));
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an object.");
    }
    return mapItem(data as Record<string, unknown>, 0);
  },

  async create(payload: TemplateCreatePayload): Promise<void> {
    const web_permission =
      payload.accessType === "web" ? buildPermissionTree(payload.webPermissions ?? []) : null;
    const mobile_permission =
      payload.accessType === "mobile"
        ? buildPermissionTree(payload.mobilePermissions ?? [])
        : null;

    const response = await axiosInstance.post(API_ENDPOINTS.USER_MANAGEMENT.TEMPLATE.CREATE, {
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
      web_permission,
      mobile_permission,
    });

    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to create template.");
    }
  },

  async update(id: string, payload: TemplateUpdatePayload): Promise<void> {
    const bodyPayload: Record<string, unknown> = {};
    if (payload.name !== undefined) bodyPayload.name = payload.name.trim();
    if (payload.description !== undefined) bodyPayload.description = payload.description?.trim() || null;

    if (payload.accessType === "web") {
      bodyPayload.web_permission = buildPermissionTree(payload.webPermissions ?? []);
      bodyPayload.mobile_permission = null;
    } else if (payload.accessType === "mobile") {
      bodyPayload.mobile_permission = buildPermissionTree(payload.mobilePermissions ?? []);
      bodyPayload.web_permission = null;
    }

    const response = await axiosInstance.put(
      API_ENDPOINTS.USER_MANAGEMENT.TEMPLATE.UPDATE(id),
      bodyPayload,
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update template.");
    }
  },

  async updateStatus(id: string): Promise<void> {
    const response = await axiosInstance.patch(
      API_ENDPOINTS.USER_MANAGEMENT.TEMPLATE.STATUS_UPDATE(id),
    );
    const body = response.data as Record<string, unknown>;
    if (body.success === false) {
      throw new Error(asString(body.message) || "Failed to update template status.");
    }
  },

  async export(params: TemplateExportParams): Promise<void> {
    const result = await TemplateListService.list({
      page: 1,
      pageSize: 5000,
      search: params.search,
      ordering: params.ordering,
      status: params.status,
      apiFilters: params.apiFilters,
    });

    const csv = buildTemplateCsv(result.items);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `permission_templates_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  async dropdown(): Promise<Array<{ id: string; name: string; label: string }>> {
    const response = await axiosInstance.get(API_ENDPOINTS.USER_MANAGEMENT.TEMPLATE.DROPDOWN);
    const payload = response.data as Record<string, unknown>;
    const data = payload.data;
    if (!Array.isArray(data)) {
      throw new Error("Unexpected response shape: 'data' must be an array.");
    }

    return data.map((row) => {
      const item = (row ?? {}) as Record<string, unknown>;
      const name = asString(item.name);
      return {
        id: asString(item.template_id),
        name,
        label: asString(item.label || name),
      };
    });
  },
};
