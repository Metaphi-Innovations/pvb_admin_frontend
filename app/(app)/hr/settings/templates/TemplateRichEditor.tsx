"use client";

import React, { useCallback, useEffect, useRef } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Italic,
  List,
  ListOrdered,
  Underline,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { hrBtn } from "../organization/_components";

/** Lightweight contentEditable toolbar — no Word-processor complexity. */
export function TemplateRichEditor({
  value,
  onChange,
  placeholder,
  minHeightClass = "min-h-[140px]",
  disabled,
  onBlockChipClick,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeightClass?: string;
  disabled?: boolean;
  onBlockChipClick?: (blockId: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const last = useRef(value);

  useEffect(() => {
    if (!ref.current) return;
    if (value !== last.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
      last.current = value;
    }
  }, [value]);

  const emit = useCallback(() => {
    if (!ref.current) return;
    const html = ref.current.innerHTML;
    last.current = html;
    onChange(html);
  }, [onChange]);

  const cmd = (command: string, arg?: string) => {
    if (disabled) return;
    ref.current?.focus();
    try {
      document.execCommand(command, false, arg);
    } catch {
      /* ignore */
    }
    emit();
  };

  const insertToken = useCallback(
    (token: string) => {
      if (disabled || !ref.current) return;
      ref.current.focus();
      try {
        document.execCommand("insertText", false, token);
      } catch {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          range.insertNode(document.createTextNode(token));
        }
      }
      emit();
    },
    [disabled, emit],
  );

  const insertHtml = useCallback(
    (html: string) => {
      if (disabled || !ref.current) return;
      ref.current.focus();
      try {
        document.execCommand("insertHTML", false, html);
      } catch {
        const sel = window.getSelection();
        if (sel && sel.rangeCount) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          const tmp = document.createElement("div");
          tmp.innerHTML = html;
          const frag = document.createDocumentFragment();
          while (tmp.firstChild) frag.appendChild(tmp.firstChild);
          range.insertNode(frag);
        }
      }
      emit();
    },
    [disabled, emit],
  );

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onPlaceholder = (e: Event) => {
      const token = (e as CustomEvent<string>).detail;
      if (typeof token === "string") insertToken(token);
    };
    const onHtml = (e: Event) => {
      const html = (e as CustomEvent<string>).detail;
      if (typeof html === "string") insertHtml(html);
    };
    el.addEventListener("hr-insert-placeholder", onPlaceholder as EventListener);
    el.addEventListener("hr-insert-html", onHtml as EventListener);
    return () => {
      el.removeEventListener("hr-insert-placeholder", onPlaceholder as EventListener);
      el.removeEventListener("hr-insert-html", onHtml as EventListener);
    };
  }, [insertToken, insertHtml]);

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-white overflow-hidden",
        disabled && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-center gap-0.5 px-1.5 py-1 border-b border-border bg-muted/20">
        {[
          { icon: Bold, c: "bold", label: "Bold" },
          { icon: Italic, c: "italic", label: "Italic" },
          { icon: Underline, c: "underline", label: "Underline" },
        ].map(({ icon: Icon, c, label }) => (
          <button
            key={c}
            type="button"
            title={label}
            disabled={disabled}
            className={cn(hrBtn("h-7 w-7 p-0"), "text-muted-foreground")}
            onMouseDown={(e) => {
              e.preventDefault();
              cmd(c);
            }}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <span className="w-px h-4 bg-border mx-0.5" />
        {[
          { icon: AlignLeft, c: "justifyLeft" },
          { icon: AlignCenter, c: "justifyCenter" },
          { icon: AlignRight, c: "justifyRight" },
        ].map(({ icon: Icon, c }) => (
          <button
            key={c}
            type="button"
            disabled={disabled}
            className={cn(hrBtn("h-7 w-7 p-0"), "text-muted-foreground")}
            onMouseDown={(e) => {
              e.preventDefault();
              cmd(c);
            }}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        ))}
        <span className="w-px h-4 bg-border mx-0.5" />
        <button
          type="button"
          title="Bullets"
          disabled={disabled}
          className={cn(hrBtn("h-7 w-7 p-0"), "text-muted-foreground")}
          onMouseDown={(e) => {
            e.preventDefault();
            cmd("insertUnorderedList");
          }}
        >
          <List className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          title="Numbering"
          disabled={disabled}
          className={cn(hrBtn("h-7 w-7 p-0"), "text-muted-foreground")}
          onMouseDown={(e) => {
            e.preventDefault();
            cmd("insertOrderedList");
          }}
        >
          <ListOrdered className="w-3.5 h-3.5" />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        suppressContentEditableWarning
        data-placeholder={placeholder}
        className={cn(
          "px-3 py-2 text-xs leading-relaxed outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground",
          minHeightClass,
        )}
        onInput={emit}
        onBlur={emit}
        onClick={(e) => {
          const target = e.target as HTMLElement | null;
          const chip = target?.closest?.(".hr-tpl-block-chip") as HTMLElement | null;
          if (chip?.dataset.hrBlockId && onBlockChipClick) {
            e.preventDefault();
            onBlockChipClick(chip.dataset.hrBlockId);
          }
        }}
      />
    </div>
  );
}

export function insertPlaceholderIntoEditor(
  editorRoot: HTMLElement | null,
  token: string,
): void {
  if (!editorRoot) return;
  editorRoot.dispatchEvent(new CustomEvent("hr-insert-placeholder", { detail: token }));
}

export function insertHtmlIntoEditor(editorRoot: HTMLElement | null, html: string): void {
  if (!editorRoot) return;
  editorRoot.dispatchEvent(new CustomEvent("hr-insert-html", { detail: html }));
}
