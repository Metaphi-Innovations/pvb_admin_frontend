"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, FileSpreadsheet, CheckCircle2, AlertCircle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  importBankStatement,
} from "@/lib/accounts/bank-transaction-categorization";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";

type UploadStep = "select" | "uploading" | "success" | "error";

export function StatementImportClient() {
  const router = useRouter();
  const [step, setStep] = useState<UploadStep>("select");
  const [bankAccountId, setBankAccountId] = useState<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [error, setError] = useState("");
  const [result, setResult] = useState<{ imported: number; skipped: number } | null>(null);

  const bankAccounts = React.useMemo(() => listBankAccountSelectOptions(), []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    const ext = selected.name.split(".").pop()?.toLowerCase();
    if (ext !== "xlsx" && ext !== "xls" && ext !== "csv") {
      setError("Please select an Excel (.xlsx, .xls) or CSV (.csv) file");
      return;
    }

    setFile(selected);
    setError("");
  }, []);

  const handleUpload = async () => {
    if (!bankAccountId || !file) {
      setError("Please select a bank account and file");
      return;
    }

    setStep("uploading");
    setError("");

    try {
      const res = await importBankStatement({
        bankAccountId,
        file,
        statementMonth: month,
        statementYear: year,
      });
      setResult(res);
      setStep("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to import statement");
      setStep("error");
    }
  };

  const reset = () => {
    setStep("select");
    setFile(null);
    setError("");
    setResult(null);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Banking", "Statement Import")}
      title="Import Bank Statement"
      description="Upload Excel or CSV file to import transactions"
      layout="form"
      className="min-h-0 overflow-y-auto"
    >
      <div className="w-full max-w-2xl mx-auto">
        <div className="rounded-xl border border-border bg-white shadow-sm p-6">
          <div className="flex items-center gap-3 mb-5 pb-4 border-b border-border/60">
            <div className="w-10 h-10 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Upload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Statement file</h2>
              <p className="text-[11px] text-muted-foreground">
                Select account, period, and upload file
              </p>
            </div>
          </div>

          {step === "select" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Bank Account <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={bankAccountId?.toString() || ""}
                  onValueChange={(v) => setBankAccountId(parseInt(v))}
                >
                  <SelectTrigger className="h-8 text-xs accounts-filter-control">
                    <SelectValue placeholder="Select bank account" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id.toString()}>
                        {acc.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Statement Month <span className="text-red-500">*</span>
                  </Label>
                  <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs accounts-filter-control">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <SelectItem key={m} value={m.toString()}>
                          {new Date(2000, m - 1).toLocaleString("default", { month: "long" })}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Statement Year <span className="text-red-500">*</span>
                  </Label>
                  <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                    <SelectTrigger className="h-8 text-xs accounts-filter-control">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                        <SelectItem key={y} value={y.toString()}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Upload File <span className="text-red-500">*</span>
                </Label>
                <div className="border-2 border-dashed border-border/60 rounded-lg p-5 bg-muted/20 hover:bg-muted/30 transition-colors">
                  <input
                    type="file"
                    id="file-upload"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <label
                    htmlFor="file-upload"
                    className="flex flex-col items-center justify-center cursor-pointer"
                  >
                    <FileSpreadsheet className="w-10 h-10 text-muted-foreground/40 mb-2" />
                    <p className="text-sm font-medium text-foreground">
                      {file ? file.name : "Click to upload or drag and drop"}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Excel (.xlsx, .xls) or CSV (.csv) files only
                    </p>
                  </label>
                </div>
              </div>

              {error && (
                <div className="rounded-md bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <Button
                  className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "flex-1 bg-brand-600 hover:bg-brand-700 text-white border-0")}
                  onClick={handleUpload}
                  disabled={!bankAccountId || !file}
                >
                  <Upload className="w-3.5 h-3.5 mr-1.5" />
                  Import Statement
                </Button>
                <Button
                  variant="outline"
                  className={ACCOUNTS_ACTION_BUTTON_CLASS}
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {step === "uploading" && (
            <div className="py-10 text-center">
              <div className="w-12 h-12 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground">Importing transactions...</p>
              <p className="text-xs text-muted-foreground mt-1">This may take a few moments</p>
            </div>
          )}

          {step === "success" && result && (
            <div className="py-6">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-3">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="accounts-card-title text-center mb-1">Import Successful!</h2>
              <p className="text-xs text-center text-muted-foreground mb-5">
                Your bank statement has been imported successfully
              </p>
              <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-1.5 mb-5">
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Transactions imported:</span>
                  <span className="font-semibold text-foreground">{result.imported}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">Skipped:</span>
                  <span className="font-medium text-muted-foreground">{result.skipped}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "flex-1 bg-brand-600 hover:bg-brand-700 text-white border-0")}
                  onClick={() => router.push("/accounts/banking/transactions")}
                >
                  View Transactions
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                </Button>
                <Button variant="outline" className={ACCOUNTS_ACTION_BUTTON_CLASS} onClick={reset}>
                  Import Another
                </Button>
              </div>
            </div>
          )}

          {step === "error" && (
            <div className="py-6">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-3">
                <AlertCircle className="w-6 h-6" />
              </div>
              <h2 className="accounts-card-title text-center mb-1">Import Failed</h2>
              <p className="text-xs text-center text-muted-foreground mb-5">{error}</p>
              <div className="flex gap-2">
                <Button
                  className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "flex-1 bg-brand-600 hover:bg-brand-700 text-white border-0")}
                  onClick={reset}
                >
                  Try Again
                </Button>
                <Button
                  variant="outline"
                  className={ACCOUNTS_ACTION_BUTTON_CLASS}
                  onClick={() => router.back()}
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-white shadow-sm p-4">
          <h3 className="accounts-card-title mb-2">Expected File Format</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Columns: Date, Narration, Reference Number, Debit, Credit, Balance</p>
            <p>• Date format: DD/MM/YYYY or YYYY-MM-DD</p>
            <p>• Amounts should be numeric (commas are automatically removed)</p>
            <p>• Supports all major Indian bank statement formats</p>
          </div>
        </div>
      </div>
    </AccountsPageShell>
  );
}
