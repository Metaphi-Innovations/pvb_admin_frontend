"use client";

import React, { useState } from "react";
import { CheckCircle2, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

export interface RecordKvRowProps {
  label: string;
  value?: React.ReactNode;
  highlight?: boolean;
  mono?: boolean;
  muted?: boolean;
  copy?: boolean;
  link?: boolean;
  href?: string;
  amount?: boolean;
  isLast?: boolean;
}

export function RecordKvRow({
  label,
  value,
  highlight,
  mono,
  muted,
  copy,
  link,
  href,
  amount,
  isLast,
}: RecordKvRowProps) {
  const [copied, setCopied] = useState(false);
  const text = value === undefined || value === null || value === "" ? "—" : value;

  const copyText = typeof text === "string" ? text : undefined;

  const handleCopy = async () => {
    if (!copyText) return;
    await navigator.clipboard.writeText(copyText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const valueNode =
    link && href && typeof text === "string" ? (
      <a
        href={href}
        className="text-[#1554B4] hover:underline"
        onClick={(e) => e.stopPropagation()}
      >
        {text}
      </a>
    ) : (
      text
    );

  return (
    <div
      className={cn(
        "flex justify-between gap-4 py-2",
        !isLast && "border-b border-[#F0F3FA]",
      )}
    >
      <span className="min-w-[130px] flex-shrink-0 text-[12.5px] font-medium text-[#6B80A0]">
        {label}
      </span>
      <span
        className={cn(
          "flex items-center justify-end gap-1.5 text-right text-[13px] font-medium text-[#3D5473]",
          highlight && "font-bold text-[#0A1628]",
          mono && "font-mono",
          muted && "text-[#9AAAC5]",
          amount && "font-bold tabular-nums",
          copy && "group relative",
        )}
      >
        {valueNode}
        {copy && copyText && (
          <button
            type="button"
            onClick={handleCopy}
            className="opacity-0 group-hover:opacity-100 transition-opacity text-[#6B80A0] hover:text-[#1554B4]"
            aria-label="Copy"
          >
            {copied ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </button>
        )}
      </span>
    </div>
  );
}
