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
import { loadCategories, saveCategories, type Category, type CategoryStatus, todayStr } from "../category-data";

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

export default function CategoryDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [category, setCategory] = useState<Category | null>(null);
  const [records, setRecords] = useState<Category[]>([]);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const items = loadCategories();
    setRecords(items);
    setCategory(items.find((item) => item.id === Number(id)) ?? null);
  }, [id]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  if (!category) {
    return (
      <RecordDetailPage
        listHref="/masters/categories"
        listLabel="Categories"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Category not found.</p>
          <Link href="/masters/categories" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const toggleStatus = (on: boolean) => {
    const nextStatus: CategoryStatus = on ? "active" : "inactive";
    const updated = records.map((item) =>
      item.id === category.id
        ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() }
        : item,
    );
    setRecords(updated);
    saveCategories(updated);
    setCategory(updated.find((item) => item.id === category.id) ?? null);
    setToast({
      msg: `Category status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`,
      type: "success",
    });
  };

  const tabs = [{ value: "overview", label: "Overview" }];

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Basic Details" icon={Tag} accent="blue">
          <RecordKvRow label="Category Name" value={category.categoryName} highlight />
          <RecordKvRow label="Description" value={category.description} />
          <RecordKvRow
            label="Status"
            value={
              <RecordStatusPill
                label={category.status === "active" ? "Active" : "Inactive"}
                variant={category.status}
              />
            }
            isLast
          />
        </RecordSectionCard>

        <RecordSectionCard title="Audit Details" icon={Clock} accent="slate">
          <RecordKvRow label="Created By" value={category.createdBy} />
          <RecordKvRow label="Created Date" value={category.createdDate} />
          <RecordKvRow label="Updated By" value={category.updatedBy} />
          <RecordKvRow label="Updated Date" value={category.updatedDate} isLast />
        </RecordSectionCard>
      </div>
    );
  };

  return (
    <>
      <RecordDetailPage
        listHref="/masters/categories"
        listLabel="Categories"
        recordName={category.categoryName}
        recordCode={String(category.id)}
        statusLabel={category.status === "active" ? "Active" : "Inactive"}
        statusVariant={category.status}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        active={category.status === "active"}
        onActiveChange={toggleStatus}
        onEdit={() => router.push(`/masters/categories/${category.id}/edit`)}
        sidebar={{
          quickActions: [
            {
              label: "Edit Category",
              icon: Pencil,
              onClick: () => router.push(`/masters/categories/${category.id}/edit`),
              variant: "primary",
            },
          ],
          summary: [
            { label: "ID", value: String(category.id), highlight: true },
            { label: "Description", value: category.description || "—" },
            { label: "Created", value: category.createdDate },
            { label: "Updated", value: category.updatedDate },
          ],
        }}
      >
        {renderTabContent()}
      </RecordDetailPage>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </>
  );
}
