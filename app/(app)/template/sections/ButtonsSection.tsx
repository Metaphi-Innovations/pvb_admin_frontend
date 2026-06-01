import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Check } from "lucide-react";

export default function ButtonsSection() {
  const [loadingId, setLoadingId] = React.useState<string | null>(null);

  const handleLoadingDemo = (id: string) => {
    setLoadingId(id);
    setTimeout(() => setLoadingId(null), 2000);
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Button Variants</h3>
        <div className="space-y-6">
          {/* Primary */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-3">Primary</p>
            <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg">
              <Button className="bg-brand-600 hover:bg-brand-700 text-white">
                Primary
              </Button>
              <Button className="bg-brand-600 hover:bg-brand-700 text-white" disabled>
                Disabled
              </Button>
              <Button
                className="bg-brand-600 hover:bg-brand-700 text-white"
                onClick={() => handleLoadingDemo("primary")}
              >
                {loadingId === "primary" ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Loading...
                  </>
                ) : (
                  "Loading Demo"
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Main actions, primary CTAs</p>
          </div>

          {/* Secondary */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-3">Secondary</p>
            <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg">
              <Button variant="outline">
                Secondary
              </Button>
              <Button variant="outline" disabled>
                Disabled
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Secondary actions, alternatives</p>
          </div>

          {/* Ghost */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-3">Ghost</p>
            <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg">
              <Button variant="ghost">
                Ghost
              </Button>
              <Button variant="ghost" disabled>
                Disabled
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Tertiary actions, text-only buttons</p>
          </div>

          {/* Semantic Buttons */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-3">Semantic Actions</p>
            <div className="flex flex-wrap gap-3 p-4 bg-muted/20 rounded-lg">
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">
                Success
              </Button>
              <Button className="bg-red-600 hover:bg-red-700 text-white">
                Danger
              </Button>
              <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                Warning
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">Success, danger, warning actions</p>
          </div>

          {/* Sizes */}
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-3">Sizes</p>
            <div className="flex flex-wrap items-center gap-3 p-4 bg-muted/20 rounded-lg">
              <Button size="sm">Small</Button>
              <Button>Default</Button>
              <Button size="lg">Large</Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">sm, default (md), lg</p>
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Button Best Practices</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Use primary for main CTAs (submit, save, create)</p>
          <p>• Use secondary for alternative actions (cancel, close)</p>
          <p>• Use semantic colors for destructive or success actions</p>
          <p>• Always show loading state for async actions</p>
          <p>• Maintain consistent button height and padding</p>
        </div>
      </div>
    </div>
  );
}
