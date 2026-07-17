"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export type AppToastType = "error" | "success" | "info";

export interface AppToast {
  id: number;
  message: string;
  type: AppToastType;
}

type Listener = (toast: AppToast) => void;

let listeners: Listener[] = [];
let nextId = 1;

export function showToast(message: string, type: AppToastType = "error") {
  if (!message?.trim()) return;
  const toast: AppToast = { id: nextId++, message: message.trim(), type };
  listeners.forEach((l) => l(toast));
}

export function AppToaster() {
  const [toasts, setToasts] = useState<AppToast[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const listener: Listener = (toast) => {
      setToasts((prev) => [...prev.slice(-4), toast]);
    };
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  }, []);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    if (!toasts.length) return;
    const timers = toasts.map((t) =>
      window.setTimeout(() => dismiss(t.id), 5000),
    );
    return () => timers.forEach(clearTimeout);
  }, [toasts, dismiss]);

  if (!mounted || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed bottom-4 right-4 z-[200] flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "pointer-events-auto flex items-start gap-2 rounded-lg px-3.5 py-2.5 text-sm text-white shadow-lg",
            toast.type === "success" && "bg-emerald-600",
            toast.type === "error" && "bg-red-600",
            toast.type === "info" && "bg-navy-700",
          )}
          role="status"
        >
          <span className="flex-1 leading-snug">{toast.message}</span>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="opacity-80 hover:opacity-100 flex-shrink-0 mt-0.5"
            aria-label="Dismiss"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>,
    document.body,
  );
}
