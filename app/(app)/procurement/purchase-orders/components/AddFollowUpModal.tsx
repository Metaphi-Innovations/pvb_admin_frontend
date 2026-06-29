"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown } from "lucide-react";
import type { PurchaseOrder } from "../po-data";
import {
  loadFollowUpsForPO,
  nowDateTimeLocal,
  PO_FOLLOWUP_TYPE_OPTIONS,
  type AddFollowUpInput,
  type POFollowUpType,
} from "../po-followup-data";
import { FollowUpActivityFeed, PanelTitle } from "./FollowUpActivityFeed";

function RemarkToolbar({
  onAction,
}: {
  onAction: (action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number") => void;
}) {
  const btn =
    "h-7 w-7 inline-flex items-center justify-center rounded-md text-muted-foreground hover:bg-muted/60 hover:text-foreground transition-colors";

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 px-2 py-1.5">
      <button type="button" className={btn} onClick={() => onAction("bold")} title="Bold">
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} onClick={() => onAction("italic")} title="Italic">
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} onClick={() => onAction("underline")} title="Underline">
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} onClick={() => onAction("strike")} title="Strikethrough">
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" />
      <button type="button" className={btn} onClick={() => onAction("bullet")} title="Bullet list">
        <List className="h-3.5 w-3.5" />
      </button>
      <button type="button" className={btn} onClick={() => onAction("number")} title="Numbered list">
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

function applyRemarkFormat(
  value: string,
  selectionStart: number,
  selectionEnd: number,
  action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number",
): { next: string; cursor: number } {
  const selected = value.slice(selectionStart, selectionEnd);
  const before = value.slice(0, selectionStart);
  const after = value.slice(selectionEnd);

  if (action === "bullet") {
    const line = selected || "List item";
    const next = `${before}• ${line}${after}`;
    return { next, cursor: before.length + line.length + 2 };
  }
  if (action === "number") {
    const line = selected || "List item";
    const next = `${before}1. ${line}${after}`;
    return { next, cursor: before.length + line.length + 3 };
  }

  const wrappers: Record<string, [string, string]> = {
    bold: ["**", "**"],
    italic: ["_", "_"],
    underline: ["<u>", "</u>"],
    strike: ["~~", "~~"],
  };
  const [open, close] = wrappers[action];
  const inner = selected || "text";
  const next = `${before}${open}${inner}${close}${after}`;
  return { next, cursor: before.length + open.length + inner.length + close.length };
}

