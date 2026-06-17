"use client";

import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import {
  loadAccountingSettings,
  saveAccountingSettings,
  type AccountingSettings,
} from "@/lib/accounts/accounting-settings-data";
import { loadLedgerMappings } from "@/lib/accounts/ledger-mappings";

export default function AccountingSettingsPageClient() {
  const [settings, setSettings] = useState(loadAccountingSettings());
  const [mappings] = useState(loadLedgerMappings());

  const update = (patch: Partial<AccountingSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAccountingSettings(next);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Accounting Settings")}
      title="Accounting Settings"
      description="Auto-posting rules, approval workflow and ERP ledger mapping configuration."
      layout="standard"
    >
      <div className="p-5 space-y-6 overflow-auto">
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            Auto-Posting (ERP Integration)
          </h2>
          {(
            [
              ["autoPostSales", "Sales Invoice → accounting entries"],
              ["autoPostPurchase", "Purchase Invoice approval → accounting entries"],
              ["autoPostHrClaims", "Approved employee claims → payable entries"],
              ["autoPostStockAdj", "Stock adjustments → inventory accounting"],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
              <div>
                <p className="text-xs font-medium">{label}</p>
              </div>
              <Switch checked={settings[key]} onCheckedChange={(v) => update({ [key]: v })} />
            </div>
          ))}
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            Voucher Workflow
          </h2>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <p className="text-xs font-medium">Require approval before posting</p>
              <p className="text-[11px] text-muted-foreground">Draft → Approved → Posted</p>
            </div>
            <Switch
              checked={settings.requireVoucherApproval}
              onCheckedChange={(v) => update({ requireVoucherApproval: v })}
            />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            Ledger Mappings
          </h2>
          <table className="w-full text-table border border-border/60 rounded-lg overflow-hidden">
            <thead className="bg-muted/20">
              <tr>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Key</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Target Sub-Group</th>
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Module</th>
              </tr>
            </thead>
            <tbody>
              {mappings.map((m) => (
                <tr key={m.mappingKey} className="border-t border-border/40">
                  <td className="px-3 py-2 text-xs font-mono">{m.mappingKey}</td>
                  <td className="px-3 py-2 text-xs">{m.subGroupName}</td>
                  <td className="px-3 py-2 text-xs capitalize">{m.module}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </AccountsPageShell>
  );
}
