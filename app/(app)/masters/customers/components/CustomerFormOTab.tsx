"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { RecordSectionCard } from "@/components/record-detail";
import { Download, FilePlus2, FileText, Mail, Pencil } from "lucide-react";
import { toast } from "sonner";
import {
  downloadFormOPdf,
  listFormOs,
  type FormOListItem,
} from "@/services/form-o.service";
import { SendFormOEmailModal } from "../../form-o/components/SendFormOEmailModal";
import { useFormOPermissions } from "../../form-o/form-o-permissions";

export function CustomerFormOTab({
  customerId,
  fcoExpiryDate,
}: {
  customerId: string;
  fcoExpiryDate?: string | null;
}) {
  const { canCreate, canEdit, canView } = useFormOPermissions();
  const [items, setItems] = useState<FormOListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);
  const [sendEmailFormOId, setSendEmailFormOId] = useState<string | null>(null);

  const expired =
    !!fcoExpiryDate &&
    new Date(fcoExpiryDate).getTime() < new Date().setHours(0, 0, 0, 0);

  useEffect(() => {
    if (!canView) {
      setItems([]);
      setLoading(false);
      setError(null);
      return;
    }
    void (async () => {
      setLoading(true);
      try {
        const result = await listFormOs({
          customer_id: customerId,
          page: 1,
          page_size: 50,
        });
        setItems(result.items);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [customerId, canView]);

  return (
    <div className="space-y-4">
      {expired && (
        <div className="p-3 text-sm border rounded-lg border-amber-200 bg-amber-50 text-amber-900">
          FCO licence expired — re-issue Form O with purpose Renewal (new series number).
        </div>
      )}

      {canCreate ? (
        <div className="flex justify-end">
          <Button size="sm" asChild>
            <Link
              href={`/masters/form-o/new?customerId=${customerId}${
                expired ? "&reissue=1" : ""
              }`}
            >
              <FilePlus2 className="w-4 h-4 mr-1" />
              {expired ? "Re-issue Form O" : "Generate Form O"}
            </Link>
          </Button>
        </div>
      ) : null}

      <RecordSectionCard title="Form O certificates" icon={FileText} accent="blue">
        {!canView ? (
          <p className="text-sm text-muted-foreground">
            You do not have permission to view Form O certificates.
          </p>
        ) : null}
        {canView && loading && (
          <p className="text-sm text-muted-foreground">Loading…</p>
        )}
        {canView && error && <p className="text-sm text-red-600">{error}</p>}
        {canView && !loading && !error && items.length === 0 && (
          <p className="text-sm text-muted-foreground">
            No Form O generated for this customer yet.
          </p>
        )}
        {canView && items.length > 0 && (
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-2 text-left">Number</th>
                  <th className="px-2 py-2 text-left">Date</th>
                  <th className="px-2 py-2 text-left">State</th>
                  <th className="px-2 py-2 text-left">Purpose</th>
                  <th className="px-2 py-2 text-right">Products</th>
                  <th className="px-2 py-2 text-right">PDF</th>
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={row.form_o_id} className="border-t">
                    <td className="px-2 py-1.5">
                      <Link
                        className="font-mono text-xs font-semibold text-brand-700 hover:underline"
                        href={`/masters/form-o/${row.form_o_id}`}
                      >
                        {row.form_o_number}
                      </Link>
                    </td>
                    <td className="px-2 py-1.5">{String(row.issue_date).slice(0, 10)}</td>
                    <td className="px-2 py-1.5">{row.state_code}</td>
                    <td className="px-2 py-1.5">
                      {row.purpose === "RENEWAL" ? "Renewal" : "Fresh"}
                    </td>
                    <td className="px-2 py-1.5 text-right">{row.line_count}</td>
                    <td className="px-2 py-1.5 text-right">
                      <div className="flex justify-end gap-1">
                        {canEdit ? (
                          <Button variant="ghost" size="sm" asChild>
                            <Link href={`/masters/form-o/${row.form_o_id}/edit`}>
                              <Pencil className="w-4 h-4" />
                            </Link>
                          </Button>
                        ) : null}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void downloadFormOPdf(
                              row.form_o_id,
                              `${row.form_o_number.replace(/\//g, "-")}.pdf`,
                            )
                          }
                        >
                          <Download className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          title="Send email"
                          onClick={() => {
                            setSendEmailFormOId(row.form_o_id);
                            setSendEmailOpen(true);
                          }}
                        >
                          <Mail className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </RecordSectionCard>

      <SendFormOEmailModal
        open={sendEmailOpen}
        formOId={sendEmailFormOId}
        onOpenChange={(open) => {
          setSendEmailOpen(open);
          if (!open) setSendEmailFormOId(null);
        }}
        onSent={(result) => {
          toast.success(`Form O email sent to ${result.to}.`);
        }}
      />
    </div>
  );
}