export function AddFollowUpModal({
  open,
  onOpenChange,
  po,
  onSubmit,
  readOnly = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PurchaseOrder | null;
  onSubmit: (input: AddFollowUpInput) => void;
  readOnly?: boolean;
}) {
  const remarkRef = useRef<HTMLTextAreaElement>(null);
  const [followUpType, setFollowUpType] = useState<POFollowUpType | "">("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [followUpAt, setFollowUpAt] = useState(nowDateTimeLocal());
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [entries, setEntries] = useState<ReturnType<typeof loadFollowUpsForPO>>([]);

  const refreshEntries = useCallback(() => {
    if (po) setEntries(loadFollowUpsForPO(po.id));
  }, [po]);

  const resetForm = useCallback(() => {
    setFollowUpType("");
    setFollowUpAt(nowDateTimeLocal());
    setNextFollowUpAt("");
    setRemarks("");
    setError("");
  }, []);

  useEffect(() => {
    if (open && po) {
      resetForm();
      refreshEntries();
    }
  }, [open, po?.id, resetForm, refreshEntries]);

  if (!po) return null;

  const handleRemarkAction = (
    action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number",
  ) => {
    const el = remarkRef.current;
    if (!el) return;
    const { selectionStart, selectionEnd } = el;
    const { next, cursor } = applyRemarkFormat(remarks, selectionStart, selectionEnd, action);
    setRemarks(next);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(cursor, cursor);
    });
  };

  const submit = () => {
    if (!followUpType) {
      setError("Follow-up type is required.");
      return;
    }
    if (!remarks.trim()) {
      setError("Remark is required.");
      return;
    }
    onSubmit({
      followUpAt,
      followUpType,
      nextFollowUpAt: nextFollowUpAt || undefined,
      spokeWith: "",
      remarks: remarks.trim(),
    });
    resetForm();
    refreshEntries();
  };

  const typeLabel =
    PO_FOLLOWUP_TYPE_OPTIONS.find((o) => o.value === followUpType)?.label ?? "Select";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className={cn(
          "flex h-[85vh] w-[80vw] max-w-[80vw] flex-col gap-0 overflow-hidden p-0",
          "[&>button]:right-4 [&>button]:top-3.5 [&>button]:text-white [&>button]:opacity-90 [&>button]:hover:opacity-100",
        )}
      >
        <div className="shrink-0 bg-brand-600 px-5 py-3.5 pr-12">
          <DialogTitle className="text-base font-semibold text-white">
            Follow-up &amp; Activities
          </DialogTitle>
          <p className="mt-0.5 text-[11px] text-brand-100">{po.poNumber}</p>
        </div>

        <div
          className={cn(
            "grid min-h-0 flex-1 grid-cols-1 overflow-hidden",
            !readOnly && "lg:grid-cols-2",
          )}
        >
          {!readOnly && (
          <div className="flex min-h-0 flex-col border-b border-border lg:border-b-0 lg:border-r">
            <div className="min-h-0 flex-1 overflow-y-auto p-5">
              <PanelTitle label="Schedule Follow-up" />

              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Follow-up Type <span className="text-red-500">*</span>
                  </Label>
                  <Popover open={typeOpen} onOpenChange={setTypeOpen}>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        className={cn(
                          "flex h-9 w-full items-center justify-between rounded-lg border border-border bg-background px-3 text-sm",
                          !followUpType && "text-muted-foreground",
                        )}
                      >
                        <span className="truncate text-xs">{typeLabel}</span>
                        <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[--radix-popover-trigger-width] p-1" align="start">
                      {PO_FOLLOWUP_TYPE_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => {
                            setFollowUpType(opt.value);
                            setTypeOpen(false);
                            setError("");
                          }}
                          className={cn(
                            "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs hover:bg-muted/60",
                            followUpType === opt.value && "bg-brand-50 text-brand-700",
                          )}
                        >
                          <span className="flex-1">{opt.label}</span>
                          {followUpType === opt.value && (
                            <Check className="h-3.5 w-3.5 shrink-0 text-brand-600" />
                          )}
                        </button>
                      ))}
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Follow-up Date <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="datetime-local"
                    value={followUpAt}
                    onChange={(e) => setFollowUpAt(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Next Follow-up Date</Label>
                  <Input
                    type="date"
                    value={nextFollowUpAt}
                    onChange={(e) => setNextFollowUpAt(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    Remark <span className="text-red-500">*</span>
                  </Label>
                  <div className="overflow-hidden rounded-lg border border-border">
                    <RemarkToolbar onAction={handleRemarkAction} />
                    <Textarea
                      ref={remarkRef}
                      value={remarks}
                      onChange={(e) => {
                        setRemarks(e.target.value);
                        setError("");
                      }}
                      placeholder="Add follow-up notes…"
                      className="min-h-[140px] resize-none rounded-none border-0 text-xs focus-visible:ring-0"
                    />
                  </div>
                </div>

                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>
            </div>

            <div className="shrink-0 flex items-center justify-end gap-2 border-t border-border bg-muted/20 px-5 py-3">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={submit}
              >
                Save
              </Button>
            </div>
          </div>
          )}

          <div className="min-h-0 overflow-y-auto bg-muted/20 p-4">
            <FollowUpActivityFeed entries={entries} compact />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
