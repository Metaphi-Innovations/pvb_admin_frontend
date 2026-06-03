import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-btn text-table font-medium ring-offset-background transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-400/40 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50",
  {
    variants: {
      variant: {
        default:     "bg-brand-600 text-white shadow-sm hover:bg-brand-700 active:bg-brand-800",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline:     "border border-border bg-white text-foreground hover:bg-muted/60 hover:border-brand-200",
        secondary:   "bg-navy-700 text-white hover:bg-navy-800 shadow-sm",
        ghost:       "text-foreground hover:bg-muted/70",
        link:        "text-brand-600 underline-offset-4 hover:underline hover:text-brand-700",
        success:     "bg-leaf-600 text-white hover:bg-leaf-700 shadow-sm",
      },
      size: {
        default: "h-9 px-4 py-2 text-sm",
        sm:      "h-8 rounded-btn px-3 text-xs",
        lg:      "h-10 rounded-btn px-6 text-sm",
        icon:    "h-8 w-8",
      },
    },
    defaultVariants: { variant: "default", size: "sm" },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
