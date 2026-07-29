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
import { ACCOUNTS_FILTER_CONTROL_CLASS as filterControlClass } from "@/components/accounts/ReportFilters";
import { cn } from "@/lib/utils";

const MAX_BREAKPOINTS = 8;
const MIN_BREAKPOINTS = 2;

export interface AgeingBreakpointPanelProps {
  draft: string[];
  onDraftChange: (draft: string[]) => void;
  onApply: (breakpoints: AgeingBreakpoints) => void;
  error: string | null;
  onErrorChange: (error: string | null) => void;
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
  if (value <= prev) {
    return `Must be greater than ${prev}.`;
  }

  for (let i = index + 1; i < draft.length; i++) {
    const nextRaw = draft[i]?.trim();
    if (!nextRaw) continue;
    const next = Number(nextRaw);
    if (Number.isFinite(next) && next <= value) {
      return `Must be less than ${next}.`;
    }
  }

  return null;
}

export function AgeingBreakpointPanel({
  draft,
  onDraftChange,
  onApply,
  error,
  onErrorChange,
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
    if (index === 0 || draft.length <= MIN_BREAKPOINTS) return;
    onDraftChange(draft.filter((_, i) => i !== index));
    if (error) onErrorChange(null);
  };

  const canRemove = (index: number) => index > 0 && draft.length > MIN_BREAKPOINTS;

  const handleApply = () => {
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
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5 pb-2.5 border-b border-border/60">
      <span className="text-xs font-medium text-foreground shrink-0">Ageing Days:</span>
      <div className="flex flex-wrap items-center gap-1.5">
        {draft.map((value, index) => {
          const fieldError = getBreakpointFieldError(draft, index);
          return (
            <Fragment key={`bp-${index}`}>
              {index > 0 && <span className="text-xs text-muted-foreground px-0.5">|</span>}
              <div className="flex items-center gap-0.5">
                <div className="flex flex-col">
                  <Input
                    ref={(el) => {
                      inputRefs.current[index] = el;
                    }}
                    value={value}
                    readOnly={index === 0}
                    disabled={index === 0}
                    onChange={(e) => setBreakpoint(index, e.target.value)}
                    placeholder={index === 0 ? undefined : value ? undefined : "Days"}
                    className={cn(
                      filterControlClass,
                      "w-[52px] h-8 text-center px-1.5",
                      index === 0 && "bg-muted/30",
                      fieldError && "border-red-400 focus-visible:ring-red-300",
                    )}
                    aria-label={index === 0 ? "First ageing breakpoint" : `Ageing breakpoint ${index + 1}`}
                    aria-invalid={fieldError ? true : undefined}
                  />
                  {fieldError && (
                    <span className="text-[10px] text-red-500 mt-0.5 max-w-[72px] leading-tight">
                      {fieldError}
                    </span>
                  )}
                </div>
                {canRemove(index) && (
                  <button
                    type="button"
                    onClick={() => removeBreakpoint(index)}
                    className="p-0.5 rounded hover:bg-muted text-muted-foreground self-start mt-1.5"
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
            className="inline-flex items-center justify-center w-7 h-8 rounded-lg border border-border hover:bg-muted text-muted-foreground"
            aria-label="Add breakpoint"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white shrink-0"
        onClick={handleApply}
      >
        Apply
      </Button>
      {error && <p className="w-full text-xs text-red-500">{error}</p>}
    </div>
  );
}
