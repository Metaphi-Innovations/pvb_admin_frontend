"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordStatusPill,
} from "@/components/record-detail";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Clock, Download, Eye, ExternalLink, MapPin, Pencil, Phone, User, Warehouse, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useWarehouse } from "@/hooks/masters";
import {
  downloadWarehouseDocument,
  getWarehouseDocumentPreviewUrl,
  isWarehouseDocumentLink,
  isWarehouseImageDocument,
  type WarehouseDocumentPayload,
  type WarehouseListRecord,
} from "@/services/warehouse-list.service";

function formatStatus(status: string): string {
  if (status === "Under Maintenance" || status === "under_maintenance") return "Under Maintenance";
  if (status === "Closed" || status === "closed") return "Closed";
  if (status === "Active" || status === "active") return "Active";
  if (status === "Inactive" || status === "inactive") return "Inactive";
  return status;
}

const STATUS_VARIANT: Record<string, "active" | "inactive" | "neutral" | "blocked"> = {
  Active: "active",
  active: "active",
  Inactive: "inactive",
  inactive: "inactive",
  "Under Maintenance": "neutral",
  under_maintenance: "neutral",
  Closed: "blocked",
  closed: "blocked",
};

function formatDocumentDate(value?: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value.slice(0, 10) || "—";
  return parsed.toLocaleDateString();
}

