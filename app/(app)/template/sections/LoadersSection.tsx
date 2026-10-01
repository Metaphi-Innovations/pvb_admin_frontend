import { Loader2 } from "lucide-react";

export default function LoadersSection() {
  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Loading States</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-muted/20 border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3">
            <div className="animate-spin">
              <Loader2 className="w-6 h-6 text-brand-600" />
            </div>
            <p className="text-xs text-muted-foreground">Spinner</p>
          </div>

          <div className="bg-muted/20 border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3">
            <div className="w-8 h-1 rounded-full bg-muted-foreground/20 overflow-hidden">
              <div className="h-full bg-brand-600 animate-pulse" style={{ width: "40%" }} />
            </div>
            <p className="text-xs text-muted-foreground">Progress Bar</p>
          </div>

          <div className="bg-muted/20 border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="w-2 h-2 rounded-full bg-brand-600"
                  style={{
                    animation: `pulse 1.4s infinite`,
                    animationDelay: `${i * 0.2}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Dots</p>
          </div>

          <div className="bg-muted/20 border border-border rounded-lg p-6 flex flex-col items-center justify-center gap-3">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="w-1 rounded-full bg-brand-600"
                  style={{
                    height: `${8 + i * 4}px`,
                    animation: `pulse 1s infinite`,
                    animationDelay: `${i * 0.1}s`,
                  }}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Bars</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Skeleton Loaders</h3>
        <div className="space-y-3">
          <div className="bg-white border border-border rounded-card p-4 space-y-3">
            <div className="h-6 bg-muted rounded animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
              <div className="h-4 bg-muted rounded animate-pulse w-2/3" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Loader Best Practices</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Use spinner for quick operations (&lt;2 seconds)</p>
          <p>• Use progress bar for long operations</p>
          <p>• Skeleton loaders for content placeholders</p>
          <p>• Never block user interaction without reason</p>
        </div>
      </div>
    </div>
  );
}
