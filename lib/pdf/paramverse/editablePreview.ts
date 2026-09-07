"use client";

import { writeHtmlAndPrint } from "./shell";

interface EditablePreviewOptions<T extends Record<string, unknown>> {
  title: string;
  initialData: T;
  renderHtml: (data: T) => string;
  printButtonLabel?: string;
  outputFileName?: string;
  openedWindow?: Window | null;
  enableDirectPreviewEditing?: boolean;
  /** When set, Download uses this instead of posting HTML to /pdf/from-html. */
  onDownload?: () => Promise<void>;
}

export function openEditablePdfPreview<T extends Record<string, unknown>>(
  options: EditablePreviewOptions<T>,
): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();

  return new Promise((resolve, reject) => {
    const initial = options.initialData;
    const initialHtml = options.renderHtml(initial);
    let editEnabled = options.enableDirectPreviewEditing !== false;

    // ── Overlay (fullscreen) ──
    const overlay = document.createElement("div");
    Object.assign(overlay.style, {
      position: "fixed",
      inset: "0",
      background: "rgba(2,6,23,0.68)",
      zIndex: "99999",
      display: "flex",
      alignItems: "stretch",
      justifyContent: "stretch",
    });

    // ── Panel (takes full viewport) ──
    const panel = document.createElement("div");
    Object.assign(panel.style, {
      width: "100%",
      height: "100%",
      background: "#fff",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
    });

    // ── Header bar ──
    const header = document.createElement("div");
    Object.assign(header.style, {
      padding: "10px 16px",
      borderBottom: "1px solid #d1d5db",
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      background: "#f8fafc",
      flexShrink: "0",
    });
    header.innerHTML = `<div style="font:600 14px Arial,sans-serif;color:#111827">${options.title}</div>
      <div style="font:500 12px Arial,sans-serif;color:#475569">${
        options.enableDirectPreviewEditing === false
          ? "Official server preview"
          : "Preview-only editing (no DB changes)"
      }</div>`;

    // ── Toolbar ──
    const toolbar = document.createElement("div");
    Object.assign(toolbar.style, {
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      gap: "8px",
      padding: "6px 16px",
      borderBottom: "1px solid #e2e8f0",
      background: "#f1f5f9",
      flexShrink: "0",
    });

    const toolbarLeft = document.createElement("div");
    Object.assign(toolbarLeft.style, { display: "flex", gap: "6px", alignItems: "center", flexWrap: "wrap" });

    const status = document.createElement("div");
    Object.assign(status.style, { font: "12px Arial,sans-serif", color: "#0f766e" });
    status.textContent = editEnabled
      ? "Edit mode ON — click text in preview to edit"
      : "Edit mode OFF";

    toolbar.appendChild(toolbarLeft);
    toolbar.appendChild(status);

    // ── Iframe area (takes ALL remaining space) ──
    const iframeArea = document.createElement("div");
    Object.assign(iframeArea.style, {
      flex: "1 1 0",
      minHeight: "0",
      background: "#e2e8f0",
      position: "relative",
    });

    const frameViewport = document.createElement("div");
    Object.assign(frameViewport.style, {
      position: "relative",
      width: "72%",
      maxWidth: "1320px",
      height: "100%",
      margin: "0 auto",
      minWidth: "920px",
      background: "#fff",
      boxShadow: "0 0 0 1px #e2e8f0",
    });

    const iframe = document.createElement("iframe");
    Object.assign(iframe.style, {
      position: "absolute",
      top: "0",
      left: "0",
      width: "100%",
      height: "100%",
      border: "0",
      background: "#fff",
    });
    frameViewport.appendChild(iframe);
    iframeArea.appendChild(frameViewport);

    // ── Footer bar ──
    const footer = document.createElement("div");
    Object.assign(footer.style, {
      padding: "8px 16px",
      borderTop: "1px solid #d1d5db",
      display: "flex",
      justifyContent: "flex-end",
      gap: "8px",
      background: "#f8fafc",
      flexShrink: "0",
    });

    // ── Buttons ──
    const mkBtn = (label: string, variant: "default" | "primary" | "ghost" = "default") => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.textContent = label;
      Object.assign(btn.style, {
        border: "1px solid #d1d5db",
        background: "#fff",
        color: "#111827",
        padding: "6px 14px",
        borderRadius: "6px",
        font: "600 12px Arial,sans-serif",
        cursor: "pointer",
        whiteSpace: "nowrap",
      });
      if (variant === "primary") {
        Object.assign(btn.style, { background: "#0f172a", color: "#fff", borderColor: "#0f172a" });
      }
      if (variant === "ghost") {
        btn.style.background = "#f1f5f9";
      }
      return btn;
    };

    const toggleEditBtn = mkBtn(editEnabled ? "Disable Edit" : "Enable Edit", "ghost");
    const resetBtn = mkBtn("Reset", "ghost");
    const fitWidthBtn = mkBtn("Fit Width", "ghost");
    const cancelBtn = mkBtn("Cancel");
    const printBtn = mkBtn(options.printButtonLabel || "Print / Download PDF", "primary");

    const zoomSelect = document.createElement("select");
    Object.assign(zoomSelect.style, {
      border: "1px solid #d1d5db",
      background: "#fff",
      color: "#111827",
      padding: "6px 8px",
      borderRadius: "6px",
      font: "600 12px Arial,sans-serif",
      cursor: "pointer",
    });
    const zoomValues = [50, 60, 70, 80, 90, 100, 110, 125, 150, 175, 200];
    for (const v of zoomValues) {
      const opt = document.createElement("option");
      opt.value = String(v);
      opt.textContent = `${v}%`;
      if (v === 100) opt.selected = true;
      zoomSelect.appendChild(opt);
    }

    if (options.enableDirectPreviewEditing !== false) {
      toolbarLeft.appendChild(toggleEditBtn);
      toolbarLeft.appendChild(resetBtn);
    }
    toolbarLeft.appendChild(fitWidthBtn);
    toolbarLeft.appendChild(zoomSelect);

    footer.appendChild(cancelBtn);
    footer.appendChild(printBtn);

    // ── Assemble ──
    panel.appendChild(header);
    panel.appendChild(toolbar);
    panel.appendChild(iframeArea);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";

    // ── State ──
    let cleanedUp = false;
    let zoomPercent = 100;
    let previewObjectUrl: string | null = null;

    const cleanup = () => {
      if (cleanedUp) return;
      cleanedUp = true;
      window.removeEventListener("keydown", keyHandler);
      overlay.removeEventListener("click", closeOnOverlayClick);
      if (previewObjectUrl) {
        URL.revokeObjectURL(previewObjectUrl);
        previewObjectUrl = null;
      }
      overlay.remove();
      document.body.style.overflow = "";
    };

    const setEditMode = () => {
      try {
        if (iframe.contentDocument) {
          iframe.contentDocument.designMode = editEnabled ? "on" : "off";
        }
      } catch { /* ignore */ }
      toggleEditBtn.textContent = editEnabled ? "Disable Edit" : "Enable Edit";
      status.style.color = editEnabled ? "#047857" : "#64748b";
      status.textContent = editEnabled
        ? `Zoom ${zoomPercent}% · Edit mode ON — click text to edit`
        : `Zoom ${zoomPercent}% · Edit mode OFF`;
    };

    const PREVIEW_GUTTER_ID = "__pv_preview_gutter";

    const injectPreviewGutter = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) return;
      if (doc.getElementById(PREVIEW_GUTTER_ID)) return;
      const gutter = doc.createElement("div");
      gutter.id = PREVIEW_GUTTER_ID;
      gutter.style.boxSizing = "border-box";
      gutter.style.padding = "12px";
      gutter.style.minHeight = "100vh";
      while (doc.body.firstChild) gutter.appendChild(doc.body.firstChild);
      doc.body.appendChild(gutter);
      doc.body.style.margin = "0";
      doc.body.style.background = "#fff";
      doc.body.style.fontSize = "11.5px";
    };

    const stripPreviewGutter = (doc: Document) => {
      const gutter = doc.getElementById(PREVIEW_GUTTER_ID);
      if (!gutter || !doc.body) return;
      while (gutter.firstChild) doc.body.appendChild(gutter.firstChild);
      gutter.remove();
      doc.body.style.margin = "";
      doc.body.style.background = "";
      doc.body.style.fontSize = "";
      doc.body.style.zoom = "";
    };

    const applyZoom = (percent: number) => {
      zoomPercent = Math.max(40, Math.min(250, percent));
      const doc = iframe.contentDocument;
      if (!doc) return;
      const zoomTarget = (doc.getElementById(PREVIEW_GUTTER_ID) ||
        doc.body) as HTMLElement | null;
      if (!zoomTarget) return;
      zoomTarget.style.zoom = `${zoomPercent}%`;
      setEditMode();
    };

    const fitWidth = () => {
      const doc = iframe.contentDocument;
      if (!doc) return;
      const sheet = (doc.querySelector(".pv-sheet") || doc.body.firstElementChild) as HTMLElement | null;
      if (!sheet) return;
      const zoomTarget = (doc.getElementById(PREVIEW_GUTTER_ID) ||
        doc.body) as HTMLElement | null;
      if (zoomTarget) zoomTarget.style.zoom = "100%";
      const totalContentWidth = (sheet.scrollWidth || sheet.clientWidth) + 24;
      const available = Math.max(0, Math.floor(frameViewport.clientWidth * 0.94));
      if (!available || !totalContentWidth) return;
      const next = Math.max(120, Math.min(250, Math.floor((available / totalContentWidth) * 100)));
      applyZoom(next);
      zoomSelect.value = zoomValues.includes(next) ? String(next) : "100";
    };

    const renderPreview = () => {
      try {
        if (previewObjectUrl) {
          URL.revokeObjectURL(previewObjectUrl);
          previewObjectUrl = null;
        }
        // Blob URL avoids iframe srcdoc size limits that can drop large embedded logos.
        const blob = new Blob([initialHtml], { type: "text/html;charset=utf-8" });
        previewObjectUrl = URL.createObjectURL(blob);
        iframe.onload = () => {
          injectPreviewGutter();
          fitWidth();
          setEditMode();
        };
        iframe.src = previewObjectUrl;
        return true;
      } catch (error) {
        status.style.color = "#b91c1c";
        status.textContent = error instanceof Error
          ? `Preview render failed: ${error.message}`
          : "Preview render failed.";
        return false;
      }
    };

    renderPreview();

    // ── Event handlers ──
    cancelBtn.onclick = () => { cleanup(); resolve(); };
    toggleEditBtn.onclick = () => { editEnabled = !editEnabled; setEditMode(); };
    resetBtn.onclick = () => { renderPreview(); };
    fitWidthBtn.onclick = () => { fitWidth(); };
    zoomSelect.onchange = () => {
      const v = Number(zoomSelect.value);
      if (Number.isFinite(v)) applyZoom(v);
    };

    const closeOnOverlayClick = (event: MouseEvent) => {
      if (event.target === overlay) { cleanup(); resolve(); }
    };
    overlay.addEventListener("click", closeOnOverlayClick);

    const keyHandler = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); cleanup(); resolve(); }
      if ((event.ctrlKey || event.metaKey) && event.key === "Enter") { event.preventDefault(); printBtn.click(); }
    };
    window.addEventListener("keydown", keyHandler);

    printBtn.onclick = async () => {
      try {
        if (options.onDownload) {
          cleanup();
          await options.onDownload();
          resolve();
          return;
        }
        let html = initialHtml;
        try {
          const doc = iframe.contentDocument;
          if (doc) {
            stripPreviewGutter(doc);
            if (doc.documentElement?.outerHTML) {
              html = `<!doctype html>\n${doc.documentElement.outerHTML}`;
            }
          }
        } catch { /* fallback to initialHtml */ }
        cleanup();
        await writeHtmlAndPrint(html, options.openedWindow, options.outputFileName);
        resolve();
      } catch (error) {
        cleanup();
        reject(error);
      }
    };
  });
}
