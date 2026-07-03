"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Paperclip, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AccountsFormLayout } from "@/app/(app)/accounts/expenses/components/AccountsFormLayout";
import { formatMoney } from "@/lib/accounts/money-format";
import { ensureBankingDemoOnPageLoad } from "@/lib/accounts/banking-demo-seed";
import { loadBankAccounts } from "@/lib/accounts/bank-accounts-data";
import {
  createFundTransfer,
  FUND_TRANSFER_MODE_LABELS,
  FUND_TRANSFER_MODES,
  getAvailableTransferBalance,
  listTransferAccountOptions,
  peekNextTransferNo,
  type FundTransferMode,
} from "@/lib/accounts/fund-transfer-data";
import { cn } from "@/lib/utils";

const REFERENCE_REQUIRED_MODES: FundTransferMode[] = ["neft", "rtgs", "imps", "upi", "cheque"];

export default function FundTransferFormClient() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [transferNo] = useState(() => peekNextTransferNo());
  const [form, setForm] = useState({
    transferDate: new Date().toISOString().slice(0, 10),
    transferMode: "neft" as FundTransferMode,
    fromAccountId: "",
    toAccountId: "",
    amount: "",
    referenceNo: "",
    narration: "",
    attachmentName: "",
    attachmentDataUrl: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    ensureBankingDemoOnPageLoad();
    loadBankAccounts();
  }, []);

  const accountOptions = useMemo(
    () => listTransferAccountOptions(form.transferMode),
    [form.transferMode],
  );

  const availableBalance = useMemo(() => {
    if (!form.fromAccountId) return null;
    return getAvailableTransferBalance(Number(form.fromAccountId));
  }, [form.fromAccountId, form.transferDate]);

  const referenceRequired = REFERENCE_REQUIRED_MODES.includes(form.transferMode);

  const setMode = (mode: FundTransferMode) => {
    setForm((prev) => ({
      ...prev,
      transferMode: mode,
      fromAccountId: "",
      toAccountId: "",
      referenceNo: REFERENCE_REQUIRED_MODES.includes(mode) ? prev.referenceNo : "",
    }));
    setError(null);
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setForm((prev) => ({
        ...prev,
        attachmentName: file.name,
        attachmentDataUrl: typeof reader.result === "string" ? reader.result : "",
      }));
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const save = () => {
    setError(null);
    if (!form.fromAccountId || !form.toAccountId) {
      setError("From Account and To Account are required.");
      return;
    }
    const amount = Number(form.amount);
    if (!amount || amount <= 0) {
      setError("Amount must be greater than zero.");
      return;
    }
    if (referenceRequired && !form.referenceNo.trim()) {
      setError(`Reference No. is required for ${FUND_TRANSFER_MODE_LABELS[form.transferMode]}.`);
      return;
    }

    setSaving(true);
    try {
      createFundTransfer({
        transferDate: form.transferDate,
        transferMode: form.transferMode,
        fromAccountId: Number(form.fromAccountId),
        toAccountId: Number(form.toAccountId),
        amount,
        referenceNo: form.referenceNo,
        narration: form.narration,
        attachmentName: form.attachmentName || undefined,
        attachmentDataUrl: form.attachmentDataUrl || undefined,
      });
      router.push("/accounts/banking/fund-transfer");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save transfer.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AccountsFormLayout
      title="New Fund Transfer"
      breadcrumb={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Banking", href: "/accounts/banking/bank-accounts" },
        { label: "Fund Transfer", href: "/accounts/banking/fund-transfer" },
        { label: "New", href: "/accounts/banking/fund-transfer/new" },
      ]}
      code={transferNo}
      footer={
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={() => router.back()}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-9 text-[13px] font-medium bg-brand-600 hover:bg-brand-700 text-white"
            disabled={saving}
            onClick={save}
          >
            {saving ? "Saving…" : "Save Transfer"}
          </Button>
        </div>
      }
    >
      <div className="max-w-2xl space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2.5 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-red-700">{error}</p>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Transfer Date <span className="text-red-500">*</span>
            </Label>
            <Input
              type="date"
              className="h-9 text-sm rounded-lg"
              value={form.transferDate}
              onChange={(e) => setForm({ ...form, transferDate: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Transfer No.</Label>
            <Input
              className="h-9 text-sm rounded-lg font-mono bg-muted/30"
              value={transferNo}
              readOnly
            />
            <p className="text-[11px] text-muted-foreground">Auto-generated on save</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Transfer Mode <span className="text-red-500">*</span>
            </Label>
            <Select value={form.transferMode} onValueChange={(v) => setMode(v as FundTransferMode)}>
              <SelectTrigger className="h-9 text-sm rounded-lg">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FUND_TRANSFER_MODES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {FUND_TRANSFER_MODE_LABELS[m]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Amount <span className="text-red-500">*</span>
            </Label>
            <AccountsMoneyInput
              className="h-9 text-sm rounded-lg"
              value={form.amount}
              onChange={(v) => setForm({ ...form, amount: String(v) })}
              placeholder="0.00"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              From Account <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.fromAccountId || "none"}
              onValueChange={(v) => setForm({ ...form, fromAccountId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-9 text-sm rounded-lg">
                <SelectValue placeholder="Select source account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select…</SelectItem>
                {accountOptions.from.map((a) => (
                  <SelectItem key={a.id} value={String(a.id)}>
                    {a.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableBalance != null && form.fromAccountId && (
              <p className="text-[11px] text-muted-foreground">
                Available balance:{" "}
                <span className="font-medium text-foreground tabular-nums">
                  {formatMoney(availableBalance)}
                </span>
              </p>
            )}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              To Account <span className="text-red-500">*</span>
            </Label>
            <Select
              value={form.toAccountId || "none"}
              onValueChange={(v) => setForm({ ...form, toAccountId: v === "none" ? "" : v })}
            >
              <SelectTrigger className="h-9 text-sm rounded-lg">
                <SelectValue placeholder="Select destination account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Select…</SelectItem>
                {accountOptions.to
                  .filter((a) => String(a.id) !== form.fromAccountId)
                  .map((a) => (
                    <SelectItem key={a.id} value={String(a.id)}>
                      {a.label}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium">
              Reference No.
              {referenceRequired && <span className="text-red-500"> *</span>}
            </Label>
            <Input
              className="h-9 text-sm rounded-lg font-mono"
              value={form.referenceNo}
              onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
              placeholder={
                referenceRequired
                  ? "Bank / UPI / cheque reference"
                  : "Optional for cash deposit or withdrawal"
              }
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label className="text-xs font-medium">Narration</Label>
            <Textarea
              className="text-sm min-h-[72px] rounded-lg"
              value={form.narration}
              onChange={(e) => setForm({ ...form, narration: e.target.value })}
              placeholder="Transfer purpose or notes"
              rows={3}
            />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-muted/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Attachment</Label>
            <span className="text-[11px] text-muted-foreground">Optional</span>
          </div>
          <input
            ref={fileRef}
            type="file"
            className="hidden"
            accept=".pdf,.png,.jpg,.jpeg,.doc,.docx,.xls,.xlsx"
            onChange={onFilePick}
          />
          {form.attachmentName ? (
            <div className="flex items-center gap-2 text-xs bg-white border border-border rounded-lg px-3 py-2">
              <Paperclip className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="flex-1 truncate font-medium">{form.attachmentName}</span>
              <button
                type="button"
                className="p-1 hover:bg-muted rounded"
                onClick={() =>
                  setForm({ ...form, attachmentName: "", attachmentDataUrl: "" })
                }
              >
                <Trash2 className="w-4 h-4 text-red-500" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "w-full flex items-center justify-center gap-2 h-9 text-xs border border-dashed border-border",
                "rounded-lg hover:bg-muted/40 text-muted-foreground",
              )}
            >
              <Upload className="w-4 h-4" />
              Upload supporting document
            </button>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground">
          Saving posts a contra voucher — debiting the destination account and crediting the source
          account. Impacts Bank Book, Cash Book, General Ledger and Trial Balance.
        </p>
      </div>
    </AccountsFormLayout>
  );
}
