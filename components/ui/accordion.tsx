import * as React from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

// ── Custom Accordion implementation without external dependency ──────────────

interface AccordionContextValue {
  openItems: Set<string>
  toggleItem: (value: string) => void
}

const AccordionContext = React.createContext<AccordionContextValue | undefined>(undefined)

interface AccordionProps {
  children: React.ReactNode
  type?: "single" | "multiple"
  collapsible?: boolean
  defaultValue?: string | string[]
  className?: string
}

const Accordion = React.forwardRef<HTMLDivElement, AccordionProps>(
  (
    { children, type = "single", collapsible = false, defaultValue, className },
    ref
  ) => {
    const [openItems, setOpenItems] = React.useState<Set<string>>(() => {
      if (!defaultValue) return new Set()
      if (typeof defaultValue === "string") return new Set([defaultValue])
      return new Set(defaultValue)
    })

    const toggleItem = React.useCallback((value: string) => {
      setOpenItems((prev) => {
        const next = new Set(prev)
        if (next.has(value)) {
          if (collapsible || type === "multiple") {
            next.delete(value)
          }
        } else {
          if (type === "single") {
            next.clear()
          }
          next.add(value)
        }
        return next
      })
    }, [type, collapsible])

    return (
      <AccordionContext.Provider value={{ openItems, toggleItem }}>
        <div ref={ref} className={className}>
          {children}
        </div>
      </AccordionContext.Provider>
    )
  }
)
Accordion.displayName = "Accordion"

interface AccordionItemProps {
  value: string
  children: React.ReactNode
  className?: string
}

const AccordionItem = React.forwardRef<HTMLDivElement, AccordionItemProps>(
  ({ value, children, className }, ref) => (
    <div ref={ref} className={cn("border border-border", className)} data-state={value}>
      {children}
    </div>
  )
)
AccordionItem.displayName = "AccordionItem"

interface AccordionTriggerProps {
  children: React.ReactNode
  className?: string
}

const AccordionTrigger = React.forwardRef<
  HTMLButtonElement,
  AccordionTriggerProps & { "data-value"?: string }
>(({ children, className, ...props }, ref) => {
  const context = React.useContext(AccordionContext)
  const value = props["data-value"] || ""
  const isOpen = context?.openItems.has(value) ?? false

  return (
    <button
      ref={ref}
      className={cn(
        "flex flex-1 items-center justify-between py-4 px-4 font-medium transition-all hover:bg-muted/40 w-full text-left",
        className
      )}
      onClick={() => context?.toggleItem(value)}
      type="button"
    >
      {children}
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200",
          isOpen && "rotate-180"
        )}
        aria-hidden="true"
      />
    </button>
  )
})
AccordionTrigger.displayName = "AccordionTrigger"

interface AccordionContentProps {
  children: React.ReactNode
  className?: string
}

const AccordionContent = React.forwardRef<
  HTMLDivElement,
  AccordionContentProps & { "data-value"?: string }
>(({ children, className, ...props }, ref) => {
  const context = React.useContext(AccordionContext)
  const value = props["data-value"] || ""
  const isOpen = context?.openItems.has(value) ?? false

  if (!isOpen) return null

  return (
    <div
      ref={ref}
      className={cn(
        "overflow-hidden text-sm transition-all animate-in slide-in-from-top fade-in-0",
        className
      )}
    >
      <div className={cn("pb-4 pt-0 px-4")}>{children}</div>
    </div>
  )
})
AccordionContent.displayName = "AccordionContent"

export { Accordion, AccordionItem, AccordionTrigger, AccordionContent }
