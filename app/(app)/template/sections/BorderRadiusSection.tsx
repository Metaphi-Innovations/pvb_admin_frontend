import React from "react";

export default function BorderRadiusSection() {
  const radius = [
    { name: "input", value: "10px", use: "Input fields, form controls" },
    { name: "btn", value: "12px", use: "Buttons, action elements" },
    { name: "card", value: "16px", use: "Cards, containers" },
    { name: "modal", value: "20px", use: "Modals, large containers" },
    { name: "badge", value: "6px", use: "Small badges, tags" },
    { name: "full", value: "9999px", use: "Circular elements, avatars" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {radius.map((item) => (
          <div key={item.name} className="border border-border rounded-lg p-4 bg-muted/20">
            <div className="flex items-start gap-4">
              <div
                className="w-24 h-24 bg-brand-500 flex-shrink-0"
                style={{ borderRadius: item.value }}
              />
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-semibold">Type</p>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                <p className="text-xs text-muted-foreground font-mono mt-1">{item.value}</p>
                <p className="text-xs text-muted-foreground mt-2">{item.use}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
        <p className="text-xs text-warning font-semibold mb-2">Radius Guidelines</p>
        <div className="space-y-1 text-xs text-warning/80">
          <p>• Maintain consistency: use predefined radius values only</p>
          <p>• Subtle curves for UI elements (badge, input)</p>
          <p>• Rounded corners for containers (card, modal)</p>
          <p>• Full/maximum radius for avatars and circular elements</p>
        </div>
      </div>
    </div>
  );
}
