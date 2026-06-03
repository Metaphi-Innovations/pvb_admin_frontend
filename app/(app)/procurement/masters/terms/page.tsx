"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Plus, FileText, Search, Edit2, Eye } from "lucide-react";
import { KpiCard, StatusPill, Toast } from "../../components/ProcurementUI";
import TermSheet, { type TermFormState } from "./components/TermSheet";
import {
  type TermsMaster,
  loadTermsMasters,
  saveTermsMasters,
  nextId,
  todayStr,
  APPLICABLE_TO_LABELS,
} from "./terms-data";
import { CURRENT_USER } from "@/lib/procurement/config";
import { cn } from "@/lib/utils";

const STATUS_CFG = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
};

export default function TermsMasterPage() {
  const [records, setRecords] = useState<TermsMaster[]>([]);
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<TermsMaster | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  useEffect(() => setRecords(loadTermsMasters()), []);

  const visible = useMemo(() => {
    if (!search.trim()) return records;
    const q = search.toLowerCase();
    return records.filter((t) => t.termTitle.toLowerCase().includes(q) || t.termContent.toLowerCase().includes(q));
  }, [records, search]);

  const onSave = (form: TermFormState) => {
    const today = todayStr();
    const list = loadTermsMasters();
    if (editTarget) {
      saveTermsMasters(
        list.map((t) =>
          t.id === editTarget.id ? { ...t, ...form, updatedBy: CURRENT_USER, updatedDate: today } : t,
        ),
      );
    } else {
      saveTermsMasters([
        ...list,
        {
          id: nextId(list),
          ...form,
          createdBy: CURRENT_USER,
          createdDate: today,
          updatedBy: CURRENT_USER,
          updatedDate: today,
        },
      ]);
    }
    setRecords(loadTermsMasters());
    setSheetOpen(false);
    setEditTarget(null);
    setToast({ msg: "Term saved.", type: "success" });
  };

  return (
    <AppLayout>
      <PageShell className="max-w-none space-y-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[11px] text-muted-foreground">Procurement → Masters</p>
            <h1 className="text-xl font-bold">Terms & Conditions Master</h1>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={() => { setEditTarget(null); setSheetOpen(true); }}>
            <Plus className="w-3.5 h-3.5" /> Add Term
          </Button>
        </div>
        <div className="grid grid-cols-3 gap-3 max-w-xl">
          <KpiCard label="Total Terms" value={records.length} icon={FileText} accent />
          <KpiCard label="Default Terms" value={records.filter((t) => t.defaultTerm).length} icon={FileText} />
        </div>
        <div className="relative max-w-sm">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-[9px] text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search terms…" className="pl-8 h-8 text-xs" />
        </div>
        <div className="border border-border rounded-xl bg-white overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="bg-muted/40 border-b border-border">
                <th className="px-4 py-3 text-left text-xs font-semibold">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Applicable To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Default</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Created By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold">Updated By</th>
                <th className="px-4 py-3 w-20" />
              </tr>
            </thead>
            <tbody>
              {visible.map((t) => (
                <tr key={t.id} className="border-b border-border/60 hover:bg-muted/20">
                  <td className="px-4 py-3">
                    <p className="text-xs font-semibold">{t.termTitle}</p>
                    <p className="text-[11px] text-muted-foreground line-clamp-1 mt-0.5">{t.termContent}</p>
                  </td>
                  <td className="px-4 py-2 text-xs">{APPLICABLE_TO_LABELS[t.applicableTo]}</td>
                  <td className="px-4 py-2">{t.defaultTerm ? <span className="text-[10px] bg-brand-50 text-brand-700 px-2 py-0.5 rounded-full font-medium">Default</span> : "—"}</td>
                  <td className="px-4 py-2"><StatusPill status={t.status} config={STATUS_CFG} /></td>
                  <td className="px-4 py-2 text-[11px] text-muted-foreground">{t.createdBy}</td>
                  <td className="px-4 py-2 text-[11px] text-muted-foreground">{t.updatedBy}</td>
                  <td className="px-4 py-2">
                    <button type="button" className="p-1 hover:bg-muted rounded" onClick={() => { setEditTarget(t); setSheetOpen(true); }}><Edit2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </PageShell>
      <TermSheet open={sheetOpen} onClose={() => { setSheetOpen(false); setEditTarget(null); }} onSave={onSave} term={editTarget} />
      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </AppLayout>
  );
}
