"use client";

import React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  HR_LABEL_CLASS,
  HR_HELPER_CLASS,
  HR_ERROR_CLASS,
  HR_SUCCESS_CLASS,
  HR_FIELD_SIZE,
  hrSpan,
  type HrSpan,
  type HrFieldSize,
} from "./hr-org-form";

/**
 * Label + control + helper/error.
 * `size` maps to grid column span inside the dense 2–3 col layout.
 * Pass `span` only for drawer flex layouts.
 */
export function HrOrgField({
  label,
  required,
  helper,
  error,
  success,
  children,
  className,
  span,
  size = "md",
  htmlFor,
  id,
}: {
  label: string;
  required?: boolean;
  helper?: string;
  error?: string;
  success?: string;
  children: React.ReactNode;
  className?: string;
  span?: HrSpan;
  /** Grid: sm/md = 1 col · lg = 2 cols · full = row */
  size?: HrFieldSize;
  htmlFor?: string;
  id?: string;
}) {
  const errorId = id ? `${id}-error` : undefined;
  const helperId = id ? `${id}-helper` : undefined;

  return (
    <div
      className={cn(
        "space-y-1.5 min-w-0",
        span ? hrSpan(span) : HR_FIELD_SIZE[size],
        className,
      )}
    >
      <Label htmlFor={htmlFor ?? id} className={HR_LABEL_CLASS}>
        {label}
        {required && (
          <span className="text-red-500 ml-0.5" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error && (
        <p id={errorId} role="alert" className={HR_ERROR_CLASS}>
          {error}
        </p>
      )}
      {!error && success && <p className={HR_SUCCESS_CLASS}>{success}</p>}
      {!error && !success && helper && (
        <p id={helperId} className={HR_HELPER_CLASS}>
          {helper}
        </p>
      )}
    </div>
  );
}
