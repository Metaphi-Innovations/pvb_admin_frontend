import React from "react";
import { Copy, Check } from "lucide-react";

export default function ColorSection() {
  const [copied, setCopied] = React.useState<string | null>(null);

  const colors = {
    brand: [
      { name: "50",  hex: "#FFF3E8", use: "Lightest tint backgrounds" },
      { name: "100", hex: "#FFE4C4", use: "Light backgrounds, hover tints" },
      { name: "200", hex: "#FFCB90", use: "Hover states, subtle accents" },
      { name: "300", hex: "#FFAA55", use: "Borders, visual accents" },
      { name: "400", hex: "#FF8C2A", use: "Muted primary elements" },
      { name: "500", hex: "#F47920", use: "Logo orange — primary brand" },
      { name: "600", hex: "#D96A10", use: "Primary CTA buttons, active states" },
      { name: "700", hex: "#B85508", use: "Hover on active, active links" },
      { name: "800", hex: "#94400A", use: "Dark text on light brand bg" },
      { name: "900", hex: "#6B2D07", use: "Very dark backgrounds" },
      { name: "950", hex: "#3D1503", use: "Text on brand-colored surfaces" },
    ],
    navy: [
      { name: "50",  hex: "#EEF2FF", use: "Lightest navy tint" },
      { name: "100", hex: "#D8E2FF", use: "Light navy backgrounds" },
      { name: "200", hex: "#B8C9FF", use: "Navy borders" },
      { name: "300", hex: "#8AAEFF", use: "Navy accents" },
      { name: "400", hex: "#5C8EEE", use: "Navy interactive elements" },
      { name: "500", hex: "#3A6DD8", use: "Navy primary" },
      { name: "600", hex: "#2451B7", use: "Navy CTA, secondary actions" },
      { name: "700", hex: "#1A3A96", use: "Logo navy — page titles, headings" },
      { name: "800", hex: "#153080", use: "Dark navy" },
      { name: "900", hex: "#0F2266", use: "Darkest navy" },
    ],
    leaf: [
      { name: "300", hex: "#7CC87C", use: "Leaf accent borders" },
      { name: "400", hex: "#50AF50", use: "Leaf interactive" },
      { name: "500", hex: "#33913A", use: "Leaf primary" },
      { name: "600", hex: "#267A2E", use: "Logo leaf — active/approved states" },
      { name: "700", hex: "#1A5F22", use: "Hover on leaf elements" },
    ],
    semantic: [
      { name: "Success", hex: "#267A2E", use: "Success / approved states" },
      { name: "Warning", hex: "#92400e", use: "Warning states" },
      { name: "Error",   hex: "#991b1b", use: "Error / rejected states" },
      { name: "Info",    hex: "#1A3A96", use: "Information / draft states" },
      { name: "Neutral", hex: "#6b7280", use: "Disabled, neutral text" },
    ],
    secondary: [
      { name: "Sage",   hex: "#7c9a7e", use: "Muted green accent" },
      { name: "Forest", hex: "#2d5a2e", use: "Dark secondary" },
      { name: "Olive",  hex: "#6b7c3a", use: "Earthy accent" },
      { name: "Earth",  hex: "#e8e0d0", use: "Warm neutral background" },
    ],
  };

  const copyColor = (hex: string, name: string) => {
    navigator.clipboard.writeText(hex);
    setCopied(hex);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Brand Colors</h3>
        <div className="grid grid-cols-2 gap-4">
          {colors.brand.map((color) => (
            <div
              key={color.hex}
              className="bg-muted/40 rounded-lg p-4 hover:bg-muted/60 transition-colors cursor-pointer group"
              onClick={() => copyColor(color.hex, color.name)}
            >
              <div className="flex items-center gap-3 mb-2">
                <div
                  className="w-12 h-12 rounded-lg border border-border shadow-sm"
                  style={{ backgroundColor: color.hex }}
                />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">
                    brand-{color.name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                </div>
                {copied === color.hex ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                )}
              </div>
              <p className="text-xs text-muted-foreground">{color.use}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Navy palette */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Navy — Sutra Wordmark</h3>
        <p className="text-xs text-muted-foreground mb-4">From the "Sutra" wordmark and shield border. Used for page titles, headings, secondary actions.</p>
        <div className="grid grid-cols-2 gap-3">
          {colors.navy.map((color) => (
            <div key={color.hex} className="bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors cursor-pointer group" onClick={() => copyColor(color.hex, color.name)}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ backgroundColor: color.hex }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">navy-{color.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                </div>
                {copied === color.hex ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <p className="text-xs text-muted-foreground">{color.use}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaf palette */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-1">Leaf Green — Shield Plant</h3>
        <p className="text-xs text-muted-foreground mb-4">From the plant inside the shield. Used for active/approved/success states.</p>
        <div className="grid grid-cols-2 gap-3">
          {colors.leaf.map((color) => (
            <div key={color.hex} className="bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors cursor-pointer group" onClick={() => copyColor(color.hex, color.name)}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ backgroundColor: color.hex }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">leaf-{color.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                </div>
                {copied === color.hex ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <p className="text-xs text-muted-foreground">{color.use}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Semantic Colors</h3>
        <div className="grid grid-cols-2 gap-3">
          {colors.semantic.map((color) => (
            <div key={color.hex} className="bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors cursor-pointer group" onClick={() => copyColor(color.hex, color.name)}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ backgroundColor: color.hex }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{color.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                </div>
                {copied === color.hex ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <p className="text-xs text-muted-foreground">{color.use}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Supporting Palettes</h3>
        <div className="grid grid-cols-2 gap-3">
          {colors.secondary.map((color) => (
            <div key={color.hex} className="bg-muted/40 rounded-lg p-3 hover:bg-muted/60 transition-colors cursor-pointer group" onClick={() => copyColor(color.hex, color.name)}>
              <div className="flex items-center gap-3 mb-1.5">
                <div className="w-10 h-10 rounded-lg border border-border shadow-sm" style={{ backgroundColor: color.hex }} />
                <div className="flex-1">
                  <p className="text-xs font-semibold text-foreground">{color.name}</p>
                  <p className="text-xs text-muted-foreground font-mono">{color.hex}</p>
                </div>
                {copied === color.hex ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />}
              </div>
              <p className="text-xs text-muted-foreground">{color.use}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-brand-50 border border-brand-200 rounded-lg p-4">
        <p className="text-xs text-brand-700 font-medium">Dharitri Sutra Three-Palette System</p>
        <p className="text-xs text-brand-600 mt-1">
          Warm orange (Dharitri wordmark) + deep navy (Sutra wordmark + shield) + leaf green (plant inside shield). Together they form the complete brand identity for professional agri-tech ERP.
        </p>
      </div>
    </div>
  );
}
