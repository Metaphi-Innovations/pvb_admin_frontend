"use client";

import React, { useMemo, useState } from "react";
import {
  FolderOpen,
  Folder,
  FileText,
  LayoutGrid,
  List,
  Search,
  Upload,
  Download,
  Share2,
  Eye,
  Calendar,
  User,
  Clock,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Globe,
  Building2,
  Award,
  ScrollText,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SectionShell,
  SectionBlock,
  PreviewFrame,
  DoDont,
  BestPractices,
  TokenUsage,
  AccessibilityNotes,
  ProductionNotes,
  ErpUseCase,
} from "../_components/SectionShell";
import { TplTabs, TplTabsList, TplTabsTrigger, TplTabsContent } from "../_components/TemplateTabs";
import { MOCK_DOCUMENTS } from "../mock/hrms-data";

type ViewMode = "folder" | "grid" | "list";
type DocStatus = "verified" | "pending" | "expired" | "published";

interface Document {
  id: string;
  name: string;
  folder: string;
  owner: string;
  uploadedBy: string;
  status: DocStatus;
  expiry: string;
  version: string;
  size: string;
}

const CATEGORY_TABS = [
  { id: "all", label: "All", icon: FolderOpen },
  { id: "My Documents", label: "My Documents", icon: User },
  { id: "HR Letters", label: "HR Letters", icon: ScrollText },
  { id: "Shared Documents", label: "Shared", icon: Users },
  { id: "Policies", label: "Policies", icon: Building2 },
  { id: "Certificates", label: "Certificates", icon: Award },
  { id: "Government", label: "Government", icon: Globe },
] as const;

const FOLDER_ICONS: Record<string, React.ElementType> = {
  "My Documents": User,
  "HR Letters": ScrollText,
  Policies: Building2,
  Certificates: Award,
  Government: Globe,
};

const STATUS_CFG: Record<
  DocStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  verified: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Verified",
  },
  pending: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-400",
    label: "Pending",
  },
  expired: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
    label: "Expired",
  },
  published: {
    bg: "bg-navy-50",
    text: "text-navy-700",
    dot: "bg-navy-500",
    label: "Published",
  },
};

function StatusChip({ status }: { status: DocStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full font-semibold",
        cfg.bg,
        cfg.text,
      )}
    >
      <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", cfg.dot)} />
      {cfg.label}
    </span>
  );
}

function ExpiryBadge({ expiry, status }: { expiry: string; status: DocStatus }) {
  if (expiry === "—") return null;
  const isExpired = status === "expired";
  const isSoon =
    !isExpired &&
    expiry !== "—" &&
    new Date(expiry) <= new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-[6px]",
        isExpired
          ? "bg-red-50 text-red-700 border border-red-200"
          : isSoon
            ? "bg-amber-50 text-amber-700 border border-amber-200"
            : "bg-muted/40 text-muted-foreground border border-border",
      )}
    >
      <Calendar className="w-3 h-3" />
      {isExpired ? "Expired" : "Expires"} {expiry}
    </span>
  );
}

function filterByCategory(docs: Document[], category: string): Document[] {
  if (category === "all") return docs;
  if (category === "Shared Documents") {
    return docs.filter((d) => d.owner === "All Employees");
  }
  return docs.filter((d) => d.folder === category);
}

