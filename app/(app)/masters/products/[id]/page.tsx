"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Edit2, Eye, FileText, Link2, Package, UserCheck, UserX } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatMoney, loadProducts, saveProducts, type Product, type ProductStatus } from "../product-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const STATUS_CFG: Record<ProductStatus, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
  draft: { bg: "bg-amber-50", text: "text-amber-700", dot: "bg-amber-500", label: "Draft" },
};

function InfoRow({ label, value, mono }: { label: string; value?: string; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-right text-xs font-medium text-foreground", mono && "font-mono")}>{value ? value : "-"}</span>
    </div>
  );
}

function StatusPill({ status }: { status: ProductStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
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

function MediaSection({ product }: { product: Product }) {
  const [selectedItem, setSelectedItem] = useState<{ src: string; name: string } | null>(null);
  const items = product.assets ?? product.mediaItems ?? [];
  const openExternal = (url?: string) => {
    if (!url) return;
    const trimmedUrl = url.trim();
    const isAbsoluteUrl =
      /^https?:\/\//i.test(trimmedUrl) ||
      /^blob:/i.test(trimmedUrl) ||
      /^data:/i.test(trimmedUrl);
    const safeUrl = isAbsoluteUrl ? trimmedUrl : `https://${trimmedUrl}`;
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  };
  const getUrl = (item: (typeof items)[number]) => item.url ?? item.fileUrl ?? item.previewUrl ?? item.src ?? "";
  const getLabel = (item: (typeof items)[number]) => {
    if (item.type === "link") return "Link";
    switch (item.mediaKind ?? item.fileType?.toLowerCase()) {
      case "video": return "Video";
      case "pdf": return "PDF";
      case "document": return "Document";
      case "spreadsheet": return "Spreadsheet";
      default: return "Image";
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">Uploaded Assets ({items.length})</p>
        <p className="text-[11px] text-muted-foreground">Read-only media, documents, spreadsheets, and links.</p>
      </div>
      {items.length === 0 ? (
        <p className="px-1 py-4 text-sm text-muted-foreground">No assets uploaded.</p>
      ) : (
        <div className="space-y-3">
          {items.map((item) => {
            const url = getUrl(item);
            const isImage = item.type === "media" && (item.mediaKind === "image" || item.kind === "image");
            return (
              <div key={item.id} className="rounded-xl border border-border bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-border bg-muted/20 text-brand-600">
                      {isImage && url ? (
                        <img src={url} alt={item.name} className="h-full w-full object-cover" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{item.title || item.name}</p>
                      <p className="text-[11px] text-muted-foreground truncate">{item.size || item.fileType || item.mediaKind || item.type}</p>
                    </div>
                  </div>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium", item.uploaded ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700")}>
                    {getLabel(item)}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-end gap-2">
                  <Button type="button" variant="outline" className="h-8 px-3 text-[11px]" onClick={() => (item.type === "media" && (item.mediaKind === "image" || item.kind === "image") && url ? setSelectedItem({ src: url, name: item.name }) : openExternal(url))} disabled={!url}>
                    Open
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Dialog open={!!selectedItem} onOpenChange={(open) => !open && setSelectedItem(null)}>
        <DialogContent className="max-w-3xl p-4 bg-white border border-border rounded-xl shadow-lg">
          <DialogHeader className="pb-2 border-b border-border/50">
            <DialogTitle className="text-sm font-semibold text-foreground truncate">{selectedItem?.name}</DialogTitle>
          </DialogHeader>
          <div className="flex items-center justify-center overflow-hidden bg-muted/5 rounded-lg py-4">
            <img src={selectedItem?.src} alt={selectedItem?.name} className="max-h-[70vh] max-w-full object-contain rounded-md" />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ProductDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [records, setRecords] = useState<Product[]>([]);

  useEffect(() => {
    const list = loadProducts();
    setRecords(list);
    setProduct(list.find((item) => item.id === Number(id)) ?? null);
  }, [id]);

  const updateStatus = (status: ProductStatus) => {
    if (!product) return;
    const updated = records.map((item) =>
      item.id === product.id
        ? { ...item, status, updatedBy: "Admin", updatedDate: new Date().toISOString().slice(0, 10) }
        : item,
    );
    setRecords(updated);
    saveProducts(updated);
    setProduct(updated.find((item) => item.id === product.id) ?? null);
  };

  if (!product) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Product not found.</p>
        <Link href="/masters/products" className="text-xs text-brand-600 hover:underline mt-2 inline-block">
          Back to listing
        </Link>
      </div>
    );
  }

  const statusCfg = STATUS_CFG[product.status];

  return (
    <FormContainer
      title={product.productName}
      description={`${product.productId} • ${product.category || "No category"} • ${product.sku || "No SKU"}`}
      onBack={() => router.push("/masters/products")}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status={product.status} />
          <Button
            variant="outline"
            size="sm"
            className="h-9 text-xs font-semibold rounded-lg gap-1.5"
            onClick={() => updateStatus(product.status === "active" ? "inactive" : "active")}
          >
            {product.status === "active" ? <UserX className="w-3.5 h-3.5" /> : <UserCheck className="w-3.5 h-3.5" />}
            {product.status === "active" ? "Deactivate" : "Activate"}
          </Button>
          <Link href={`/masters/products/${product.id}/edit`}>
            <Button size="sm" className="h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          </Link>
        </div>
      }
      noCard={true}
    >
      <div className="max-w-[800px] mx-auto space-y-5">
        {/* Details Cards */}
        <div className="grid grid-cols-2 gap-3">
          <DetailCard title="Product Details">
            <InfoRow label="Product ID" value={product.productId} mono />
            <InfoRow label="Product Name" value={product.productName} />
            <InfoRow label="Category" value={product.category} />
            <InfoRow label="Segment" value={product.segment} />
            <InfoRow label="Formulation" value={product.formulation} />
            <InfoRow label="Base Unit" value={product.baseUnit} />
            <InfoRow label="Packaging Unit" value={product.packagingUnit} />
            <InfoRow label="Conversion Quantity" value={product.conversionQuantity !== undefined ? String(product.conversionQuantity) : undefined} />
          </DetailCard>

          <DetailCard title="Tax & Pricing">
            <InfoRow label="HSN Code" value={product.hsnCode} mono />
            <InfoRow label="GST Rate" value={product.gstRate} />
            <InfoRow label="MRP" value={formatMoney(product.mrp)} />
          </DetailCard>

          <DetailCard title="Commercial & Stock">
            <InfoRow label="SKU" value={product.sku} mono />
            <InfoRow label="Crop Applicable" value={product.cropApplicable} />
            <InfoRow label="Status" value={statusCfg.label} />
          </DetailCard>

          <DetailCard title="Audit Details">
            <InfoRow label="Created By" value={product.createdBy} />
            <InfoRow label="Created Date" value={product.createdDate} />
            <InfoRow label="Updated By" value={product.updatedBy} />
            <InfoRow label="Updated Date" value={product.updatedDate} />
          </DetailCard>
        </div>

        {(product.assets ?? product.mediaItems ?? []).length > 0 && (
          <DetailCard title="Media">
            <MediaSection product={product} />
          </DetailCard>
        )}
      </div>
    </FormContainer>
  );
}

