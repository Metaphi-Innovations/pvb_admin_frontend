"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Eye, EyeOff, Upload, MapPin, Search, X, Calendar, IndianRupee, Percent, Hash } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// ── Field wrapper ─────────────────────────────────────────────────────────────
interface FieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}

export function Field({ label, required, error, hint, className, children }: FieldProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      {label && (
        <Label className="text-sm font-medium text-foreground">
          {label}
          {required && <span className="text-red-500 ml-0.5">*</span>}
        </Label>
      )}
      {children}
      {error && (
        <p className="text-[11px] text-red-500 font-medium">{error}</p>
      )}
      {hint && !error && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}

// ── Text input ────────────────────────────────────────────────────────────────
interface TextFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  prefix?: React.ReactNode;
  suffix?: React.ReactNode;
  fieldClassName?: string;
  className?: string;
  [key: string]: any;
}

export function TextField({
  label, required, error, hint, prefix, suffix, fieldClassName, className, ...props
}: TextFieldProps) {
  return (
    <Field label={label} required={required} error={error} hint={hint} className={fieldClassName}>
      <div className="relative">
        {prefix && (
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {prefix}
          </span>
        )}
        <Input
          className={cn(
            "rounded-input",
            prefix && "pl-9",
            suffix && "pr-9",
            error && "border-red-400 focus-visible:ring-red-400",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground">
            {suffix}
          </span>
        )}
      </div>
    </Field>
  );
}

// ── Password field ────────────────────────────────────────────────────────────
export function PasswordField({
  label = "Password", required, error, hint, fieldClassName, ...props
}: Omit<TextFieldProps, "type">) {
  const [show, setShow] = useState(false);
  const Icon = show ? EyeOff : Eye;
  return (
    <Field label={label} required={required} error={error} hint={hint} className={fieldClassName}>
      <div className="relative">
        <Input
          type={show ? "text" : "password"}
          className={cn("rounded-input pr-10", error && "border-red-400")}
          {...props}
        />
        <button
          type="button"
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          onClick={() => setShow(v => !v)}
          tabIndex={-1}
        >
          <Icon className="w-4 h-4" />
        </button>
      </div>
    </Field>
  );
}

// ── Amount field ──────────────────────────────────────────────────────────────
export function AmountField({ label = "Amount", ...props }: Omit<TextFieldProps, "type">) {
  return (
    <TextField
      label={label}
      type="number"
      prefix={<IndianRupee className="w-3.5 h-3.5" />}
      {...props}
    />
  );
}

// ── Percentage field ──────────────────────────────────────────────────────────
export function PercentField({ label = "Percentage", ...props }: Omit<TextFieldProps, "type">) {
  return (
    <TextField
      label={label}
      type="number"
      suffix={<Percent className="w-3.5 h-3.5" />}
      {...props}
    />
  );
}

// ── GST field ─────────────────────────────────────────────────────────────────
export function GSTField({ label = "GSTIN", ...props }: Omit<TextFieldProps, "type">) {
  return (
    <TextField
      label={label}
      placeholder="22AAAAA0000A1Z5"
      maxLength={15}
      hint="15-character GST identification number"
      {...props}
    />
  );
}

// ── HSN field ─────────────────────────────────────────────────────────────────
export function HSNField({ label = "HSN Code", ...props }: Omit<TextFieldProps, "type">) {
  return (
    <TextField
      label={label}
      prefix={<Hash className="w-3.5 h-3.5" />}
      placeholder="12345678"
      maxLength={8}
      {...props}
    />
  );
}

// ── Mobile field ──────────────────────────────────────────────────────────────
export function MobileField({ label = "Mobile Number", ...props }: Omit<TextFieldProps, "type">) {
  return (
    <Field label={label} required={props.required} error={props.error}>
      <div className="flex">
        <span className="inline-flex items-center px-3 rounded-l-input border border-r-0 border-border bg-muted/50 text-muted-foreground text-sm font-medium">
          +91
        </span>
        <Input
          type="tel"
          maxLength={10}
          className="rounded-l-none rounded-r-input"
          placeholder="98765 43210"
          {...props}
        />
      </div>
    </Field>
  );
}

// ── OTP field ─────────────────────────────────────────────────────────────────
export function OTPField({
  length = 6,
  onChange,
}: {
  length?: number;
  onChange?: (val: string) => void;
}) {
  const [values, setValues] = useState(Array(length).fill(""));
  const refs = React.useRef<(HTMLInputElement | null)[]>([]);

  const handleChange = (idx: number, val: string) => {
    if (!/^\d*$/.test(val)) return;
    const next = [...values];
    next[idx] = val.slice(-1);
    setValues(next);
    onChange?.(next.join(""));
    if (val && idx < length - 1) refs.current[idx + 1]?.focus();
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !values[idx] && idx > 0) {
      refs.current[idx - 1]?.focus();
    }
  };

  return (
    <div className="flex gap-2">
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { refs.current[idx] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={values[idx]}
          onChange={e => handleChange(idx, e.target.value)}
          onKeyDown={e => handleKeyDown(idx, e)}
          className={cn(
            "w-11 h-11 text-center text-lg font-semibold rounded-input border border-border",
            "focus:outline-none focus:ring-2 focus:ring-brand-400 focus:border-brand-400",
            "transition-all bg-white",
            values[idx] && "border-brand-400 bg-brand-50",
          )}
        />
      ))}
    </div>
  );
}

