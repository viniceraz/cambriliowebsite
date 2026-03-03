import type { ReactNode } from "react"
import { cn } from "@/lib/utils"

interface RpgPanelProps {
  children: ReactNode
  className?: string
  glow?: boolean
}

export function RpgPanel({ children, className, glow = false }: RpgPanelProps) {
  return (
    <div
      className={cn(
        "relative border-2 border-primary/30 bg-card/80 backdrop-blur-sm rounded-lg p-6",
        glow && "panel-glow",
        className,
      )}
    >
      {/* Corner decorations */}
      <div className="absolute top-0 left-0 w-3 h-3 border-l-2 border-t-2 border-primary" />
      <div className="absolute top-0 right-0 w-3 h-3 border-r-2 border-t-2 border-primary" />
      <div className="absolute bottom-0 left-0 w-3 h-3 border-l-2 border-b-2 border-primary" />
      <div className="absolute bottom-0 right-0 w-3 h-3 border-r-2 border-b-2 border-primary" />

      {children}
    </div>
  )
}
