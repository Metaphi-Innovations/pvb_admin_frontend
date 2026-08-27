"use client";

import { useEffect, useMemo, useState } from "react";
import { SearchableSelect } from "./SearchableSelect";
import { CreditNoteFormApi } from "../credit-note-form-api";

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
  const [options, setOptions] = useState<{ value: string; label: string; sub?: string }[]>([]);

  useEffect(() => {
    let cancelled = false;
    CreditNoteFormApi.listManualLedgers()
      .then((rows) => {
        if (cancelled) return;
        setOptions(
          rows.map((r) => ({
            value: r.ledgerId,
            label: r.ledgerName,
            sub: r.ledgerCode,
          })),
        );
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const merged = useMemo(() => {
    if (value && !options.some((o) => o.value === value)) {
      return [
        { value, label: fallbackLabel || value, sub: "Selected" },
        ...options,
      ];
    }
    return options;
  }, [options, value, fallbackLabel]);

  return (
    <SearchableSelect
      label={label}
      value={value}
      onChange={(id) => {
        const opt = merged.find((o) => o.value === id);
        onChange(id, opt?.label || fallbackLabel || "");
      }}
      options={merged}
      placeholder={placeholder || "Select ledger…"}
      required={required}
      disabled={disabled}
    />
  );
}
