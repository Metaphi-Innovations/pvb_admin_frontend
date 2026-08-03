"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useEditor, EditorContent, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import UnderlineExtension from "@tiptap/extension-underline";
import Placeholder from "@tiptap/extension-placeholder";
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

type RemarkListAction = "bullet" | "number";

/** Split soft line breaks inside the selection into separate paragraphs. */
function splitHardBreaksInSelection(editor: Editor): void {
  const { state, view } = editor;
  const { from, to } = state.selection;
  const breaks: number[] = [];

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.type.name === "hardBreak") breaks.push(pos);
  });

  if (breaks.length === 0) return;

  let tr = state.tr;
  breaks.sort((a, b) => b - a);

  for (const pos of breaks) {
    tr = tr.delete(pos, pos + 1);
    const mappedPos = tr.mapping.map(pos);
    const $pos = tr.doc.resolve(mappedPos);
    if ($pos.parent.type.name === "paragraph" && $pos.parentOffset > 0) {
      tr = tr.split(mappedPos);
    }
  }

  view.dispatch(tr);
}

/** Expand selection to fully include every text block in range. */
function expandSelectionToTextblocks(editor: Editor): void {
  const { state } = editor;
  const { from, to } = state.selection;
  if (from === to) return;

  let blockFrom = from;
  let blockTo = to;

  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock) {
      blockFrom = Math.min(blockFrom, pos);
      blockTo = Math.max(blockTo, pos + node.nodeSize);
    }
  });

  if (blockFrom !== from || blockTo !== to) {
    editor.commands.setTextSelection({ from: blockFrom, to: blockTo });
  }
}

function applyListFormat(editor: Editor, listType: RemarkListAction): void {
  const { empty } = editor.state.selection;

  if (empty) {
    if (listType === "bullet") editor.chain().focus().toggleBulletList().run();
    else editor.chain().focus().toggleOrderedList().run();
    return;
  }

  splitHardBreaksInSelection(editor);
  expandSelectionToTextblocks(editor);

  if (listType === "bullet") editor.chain().focus().toggleBulletList().run();
  else editor.chain().focus().toggleOrderedList().run();
}

function RemarkToolbar({
  onAction,
  isActive,
  disabled = false,
}: {
  onAction: (action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number") => void;
  isActive: (action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number") => boolean;
  disabled?: boolean;
}) {
  const btn = (active: boolean) =>
    cn(
      "h-7 w-7 inline-flex items-center justify-center rounded-md transition-colors",
      active
        ? "bg-brand-50 text-brand-700"
        : "text-muted-foreground hover:bg-muted/60 hover:text-foreground",
      disabled && "pointer-events-none opacity-50",
    );

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/20 px-2 py-1.5">
      <button
        type="button"
        className={btn(isActive("bold"))}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAction("bold")}
        title="Bold"
        aria-pressed={isActive("bold")}
      >
        <Bold className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(isActive("italic"))}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAction("italic")}
        title="Italic"
        aria-pressed={isActive("italic")}
      >
        <Italic className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(isActive("underline"))}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAction("underline")}
        title="Underline"
        aria-pressed={isActive("underline")}
      >
        <Underline className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(isActive("strike"))}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAction("strike")}
        title="Strikethrough"
        aria-pressed={isActive("strike")}
      >
        <Strikethrough className="h-3.5 w-3.5" />
      </button>
      <span className="mx-1 h-4 w-px bg-border" />
      <button
        type="button"
        className={btn(isActive("bullet"))}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAction("bullet")}
        title="Bullet list"
        aria-pressed={isActive("bullet")}
      >
        <List className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn(isActive("number"))}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => onAction("number")}
        title="Numbered list"
        aria-pressed={isActive("number")}
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}

export function AddFollowUpModal({
  open,
  onOpenChange,
  po,
  onSubmit,
  readOnly = false,
  entries: entriesProp = [],
  submitting = false,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  po: PurchaseOrder | null;
  onSubmit: (input: AddFollowUpInput) => void;
  readOnly?: boolean;
  entries?: ReturnType<typeof loadFollowUpsForPO>;
  submitting?: boolean;
}) {
  const remarkRef = useRef<HTMLDivElement>(null);
  const [followUpType, setFollowUpType] = useState<POFollowUpType | "">("");
  const [typeOpen, setTypeOpen] = useState(false);
  const [followUpAt, setFollowUpAt] = useState(nowDateTimeLocal());
  const [nextFollowUpAt, setNextFollowUpAt] = useState("");
  const [remarks, setRemarks] = useState("");
  const [error, setError] = useState("");
  const [, setEditorTick] = useState(0);
  const entries = entriesProp;

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
    }
  }, [open, po?.id, resetForm]);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        code: false,
        codeBlock: false,
        blockquote: false,
        horizontalRule: false,
      }),
      UnderlineExtension,
      Placeholder.configure({
        placeholder: "Add follow-up notes…",
      }),
    ],
    content: remarks || "",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class:
          "min-h-[140px] px-3 py-2 text-xs focus:outline-none [&_p]:my-1 [&_ul]:my-1 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_.is-editor-empty:first-child::before]:pointer-events-none [&_.is-editor-empty:first-child::before]:float-left [&_.is-editor-empty:first-child::before]:h-0 [&_.is-editor-empty:first-child::before]:text-muted-foreground [&_.is-editor-empty:first-child::before]:content-[attr(data-placeholder)]",
      },
    },
    onUpdate: ({ editor: activeEditor }) => {
      setRemarks(activeEditor.getHTML());
      setError("");
    },
    onSelectionUpdate: () => {
      setEditorTick((prev) => prev + 1);
    },
    onTransaction: () => {
      setEditorTick((prev) => prev + 1);
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (remarks !== current) {
      editor.commands.setContent(remarks || "");
    }
  }, [editor, remarks]);

  if (!po) return null;

  const handleRemarkAction = (
    action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number",
  ) => {
    if (!editor) return;
    const chain = editor.chain().focus();
    if (action === "bold") chain.toggleBold().run();
    if (action === "italic") chain.toggleItalic().run();
    if (action === "underline") chain.toggleUnderline().run();
    if (action === "strike") chain.toggleStrike().run();
    if (action === "bullet") applyListFormat(editor, "bullet");
    if (action === "number") applyListFormat(editor, "number");
  };

  const isRemarkActionActive = (
    action: "bold" | "italic" | "underline" | "strike" | "bullet" | "number",
  ) => {
    if (!editor) return false;
    if (action === "bold") return editor.isActive("bold");
    if (action === "italic") return editor.isActive("italic");
    if (action === "underline") return editor.isActive("underline");
    if (action === "strike") return editor.isActive("strike");
    if (action === "bullet") return editor.isActive("bulletList");
    if (action === "number") return editor.isActive("orderedList");
    return false;
  };

  const submit = () => {
    const remarkText = editor?.getText().trim() ?? "";
    if (!followUpType) {
      setError("Follow-up type is required.");
      return;
    }
    if (!remarkText) {
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
                    <RemarkToolbar
                      onAction={handleRemarkAction}
                      isActive={isRemarkActionActive}
                      disabled={!editor}
                    />
                    <div ref={remarkRef} className="rounded-none border-0">
                      <EditorContent editor={editor} />
                    </div>
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
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={submit}
                disabled={submitting}
              >
                {submitting ? "Saving…" : "Save"}
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