// ── Textarea field ────────────────────────────────────────────────────────────
export function TextareaField({
  label, required, error, hint, className, fieldClassName, ...props
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  fieldClassName?: string;
} & React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <Field label={label} required={required} error={error} hint={hint} className={fieldClassName}>
      <Textarea
        className={cn(
          "rounded-input min-h-[80px] resize-y",
          error && "border-red-400",
          className,
        )}
        {...props}
      />
    </Field>
  );
}

// ── Select field ──────────────────────────────────────────────────────────────
export function SelectField({
  label,
  required,
  error,
  hint,
  placeholder = "Select…",
  options,
  value,
  onValueChange,
  fieldClassName,
}: {
  label?: string;
  required?: boolean;
  error?: string;
  hint?: string;
  placeholder?: string;
  options: { label: string; value: string }[];
  value?: string;
  onValueChange?: (val: string) => void;
  fieldClassName?: string;
}) {
  return (
    <Field label={label} required={required} error={error} hint={hint} className={fieldClassName}>
      <Select value={value} onValueChange={onValueChange}>
        <SelectTrigger
          className={cn("rounded-input", error && "border-red-400")}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(opt => (
            <SelectItem key={opt.value} value={opt.value}>
              {opt.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </Field>
  );
}

// ── GPS field ─────────────────────────────────────────────────────────────────
export function GPSField({
  label = "GPS Location",
  value,
  onChange,
  onCapture,
}: {
  label?: string;
  value?: string;
  onChange?: (val: string) => void;
  onCapture?: () => void;
}) {
  return (
    <Field label={label}>
      <div className="flex gap-2">
        <Input
          value={value}
          onChange={e => onChange?.(e.target.value)}
          placeholder="Lat, Long (e.g. 23.456789, 78.123456)"
          className="rounded-input font-mono text-sm"
          readOnly
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          className="flex-shrink-0 rounded-input border-brand-200 text-brand-600 hover:bg-brand-50"
          onClick={onCapture}
        >
          <MapPin className="w-4 h-4" />
        </Button>
      </div>
    </Field>
  );
}

// ── File upload ───────────────────────────────────────────────────────────────
export function FileUploadField({
  label = "Upload File",
  accept,
  hint,
  onChange,
}: {
  label?: string;
  accept?: string;
  hint?: string;
  onChange?: (files: FileList | null) => void;
}) {
  const [fileName, setFileName] = useState<string>("");
  const ref = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFileName(f?.name ?? "");
    onChange?.(e.target.files);
  };

  return (
    <Field label={label} hint={hint}>
      <div
        className={cn(
          "border-2 border-dashed border-earth-300 rounded-xl p-4",
          "flex flex-col items-center justify-center text-center gap-2 cursor-pointer",
          "hover:border-brand-300 hover:bg-brand-50/50 transition-all",
        )}
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept={accept} className="hidden" onChange={handleChange} />
        <div className="w-9 h-9 rounded-xl bg-brand-50 flex items-center justify-center">
          <Upload className="w-4 h-4 text-brand-500" />
        </div>
        {fileName ? (
          <p className="text-sm font-medium text-brand-600 truncate max-w-xs">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-foreground">
              Click to upload or drag and drop
            </p>
            <p className="text-helper text-muted-foreground">{accept ?? "Any file type"}</p>
          </>
        )}
      </div>
    </Field>
  );
}

// ── Image upload ──────────────────────────────────────────────────────────────
export function ImageUploadField({
  label = "Upload Image",
  preview,
  onChange,
}: {
  label?: string;
  preview?: string;
  onChange?: (file: File | null) => void;
}) {
  const [src, setSrc] = useState(preview ?? "");
  const ref = React.useRef<HTMLInputElement>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSrc(URL.createObjectURL(f));
      onChange?.(f);
    }
  };

  return (
    <Field label={label}>
      <div
        className="w-24 h-24 rounded-xl border-2 border-dashed border-earth-300 overflow-hidden cursor-pointer relative group hover:border-brand-300 transition-colors"
        onClick={() => ref.current?.click()}
      >
        <input ref={ref} type="file" accept="image/*" className="hidden" onChange={handleChange} />
        {src ? (
          <>
            <img src={src} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <Upload className="w-5 h-5 text-white" />
            </div>
          </>
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1">
            <Upload className="w-5 h-5 text-muted-foreground" />
            <span className="text-[10px] text-muted-foreground">Upload</span>
          </div>
        )}
      </div>
    </Field>
  );
}

// ── Form section divider ──────────────────────────────────────────────────────
export function FormSection({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="pb-2 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        {description && (
          <p className="text-helper text-muted-foreground mt-0.5">{description}</p>
        )}
      </div>
      {children}
    </div>
  );
}
