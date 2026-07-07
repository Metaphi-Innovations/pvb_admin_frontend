"use client";

import React, { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  type ImportTransactionsInput,
} from "@/lib/accounts/bank-transaction-categorization";
import { listBankAccountSelectOptions } from "@/lib/accounts/bank-accounts-data";

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
    <div className="flex items-center justify-center min-h-screen bg-slate-50 p-6">
      <div className="w-full max-w-2xl">
        <div className="rounded-xl border border-border/50 bg-white shadow-lg p-8">
          {/* Header */}
          <div className="flex items-center gap-3 mb-6 pb-6 border-b border-border/30">
            <div className="w-12 h-12 rounded-xl bg-brand-50 text-brand-700 flex items-center justify-center">
              <Upload className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground">Import Bank Statement</h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                Upload Excel or CSV file to import transactions
              </p>
            </div>
          </div>

          {/* Select Form */}
          {step === "select" && (
            <div className="space-y-5">
              <div className="space-y-2">
                <Label>
                  Bank Account <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={bankAccountId?.toString() || ""}
                  onValueChange={(v) => setBankAccountId(parseInt(v))}
                >
                  <SelectTrigger className="h-10">
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

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>
                    Statement Month <span className="text-red-500">*</span>
                  </Label>
                  <Select value={month.toString()} onValueChange={(v) => setMonth(parseInt(v))}>
                    <SelectTrigger className="h-10">
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

                <div className="space-y-2">
                  <Label>
                    Statement Year <span className="text-red-500">*</span>
                  </Label>
                  <Select value={year.toString()} onValueChange={(v) => setYear(parseInt(v))}>
                    <SelectTrigger className="h-10">
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

              <div className="space-y-2">
                <Label>
                  Upload File <span className="text-red-500">*</span>
                </Label>
                <div className="border-2 border-dashed border-border/60 rounded-lg p-6 bg-slate-50/50 hover:bg-slate-50 transition-colors">
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
                    <FileSpreadsheet className="w-12 h-12 text-muted-foreground/40 mb-3" />
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
                <div className="rounded-md bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <Button
                  className="flex-1 h-10"
                  onClick={handleUpload}
                  disabled={!bankAccountId || !file}
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Statement
                </Button>
                <Button variant="outline" className="h-10" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </div>
          )}

          {/* Uploading */}
          {step === "uploading" && (
            <div className="py-12 text-center">
              <div className="w-16 h-16 rounded-full border-4 border-brand-200 border-t-brand-600 animate-spin mx-auto mb-4" />
              <p className="text-base font-medium text-foreground">Importing transactions...</p>
              <p className="text-sm text-muted-foreground mt-2">This may take a few moments</p>
            </div>
          )}

          {/* Success */}
          {step === "success" && result && (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-8 h-8" />
              </div>
              <h2 className="text-base font-semibold text-center text-foreground mb-2">
                Import Successful!
              </h2>
              <p className="text-sm text-center text-muted-foreground mb-6">
                Your bank statement has been imported successfully
              </p>
              <div className="rounded-lg border border-border/60 bg-slate-50/50 p-4 space-y-2 mb-6">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Transactions imported:</span>
                  <span className="font-semibold text-foreground">{result.imported}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Skipped:</span>
                  <span className="font-medium text-muted-foreground">{result.skipped}</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button className="flex-1 h-10" onClick={() => router.push("/accounts/banking/transactions")}>
                  View Transactions
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
                <Button variant="outline" className="h-10" onClick={reset}>
                  Import Another
                </Button>
              </div>
            </div>
          )}

          {/* Error */}
          {step === "error" && (
            <div className="py-8">
              <div className="w-16 h-16 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-base font-semibold text-center text-foreground mb-2">
                Import Failed
              </h2>
              <p className="text-sm text-center text-muted-foreground mb-6">{error}</p>
              <div className="flex gap-3">
                <Button className="flex-1 h-10" onClick={reset}>
                  Try Again
                </Button>
                <Button variant="outline" className="h-10" onClick={() => router.back()}>
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Help Text */}
        <div className="mt-6 rounded-lg border border-border/60 bg-white p-4">
          <h3 className="text-sm font-semibold text-foreground mb-2">Expected File Format</h3>
          <div className="text-xs text-muted-foreground space-y-1">
            <p>• Columns: Date, Narration, Reference Number, Debit, Credit, Balance</p>
            <p>• Date format: DD/MM/YYYY or YYYY-MM-DD</p>
            <p>• Amounts should be numeric (commas are automatically removed)</p>
            <p>• Supports all major Indian bank statement formats</p>
          </div>
        </div>
      </div>
    </div>
  );
}
