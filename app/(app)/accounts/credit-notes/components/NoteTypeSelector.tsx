"use client";

/**
 * @deprecated Replaced by VoucherNoteSegmentControl for Reference Type.
 * Not imported by active Credit / Debit Note routes.
 */
/** Compact neutral radio group — transaction mode, not navigation. */
export interface NoteTypeOption<T extends string> {
  value: T;
  label: string;
  description?: string;
}

export function NoteTypeSelector<T extends string>({
  label = "Basis",
  value,
  options,
  onChange,
  disabled,
  hideLabel,
}: {
  label?: string;
  value: T;
  options: NoteTypeOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
  hideLabel?: boolean;
}) {
  return (
    <div className="cnz-basis">
      {!hideLabel ? <span className="cnz-basis__lab">{label}</span> : null}
      <div className="cnz-radios" role="radiogroup" aria-label={label}>
        {options.map((opt) => (
          <label key={opt.value} title={opt.description}>
            <input
              type="radio"
              name={`cn-basis-${label}`}
              checked={value === opt.value}
              disabled={disabled}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}
