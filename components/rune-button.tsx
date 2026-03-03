import type { ButtonHTMLAttributes, ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RuneButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode
  variant?: "primary" | "secondary"
}

export function RuneButton({ children, className, variant = "primary", ...props }: RuneButtonProps) {
  return (
    <button
      className={cn(
        "relative px-8 py-4 font-semibold font-[family-name:var(--font-cinzel)] text-lg",
        "border-2 transition-all duration-300",
        "disabled:opacity-50 disabled:cursor-not-allowed",
        variant === "primary" && [
          "border-primary bg-primary text-primary-foreground",
          "hover:bg-primary/90 hover:border-glow hover:shadow-lg hover:shadow-primary/50",
        ],
        variant === "secondary" && [
          "border-primary/50 bg-secondary text-foreground",
          "hover:bg-secondary/80 hover:border-primary hover:shadow-lg hover:shadow-primary/30",
        ],
        className,
      )}
      {...props}
    >
      {/* Corner runes */}
      <span className="absolute top-0 left-0 w-2 h-2 bg-primary" />
      <span className="absolute top-0 right-0 w-2 h-2 bg-primary" />
      <span className="absolute bottom-0 left-0 w-2 h-2 bg-primary" />
      <span className="absolute bottom-0 right-0 w-2 h-2 bg-primary" />

      {children}
    </button>
  )
}