function DocumentActions({ compact }: { compact?: boolean }) {
  return (
    <div className={cn("flex items-center gap-1", compact && "opacity-0 group-hover:opacity-100 transition-opacity")}>
      <button
        title="Preview"
        className="p-1.5 rounded-[10px] hover:bg-muted text-muted-foreground hover:text-brand-600 transition-colors"
      >
        <Eye className="w-3.5 h-3.5" />
      </button>
      <button
        title="Download"
        className="p-1.5 rounded-[10px] hover:bg-muted text-muted-foreground hover:text-brand-600 transition-colors"
      >
        <Download className="w-3.5 h-3.5" />
      </button>
      <button
        title="Share"
        className="p-1.5 rounded-[10px] hover:bg-muted text-muted-foreground hover:text-brand-600 transition-colors"
      >
        <Share2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FilePreviewStub({ doc, onClose }: { doc: Document; onClose: () => void }) {
  return (
    <div className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
      <div className="px-3 py-2 border-b border-border bg-muted/20 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
          <p className="text-xs font-semibold text-foreground truncate">{doc.name}</p>
          <StatusChip status={doc.status} />
        </div>
        <button
          onClick={onClose}
          className="p-1 rounded-[10px] hover:bg-muted text-muted-foreground"
          aria-label="Close preview"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
      <div className="p-4 space-y-3">
        <div className="aspect-[4/3] rounded-[12px] border border-border bg-muted/20 flex flex-col items-center justify-center gap-2">
          <div className="w-12 h-12 rounded-[12px] bg-brand-50 border border-brand-100 flex items-center justify-center">
            <FileText className="w-6 h-6 text-brand-600" />
          </div>
          <p className="text-xs font-medium text-foreground">PDF preview stub</p>
          <p className="text-[11px] text-muted-foreground">{doc.size} · {doc.version}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 text-[11px]">
          <div className="rounded-[10px] border border-border px-2.5 py-2">
            <span className="text-muted-foreground">Owner</span>
            <p className="font-medium text-foreground mt-0.5">{doc.owner}</p>
          </div>
          <div className="rounded-[10px] border border-border px-2.5 py-2">
            <span className="text-muted-foreground">Uploaded by</span>
            <p className="font-medium text-foreground mt-0.5">{doc.uploadedBy}</p>
          </div>
          <div className="rounded-[10px] border border-border px-2.5 py-2">
            <span className="text-muted-foreground">Version</span>
            <p className="font-mono font-semibold text-brand-700 mt-0.5">{doc.version}</p>
          </div>
          <div className="rounded-[10px] border border-border px-2.5 py-2">
            <span className="text-muted-foreground">Expiry</span>
            <p className="font-medium text-foreground mt-0.5">{doc.expiry}</p>
          </div>
        </div>
        <div className="flex gap-2 pt-1">
          <button className="h-8 px-3 text-xs rounded-[10px] border border-border font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
            <Download className="w-3.5 h-3.5" /> Download
          </button>
          <button className="h-8 px-3 text-xs rounded-[10px] border border-border font-medium inline-flex items-center gap-1.5 hover:bg-muted/40">
            <Share2 className="w-3.5 h-3.5" /> Share
          </button>
          {doc.status === "pending" && (
            <button className="h-8 px-3 text-xs rounded-[10px] bg-brand-600 text-white font-medium inline-flex items-center gap-1.5 hover:bg-brand-700 ml-auto">
              <ShieldCheck className="w-3.5 h-3.5" /> Verify
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function FolderView({
  docs,
  selectedId,
  onSelect,
}: {
  docs: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const grouped = useMemo(() => {
    const map = new Map<string, Document[]>();
    docs.forEach((d) => {
      const list = map.get(d.folder) ?? [];
      list.push(d);
      map.set(d.folder, list);
    });
    return Array.from(map.entries());
  }, [docs]);

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {grouped.map(([folder, items]) => {
        const Icon = FOLDER_ICONS[folder] ?? Folder;
        const hasExpired = items.some((d) => d.status === "expired");
        const hasPending = items.some((d) => d.status === "pending");
        return (
          <div key={folder} className="rounded-[14px] border border-border bg-white shadow-sm overflow-hidden">
            <div className="px-3 py-2.5 border-b border-border bg-muted/20 flex items-center gap-2">
              <div className="w-8 h-8 rounded-[10px] bg-brand-50 border border-brand-100 flex items-center justify-center shrink-0">
                <Icon className="w-4 h-4 text-brand-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-navy-700 truncate">{folder}</p>
                <p className="text-[10px] text-muted-foreground">{items.length} files</p>
              </div>
              {hasExpired && <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />}
              {!hasExpired && hasPending && <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />}
            </div>
            <div className="p-2 space-y-0.5 max-h-[140px] overflow-y-auto">
              {items.map((doc) => (
                <button
                  key={doc.id}
                  onClick={() => onSelect(doc.id)}
                  className={cn(
                    "w-full flex items-center gap-2 px-2 py-1.5 rounded-[10px] text-left transition-colors group",
                    selectedId === doc.id ? "bg-brand-50" : "hover:bg-muted/30",
                  )}
                >
                  <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-[11px] font-medium text-foreground truncate flex-1">{doc.name}</span>
                  <StatusChip status={doc.status} />
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function GridView({
  docs,
  selectedId,
  onSelect,
}: {
  docs: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {docs.map((doc) => (
        <button
          key={doc.id}
          onClick={() => onSelect(doc.id)}
          className={cn(
            "rounded-[14px] border border-border bg-white p-3 text-left shadow-sm transition-colors group",
            selectedId === doc.id ? "border-brand-400 bg-brand-50/40" : "hover:bg-muted/20",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="w-9 h-9 rounded-[10px] bg-navy-50 border border-navy-100 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4 text-navy-600" />
            </div>
            <DocumentActions compact />
          </div>
          <p className="text-xs font-semibold text-foreground mt-2 truncate">{doc.name}</p>
          <p className="text-[10px] text-muted-foreground mt-0.5">{doc.folder} · {doc.size}</p>
          <div className="flex flex-wrap items-center gap-1.5 mt-2">
            <StatusChip status={doc.status} />
            <ExpiryBadge expiry={doc.expiry} status={doc.status} />
          </div>
          <div className="mt-2 pt-2 border-t border-border/60 grid grid-cols-2 gap-1 text-[10px]">
            <div>
              <span className="text-muted-foreground">Owner</span>
              <p className="font-medium text-foreground truncate">{doc.owner}</p>
            </div>
            <div>
              <span className="text-muted-foreground">By</span>
              <p className="font-medium text-foreground truncate">{doc.uploadedBy}</p>
            </div>
          </div>
        </button>
      ))}
    </div>
  );
}

function ListView({
  docs,
  selectedId,
  onSelect,
}: {
  docs: Document[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="rounded-[12px] border border-border bg-white shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {["Document", "Folder", "Owner", "Uploaded by", "Status", "Expiry", "Version", ""].map((h) => (
                <th
                  key={h || "actions"}
                  className="px-3 py-2 text-left text-[11px] font-semibold text-foreground whitespace-nowrap"
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {docs.map((doc) => (
              <tr
                key={doc.id}
                onClick={() => onSelect(doc.id)}
                className={cn(
                  "border-b border-border/60 hover:bg-muted/20 transition-colors group cursor-pointer",
                  selectedId === doc.id && "bg-brand-50/60",
                )}
              >
                <td className="px-3 py-2">
                  <div className="flex items-center gap-2 min-w-[160px]">
                    <FileText className="w-3.5 h-3.5 text-brand-600 shrink-0" />
                    <span className="text-xs font-semibold text-foreground truncate">{doc.name}</span>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-0.5 pl-5">{doc.size}</p>
                </td>
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{doc.folder}</td>
                <td className="px-3 py-2 text-xs text-foreground whitespace-nowrap">{doc.owner}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground whitespace-nowrap">{doc.uploadedBy}</td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <StatusChip status={doc.status} />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {doc.expiry === "—" ? (
                    <span className="text-[11px] text-muted-foreground">—</span>
                  ) : (
                    <ExpiryBadge expiry={doc.expiry} status={doc.status} />
                  )}
                </td>
                <td className="px-3 py-2 font-mono text-xs font-semibold text-brand-700 whitespace-nowrap">
                  {doc.version}
                </td>
                <td className="px-3 py-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                  <DocumentActions compact />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-3 py-2 border-t border-border bg-muted/20">
        <p className="text-[11px] text-muted-foreground">
          Showing <span className="font-medium text-foreground">{docs.length}</span> documents
        </p>
      </div>
    </div>
  );
}

function DocumentCenterDemo() {
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_DOCUMENTS[0]?.id ?? null);

  const docs = MOCK_DOCUMENTS as Document[];

  const filtered = useMemo(() => {
    let result = filterByCategory(docs, category);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.folder.toLowerCase().includes(q) ||
          d.owner.toLowerCase().includes(q),
      );
    }
    return result;
  }, [docs, category, search]);

  const selected = docs.find((d) => d.id === selectedId) ?? null;

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: docs.length };
    CATEGORY_TABS.slice(1).forEach((tab) => {
      c[tab.id] = filterByCategory(docs, tab.id).length;
    });
    return c;
  }, [docs]);

  const kpi = useMemo(() => ({
    total: docs.length,
    verified: docs.filter((d) => d.status === "verified").length,
    pending: docs.filter((d) => d.status === "pending").length,
    expiring: docs.filter((d) => d.expiry !== "—" && d.status !== "expired").length,
  }), [docs]);

  return (
    <div className="space-y-3">
      {/* KPI strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Total documents", value: kpi.total, icon: FolderOpen, accent: true },
          { label: "Verified", value: kpi.verified, icon: CheckCircle2, accent: false },
          { label: "Pending review", value: kpi.pending, icon: Clock, accent: false },
          { label: "With expiry", value: kpi.expiring, icon: Calendar, accent: false },
        ].map((k) => {
          const Icon = k.icon;
          return (
            <div
              key={k.label}
              className="rounded-[14px] border border-border bg-white p-3 flex items-center gap-3 shadow-sm"
            >
              <div
                className={cn(
                  "w-9 h-9 rounded-[10px] flex items-center justify-center shrink-0",
                  k.accent ? "bg-brand-600" : "bg-muted",
                )}
              >
                <Icon className={cn("w-4 h-4", k.accent ? "text-white" : "text-muted-foreground")} />
              </div>
              <div className="min-w-0">
                <p className="text-lg font-bold text-foreground leading-none">{k.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{k.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Toolbar */}
      <div className="rounded-[14px] border border-border bg-white p-3 shadow-sm space-y-2.5">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search documents…"
              className="w-full h-8 pl-8 pr-3 text-xs border border-border rounded-[10px] bg-muted/20 focus:outline-none focus:ring-1 focus:ring-brand-400"
            />
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-[10px] border border-border bg-muted/20">
            {(
              [
                { id: "folder" as const, icon: Folder, label: "Folders" },
                { id: "grid" as const, icon: LayoutGrid, label: "Grid" },
                { id: "list" as const, icon: List, label: "List" },
              ] as const
            ).map((v) => {
              const Icon = v.icon;
              return (
                <button
                  key={v.id}
                  onClick={() => setViewMode(v.id)}
                  className={cn(
                    "h-7 px-2.5 text-[11px] rounded-[10px] font-medium inline-flex items-center gap-1.5 transition-colors",
                    viewMode === v.id
                      ? "bg-brand-600 text-white"
                      : "text-muted-foreground hover:bg-muted/60",
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {v.label}
                </button>
              );
            })}
          </div>

          <button className="h-8 px-3 text-xs rounded-[10px] bg-brand-600 hover:bg-brand-700 text-white font-medium inline-flex items-center gap-1.5 ml-auto">
            <Upload className="w-3.5 h-3.5" /> Upload
          </button>
        </div>

        {/* Category tabs */}
        <TplTabs value={category} onValueChange={setCategory}>
          <TplTabsList variant="pill" className="w-full flex-wrap">
            {CATEGORY_TABS.map((tab) => {
              const Icon = tab.icon;
              const count = counts[tab.id] ?? 0;
              return (
                <TplTabsTrigger key={tab.id} value={tab.id} variant="pill" count={count}>
                  <Icon className="w-3.5 h-3.5" />
                  {tab.label}
                </TplTabsTrigger>
              );
            })}
          </TplTabsList>

          {CATEGORY_TABS.map((tab) => (
            <TplTabsContent key={tab.id} value={tab.id} className="mt-3">
              {filtered.length === 0 ? (
                <div className="py-10 text-center rounded-[14px] border border-dashed border-border bg-muted/10">
                  <FolderOpen className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                  <p className="text-sm font-medium text-foreground">No documents in this category</p>
                  <p className="text-[11px] text-muted-foreground mt-1">Try another tab or clear your search.</p>
                </div>
              ) : (
                <div className="flex gap-3">
                  <div className={cn("min-w-0", selected ? "flex-1" : "w-full")}>
                    {viewMode === "folder" && (
                      <FolderView docs={filtered} selectedId={selectedId} onSelect={setSelectedId} />
                    )}
                    {viewMode === "grid" && (
                      <GridView docs={filtered} selectedId={selectedId} onSelect={setSelectedId} />
                    )}
                    {viewMode === "list" && (
                      <ListView docs={filtered} selectedId={selectedId} onSelect={setSelectedId} />
                    )}
                  </div>
                  {selected && filtered.some((d) => d.id === selected.id) && (
                    <div className="w-64 shrink-0 hidden lg:block">
                      <FilePreviewStub doc={selected} onClose={() => setSelectedId(null)} />
                    </div>
                  )}
                </div>
              )}
            </TplTabsContent>
          ))}
        </TplTabs>
      </div>

      {/* Mobile preview hint */}
      {selected && (
        <div className="lg:hidden">
          <FilePreviewStub doc={selected} onClose={() => setSelectedId(null)} />
        </div>
      )}
    </div>
  );
}

export default function DocumentCenterSection() {
  return (
    <SectionShell overview="Document Center is the HRMS file hub for employee and org documents: My Documents (personal uploads), HR Letters (offer, appointment, experience), Shared Documents (company-wide), Policies (leave, conduct, safety), Certificates (Form 16, training), and Government Documents (Aadhaar, PAN, passport). Supports folder, grid, and list layouts with verification status, expiry tracking, version history, and download/share actions.">
      <SectionBlock
        title="Interactive demo"
        subtitle="Toggle folder / grid / list views · category tabs · status chips · expiry · preview panel"
      >
        <PreviewFrame title="HR Document Center">
          <DocumentCenterDemo />
        </PreviewFrame>
      </SectionBlock>

      <SectionBlock title="View variants" subtitle="Three layout modes for the same document set">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          {[
            {
              mode: "Folder view",
              desc: "Group by category folder. Best for HR admins browsing employee dossiers.",
              icon: Folder,
            },
            {
              mode: "Grid view",
              desc: "Card tiles with status, expiry, owner. Default for employee self-service.",
              icon: LayoutGrid,
            },
            {
              mode: "List view",
              desc: "Dense table with sortable columns. Best for bulk review and compliance audits.",
              icon: List,
            },
          ].map((v) => {
            const Icon = v.icon;
            return (
              <div key={v.mode} className="rounded-[14px] border border-border bg-white p-3 shadow-sm">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-[10px] bg-brand-50 border border-brand-100 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-brand-600" />
                  </div>
                  <p className="text-xs font-semibold text-navy-700">{v.mode}</p>
                </div>
                <p className="text-[11px] text-muted-foreground leading-relaxed">{v.desc}</p>
              </div>
            );
          })}
        </div>
      </SectionBlock>

      <SectionBlock title="Verification & expiry" subtitle="Status chips and expiry badges used across all views">
        <div className="flex flex-wrap gap-2">
          {(Object.keys(STATUS_CFG) as DocStatus[]).map((s) => (
            <StatusChip key={s} status={s} />
          ))}
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          <ExpiryBadge expiry="2027-03-31" status="published" />
          <ExpiryBadge expiry="2026-06-15" status="verified" />
          <ExpiryBadge expiry="2026-01-15" status="expired" />
        </div>
      </SectionBlock>

      <ErpUseCase
        title="Purchase order attachments & invoice documents"
        description="The same Document Center pattern applies to ERP transactional attachments: PO supporting docs, GRN photos, vendor KYC, sales invoice PDFs, and credit/debit note evidence. Use folder grouping by transaction type, list view for finance audit, verification workflow for compliance docs, and version tracking when invoices are revised."
      />

      <BestPractices
        items={[
          "Default to grid view for employees; list view for HR/compliance reviewers.",
          "Show verification status prominently — pending docs block payroll or onboarding gates.",
          "Surface expiry dates 90 days ahead with amber warning; red for expired.",
          "Always display owner, uploaded-by, version, and upload date in preview panel.",
          "Keep download/share actions consistent across folder, grid, and list layouts.",
          "Group shared policies separately from personal employee documents.",
        ]}
      />

      <DoDont
        dos={[
          "Use status chips with dot indicators for verified / pending / expired / published",
          "Provide folder, grid, and list toggles without losing filter state",
          "Show inline file preview or side panel before download",
          "Track document version in mono brand-700 code style",
        ]}
        donts={[
          "Don't mix personal and company-wide docs in one flat list without category tabs",
          "Don't hide expiry dates — compliance docs must show renewal cues",
          "Don't use consumer-style large card padding — keep compact ERP density",
          "Don't allow share without permission check in production",
        ]}
      />

      <TokenUsage
        tokens={[
          { token: "rounded-[14px]", use: "Document cards, preview panel, KPI strip containers" },
          { token: "rounded-[12px]", use: "List/table container, preview canvas area" },
          { token: "rounded-[10px]", use: "View toggle buttons, category pill tabs, action buttons" },
          { token: "bg-brand-600", use: "Primary upload CTA, active view toggle" },
          { token: "bg-brand-50 text-brand-700", use: "Selected document row / active category tab" },
          { token: "text-navy-700", use: "Folder names, section headings" },
          { token: "bg-emerald-50 text-emerald-700", use: "Verified status chip" },
          { token: "bg-navy-50 text-navy-700", use: "Published policy status chip" },
        ]}
      />

      <AccessibilityNotes
        items={[
          "View toggle buttons need aria-pressed state and descriptive labels (Folders, Grid, List).",
          "Category tabs should use TplTabs with keyboard arrow navigation.",
          "Preview panel close button requires aria-label; trap focus when opened as modal on mobile.",
          "Status chips should include visible text — do not rely on color alone.",
          "Table list view must preserve horizontal scroll with sticky first column in production.",
        ]}
      />

      <ProductionNotes
        items={[
          "Template mock only — wire to document storage API (S3/Azure Blob) with signed URLs in production.",
          "Verification workflow requires backend approval queue; do not client-side only.",
          "Expiry alerts should run as scheduled jobs, not only on page load.",
          "Share links must be time-limited and permission-scoped per document owner.",
          "Existing ERP attachment flows remain unchanged until a dedicated redesign task.",
        ]}
      />
    </SectionShell>
  );
}
