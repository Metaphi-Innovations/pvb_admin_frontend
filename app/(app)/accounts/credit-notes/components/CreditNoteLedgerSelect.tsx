"use client";

/**
 * Direct Credit Note Supporting Ledger selector.
 * Options come only from GET /accounts/credit-note/eligible-ledgers.
 * Do not fall back to generic COA ledgers.
 */

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "./SearchableSelect";
import { CreditNoteFormApi, creditNoteApiError } from "../credit-note-form-api";

function formatLedgerLabel(name: string, code?: string | null): string {
  const n = name.trim();
  const c = code?.trim();
  if (n && c) return `${n} (${c})`;
  return n || c || "";
}

type LedgerOption = {
  value: string;
  label: string;
  selectedLabel?: string;
  sub?: string;
  ledgerName: string;
};

export function CreditNoteLedgerSelect({
  value,
  fallbackLabel,
  label,
  placeholder,
  disabled,
  required,
  onChange,
}: {
  value: string;
  fallbackLabel?: string;
  label?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  onChange: (ledgerId: string, ledgerName: string) => void;
}) {
  const [options, setOptions] = useState<LedgerOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError(null);
    CreditNoteFormApi.listEligibleSupportingLedgers({ page: 1, page_size: 100 })
      .then((res) => {
        if (cancelled) return;
        setOptions(
          res.items.map((r) => {
            const display = formatLedgerLabel(r.ledger_name, r.ledger_code);
            return {
              value: r.ledger_id,
              label: display,
              selectedLabel: display,
              sub: r.ledger_code?.trim() || undefined,
              ledgerName: r.ledger_name.trim(),
            };
          }),
        );
      })
      .catch((e) => {
        if (cancelled) return;
        setOptions([]);
        setLoadError(
          creditNoteApiError(e, "Could not load eligible Supporting Ledgers."),
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo((): LedgerOption[] => {
    if (value && !options.some((o) => o.value === value)) {
      const name = (fallbackLabel || "").trim() || value;
      const display = `${formatLedgerLabel(name, null)} (unavailable)`;
      return [
        {
          value,
          label: display,
          selectedLabel: display,
          sub: "Not in eligible list",
          ledgerName: name,
        },
        ...options,
      ];
    }
    return options;
  }, [options, value, fallbackLabel]);

  const emptyHint = loadError
    ? loadError
    : !loading && options.length === 0
      ? "No eligible Supporting Ledgers found."
      : null;

  return (
    <div className="min-w-0 space-y-0.5">
      <SearchableSelect
        label={label}
        value={value}
        onChange={(id) => {
          const opt = merged.find((o) => o.value === id);
          onChange(id, opt?.ledgerName || fallbackLabel || "");
        }}
        options={merged}
        placeholder={
          loading ? "Loading ledgers…" : placeholder || "Select supporting ledger…"
        }
        required={required}
        disabled={disabled || loading || Boolean(loadError)}
      />
      {emptyHint ? (
        <p
          className={
            loadError
              ? "text-[10px] text-red-600 leading-tight"
              : "text-[10px] text-muted-foreground leading-tight"
          }
        >
          {emptyHint}
        </p>
      ) : null}
    </div>
  );
}
