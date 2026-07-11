"use client";

import { useState } from "react";
import Link from "next/link";
import { Switch } from "@/components/ui/switch";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import {
  ACCOUNTING_SETTINGS_HREF,
  accountingSettingsSetupLinks,
  accountsBreadcrumb,
} from "@/lib/accounts/accounts-nav";
import {
  loadAccountingSettings,
  saveAccountingSettings,
  type AccountingSettings,
} from "@/lib/accounts/accounting-settings-data";
import { loadLedgerMappings } from "@/lib/accounts/ledger-mappings";

export default function AccountingSettingsPageClient() {
  const [settings, setSettings] = useState(loadAccountingSettings());
  const [mappings] = useState(loadLedgerMappings());
  const setupLinks = accountingSettingsSetupLinks();

  const update = (patch: Partial<AccountingSettings>) => {
    const next = { ...settings, ...patch };
    setSettings(next);
    saveAccountingSettings(next);
  };

  return (
    <AccountsPageShell
      breadcrumbs={accountsBreadcrumb("Masters", "Accounting Settings", ACCOUNTING_SETTINGS_HREF)}
      title="Accounting Settings"
      description="Setup and configuration for financial years, tax, voucher numbering and posting rules."
      layout="standard"
    >
      <div className="p-5 space-y-6 overflow-auto">
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            Setup
          </h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {setupLinks.map((link) => {
              const Icon = link.icon;
              const isOnPageAnchor = link.href.startsWith(`${ACCOUNTING_SETTINGS_HREF}#`);
              const inner = (
                <div className="flex items-start gap-3">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-50 text-brand-700 flex-shrink-0">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">{link.label}</p>
                    {link.description ? (
                      <p className="mt-0.5 text-xs leading-snug text-muted-foreground truncate">
                        {link.description}
                      </p>
                    ) : null}
                  </div>
                </div>
              );

              if (isOnPageAnchor) {
                return (
                  <a
                    key={link.label}
                    href={link.href}
                    className="rounded-lg border border-border bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                  >
                    {inner}
                  </a>
                );
              }

              return (
                <Link
                  key={link.label}
                  href={link.href}
                  className="rounded-lg border border-border bg-white p-3 transition-colors hover:border-brand-300 hover:bg-brand-50/30"
                >
                  {inner}
                </Link>
              );
            })}
          </div>
        </section>

        <section id="posting-defaults" className="space-y-3 scroll-mt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            Posting Defaults
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

        <section id="accounting-preferences" className="space-y-3 scroll-mt-4">
          <h2 className="text-xs font-bold uppercase tracking-widest text-muted-foreground border-b border-border/60 pb-2">
            Accounting Preferences
          </h2>
          <div className="flex items-center justify-between rounded-lg border border-border bg-muted/20 p-3">
            <div>
              <p className="text-xs font-medium">Require approval before posting</p>
              <p className="text-xs text-muted-foreground">Draft → Approved → Posted</p>
            </div>
            <Switch
              checked={settings.requireVoucherApproval}
              onCheckedChange={(v) => update({ requireVoucherApproval: v })}
            />
          </div>

          <div className="space-y-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ledger Mappings
            </h3>
            <table className="accounts-table w-full border border-border/60 rounded-lg overflow-hidden">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Key</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Target Sub-Group</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold uppercase text-muted-foreground">Module</th>
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
          </div>
        </section>
      </div>
    </AccountsPageShell>
  );
}
