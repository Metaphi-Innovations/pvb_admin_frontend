"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ArrowLeft, Edit2, Tag, CheckCircle2, X } from "lucide-react";
import { loadSubCategories, saveSubCategories, type SubCategory, type SubCategoryStatus, todayStr } from "../subcategory-data";

const STATUS_CFG: Record<SubCategoryStatus, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
};

function StatusPill({ status }: { status: SubCategoryStatus }) {
  const st = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", st.bg, st.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
      {st.label}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">{value ? value : "-"}</span>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div>{children}</div>
    </div>
  );
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn("fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium", toast.type === "success" ? "bg-emerald-600" : "bg-red-600")}>
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
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Sub Category not found.</p>
        </div>
      </AppLayout>
    );
  }

  const toggleStatus = () => {
    const nextStatus: SubCategoryStatus = record.status === "active" ? "inactive" : "active";
    const updated = records.map((item) =>
      item.id === record.id ? { ...item, status: nextStatus, updatedBy: "Admin", updatedDate: todayStr() } : item,
    );
    setRecords(updated);
    saveSubCategories(updated);
    setRecord(updated.find((item) => item.id === record.id) ?? null);
    setToast({ msg: `Sub Category status updated to ${nextStatus === "active" ? "Active" : "Inactive"}`, type: "success" });
  };

  return (
    <AppLayout>
      <div className="mx-auto max-w-[800px] space-y-5">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="sm" className="h-8 px-2 -ml-2" onClick={() => router.push("/masters/subcategories")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-brand-100 bg-brand-50">
                <Tag className="h-5 w-5 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{record.subCategoryName}</h1>
                <p className="mt-0.5 text-xs text-muted-foreground">{record.subCategoryCode}</p>
              </div>
              <StatusPill status={record.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs" onClick={toggleStatus}>
              {record.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Link href={`/masters/subcategories/${record.id}/edit`}>
              <Button size="sm" className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700">
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <DetailCard title="Basic Details">
            <InfoRow label="Sub Category Code" value={record.subCategoryCode} />
            <InfoRow label="Sub Category Name" value={record.subCategoryName} />
            <InfoRow label="Category" value={record.categoryName} />
            <InfoRow label="Description" value={record.description} />
            <InfoRow label="Status" value={<StatusPill status={record.status} />} />
          </DetailCard>
        </div>
      </div>
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}

