"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

// Root / Trigger / Close re-exported for convenience
const Sheet        = DialogPrimitive.Root;
const SheetTrigger = DialogPrimitive.Trigger;
const SheetClose   = DialogPrimitive.Close;
const SheetPortal  = DialogPrimitive.Portal;

// Overlay
const SheetOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-[300] bg-black/40",
      "data-[state=open]:animate-in  data-[state=open]:fade-in-0",
      "data-[state=closed]:animate-out data-[state=closed]:fade-out-0",
      className,
    )}
    {...props}
  />
));
SheetOverlay.displayName = "SheetOverlay";

// Content — right-side panel
const SheetContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => (
  <SheetPortal>
    <SheetOverlay />
    <DialogPrimitive.Content
      ref={ref}
      className={cn(
        // Positioning
        "fixed right-0 top-0 z-[300] flex h-full w-full max-w-[440px] flex-col",
        "bg-white border-l border-border shadow-2xl",
        // Animations
        "data-[state=open]:animate-in   data-[state=open]:slide-in-from-right",
        "data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right",
        "data-[state=open]:duration-300 data-[state=closed]:duration-200",
        className,
      )}
      {...props}
    >
      {children}
      {/* Close button */}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-lg p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors focus:outline-none">
        <X className="w-4 h-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </SheetPortal>
));
SheetContent.displayName = "SheetContent";

// Header (sticky top)
function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex-shrink-0 px-6 pt-5 pb-4 border-b border-border", className)}
      {...props}
    />
  );
}
SheetHeader.displayName = "SheetHeader";

// Scrollable body
function SheetBody({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex-1 overflow-y-auto px-6 py-5", className)} {...props} />
  );
}
SheetBody.displayName = "SheetBody";

// Sticky footer
function SheetFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex-shrink-0 flex items-center justify-end gap-2 px-6 py-4",
        "border-t border-border bg-muted/30",
        className,
      )}
      {...props}
    />
  );
}
SheetFooter.displayName = "SheetFooter";

// Title
const SheetTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-base font-semibold text-foreground leading-tight", className)}
    {...props}
  />
));
SheetTitle.displayName = "SheetTitle";

// Description
const SheetDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn("text-xs text-muted-foreground mt-0.5", className)}
    {...props}
  />
));
SheetDescription.displayName = "SheetDescription";

export {
  Sheet, SheetTrigger, SheetClose, SheetPortal, SheetOverlay,
  SheetContent, SheetHeader, SheetBody, SheetFooter, SheetTitle, SheetDescription,
};
