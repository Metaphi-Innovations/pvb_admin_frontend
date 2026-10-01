"use client";

import { Fragment, useEffect, useRef } from "react";
import { Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  validateAgeingBreakpoints,
  draftToBreakpoints,
  type AgeingBreakpoints,
} from "@/lib/accounts/ageing-breakpoints";
import {
  ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass,
  ACCOUNTS_FILTER_LABEL_CLASS as filterLabelClass,
} from "@/components/accounts/ReportFilters";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";
import { cn } from "@/lib/utils";

const MAX_BREAKPOINTS = 8;

export interface AgeingBreakpointPanelProps {
  draft: string[];
  onDraftChange: (draft: string[]) => void;
  onApply: (breakpoints: AgeingBreakpoints) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
  className?: string;
}

function getBreakpointFieldError(draft: string[], index: number): string | null {
  if (index === 0) return null;
  const raw = draft[index]?.trim() ?? "";
  if (!raw) return null;

  const value = Number(raw);
  const prev = Number(draft[index - 1]) || 0;
  if (!Number.isFinite(value) || value < 0) {
    return "Enter a valid number.";
  }
  if (value === prev) {
    return "Duplicate value.";
  }
  if (value < prev) {
    return `Must be greater than ${prev}.`;
  }

  for (let i = index + 1; i < draft.length; i++) {
    const nextRaw = draft[i]?.trim();
    if (!nextRaw) continue;
    const next = Number(nextRaw);
    if (!Number.isFinite(next)) continue;
    if (next === value) {
      return "Duplicate value.";
    }
    if (next <= value) {
      return `Must be less than ${next}.`;
    }
  }

  return null;
}

/**
 * Compact Ageing Days filter-bar control (Accounts filter density).
 * Place inside `ReportFilterRow` — not in a popover or separate card.
 */
export function AgeingBreakpointPanel({
  draft,
  onDraftChange,
  onApply,
  error,
  onErrorChange,
  className,
}: AgeingBreakpointPanelProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const pendingFocusIndex = useRef<number | null>(null);

  useEffect(() => {
    if (pendingFocusIndex.current == null) return;
    const el = inputRefs.current[pendingFocusIndex.current];
    if (el) {
      el.focus();
      pendingFocusIndex.current = null;
    }
  }, [draft.length]);

  const setBreakpoint = (index: number, value: string) => {
    if (index === 0) return;
    const next = [...draft];
    next[index] = value.replace(/[^\d]/g, "");
    onDraftChange(next);
    if (error) onErrorChange(null);
  };

  const addBreakpoint = () => {
    if (draft.length >= MAX_BREAKPOINTS) return;
    pendingFocusIndex.current = draft.length;
    onDraftChange([...draft, ""]);
    if (error) onErrorChange(null);
  };

  const removeBreakpoint = (index: number) => {
    if (index === 0 || draft.length <= 1) return;
    onDraftChange(draft.filter((_, i) => i !== index));
    if (error) onErrorChange(null);
  };

  const canRemove = (index: number) => index > 0;

  const handleApply = () => {
    if (draft.length < 2) {
      onErrorChange("Add at least one ageing boundary before applying.");
      return;
    }
    if (draft.some((value, index) => index > 0 && !value.trim())) {
      onErrorChange("Enter a value for each breakpoint before applying.");
      return;
    }

    for (let i = 1; i < draft.length; i++) {
      const fieldError = getBreakpointFieldError(draft, i);
      if (fieldError) {
        onErrorChange(fieldError);
        inputRefs.current[i]?.focus();
        return;
      }
    }

    const breakpoints = draftToBreakpoints(draft);
    const validationError = validateAgeingBreakpoints(breakpoints);
    if (validationError) {
      onErrorChange(validationError);
      return;
    }
    onErrorChange(null);
    onApply(breakpoints);
  };

  return (
    <div className={cn("flex flex-col gap-0.5 min-w-0 shrink-0", className)}>
      <span className={filterLabelClass}>Ageing Days</span>
      <div className="flex flex-wrap items-center gap-1">
        {draft.map((value, index) => {
          const fieldError = getBreakpointFieldError(draft, index);
          return (
            <Fragment key={`bp-${index}`}>
              <div className="relative flex items-center gap-0.5">
                <Input
                  ref={(el) => {
                    inputRefs.current[index] = el;
                  }}
                  value={value}
                  readOnly={index === 0}
                  disabled={index === 0}
                  onChange={(e) => setBreakpoint(index, e.target.value)}
                  placeholder={index === 0 ? undefined : "Days"}
                  className={cn(
                    filterControlClass,
                    "w-[48px] text-center px-1",
                    index === 0 && "bg-muted/40 text-muted-foreground",
                    fieldError && "border-red-400 focus-visible:ring-red-300",
                  )}
                  aria-label={index === 0 ? "First ageing breakpoint" : `Ageing breakpoint ${index + 1}`}
                  aria-invalid={fieldError ? true : undefined}
                  title={fieldError ?? undefined}
                />
                {canRemove(index) && (
                  <button
                    type="button"
                    onClick={() => removeBreakpoint(index)}
                    className="inline-flex items-center justify-center w-5 h-8 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={`Remove breakpoint ${index + 1}`}
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                )}
              </div>
            </Fragment>
          );
        })}
        {draft.length < MAX_BREAKPOINTS && (
          <button
            type="button"
            onClick={addBreakpoint}
            className={cn(
              filterControlClass,
              "inline-flex items-center gap-1 w-auto px-2 text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
            aria-label="Add Bucket"
          >
            <Plus className="w-3 h-3" />
            <span className="whitespace-nowrap">Add Bucket</span>
          </button>
        )}
        <Button
          type="button"
          size="sm"
          className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "px-2.5 bg-brand-600 hover:bg-brand-700 text-white shrink-0")}
          onClick={handleApply}
        >
          Apply
        </Button>
      </div>
      {(error || draft.some((_, i) => getBreakpointFieldError(draft, i))) && (
        <p className="text-[10px] text-red-500 leading-tight max-w-[320px]">
          {error ??
            draft.map((_, i) => getBreakpointFieldError(draft, i)).find(Boolean) ??
            null}
        </p>
      )}
    </div>
  );
}