function WarehouseDocumentsSection({
  documents,
}: {
  documents: WarehouseDocumentPayload[];
}) {
  const [previewDoc, setPreviewDoc] = useState<WarehouseDocumentPayload | null>(null);
  const [downloadingKey, setDownloadingKey] = useState<string | null>(null);
  const [downloadError, setDownloadError] = useState<string | null>(null);

  const fileDocuments = documents.filter((doc) => !isWarehouseDocumentLink(doc));
  const linkDocuments = documents.filter((doc) => isWarehouseDocumentLink(doc));

  const getDocumentKey = (doc: WarehouseDocumentPayload) =>
    doc.warehouse_document_id || `${doc.document_name}-${doc.file_name}`;

  const handleDownload = async (doc: WarehouseDocumentPayload) => {
    const docKey = getDocumentKey(doc);
    setDownloadError(null);
    setDownloadingKey(docKey);
    try {
      await downloadWarehouseDocument(doc);
    } catch {
      setDownloadError("Failed to download document. Please try again.");
    } finally {
      setDownloadingKey(null);
    }
  };

  const openDocument = (doc: WarehouseDocumentPayload) => {
    const url = getWarehouseDocumentPreviewUrl(doc);
    if (!url) return;
    if (isWarehouseImageDocument(doc)) {
      setPreviewDoc(doc);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="space-y-4">
      {downloadError && (
        <p className="text-xs text-red-600">{downloadError}</p>
      )}
      <RecordSectionCard title="Uploaded Documents" icon={FileText} accent="purple">
        {fileDocuments.length === 0 ? (
          <p className="py-4 text-sm text-muted-foreground">No documents uploaded.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border border-border">
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-border bg-muted/40">
                    <th className="px-3 py-2 text-left font-semibold">Document Type</th>
                    <th className="px-3 py-2 text-left font-semibold">File Name</th>
                    <th className="px-3 py-2 text-left font-semibold">Uploaded On</th>
                    <th className="px-3 py-2 text-left font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {fileDocuments.map((doc) => {
                    const previewUrl = getWarehouseDocumentPreviewUrl(doc);
                    const isImage = isWarehouseImageDocument(doc);
                    const docKey = getDocumentKey(doc);
                    const isDownloading = downloadingKey === docKey;

                    return (
                      <tr
                        key={docKey}
                        className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                      >
                        <td className="px-3 py-2">{doc.document_name || "—"}</td>
                        <td className="px-3 py-2 font-mono">{doc.file_name || "—"}</td>
                        <td className="px-3 py-2 text-muted-foreground">
                          {formatDocumentDate(doc.created_at)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            {previewUrl ? (
                              <>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[10px]"
                                  onClick={() => openDocument(doc)}
                                >
                                  <Eye className="mr-1 w-3 h-3" />
                                  {isImage ? "View" : "Open"}
                                </Button>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-[10px] font-medium text-brand-700 hover:text-brand-800"
                                  disabled={isDownloading}
                                  onClick={() => handleDownload(doc)}
                                >
                                  <Download className="mr-1 w-3 h-3" />
                                  {isDownloading ? "Downloading..." : "Download"}
                                </Button>
                              </>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </RecordSectionCard>

      {linkDocuments.length > 0 && (
        <RecordSectionCard title="Document Links" icon={ExternalLink} accent="blue">
          <div className="overflow-hidden rounded-lg border border-border/60">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b bg-muted/30">
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">
                    Document Type
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold text-muted-foreground">
                    URL
                  </th>
                  <th className="w-16 px-2 py-1.5 text-center text-[10px] font-semibold text-muted-foreground">
                    Open
                  </th>
                </tr>
              </thead>
              <tbody>
                {linkDocuments.map((doc) => {
                  const url = getWarehouseDocumentPreviewUrl(doc);
                  const docKey = doc.warehouse_document_id || `${doc.document_name}-${url}`;

                  return (
                    <tr key={docKey} className="border-b border-border/40 last:border-0">
                      <td className="px-2 py-2">{doc.document_name || "—"}</td>
                      <td className="max-w-md truncate px-2 py-2" title={url}>
                        {url}
                      </td>
                      <td className="px-2 py-2 text-center">
                        {url ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7"
                            onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </RecordSectionCard>
      )}

      {fileDocuments.some((doc) => isWarehouseImageDocument(doc) && getWarehouseDocumentPreviewUrl(doc)) && (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-foreground">Image Preview</p>
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4">
            {fileDocuments
              .filter((doc) => isWarehouseImageDocument(doc) && getWarehouseDocumentPreviewUrl(doc))
              .map((doc) => {
                const previewUrl = getWarehouseDocumentPreviewUrl(doc);
                const docKey = doc.warehouse_document_id || `${doc.document_name}-${doc.file_name}`;

                return (
                  <div
                    key={docKey}
                    className="flex flex-col overflow-hidden border rounded-lg border-border/60 bg-white"
                  >
                    <button
                      type="button"
                      className="relative h-[88px] w-full bg-muted/20"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      <img
                        src={previewUrl}
                        alt={doc.file_name || doc.document_name}
                        className="object-cover w-full h-full"
                        crossOrigin="anonymous"
                      />
                    </button>
                    <div className="px-2 py-1.5 border-t border-border/40">
                      <p className="truncate text-[10px] font-medium text-foreground">
                        {doc.document_name}
                      </p>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-3xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm truncate">
              {previewDoc?.document_name || previewDoc?.file_name || "Document Preview"}
            </DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <img
              src={getWarehouseDocumentPreviewUrl(previewDoc)}
              alt={previewDoc.file_name || previewDoc.document_name}
              className="max-h-[70vh] w-full object-contain"
              crossOrigin="anonymous"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function WarehouseDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: warehouse, isLoading, isError } = useWarehouse(id);

  const documentCount = warehouse?.documents?.length ?? 0;

  const tabs = useMemo(
    () => [
      { value: "overview", label: "Overview" },
      {
        value: "documents",
        label: "Documents",
        count: documentCount || undefined,
      },
    ],
    [documentCount],
  );

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading warehouse details...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !warehouse) {
    return (
      <RecordDetailPage
        listHref="/masters/warehouse"
        listLabel="Warehouses"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Warehouse not found.</p>
          <Link href="/masters/warehouse" className="inline-block mt-2 text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const primaryContact = warehouse.contacts?.[0];
  const designation = primaryContact?.designation?.trim() || "—";

  const kpis = [
    {
      icon: Warehouse,
      iconBg: "#EEF3FB",
      iconColor: "#0C3F8A",
      value: warehouse.operatedBy || "—",
      label: "Operated By",
    },
    {
      icon: MapPin,
      iconBg: "#E6F7EF",
      iconColor: "#1E9E61",
      value: warehouse.city || "—",
      label: "City",
    },
    {
      icon: User,
      iconBg: "#FFFBEB",
      iconColor: "#D97706",
      value: designation,
      label: "Designation",
    },
  ];

  const renderOverview = (record: WarehouseListRecord) => (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <RecordSectionCard title="Basic Details" icon={Warehouse} accent="blue">
        <RecordKvRow label="Warehouse Name" value={record.warehouseName} highlight />
        <RecordKvRow label="Operated By" value={record.operatedBy || "—"} />
        <RecordKvRow
          label="Status"
          value={
            <RecordStatusPill
              label={formatStatus(record.status)}
              variant={STATUS_VARIANT[record.status] ?? "neutral"}
            />
          }
          isLast
        />
      </RecordSectionCard>

      <RecordSectionCard title="Contact Persons" icon={Phone} accent="green">
        {record.contacts && record.contacts.length > 0 ? (
          record.contacts.map((c, idx) => (
            <React.Fragment key={idx}>
              <RecordKvRow
                label={c.is_primary ? "Primary Contact" : `Contact ${idx + 1}`}
                value={c.contact_person || "—"}
                highlight
              />
              {c.designation && <RecordKvRow label="Designation" value={c.designation} />}
              <RecordKvRow
                label="Mobile"
                value={c.mobile_number}
                mono
                link
                href={c.mobile_number ? `tel:${c.mobile_number}` : undefined}
              />
              {c.alternate_contact && (
                <RecordKvRow
                  label="Alternate Contact"
                  value={c.alternate_contact}
                  mono
                  link
                  href={`tel:${c.alternate_contact}`}
                />
              )}
              <RecordKvRow
                label="Email"
                value={c.email_address || "—"}
                link={!!c.email_address}
                href={c.email_address ? `mailto:${c.email_address}` : undefined}
                isLast={idx === (record.contacts?.length ?? 1) - 1}
              />
            </React.Fragment>
          ))
        ) : (
          <RecordKvRow label="No contacts" value="—" isLast />
        )}
      </RecordSectionCard>

      <RecordSectionCard title="Address Details" icon={MapPin} accent="purple">
        <RecordKvRow label="Address Line 1" value={record.address || "—"} />
        {record.address1 && <RecordKvRow label="Address Line 2" value={record.address1} />}
        <RecordKvRow label="Pin Code" value={record.pincode} mono />
        <RecordKvRow label="District" value={record.district || "—"} />
        <RecordKvRow label="City" value={record.city || "—"} />
        <RecordKvRow label="Town" value={record.town || "—"} />
        <RecordKvRow label="State" value={record.state || "—"} isLast />
      </RecordSectionCard>

      <RecordSectionCard title="GST & Tax Details" icon={FileText} accent="orange">
        <RecordKvRow
          label="GST Applicable"
          value={record.gstApplicable ? "Yes" : "No"}
          isLast={!record.gstApplicable}
        />
        {record.gstApplicable && (
          <>
            <RecordKvRow label="Registration Type" value={record.registrationType || "—"} />
            <RecordKvRow label="GSTIN" value={record.gstNumber} mono copy />
            <RecordKvRow label="Registered Legal Name" value={record.registeredLegalName || "—"} />
            <RecordKvRow label="Registered GST Address" value={record.registeredGstAddress || "—"} isLast />
          </>
        )}
      </RecordSectionCard>

      <RecordSectionCard title="Bank Details" icon={FileText} accent="blue">
        <RecordKvRow label="Account Holder Name" value={record.accountHolderName || "—"} />
        <RecordKvRow label="Bank Name" value={record.bankName || "—"} />
        <RecordKvRow label="Branch Name" value={record.branchName || "—"} />
        <RecordKvRow label="Account Number" value={record.accountNumber || "—"} mono />
        <RecordKvRow label="IFSC Code" value={record.ifscCode || "—"} mono />
        <RecordKvRow label="SWIFT Code" value={record.swiftCode || "—"} mono isLast />
      </RecordSectionCard>

      <div className="lg:col-span-2">
        <RecordSectionCard title="Audit Details" icon={Clock} accent="slate">
          <RecordKvRow label="Created By" value={record.createdBy} />
          <RecordKvRow label="Created Date" value={record.createdAt} />
          <RecordKvRow label="Updated By" value={record.updatedBy} />
          <RecordKvRow label="Updated Date" value={record.updatedAt} isLast />
        </RecordSectionCard>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case "documents":
        return <WarehouseDocumentsSection documents={warehouse.documents ?? []} />;
      case "overview":
      default:
        return renderOverview(warehouse);
    }
  };

  return (
    <RecordDetailPage
      listHref="/masters/warehouse"
      listLabel="Warehouses"
      recordName={warehouse.warehouseName}
      statusLabel={formatStatus(warehouse.status)}
      statusVariant={STATUS_VARIANT[warehouse.status] ?? "neutral"}
      kpis={kpis}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/warehouse/${warehouse.warehouseUuid}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Warehouse",
            icon: Pencil,
            onClick: () => router.push(`/masters/warehouse/${warehouse.warehouseUuid}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Operated By", value: warehouse.operatedBy || "—", highlight: true },
          { label: "City", value: warehouse.city || "—" },
          { label: "Documents", value: String(documentCount) },
          { label: "Created", value: warehouse.createdAt },
          { label: "Updated", value: warehouse.updatedAt },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
