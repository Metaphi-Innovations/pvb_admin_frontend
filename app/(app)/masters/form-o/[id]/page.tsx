"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Download, Mail, Pencil, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { downloadFormOPdf, getFormO } from "@/services/form-o.service";
import { SendFormOEmailModal } from "../components/SendFormOEmailModal";
import { useFormOPermissions } from "../form-o-permissions";

export default function FormOViewPage() {
  const params = useParams();
  const router = useRouter();
  const { canCreate, canEdit, canView } = useFormOPermissions();
  const id = String(params.id || "");
  const [record, setRecord] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sendEmailOpen, setSendEmailOpen] = useState(false);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      try {
        const data = await getFormO(id);
        setRecord(data);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  const fcoExpired =
    record?.customer?.fco_expiry_date &&
    new Date(record.customer.fco_expiry_date).getTime() <
      new Date().setHours(0, 0, 0, 0);

  return (
    <FormContainer
      title={record?.form_o_number || "Form O"}
      description="Certificate of Source — fertilizer / bio-stimulant"
      onBack={() => router.push("/masters/form-o")}
      actions={
        record ? (
          <div className="flex gap-2">
            {canEdit ? (
              <Button variant="outline" asChild>
                <Link href={`/masters/form-o/${record.form_o_id}/edit`}>
                  <Pencil className="w-4 h-4 mr-1" />
                  Edit
                </Link>
              </Button>
            ) : null}
            {fcoExpired && canCreate ? (
              <Button variant="outline" asChild>
                <Link
                  href={`/masters/form-o/new?customerId=${record.customer_id}&reissue=1`}
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Re-issue
                </Link>
              </Button>
            ) : null}
            {canView ? (
              <Button
                variant="outline"
                onClick={() => setSendEmailOpen(true)}
              >
                <Mail className="w-4 h-4 mr-1" />
                Send Email
              </Button>
            ) : null}
            {canView ? (
              <Button
                onClick={() =>
                  void downloadFormOPdf(
                    record.form_o_id,
                    `${String(record.form_o_number).replace(/\//g, "-")}.pdf`,
                  )
                }
              >
                <Download className="w-4 h-4 mr-1" />
                Download PDF
              </Button>
            ) : null}
          </div>
        ) : undefined
      }
    >
      {loading && <p className="text-sm text-muted-foreground">Loading…</p>}
      {error && (
        <div className="p-3 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
          {error}
        </div>
      )}
      {record && (
        <div className="space-y-6 text-sm">
          {fcoExpired && (
            <div className="p-3 text-sm border rounded-lg border-amber-200 bg-amber-50 text-amber-900">
              Customer FCO licence is expired. Re-issue a new Form O (new series
              number) with purpose Renewal.
            </div>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <div>
              <div className="text-xs text-muted-foreground">Form O No.</div>
              <div className="font-mono font-semibold">{record.form_o_number}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Issue date</div>
              <div>{String(record.issue_date).slice(0, 10)}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Purpose</div>
              <div>{record.purpose === "RENEWAL" ? "Renewal" : "Fresh"}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">State</div>
              <div>
                {record.state_name || "—"} ({record.state_code})
              </div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Financial year</div>
              <div>{record.financial_year}</div>
            </div>
            <div>
              <div className="text-xs text-muted-foreground">Customer</div>
              <div>
                <Link
                  className="text-brand-700 hover:underline"
                  href={`/masters/customers/${record.customer_id}`}
                >
                  {record.customer?.customer_name || record.recipient_name}
                </Link>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Recipient</h3>
            <p className="whitespace-pre-wrap">
              {record.recipient_name}
              {"\n"}
              {record.recipient_address}
            </p>
            <p className="mt-1 text-muted-foreground">
              Licence: {record.recipient_licence_no || "—"} · Expiry:{" "}
              {record.recipient_licence_expiry
                ? String(record.recipient_licence_expiry).slice(0, 10)
                : "—"}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">Issuer</h3>
            <p className="whitespace-pre-wrap">
              {record.issuer_name}
              {"\n"}
              {record.issuer_office_address}
            </p>
            {record.issuer_godown_address && (
              <p className="mt-1">Godown: {record.issuer_godown_address}</p>
            )}
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Mixture of fertilizers certificate
            </p>
            <p className="mt-1 text-muted-foreground">
              No.: {record.issuer_mixture_number || "—"} · Expiry:{" "}
              {record.issuer_mixture_expiry
                ? String(record.issuer_mixture_expiry).slice(0, 10)
                : "—"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Grade: {record.issuer_mixture_grades || "—"} · Authority:{" "}
              {record.issuer_mixture_authority || "—"}
            </p>
            <p className="mt-2 text-xs font-semibold text-muted-foreground">
              Issuer registration
            </p>
            <p className="mt-1 text-muted-foreground">
              Licence: {record.issuer_licence_no || "—"}
            </p>
          </div>

          <div>
            <h3 className="mb-2 font-semibold">
              Products undertaken ({record.lines?.length || 0})
            </h3>
            <div className="overflow-hidden border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-2 py-2 text-left">#</th>
                    <th className="px-2 py-2 text-left">Category</th>
                    <th className="px-2 py-2 text-left">Product</th>
                    <th className="px-2 py-2 text-left">Brand</th>
                    <th className="px-2 py-2 text-left">Source</th>
                  </tr>
                </thead>
                <tbody>
                  {(record.lines || []).map((line: any) => (
                    <tr key={line.form_o_line_id} className="border-t">
                      <td className="px-2 py-1.5">{line.line_no}</td>
                      <td className="px-2 py-1.5">{line.category_name}</td>
                      <td className="px-2 py-1.5">{line.product_name}</td>
                      <td className="px-2 py-1.5">{line.brand_name}</td>
                      <td className="px-2 py-1.5">{line.source}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      <SendFormOEmailModal
        open={sendEmailOpen}
        formOId={record?.form_o_id || id || null}
        onOpenChange={setSendEmailOpen}
        onSent={(result) => {
          toast.success(`Form O email sent to ${result.to}.`);
        }}
      />
    </FormContainer>
  );
}
