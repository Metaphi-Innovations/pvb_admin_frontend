"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VoucherFormSectionCard } from "@/components/accounts/voucher-form/VoucherFormSectionCard";
import {
  INVOICE_DETAIL_INPUT_CLASS,
  INVOICE_DETAIL_SELECT_CLASS,
  InvoiceDetailField,
} from "@/app/(app)/accounts/invoices/components/invoice-form-voucher-ui";
import { JournalSearchableSelect } from "./JournalSearchableSelect";
import {
  TdsListService,
  formatTdsSectionLabel,
  type TdsDropdownItem,
} from "@/services/tds-list.service";
import { JournalVoucherService } from "@/services/journal-voucher.service";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import type { JournalTdsNature } from "@/types/journal-voucher.types";
import {
  allocationFromOpenItem,
  calcTdsTaxAmount,
  resolveJournalPartyLedgerId,
  sanitizeNonNegativeMoneyInput,
  toMoneyNumber,
  type JournalFormState,
  type JournalTdsAllocationFormRow,
} from "../journal-voucher-utils";

type Props = {
  form: JournalFormState;
  tdsNature: JournalTdsNature;
  fieldsEditable: boolean;
  onPatch: (p: Partial<JournalFormState>) => void;
};

export function JournalTdsDetailsSection({
  form,
  tdsNature,
  fieldsEditable,
  onPatch,
}: Props) {
  const [sections, setSections] = useState<TdsDropdownItem[]>([]);
  const [invoiceOptions, setInvoiceOptions] = useState<
    { value: string; label: string; sub?: string; raw: JournalTdsAllocationFormRow }[]
  >([]);
  const [invoicePick, setInvoicePick] = useState("");
  const [loadingInvoices, setLoadingInvoices] = useState(false);

  const partyLedgerId =
    resolveJournalPartyLedgerId(form) || form.party_ledger_id;
  const partyLabel = isTdsOnDebit(form)
    ? form.credit_ledger_name || form.credit_ledger_code
    : form.debit_ledger_name || form.debit_ledger_code;

  const sectionOptions = useMemo(
    () =>
      sections.map((s) => ({
        value: s.tdsUuid,
        label: formatTdsSectionLabel(s),
        sub: s.sectionCode,
      })),
    [sections],
  );

  useEffect(() => {
    let cancelled = false;
    void TdsListService.dropdown()
      .then((rows) => {
        if (!cancelled) setSections(rows);
      })
      .catch(() => {
        if (!cancelled) setSections([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!partyLedgerId || form.tds_application_mode !== "AGAINST_INVOICE") {
      setInvoiceOptions([]);
      return;
    }
    let cancelled = false;
    setLoadingInvoices(true);
    void JournalVoucherService.listEligibleTdsOpenItems({
      party_ledger_id: partyLedgerId,
      tds_nature: tdsNature,
      page: 1,
      page_size: 50,
    })
      .then((res) => {
        if (cancelled) return;
        const section = {
          id: form.tds_section_id,
          label: form.tds_section_label,
          rate: form.tds_rate,
        };
        setInvoiceOptions(
          res.data.map((item) => {
            const row = allocationFromOpenItem(item, section);
            return {
              value: item.open_item_id,
              label: item.invoice_number,
              sub: `Outstanding ${formatMoney(toMoneyNumber(item.outstanding_amount))}`,
              raw: row,
            };
          }),
        );
      })
      .catch(() => {
        if (!cancelled) setInvoiceOptions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingInvoices(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    partyLedgerId,
    tdsNature,
    form.tds_application_mode,
    form.tds_section_id,
    form.tds_section_label,
    form.tds_rate,
  ]);

  const allocatedSum = form.tds_allocations.reduce(
    (acc, row) => acc + toMoneyNumber(row.tax_amount),
    0,
  );
  const jvAmount = toMoneyNumber(form.amount);

  return (
    <VoucherFormSectionCard title="TDS Details">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <InvoiceDetailField label="TDS Nature">
          <Input
            readOnly
            value={
              tdsNature === "TDS_RECEIVABLE"
                ? "TDS Receivable"
                : "TDS Payable"
            }
            className={cn(INVOICE_DETAIL_INPUT_CLASS, "bg-muted/40")}
          />
        </InvoiceDetailField>
        <InvoiceDetailField label="Party">
          <Input
            readOnly
            value={partyLabel || "Select Customer/Supplier on the non-TDS side"}
            className={cn(INVOICE_DETAIL_INPUT_CLASS, "bg-muted/40")}
          />
        </InvoiceDetailField>
      </div>

      <div className="mt-3 space-y-2">
        <Label className="text-xs font-medium">Application</Label>
        <div className="flex flex-wrap gap-4 text-xs">
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="jv-tds-mode"
              disabled={!fieldsEditable}
              checked={form.tds_application_mode === "AGAINST_INVOICE"}
              onChange={() =>
                onPatch({
                  tds_application_mode: "AGAINST_INVOICE",
                  tds_on_account_taxable: "",
                })
              }
            />
            Against Invoice
          </label>
          <label className="inline-flex items-center gap-2">
            <input
              type="radio"
              name="jv-tds-mode"
              disabled={!fieldsEditable}
              checked={form.tds_application_mode === "ON_ACCOUNT"}
              onChange={() =>
                onPatch({
                  tds_application_mode: "ON_ACCOUNT",
                  tds_allocations: [],
                })
              }
            />
            On Account
          </label>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
        <InvoiceDetailField label="TDS Section" required>
          <JournalSearchableSelect
            value={form.tds_section_id}
            options={sectionOptions}
            disabled={!fieldsEditable}
            placeholder="Select TDS section…"
            onChange={(value) => {
              const selected = sections.find((s) => s.tdsUuid === value);
              const rate = selected?.tdsRate ?? "";
              const label = selected
                ? formatTdsSectionLabel(selected)
                : "";
              const rateNum = toMoneyNumber(rate);
              onPatch({
                tds_section_id: value,
                tds_section_label: label,
                tds_rate: String(rateNum || rate),
                tds_allocations: form.tds_allocations.map((row) => {
                  const taxable = toMoneyNumber(row.taxable_amount);
                  return {
                    ...row,
                    tds_section_id: value,
                    tds_section_label: label,
                    tax_rate: String(rateNum || rate),
                    tax_amount: String(calcTdsTaxAmount(taxable, rateNum)),
                  };
                }),
              });
            }}
          />
        </InvoiceDetailField>
        <InvoiceDetailField label="TDS Rate (%)">
          <Input
            readOnly
            value={form.tds_rate || "—"}
            className={cn(INVOICE_DETAIL_INPUT_CLASS, "bg-muted/40")}
          />
        </InvoiceDetailField>
      </div>

      {form.tds_application_mode === "ON_ACCOUNT" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
          <InvoiceDetailField label="Taxable Amount" required>
            <Input
              disabled={!fieldsEditable}
              value={form.tds_on_account_taxable}
              className={INVOICE_DETAIL_INPUT_CLASS}
              onChange={(e) => {
                const taxableRaw = sanitizeNonNegativeMoneyInput(e.target.value);
                const taxable = toMoneyNumber(taxableRaw);
                const tax = calcTdsTaxAmount(
                  taxable,
                  toMoneyNumber(form.tds_rate),
                );
                onPatch({
                  tds_on_account_taxable: taxableRaw,
                  amount: tax > 0 ? String(tax) : form.amount,
                });
              }}
            />
          </InvoiceDetailField>
          <InvoiceDetailField label="TDS Amount">
            <Input
              readOnly
              value={formatMoney(
                calcTdsTaxAmount(
                  toMoneyNumber(form.tds_on_account_taxable),
                  toMoneyNumber(form.tds_rate),
                ),
              )}
              className={cn(INVOICE_DETAIL_INPUT_CLASS, "bg-muted/40")}
            />
          </InvoiceDetailField>
        </div>
      ) : (
        <div className="mt-3 space-y-2">
          {fieldsEditable && (
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[240px] flex-1">
                <InvoiceDetailField label="Add Invoice">
                  <JournalSearchableSelect
                    value={invoicePick}
                    options={invoiceOptions.map((o) => ({
                      value: o.value,
                      label: o.label,
                      sub: o.sub,
                    }))}
                    disabled={loadingInvoices || !form.tds_section_id}
                    placeholder={
                      form.tds_section_id
                        ? loadingInvoices
                          ? "Loading invoices…"
                          : "Select invoice…"
                        : "Select TDS section first…"
                    }
                    onChange={setInvoicePick}
                  />
                </InvoiceDetailField>
              </div>
              <Button
                type="button"
                size="sm"
                className="h-8 text-xs"
                disabled={!invoicePick || !form.tds_section_id}
                onClick={() => {
                  const opt = invoiceOptions.find((o) => o.value === invoicePick);
                  if (!opt) return;
                  if (
                    form.tds_allocations.some(
                      (r) => r.open_item_id === opt.value,
                    )
                  ) {
                    setInvoicePick("");
                    return;
                  }
                  const row = {
                    ...opt.raw,
                    tds_section_id: form.tds_section_id,
                    tds_section_label: form.tds_section_label,
                    tax_rate: form.tds_rate,
                    tax_amount: String(
                      calcTdsTaxAmount(
                        toMoneyNumber(opt.raw.taxable_amount),
                        toMoneyNumber(form.tds_rate),
                      ),
                    ),
                  };
                  const next = [...form.tds_allocations, row];
                  const sum = next.reduce(
                    (acc, r) => acc + toMoneyNumber(r.tax_amount),
                    0,
                  );
                  onPatch({
                    tds_allocations: next,
                    amount: String(sum),
                  });
                  setInvoicePick("");
                }}
              >
                <Plus className="w-3.5 h-3.5 mr-1" />
                Add
              </Button>
            </div>
          )}

          <div className="border border-border rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <thead className="bg-muted/40 border-b border-border">
                <tr>
                  <th className="px-2 py-2 text-left font-semibold">Invoice</th>
                  <th className="px-2 py-2 text-left font-semibold">Date</th>
                  <th className="px-2 py-2 text-right font-semibold">Outstanding</th>
                  <th className="px-2 py-2 text-right font-semibold">TDS Base</th>
                  <th className="px-2 py-2 text-right font-semibold">Rate</th>
                  <th className="px-2 py-2 text-right font-semibold">TDS Amt</th>
                  {fieldsEditable && <th className="px-2 py-2 w-8" />}
                </tr>
              </thead>
              <tbody>
                {form.tds_allocations.length === 0 ? (
                  <tr>
                    <td
                      colSpan={fieldsEditable ? 7 : 6}
                      className="px-3 py-6 text-center text-muted-foreground"
                    >
                      No invoices allocated yet.
                    </td>
                  </tr>
                ) : (
                  form.tds_allocations.map((row) => (
                    <tr
                      key={row.open_item_id}
                      className="border-b border-border/60"
                    >
                      <td className="px-2 py-1.5 font-medium">{row.invoice_number}</td>
                      <td className="px-2 py-1.5">{row.invoice_date || "—"}</td>
                      <td className="px-2 py-1.5 text-right">
                        {formatMoney(toMoneyNumber(row.outstanding_amount))}
                      </td>
                      <td className="px-2 py-1.5 text-right">
                        {fieldsEditable ? (
                          <input
                            className={cn(
                              INVOICE_DETAIL_SELECT_CLASS,
                              "h-7 w-24 text-right ml-auto",
                            )}
                            value={row.taxable_amount}
                            onChange={(e) => {
                              const taxableRaw = sanitizeNonNegativeMoneyInput(
                                e.target.value,
                              );
                              const taxable = toMoneyNumber(taxableRaw);
                              const tax = calcTdsTaxAmount(
                                taxable,
                                toMoneyNumber(row.tax_rate || form.tds_rate),
                              );
                              const next = form.tds_allocations.map((r) =>
                                r.open_item_id === row.open_item_id
                                  ? {
                                      ...r,
                                      taxable_amount: taxableRaw,
                                      tax_amount: String(tax),
                                    }
                                  : r,
                              );
                              const sum = next.reduce(
                                (acc, r) => acc + toMoneyNumber(r.tax_amount),
                                0,
                              );
                              onPatch({
                                tds_allocations: next,
                                amount: String(sum),
                              });
                            }}
                          />
                        ) : (
                          formatMoney(toMoneyNumber(row.taxable_amount))
                        )}
                      </td>
                      <td className="px-2 py-1.5 text-right">{row.tax_rate}%</td>
                      <td className="px-2 py-1.5 text-right font-medium">
                        {formatMoney(toMoneyNumber(row.tax_amount))}
                      </td>
                      {fieldsEditable && (
                        <td className="px-2 py-1.5">
                          <button
                            type="button"
                            className="p-1 text-muted-foreground hover:text-red-600"
                            onClick={() => {
                              const next = form.tds_allocations.filter(
                                (r) => r.open_item_id !== row.open_item_id,
                              );
                              const sum = next.reduce(
                                (acc, r) => acc + toMoneyNumber(r.tax_amount),
                                0,
                              );
                              onPatch({
                                tds_allocations: next,
                                amount: next.length ? String(sum) : form.amount,
                              });
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <p className="text-[11px] text-muted-foreground">
            Allocated TDS {formatMoney(allocatedSum)} / JV amount{" "}
            {formatMoney(jvAmount)}
          </p>
        </div>
      )}
    </VoucherFormSectionCard>
  );
}

function isTdsOnDebit(form: JournalFormState): boolean {
  return (
    form.debit_system_ledger_type === "TDS_RECEIVABLE" ||
    form.debit_system_ledger_type === "TDS_PAYABLE"
  );
}
