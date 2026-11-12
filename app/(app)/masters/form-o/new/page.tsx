"use client";

import React, { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import Link from "next/link";
import { AlertTriangle, Plus, ShieldAlert, Trash2 } from "lucide-react";
import { axiosInstance } from "@/api/axios";
import { API_ENDPOINTS } from "@/api/endpoints";
import {
  createFormO,
  getFormOEligibleProducts,
  getFormOIssuerDefaults,
  getFormOPrefill,
  type FormOEligibleProduct,
  type FormOIssuerStatus,
  type FormOLinePayload,
  type FormOPurpose,
  type FormORecipientStatus,
} from "@/services/form-o.service";
import { useFormOPermissions } from "../form-o-permissions";

type LineDraft = FormOLinePayload & { key: string };

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function FormONewPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <FormONewPageInner />
    </Suspense>
  );
}

function FormONewPageInner() {
  const { canCreate } = useFormOPermissions();
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerIdParam = searchParams.get("customerId") || "";
  const reissue = searchParams.get("reissue") === "1";

  const [customerOptions, setCustomerOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [warehouseOptions, setWarehouseOptions] = useState<
    { value: string; label: string }[]
  >([]);
  const [eligible, setEligible] = useState<FormOEligibleProduct[]>([]);
  const [productPick, setProductPick] = useState("");

  const [customerId, setCustomerId] = useState(customerIdParam);
  const [issueDate, setIssueDate] = useState(todayIso());
  const [purpose, setPurpose] = useState<FormOPurpose>(reissue ? "RENEWAL" : "FRESH");
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
  const [issuerMixtureGrades, setIssuerMixtureGrades] = useState("Not Applicable");
  const [issuerMixtureAuthority, setIssuerMixtureAuthority] = useState("");
  const [issuerLicenceNo, setIssuerLicenceNo] = useState("");
  const [issuerLicenceIssue, setIssuerLicenceIssue] = useState("");
  const [issuerLicenceExpiry, setIssuerLicenceExpiry] = useState("");
  const [issuerLicenceAuthority, setIssuerLicenceAuthority] = useState("");

  const [lines, setLines] = useState<LineDraft[]>([]);
  const [copiedFromId, setCopiedFromId] = useState<string | null>(null);
  const [licenceAlert, setLicenceAlert] = useState<string | null>(null);
  const [stateHint, setStateHint] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        const [custRes, whRes, products] = await Promise.all([
          axiosInstance.get(API_ENDPOINTS.MASTER.CUSTOMER.DROPDOWN),
          axiosInstance.get(API_ENDPOINTS.MASTER_DROPDOWNS.WAREHOUSE),
          getFormOEligibleProducts(),
        ]);
        const custData = custRes.data?.data ?? custRes.data ?? [];
        setCustomerOptions(
          (Array.isArray(custData) ? custData : []).map((c: any) => ({
            value: String(c.customer_id || c.id || c.value),
            label: `${c.customer_name || c.name || c.label}${
              c.customer_code ? ` (${c.customer_code})` : ""
            }`,
          })),
        );
        const whData = whRes.data?.data ?? whRes.data ?? [];
        setWarehouseOptions(
          (Array.isArray(whData) ? whData : []).map((w: any) => ({
            value: String(w.warehouse_id || w.id || w.value),
            label: String(w.warehouse_name || w.name || w.label),
          })),
        );
        const list = Array.isArray(products) ? products : [];
        setEligible(list);
        if (list.length === 0) {
          setError(
            "No Form O–eligible products found. Expected active products under fertilizer categories (e.g. Poshak / Poshak WSF / Amritam).",
          );
        } else {
          setError(null);
        }
      } catch (e: any) {
        setEligible([]);
        setError(
          e?.response?.data?.message ||
            e?.message ||
            "Failed to load products for Form O selection.",
        );
      }
    })();
  }, []);

  useEffect(() => {
    if (!customerId) return;
    void (async () => {
      try {
        const prefill = await getFormOPrefill(customerId);
        setRecipientName(prefill.recipient_name || "");
        setRecipientAddress(prefill.recipient_address || "");
        setRecipientStatus(prefill.recipient_status || "WHOLESALE_DEALER");
        setRecipientLicenceNo(prefill.recipient_licence_no || "");
        setRecipientLicenceExpiry(prefill.recipient_licence_expiry || "");
        setStateHint(
          prefill.state_name
            ? `${prefill.state_name} (${prefill.state_code})`
            : prefill.state_code || "",
        );
        setPurpose(
          reissue || prefill.suggested_purpose === "RENEWAL" ? "RENEWAL" : "FRESH",
        );
        if (prefill.licence_expired) {
          setLicenceAlert(
            "Distributor FCO licence is expired. Generate a new Form O for renewal (new series number).",
          );
        } else if (prefill.licence_near_expiry) {
          setLicenceAlert(
            `FCO licence expires in ${prefill.licence_days_remaining} day(s). Prefer purpose = Renewal.`,
          );
        } else {
          setLicenceAlert(null);
        }

        const defaults = prefill.issuer_defaults || (await getFormOIssuerDefaults());
        setIssuerName(defaults.issuer_name || "");
        setIssuerOffice(defaults.issuer_office_address || "");
        setIssuerGodown(defaults.issuer_godown_address || "");
        setIssuerStatus(defaults.issuer_status || "WHOLESALE_DEALER");
        setIssuerMixtureGrades(defaults.issuer_mixture_grades || "Not Applicable");

        if ((reissue || prefill.suggested_purpose === "RENEWAL") && prefill.last_form_o) {
          setCopiedFromId(prefill.last_form_o.form_o_id);
          setLines(
            (prefill.last_form_o.lines || []).map((l: FormOLinePayload, i: number) => ({
              ...l,
              key: `copy-${i}-${l.product_id || l.brand_name}`,
            })),
          );
        } else {
          setCopiedFromId(null);
          setLines([]);
        }
      } catch (e: any) {
        setError(e?.response?.data?.message || e?.message || "Failed to load customer");
      }
    })();
  }, [customerId, reissue]);

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
    if (!customerId) {
      setError("Select a customer / distributor.");
      return;
    }
    if (lines.length === 0) {
      setError(
        "Select at least one fertilizer / bio-stimulant product you undertake to supply. The full catalogue is not auto-added.",
      );
      return;
    }
    setSaving(true);
    try {
      const created = await createFormO({
        customer_id: customerId,
        issue_date: issueDate,
        purpose,
        warehouse_id: warehouseId || null,
        copied_from_form_o_id: copiedFromId,
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
      router.push(`/masters/form-o/${created.form_o_id}`);
    } catch (e: any) {
      setError(
        e?.response?.data?.message || e?.message || "Failed to generate Form O",
      );
    } finally {
      setSaving(false);
    }
  };

  if (!canCreate) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <ShieldAlert className="w-10 h-10 text-amber-600" />
        <h1 className="text-lg font-bold">Access restricted</h1>
        <p className="text-sm text-muted-foreground">
          You do not have permission to generate Form O.
        </p>
        <Link href="/masters/form-o" className="text-xs text-brand-700 hover:underline">
          Back to Form O listing
        </Link>
      </div>
    );
  }

  return (
      <FormContainer
        title="Generate Form O"
        description="Fertilizer Certificate of Source — select only brands you undertake to supply"
        onBack={() => router.push("/masters/form-o")}
        onCancel={() => router.push("/masters/form-o")}
        actions={
            <Button onClick={() => void onSubmit()} disabled={saving}>
              {saving ? "Generating…" : "Save & Generate"}
            </Button>
        }
      >
        {licenceAlert && (
          <div className="flex items-start gap-2 p-3 mb-4 text-sm border rounded-lg border-amber-200 bg-amber-50 text-amber-900">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
            <div>{licenceAlert}</div>
          </div>
        )}
        {error && (
          <div className="p-3 mb-4 text-sm text-red-700 border border-red-200 rounded-lg bg-red-50">
            {error}
          </div>
        )}

        <section className="grid gap-4 mb-6 md:grid-cols-2">
          <div className="space-y-1.5 md:col-span-2">
            <Label>Customer / Distributor *</Label>
            <AutocompleteSelect
              value={customerId}
              onChange={setCustomerId}
              options={customerOptions}
              placeholder="Select customer"
            />
            {stateHint && (
              <p className="text-xs text-muted-foreground">
                Series state: {stateHint} → number format FO/&#123;state&#125;/&#123;FY&#125;/serial
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
                placeholder="Optional"
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
                placeholder="Authority by whom issued"
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
          <h3 className="mb-1 text-sm font-semibold">
            Products undertaken to supply *
          </h3>
          <p className="mb-3 text-xs text-muted-foreground">
            Only fertilizer / bio-stimulant products. Nothing is auto-added from the ERP catalogue —
            add each brand you undertake to supply on this certificate.
          </p>
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
          {copiedFromId && (
            <p className="mt-2 text-xs text-muted-foreground">
              Lines prefilled from last Form O (editable). Saving still allocates a new series number.
            </p>
          )}
        </section>
      </FormContainer>
  );
}
