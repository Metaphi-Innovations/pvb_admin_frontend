import React from "react";

export default function SpacingSection() {
  const spacing = [
    { name: "xs", value: "4px", use: "Tight spacing within components" },
    { name: "sm", value: "8px", use: "Small padding, gaps" },
    { name: "md", value: "12px", use: "Form field spacing" },
    { name: "lg", value: "16px", use: "Default padding, standard gaps" },
    { name: "xl", value: "20px", use: "Card padding, section gaps" },
    { name: "2xl", value: "24px", use: "Large padding, section spacing" },
    { name: "3xl", value: "32px", use: "Major section spacing" },
    { name: "4xl", value: "40px", use: "Large component spacing" },
    { name: "5xl", value: "48px", use: "Page-level spacing" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid gap-4">
        {spacing.map((item) => (
          <div key={item.name} className="border border-border rounded-lg p-4 bg-muted/20">
            <div className="flex items-center gap-4 mb-3">
              <div className="flex-1">
                <p className="text-xs text-muted-foreground font-semibold">Spacing</p>
                <p className="text-sm font-semibold text-foreground">{item.name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-semibold">Value</p>
                <p className="text-sm font-mono text-foreground">{item.value}</p>
              </div>
            </div>

            <div className="bg-white rounded-lg border border-border p-2 mb-3 overflow-x-auto flex items-center gap-2">
              <div className="text-xs text-muted-foreground">Visual:</div>
              <div
                className="bg-brand-200 rounded-sm flex-shrink-0"
                style={{ width: item.value, height: "20px" }}
                title={item.value}
              />
            </div>

            <p className="text-xs text-muted-foreground">{item.use}</p>
          </div>
        ))}
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Spacing Rules</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Padding inside components: lg (16px)</p>
          <p>• Gap between flex items: md to lg</p>
          <p>• Section spacing: xl to 2xl</p>
          <p>• Card padding: xl to 2xl</p>
          <p>• Page-level margins: 3xl to 5xl</p>
        </div>
      </div>
    </div>
  );
}
