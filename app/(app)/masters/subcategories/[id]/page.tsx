"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordStatusPill,
} from "@/components/record-detail";
import { CheckCircle2, Clock, Pencil, Tag, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadSubCategories, saveSubCategories, type SubCategory, type SubCategoryStatus, todayStr } from "../subcategory-data";

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export default function SubCategoryDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<SubCategory | null>(null);
  const [records, setRecords] = useState<SubCategory[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const items = loadSubCategories();
    setRecords(items);
    setRecord(items.find((item) => item.id === Number(id)) ?? null);
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!record) {
    return (
      <RecordDetailPage
        listHref="/masters/subcategories"
        listLabel="Sub Categories"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Sub Category not found.</p>
          <Link href="/masters/subcategories" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const toggleStatus = (on: boolean) => {
    const nextStatus: SubCategoryStatus = on ? "active" : "inactive";
    const updated = records.map((item) =>
      item.id === record.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveSubCategories(updated);
    setRecord(updated.find((item) => item.id === record.id) ?? null);
    setToast({
      msg: `Sub Category status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const tabs = [{ value: "overview", label: "Overview" }];

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Basic Details" icon={Tag} accent="blue">
          <RecordKvRow label="Sub Category Code" value={record.subCategoryCode} mono copy />
          <RecordKvRow label="Sub Category Name" value={record.subCategoryName} highlight />
          <RecordKvRow label="Category" value={record.categoryName} />
          <RecordKvRow label="Description" value={record.description} />
          <RecordKvRow
            label="Status"
            value={
              <RecordStatusPill
                label={record.status === "active" ? "Active" : "Inactive"}
                variant={record.status}
              />
            }
            isLast
          />
        </RecordSectionCard>

        <RecordSectionCard title="Audit Details" icon={Clock} accent="slate">
          <RecordKvRow label="Created By" value={record.createdBy} />
          <RecordKvRow label="Created Date" value={record.createdDate} />
          <RecordKvRow label="Updated By" value={record.updatedBy} />
          <RecordKvRow label="Updated Date" value={record.updatedDate} isLast />
        </RecordSectionCard>
      </div>
    );
  };

  return (
    <>
      <RecordDetailPage
        listHref="/masters/subcategories"
        listLabel="Sub Categories"
        recordName={record.subCategoryName}
        recordCode={record.subCategoryCode}
        statusLabel={record.status === "active" ? "Active" : "Inactive"}
        statusVariant={record.status}
        metaItems={[{ label: record.categoryName, icon: Tag }]}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        active={record.status === "active"}
        onActiveChange={toggleStatus}
        onEdit={() => router.push(`/masters/subcategories/${record.id}/edit`)}
        sidebar={{
          quickActions: [
            {
              label: "Edit Sub Category",
              icon: Pencil,
              onClick: () => router.push(`/masters/subcategories/${record.id}/edit`),
              variant: "primary",
            },
          ],
          summary: [
            { label: "Code", value: record.subCategoryCode, highlight: true },
            { label: "Category", value: record.categoryName },
            { label: "Description", value: record.description || "—" },
            { label: "Created", value: record.createdDate },
            { label: "Updated", value: record.updatedDate },
          ],
        }}
      >
        {renderTabContent()}
      </RecordDetailPage>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
