import React from "react";

export default function ShadowsSection() {
  const shadows = [
    {
      name: "None",
      css: "none",
      use: "Flat, no elevation",
      example: "shadow-none",
    },
    {
      name: "Small",
      css: "0 1px 2px rgba(0, 0, 0, 0.05)",
      use: "Subtle elevation, hover states",
      example: "shadow-sm",
    },
    {
      name: "Default (Card)",
      css: "0 4px 6px rgba(0, 0, 0, 0.07)",
      use: "Cards, containers, default elevation",
      example: "shadow-card",
    },
    {
      name: "Medium",
      css: "0 10px 15px rgba(0, 0, 0, 0.1)",
      use: "Dropdowns, popovers",
      example: "shadow-md",
    },
    {
      name: "Large",
      css: "0 20px 25px rgba(0, 0, 0, 0.15)",
      use: "Modals, overlays, important elements",
      example: "shadow-lg",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {shadows.map((item) => (
          <div key={item.name} className="border border-border rounded-lg p-6 bg-muted/20">
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Shadow</p>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Class</p>
                <p className="text-xs font-mono text-foreground">{item.example}</p>
              </div>
            </div>

            <div className="flex items-center justify-center gap-8 bg-white rounded-lg p-8 mb-4">
              <div className="text-xs text-muted-foreground">Example:</div>
              <div
                className={`w-20 h-20 bg-white rounded-lg border border-border ${item.example}`}
              />
            </div>

            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-semibold">CSS</p>
              <p className="text-xs font-mono text-foreground bg-muted/50 p-2 rounded border border-border overflow-x-auto">
                {item.css}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{item.use}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-success/10 border border-success/20 rounded-lg p-4">
        <p className="text-xs text-success font-semibold mb-2">Shadow Usage</p>
        <div className="space-y-1 text-xs text-success/80">
          <p>• Cards and containers: use default shadow (shadow-card)</p>
          <p>• Elevated UI: use medium shadow (shadow-md)</p>
          <p>• Modals and overlays: use large shadow (shadow-lg)</p>
          <p>• Hover states: consider upgrading shadow for feedback</p>
        </div>
      </div>
    </div>
  );
}
