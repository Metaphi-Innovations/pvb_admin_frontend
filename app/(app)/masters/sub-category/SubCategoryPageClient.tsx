"use client";

import { Layers } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Column } from "@/components/ui/DataTable";
import {
  MasterModule,
  MasterFormGrid,
  MasterField,
  compactInput,
} from "@/components/masters/MasterModule";
import {
  DEFAULT_SUB_CATEGORY_FORM,
  formToSubCategory,
  getActiveCategoriesForSelect,
  SUB_CATEGORY_SEED,
  SUB_CATEGORY_STORAGE_KEY,
  subCategoryToForm,
  type SubCategoryForm,
  type SubCategoryRecord,
  validateSubCategoryForm,
} from "./sub-category-data";

const columns: Column<SubCategoryRecord>[] = [
  { key: "categoryName", header: "Category", sortable: true },
  { key: "subCategoryName", header: "Sub Category Name", sortable: true },
  {
    key: "subCategoryCode",
    header: "Sub Category Code",
    sortable: true,
    render: (v) => <span className="font-mono text-xs">{String(v)}</span>,
  },
];

export default function SubCategoryMasterPage() {
  return (
    <MasterModule<SubCategoryRecord, SubCategoryForm>
      config={{
        title: "Sub Category Master",
        description: "Sub categories linked to parent categories",
        icon: Layers,
        storageKey: SUB_CATEGORY_STORAGE_KEY,
        seed: SUB_CATEGORY_SEED,
        codePrefix: "SCAT-",
        columns,
        searchKeys: ["categoryName", "subCategoryName", "subCategoryCode", "description"],
        defaultForm: DEFAULT_SUB_CATEGORY_FORM,
        getFormFromRecord: subCategoryToForm,
        recordFromForm: formToSubCategory,
        validate: (f) => validateSubCategoryForm(f),
        setCodeOnForm: (f, code) => ({ ...f, subCategoryCode: code }),
        renderFormFields: ({ form, setForm }) => {
          const categories = getActiveCategoriesForSelect();
          return (
            <MasterFormGrid>
              <MasterField label="Category" required className="sm:col-span-2">
                <Select
                  value={form.categoryId ? String(form.categoryId) : ""}
                  onValueChange={(v) => setForm((f) => ({ ...f, categoryId: Number(v) }))}
                >
                  <SelectTrigger className={compactInput()}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                        {c.categoryName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </MasterField>
              <MasterField label="Sub Category Name" required>
                <Input
                  className={compactInput()}
                  value={form.subCategoryName}
                  onChange={(e) => setForm((f) => ({ ...f, subCategoryName: e.target.value }))}
                />
              </MasterField>
              <MasterField label="Sub Category Code" required>
                <Input
                  className={compactInput("font-mono")}
                  value={form.subCategoryCode}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, subCategoryCode: e.target.value.toUpperCase() }))
                  }
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
          );
        },
        viewConfig: {
          drawerTitle: "Sub Category",
          getRecordCode: (r) => r.subCategoryCode,
          basicInfo: (r) => [
            { label: "Category", value: r.categoryName },
            { label: "Sub Category Name", value: r.subCategoryName },
            { label: "Sub Category Code", value: r.subCategoryCode, mono: true },
          ],
          description: (r) => r.description,
          showDescription: true,
        },
      }}
    />
  );
}
