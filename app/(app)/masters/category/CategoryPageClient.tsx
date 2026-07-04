"use client";

import { Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { Column } from "@/components/ui/DataTable";
import {
  MasterModule,
  MasterFormGrid,
  MasterField,
  compactInput,
} from "@/components/masters/MasterModule";
import {
  CATEGORY_STORAGE_KEY,
  categoryToForm,
  DEFAULT_CATEGORY_FORM,
  formToCategory,
  type CategoryForm,
  type CategoryRecord,
  validateCategoryForm,
} from "./category-data";
import { CategoryListService } from "@/services/category-list.service";

const columns: Column<CategoryRecord>[] = [
  { key: "categoryName", header: "Category Name", sortable: true },
  {
    key: "description",
    header: "Description",
    sortable: true,
    render: (v) => <span className="text-xs text-muted-foreground">{String(v || "—")}</span>,
  },
];

export default function CategoryPageClient() {
  return (
    <MasterModule<CategoryRecord, CategoryForm>
      config={{
        title: "Category Master",
        description: "Product categories for catalog organization",
        icon: Tag,
        storageKey: CATEGORY_STORAGE_KEY,
        seed: [],
        codePrefix: "",
        columns,
        searchKeys: ["categoryName", "description"],
        defaultForm: DEFAULT_CATEGORY_FORM,
        getFormFromRecord: categoryToForm,
        recordFromForm: formToCategory,
        validate: (f) => validateCategoryForm(f),
        remoteListConfig: {
          fetchPage: async ({ page, pageSize, search, status, signal }) => {
            const result = await CategoryListService.list({ page, pageSize, search, status, signal });
            return {
              items: result.items.map((item) => ({
                id: item.id,
                categoryName: item.name,
                description: item.remark,
                status: item.status,
                createdBy: item.createdBy || "—",
                updatedBy: item.updatedBy || "—",
                createdAt: item.createdAt,
                updatedAt: item.updatedAt,
              })),
              total: result.total,
            };
          },
          searchDebounceMs: 350,
        },
        auditColumnVariant: "product",
        auditColumnHeaders: {
          created: "Created",
          updated: "Updated",
        },
        renderFormFields: ({ form, setForm, errors }) => (
          <MasterFormGrid>
            <MasterField label="Category Name" required error={errors.categoryName}>
              <Input
                className={compactInput()}
                value={form.categoryName}
                onChange={(e) => setForm((f) => ({ ...f, categoryName: e.target.value }))}
              />
            </MasterField>
            <MasterField label="Description" className="sm:col-span-2">
              <Textarea
                className="text-xs min-h-[72px] resize-none"
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              />
            </MasterField>
          </MasterFormGrid>
        ),
        viewConfig: {
          drawerTitle: "Category",
          getRecordCode: (r) => String(r.id),
          basicInfo: (r) => [{ label: "Category Name", value: r.categoryName }],
          description: (r) => r.description,
          showDescription: true,
        },
      }}
    />
  );
}
