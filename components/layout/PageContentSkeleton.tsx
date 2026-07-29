"use client";

/** Shown immediately while route segments load (Next.js `loading.tsx`). */
export function PageContentSkeleton() {
  return (
    <div className="px-5 py-4 max-w-[1440px] mx-auto w-full space-y-4 animate-in fade-in-0 duration-150">
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2 flex-1">
          <div className="h-6 w-48 rounded-md skeleton" />
          <div className="h-3 w-72 max-w-full rounded skeleton" />
        </div>
        <div className="h-8 w-28 rounded-lg skeleton flex-shrink-0" />
      </div>
      <div className="flex gap-2">
        <div className="h-8 flex-1 max-w-sm rounded-lg skeleton" />
        <div className="h-8 w-28 rounded-lg skeleton" />
      </div>
      <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
        <div className="border-b border-border/60 bg-muted/20 px-4 py-3 flex gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-3 w-16 rounded skeleton" />
          ))}
        </div>
        <div className="divide-y divide-border/50">
          {Array.from({ length: 8 }).map((_, row) => (
            <div key={row} className="px-4 py-3 flex gap-4">
              {Array.from({ length: 6 }).map((_, col) => (
                <div
                  key={col}
                  className={`h-4 rounded skeleton ${col === 0 ? "w-32" : col === 5 ? "w-16" : "flex-1"}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
