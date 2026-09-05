"use client";

import React, { useState, useEffect } from "react";
import { X, Calculator, AlertCircle, CheckCircle2, RefreshCw, Calendar, ArrowRight } from "lucide-react";
import { CreditNoteListApi, creditNoteListApiError } from "../credit-note-list-api";
import { formatINR } from "../note-utils";

interface TurnoverSchemeCalculationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: (message: string) => void;
  onError: (message: string) => void;
}

export function TurnoverSchemeCalculationModal({
  open,
  onClose,
  onSuccess,
  onError,
}: TurnoverSchemeCalculationModalProps) {
  const [schemes, setSchemes] = useState<any[]>([]);
  const [loadingSchemes, setLoadingSchemes] = useState(false);
  const [selectedSchemeId, setSelectedSchemeId] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const [previewLoading, setPreviewLoading] = useState(false);
  const [generateLoading, setGenerateLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any | null>(null);

  useEffect(() => {
    if (!open) {
      setPreviewData(null);
      setSelectedSchemeId("");
      setFromDate("");
      setToDate("");
      return;
    }

    async function loadSchemes() {
      setLoadingSchemes(true);
      try {
        const list = await CreditNoteListApi.listTurnoverSchemes();
        setSchemes(list);
        if (list.length > 0) {
          const first = list[0];
          setSelectedSchemeId(first.scheme_id);
          if (first.start_date) setFromDate(first.start_date.slice(0, 10));
          if (first.end_date) setToDate(first.end_date.slice(0, 10));
        }
      } catch (err) {
        onError(creditNoteListApiError(err, "Failed to load turnover schemes."));
      } finally {
        setLoadingSchemes(false);
      }
    }

    loadSchemes();
  }, [open]);

  const handleSchemeChange = (schemeId: string) => {
    setSelectedSchemeId(schemeId);
    setPreviewData(null);
    const found = schemes.find((s) => s.scheme_id === schemeId);
    if (found) {
      if (found.start_date) setFromDate(found.start_date.slice(0, 10));
      if (found.end_date) setToDate(found.end_date.slice(0, 10));
    }
  };

  const handlePreview = async () => {
    if (!selectedSchemeId) return;
    setPreviewLoading(true);
    try {
      const res = await CreditNoteListApi.previewTurnoverScheme({
        scheme_id: selectedSchemeId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      setPreviewData(res);
    } catch (err) {
      onError(creditNoteListApiError(err, "Failed to preview turnover calculations."));
    } finally {
      setPreviewLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!selectedSchemeId) return;
    setGenerateLoading(true);
    try {
      const res = await CreditNoteListApi.calculateTurnoverScheme({
        scheme_id: selectedSchemeId,
        from_date: fromDate || undefined,
        to_date: toDate || undefined,
      });
      onSuccess(res.message || `Successfully generated ${res.generated_count} Pending Credit Note(s).`);
      onClose();
    } catch (err) {
      onError(creditNoteListApiError(err, "Failed to generate turnover credit notes."));
    } finally {
      setGenerateLoading(false);
    }
  };

  if (!open) return null;

  const eligibleCount = previewData?.summary?.eligible_customers_count ?? 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-card border border-border rounded-xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border bg-muted/40">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-brand-500/10 text-brand-600 dark:text-brand-400">
              <Calculator className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">
                Turnover Discount Scheme Settlement
              </h3>
              <p className="text-xs text-muted-foreground">
                Calculate customer turnovers, evaluate qualifying slabs, and generate Pending Credit Notes.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filters Form */}
        <div className="px-6 py-4 border-b border-border bg-card grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">
              Select Turnover Scheme <span className="text-destructive">*</span>
            </label>
            <select
              value={selectedSchemeId}
              onChange={(e) => handleSchemeChange(e.target.value)}
              disabled={loadingSchemes || previewLoading || generateLoading}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              {schemes.length === 0 && (
                <option value="">{loadingSchemes ? "Loading schemes..." : "No active turnover schemes"}</option>
              )}
              {schemes.map((s) => (
                <option key={s.scheme_id} value={s.scheme_id}>
                  {s.scheme_code} - {s.scheme_name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> From Date
            </label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => {
                setFromDate(e.target.value);
                setPreviewData(null);
              }}
              disabled={previewLoading || generateLoading}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" /> To Date (FY End)
            </label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => {
                setToDate(e.target.value);
                setPreviewData(null);
              }}
              disabled={previewLoading || generateLoading}
              className="w-full text-xs rounded-md border border-input bg-background px-3 py-2 text-foreground focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>
        </div>

        {/* Action bar for Preview */}
        <div className="px-6 py-3 bg-muted/20 border-b border-border flex items-center justify-between">
          <span className="text-xs text-muted-foreground">
            Test any custom date range or full FY period before generating credit notes.
          </span>
          <button
            type="button"
            onClick={handlePreview}
            disabled={!selectedSchemeId || previewLoading || generateLoading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md bg-brand-600 text-white hover:bg-brand-700 disabled:opacity-50 transition-colors"
          >
            {previewLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Calculating...
              </>
            ) : (
              <>
                <Calculator className="w-3.5 h-3.5" />
                Preview Calculation
              </>
            )}
          </button>
        </div>

        {/* Content / Preview Results */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 min-h-[260px]">
          {!previewData && !previewLoading && (
            <div className="h-full flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
              <div className="p-3 rounded-full bg-muted mb-3">
                <Calculator className="w-6 h-6" />
              </div>
              <p className="text-sm font-medium text-foreground">No Preview Generated</p>
              <p className="text-xs max-w-sm mt-1">
                Select a turnover scheme, confirm the test date range, and click Preview Calculation to evaluate customer qualifying turnover and slabs.
              </p>
            </div>
          )}

          {previewData && (
            <>
              {/* Summary Strip */}
              <div className="grid grid-cols-3 gap-3 p-3.5 bg-muted/40 rounded-lg border border-border">
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">Customers Checked</span>
                  <p className="text-base font-semibold text-foreground mt-0.5">
                    {previewData.summary.total_customers_checked}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">Eligible for Discount</span>
                  <p className="text-base font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                    {previewData.summary.eligible_customers_count}
                  </p>
                </div>
                <div>
                  <span className="text-[11px] text-muted-foreground uppercase font-medium">Total Credit Amount</span>
                  <p className="text-base font-semibold text-brand-600 dark:text-brand-400 mt-0.5">
                    {formatINR(previewData.summary.total_taxable_credit_amount)}
                  </p>
                </div>
              </div>

              {/* Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted text-muted-foreground font-medium border-b border-border">
                    <tr>
                      <th className="px-3 py-2.5">Customer</th>
                      <th className="px-3 py-2.5 text-center">Invoices</th>
                      <th className="px-3 py-2.5 text-right">Qualifying Turnover</th>
                      <th className="px-3 py-2.5 text-center">Achieved Slab</th>
                      <th className="px-3 py-2.5 text-right">Taxable Credit</th>
                      <th className="px-3 py-2.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {previewData.calculations.map((row: any) => (
                      <tr key={row.customer_id} className="hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 font-medium text-foreground">
                          {row.customer_name}
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            {row.customer_code}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center text-muted-foreground">
                          {row.qualifying_invoices_count}
                        </td>
                        <td className="px-3 py-2.5 text-right font-medium text-foreground">
                          {formatINR(row.qualifying_turnover)}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.achieved_slab ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-brand-50 text-brand-700 dark:bg-brand-950/50 dark:text-brand-300">
                              {row.discount_percentage}%
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 text-right font-semibold text-foreground">
                          {row.taxable_credit_amount > 0 ? formatINR(row.taxable_credit_amount) : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          {row.status === "ELIGIBLE" && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300">
                              <CheckCircle2 className="w-3 h-3" /> Eligible
                            </span>
                          )}
                          {row.status === "ALREADY_GENERATED" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                              Already Generated
                            </span>
                          )}
                          {row.status === "BELOW_THRESHOLD" && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300">
                              Below Threshold
                            </span>
                          )}
                          {row.status === "NO_INVOICES" && (
                            <span className="text-muted-foreground text-[11px]">No Invoices</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-muted/30">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-md border border-input bg-background hover:bg-muted transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!previewData || eligibleCount === 0 || generateLoading}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-medium rounded-md bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {generateLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                Generate {eligibleCount > 0 ? `${eligibleCount} ` : ""}Pending Credit Note(s)
                <ArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
