"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import Link from "next/link";
import { Plus, ShieldAlert, Trash2 } from "lucide-react";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  getFormO,
  getFormOEligibleProducts,
  getFormOIssuerDefaults,
  updateFormO,
  type FormOEligibleProduct,
  type FormOIssuerStatus,
  type FormOLinePayload,
  type FormOPurpose,
  type FormORecipientStatus,
} from "@/services/form-o.service";
import { useFormOPermissions } from "../../form-o-permissions";

type LineDraft = FormOLinePayload & { key: string };

function sliceDate(value: unknown): string {
  if (!value) return "";
  return String(value).slice(0, 10);
}

export default function FormOEditPage() {
  const params = useParams();
  const router = useRouter();
  const { canEdit } = useFormOPermissions();
  const id = String(params.id || "");

  const [loading, setLoading] = useState(true);
  const [formONumber, setFormONumber] = useState("");
  const [customerLabel, setCustomerLabel] = useState("");
  const [stateHint, setStateHint] = useState("");

  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [eligible, setEligible] = useState<FormOEligibleProduct[]>([]);
  const [productPick, setProductPick] = useState("");

  const [issueDate, setIssueDate] = useState("");
  const [purpose, setPurpose] = useState<FormOPurpose>("FRESH");
  const [warehouseId, setWarehouseId] = useState("");

  const [recipientName, setRecipientName] = useState("");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [recipientStatus, setRecipientStatus] =
    useState<FormORecipientStatus>("WHOLESALE_DEALER");
  const [recipientLicenceNo, setRecipientLicenceNo] = useState("");
  const [recipientLicenceIssue, setRecipientLicenceIssue] = useState("");
  const [recipientLicenceExpiry, setRecipientLicenceExpiry] = useState("");
  const [recipientLicenceAuthority, setRecipientLicenceAuthority] = useState("");

  const [issuerName, setIssuerName] = useState("");
  const [issuerOffice, setIssuerOffice] = useState("");
  const [issuerGodown, setIssuerGodown] = useState("");
  const [issuerStatus, setIssuerStatus] =
    useState<FormOIssuerStatus>("WHOLESALE_DEALER");
  const [issuerMixtureNumber, setIssuerMixtureNumber] = useState("");
  const [issuerMixtureExpiry, setIssuerMixtureExpiry] = useState("");
  const [issuerMixtureGrades, setIssuerMixtureGrades] = useState("");
  const [issuerMixtureAuthority, setIssuerMixtureAuthority] = useState("");
  const [issuerLicenceNo, setIssuerLicenceNo] = useState("");
  const [issuerLicenceIssue, setIssuerLicenceIssue] = useState("");
  const [issuerLicenceExpiry, setIssuerLicenceExpiry] = useState("");
  const [issuerLicenceAuthority, setIssuerLicenceAuthority] = useState("");

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const [record, whRes, products] = await Promise.all([
          getFormO(id),
          axiosInstance.get(API_ENDPOINTS.MASTER_DROPDOWNS.WAREHOUSE),
          getFormOEligibleProducts(),
        ]);

        setFormONumber(record.form_o_number || "");
        setCustomerLabel(
          `${record.customer?.customer_name || record.recipient_name || ""}${
            record.customer?.customer_code
              ? ` (${record.customer.customer_code})`
              : ""
          }`,
        );
        setStateHint(
          record.state_name
            ? `${record.state_name} (${record.state_code})`
            : record.state_code || "",
        );
        setIssueDate(sliceDate(record.issue_date));
        setPurpose(record.purpose === "RENEWAL" ? "RENEWAL" : "FRESH");
        setWarehouseId(record.warehouse_id || "");

        setRecipientName(record.recipient_name || "");
        setRecipientAddress(record.recipient_address || "");
        setRecipientStatus(record.recipient_status || "WHOLESALE_DEALER");
        setRecipientLicenceNo(record.recipient_licence_no || "");
        setRecipientLicenceIssue(sliceDate(record.recipient_licence_issue));
        setRecipientLicenceExpiry(sliceDate(record.recipient_licence_expiry));
        setRecipientLicenceAuthority(record.recipient_licence_authority || "");

        setIssuerName(record.issuer_name || "");
        setIssuerOffice(record.issuer_office_address || "");
        setIssuerGodown(record.issuer_godown_address || "");
        setIssuerStatus(record.issuer_status || "WHOLESALE_DEALER");
        setIssuerMixtureNumber(record.issuer_mixture_number || "");
        setIssuerMixtureExpiry(sliceDate(record.issuer_mixture_expiry));
        setIssuerMixtureGrades(record.issuer_mixture_grades || "");
        setIssuerMixtureAuthority(record.issuer_mixture_authority || "");
        setIssuerLicenceNo(record.issuer_licence_no || "");
        setIssuerLicenceIssue(sliceDate(record.issuer_licence_issue));
        setIssuerLicenceExpiry(sliceDate(record.issuer_licence_expiry));
        setIssuerLicenceAuthority(record.issuer_licence_authority || "");

        setLines(
          (record.lines || []).map((l: any, i: number) => ({
            key: l.form_o_line_id || `line-${i}`,
            product_id: l.product_id,
            category_name: l.category_name,
            product_name: l.product_name,
            brand_name: l.brand_name,
            source: l.source || "Co-Marketer",
          })),
        );

        const whData = whRes.data?.data ?? whRes.data ?? [];
        setWarehouseOptions(
          (Array.isArray(whData) ? whData : []).map((w: any) => ({
            value: String(w.warehouse_id || w.id || w.value),
            label: String(w.warehouse_name || w.name || w.label),
          })),
        );
        setEligible(Array.isArray(products) ? products : []);
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load Form O");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useEffect(() => {
    if (!warehouseId) return;
    void (async () => {
      try {
        const defaults = await getFormOIssuerDefaults(warehouseId);
        if (defaults.issuer_godown_address) {
          setIssuerGodown(defaults.issuer_godown_address);
        }
      } catch {
        /* ignore */
      }
    })();
  }, [warehouseId]);

  const productOptions = useMemo(
    () =>
      eligible.map((p) => ({
        value: p.product_id,
        label: `${p.brand_name} — ${p.category_name}`,
      })),
    [eligible],
  );

  const addProduct = (productId: string) => {
    const p = eligible.find((x) => x.product_id === productId);
    if (!p) return;
    if (lines.some((l) => l.product_id === productId)) return;
    setLines((prev) => [
      ...prev,
      {
        key: `${productId}-${Date.now()}`,
        product_id: p.product_id,
        category_name: p.category_name,
        product_name: p.product_name,
        brand_name: p.brand_name,
        source: p.source || "Co-Marketer",
      },
    ]);
    setProductPick("");
  };

  const removeLine = (key: string) => {
    setLines((prev) => prev.filter((l) => l.key !== key));
  };

  const updateLine = (key: string, patch: Partial<FormOLinePayload>) => {
    setLines((prev) =>
      prev.map((l) => (l.key === key ? { ...l, ...patch } : l)),
    );
  };

  const onSubmit = async () => {
    setError(null);
    if (lines.length === 0) {
      setError("Select at least one fertilizer / bio-stimulant product.");
      return;
    }
    setSaving(true);
    try {
      await updateFormO(id, {
        issue_date: issueDate,
        purpose,
        warehouse_id: warehouseId || null,
        recipient_name: recipientName,
        recipient_address: recipientAddress,
        recipient_status: recipientStatus,
        recipient_licence_no: recipientLicenceNo || null,
        recipient_licence_issue: recipientLicenceIssue || null,
        recipient_licence_expiry: recipientLicenceExpiry || null,
        recipient_licence_authority: recipientLicenceAuthority || null,
        issuer_name: issuerName,
        issuer_office_address: issuerOffice,
        issuer_godown_address: issuerGodown || null,
        issuer_status: issuerStatus,
        issuer_mixture_number: issuerMixtureNumber || null,
        issuer_mixture_expiry: issuerMixtureExpiry || null,
        issuer_mixture_grades: issuerMixtureGrades || null,
        issuer_mixture_authority: issuerMixtureAuthority || null,
        issuer_licence_no: issuerLicenceNo || null,
        issuer_licence_issue: issuerLicenceIssue || null,
        issuer_licence_expiry: issuerLicenceExpiry || null,
        issuer_licence_authority: issuerLicenceAuthority || null,
        lines: lines.map(({ key: _k, ...rest }) => rest),
      });
      router.push(`/masters/form-o/${id}`);
    } catch (e: any) {
      setError(e?.response?.data?.message || e?.message || "Failed to update Form O");
    } finally {
      setSaving(false);
    }
  };

  if (!canEdit) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-600" />
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          You do not have permission to edit Form O.
        </p>
        <Link
          href={`/masters/form-o/${id}`}
          className="text-xs text-brand-700 hover:underline"
        >
          Back to Form O
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <FormContainer
        title="Edit Form O"
        onBack={() => router.push(`/masters/form-o/${id}`)}
      >
        <p className="text-sm text-muted-foreground">Loading…</p>
      </FormContainer>
    );
  }

  return (
    <FormContainer
      title={`Edit ${formONumber || "Form O"}`}
      description="Form O number, customer and state series stay fixed"
      onBack={() => router.push(`/masters/form-o/${id}`)}
      onCancel={() => router.push(`/masters/form-o/${id}`)}
      actions={
        <Button onClick={() => void onSubmit()} disabled={saving}>
          {saving ? "Saving…" : "Save changes"}
        </Button>
      }
    >
      {error && (
        <div className="p-3 mb-4 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
          {error}
        </div>
      )}

      <section className="grid gap-4 mb-6 md:grid-cols-2">
        <div className="space-y-1.5 md:col-span-2">
          <Label>Customer / Distributor</Label>
          <Input value={customerLabel} disabled />
          {stateHint && (
            <p className="text-xs text-muted-foreground">
              Series: {formONumber} · State {stateHint}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label>Issue date *</Label>
          <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>Purpose *</Label>
          <select
            className="w-full h-10 px-3 text-sm border rounded-md border-input bg-background"
            value={purpose}
            onChange={(e) => setPurpose(e.target.value as FormOPurpose)}
          >
            <option value="FRESH">Fresh certificate of registration</option>
            <option value="RENEWAL">Renewal of certificate of registration</option>
          </select>
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label>Godown warehouse (optional)</Label>
          <AutocompleteSelect
            value={warehouseId}
            onChange={setWarehouseId}
            options={warehouseOptions}
            placeholder="Select warehouse for godown address"
          />
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-semibold">Recipient (dealer)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Name *</Label>
            <Input value={recipientName} onChange={(e) => setRecipientName(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Address *</Label>
            <Textarea
              rows={3}
              value={recipientAddress}
              onChange={(e) => setRecipientAddress(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Status</Label>
            <select
              className="w-full h-10 px-3 text-sm border rounded-md border-input bg-background"
              value={recipientStatus}
              onChange={(e) =>
                setRecipientStatus(e.target.value as FormORecipientStatus)
              }
            >
              <option value="WHOLESALE_DEALER">Wholesale Dealer</option>
              <option value="RETAIL_DEALER">Retail Dealer</option>
            </select>
          </div>
          <div className="space-y-1.5">
            <Label>FCO Licence No.</Label>
            <Input
              value={recipientLicenceNo}
              onChange={(e) => setRecipientLicenceNo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Licence issue date</Label>
            <Input
              type="date"
              value={recipientLicenceIssue}
              onChange={(e) => setRecipientLicenceIssue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Licence expiry</Label>
            <Input
              type="date"
              value={recipientLicenceExpiry}
              onChange={(e) => setRecipientLicenceExpiry(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Authority</Label>
            <Input
              value={recipientLicenceAuthority}
              onChange={(e) => setRecipientLicenceAuthority(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="mb-6">
        <h3 className="mb-3 text-sm font-semibold">Issuer (Paramverse)</h3>
        <div className="grid gap-3 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Name *</Label>
            <Input value={issuerName} onChange={(e) => setIssuerName(e.target.value)} />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Office address *</Label>
            <Textarea
              rows={2}
              value={issuerOffice}
              onChange={(e) => setIssuerOffice(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label>Godown address</Label>
            <Textarea
              rows={2}
              value={issuerGodown}
              onChange={(e) => setIssuerGodown(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Issuer status</Label>
            <select
              className="w-full h-10 px-3 text-sm border rounded-md border-input bg-background"
              value={issuerStatus}
              onChange={(e) => setIssuerStatus(e.target.value as FormOIssuerStatus)}
            >
              <option value="WHOLESALE_DEALER">Wholesale Dealer</option>
              <option value="MANUFACTURER">Manufacturer</option>
              <option value="POOL_HANDLING_AGENCY">Pool Handling Agency</option>
              <option value="STATE_GOVERNMENT">State Government</option>
            </select>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <p className="text-xs font-semibold text-muted-foreground">
              If manufacturer of mixture of fertilizers
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Mixture certificate number</Label>
            <Input
              value={issuerMixtureNumber}
              onChange={(e) => setIssuerMixtureNumber(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mixture certificate expiry</Label>
            <Input
              type="date"
              value={issuerMixtureExpiry}
              onChange={(e) => setIssuerMixtureExpiry(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Grade of mixture allowed to be manufactured</Label>
            <Input
              value={issuerMixtureGrades}
              onChange={(e) => setIssuerMixtureGrades(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Mixture certificate authority</Label>
            <Input
              value={issuerMixtureAuthority}
              onChange={(e) => setIssuerMixtureAuthority(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <p className="text-xs font-semibold text-muted-foreground">
              Detail certificate of registration (issuer)
            </p>
          </div>
          <div className="space-y-1.5">
            <Label>Issuer licence No.</Label>
            <Input
              value={issuerLicenceNo}
              onChange={(e) => setIssuerLicenceNo(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Issuer licence issue</Label>
            <Input
              type="date"
              value={issuerLicenceIssue}
              onChange={(e) => setIssuerLicenceIssue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Issuer licence expiry</Label>
            <Input
              type="date"
              value={issuerLicenceExpiry}
              onChange={(e) => setIssuerLicenceExpiry(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Issuer licence authority</Label>
            <Input
              value={issuerLicenceAuthority}
              onChange={(e) => setIssuerLicenceAuthority(e.target.value)}
            />
          </div>
        </div>
      </section>

      <section className="mb-2">
        <h3 className="mb-1 text-sm font-semibold">Products undertaken to supply *</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          <div className="flex-1 min-w-[240px]">
            <AutocompleteSelect
              value={productPick}
              onChange={(v) => {
                setProductPick(v);
                if (v) addProduct(v);
              }}
              options={productOptions.filter(
                (o) => !lines.some((l) => l.product_id === o.value),
              )}
              placeholder="Add eligible product…"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={!productPick}
            onClick={() => productPick && addProduct(productPick)}
          >
            <Plus className="w-4 h-4 mr-1" />
            Add
          </Button>
        </div>

        {lines.length === 0 ? (
          <div className="p-4 text-sm border border-dashed rounded-lg text-muted-foreground">
            No products selected yet.
          </div>
        ) : (
          <div className="overflow-hidden border rounded-lg">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="px-2 py-2 text-left">Category</th>
                  <th className="px-2 py-2 text-left">Product Name</th>
                  <th className="px-2 py-2 text-left">Brand</th>
                  <th className="px-2 py-2 text-left">Source</th>
                  <th className="px-2 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => (
                  <tr key={line.key} className="border-t">
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.category_name}
                        onChange={(e) =>
                          updateLine(line.key, { category_name: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.product_name}
                        onChange={(e) =>
                          updateLine(line.key, { product_name: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.brand_name}
                        onChange={(e) =>
                          updateLine(line.key, { brand_name: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        value={line.source}
                        onChange={(e) =>
                          updateLine(line.key, { source: e.target.value })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(line.key)}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </FormContainer>
  );
}
