import React from "react";

export default function TypographySection() {
  const typography = [
    {
      name: "Page Title",
      size: "28px",
      weight: "700",
      line: "36px",
      example: "Dashboard Overview",
      usage: "Main page headings",
    },
    {
      name: "Section Title",
      size: "22px",
      weight: "600",
      line: "30px",
      example: "Sales Trend",
      usage: "Section headings, major content blocks",
    },
    {
      name: "Card Title",
      size: "16px",
      weight: "600",
      line: "22px",
      example: "Total Orders",
      usage: "Card headings, subsection titles",
    },
    {
      name: "Body Large",
      size: "15px",
      weight: "400",
      line: "22px",
      example: "This is body text for important content.",
      usage: "Large body text, introductions",
    },
    {
      name: "Body",
      size: "14px",
      weight: "400",
      line: "20px",
      example: "Regular paragraph text for most content.",
      usage: "Default body text, descriptions",
    },
    {
      name: "Table Text",
      size: "13px",
      weight: "400",
      line: "18px",
      example: "Table cell content",
      usage: "Table cells, compact data",
    },
    {
      name: "Helper Text",
      size: "12px",
      weight: "400",
      line: "16px",
      example: "Supporting information",
      usage: "Form hints, captions, secondary text",
    },
    {
      name: "Badge",
      size: "11px",
      weight: "600",
      line: "14px",
      example: "Active",
      usage: "Status badges, labels",
    },
  ];

  return (
    <div className="space-y-6">
      {typography.map((item) => (
        <div key={item.name} className="border border-border rounded-lg p-6 bg-muted/20">
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Type</p>
              <p className="text-sm font-semibold text-foreground">{item.name}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Font</p>
              <p className="text-sm text-foreground">Inter</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Size / Weight</p>
              <p className="text-sm text-foreground">{item.size} / {item.weight}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-semibold">Line Height</p>
              <p className="text-sm text-foreground">{item.line}</p>
            </div>
          </div>

          <div className="bg-white rounded-lg p-4 border border-border mb-4">
            <p
              style={{
                fontSize: item.size,
                fontWeight: item.weight as any,
                lineHeight: item.line,
              }}
              className="text-foreground"
            >
              {item.example}
            </p>
          </div>

          <p className="text-xs text-muted-foreground">{item.usage}</p>
        </div>
      ))}

      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
        <p className="text-xs text-brand-700 font-semibold mb-2">Font Families</p>
        <div className="space-y-1 text-xs text-brand-600">
          <p>• Inter — Default body and UI text</p>
          <p>• Plus Jakarta Sans — Headings and emphasis (optional)</p>
          <p>• Manrope — Display and modern accents (optional)</p>
        </div>
      </div>
    </div>
  );
}
