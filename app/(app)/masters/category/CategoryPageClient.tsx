"use client";

import { Tag } from "lucide-react";
import type { Column } from "@/components/ui/DataTable";
import {
  MasterModule,
  MasterFormGrid,
  MasterViewRow,
} from "@/components/masters/MasterModule";
import { NameCodeDescriptionFields } from "@/components/masters/simpleFields";
import {
  CATEGORY_SEED,
  CATEGORY_STORAGE_KEY,
  categoryToForm,
  DEFAULT_CATEGORY_FORM,
  formToCategory,
  type CategoryForm,
  type CategoryRecord,
  validateCategoryForm,
} from "./category-data";

const columns: Column<CategoryRecord>[] = [
  { key: "categoryName", header: "Category Name", sortable: true },
  {
    key: "categoryCode",
    header: "Category Code",
    sortable: true,
    render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
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
        seed: CATEGORY_SEED,
        codePrefix: "CAT-",
        columns,
        searchKeys: ["categoryName", "categoryCode", "description"],
        defaultForm: DEFAULT_CATEGORY_FORM,
        getFormFromRecord: categoryToForm,
        recordFromForm: formToCategory,
        validate: (f) => validateCategoryForm(f),
        setCodeOnForm: (f, code) => ({ ...f, categoryCode: code }),
        auditColumnVariant: "product",
        auditColumnHeaders: {
          created: "Created",
          updated: "Updated",
        },
        renderFormFields: ({ form, setForm, errors }) => (
          <MasterFormGrid>
            <NameCodeDescriptionFields
              form={{
                name: form.categoryName,
                code: form.categoryCode,
                description: form.description,
              }}
              setForm={(updater) =>
                setForm((prev) => {
                  const next =
                    typeof updater === "function"
                      ? updater({
                          name: prev.categoryName,
                          code: prev.categoryCode,
                          description: prev.description,
                        })
                      : updater;
                  return {
                    ...prev,
                    categoryName: next.name,
                    categoryCode: next.code,
                    description: next.description,
                  };
                })
              }
              errors={{
                name: errors.categoryName,
                code: errors.categoryCode,
              }}
              labels={{ name: "Category Name", code: "Category Code" }}
            />
          </MasterFormGrid>
        ),
        renderViewDetails: (r) => (
          <div className="rounded-lg border border-border/60 bg-muted/10 px-3">
            <MasterViewRow label="Category Name" value={r.categoryName} />
            <MasterViewRow label="Category Code" value={<span className="font-mono">{r.categoryCode}</span>} />
            <MasterViewRow label="Description" value={r.description || "—"} />
            <MasterViewRow label="Status" value={r.status === "active" ? "Active" : "Inactive"} />
          </div>
        ),
      }}
    />
  );
}
